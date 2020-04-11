const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const multer = require('multer');
const mongoose = require('mongoose');
const config = require('../config/database');

// Models
const User = require('../models/user');
const Rating = require('../models/rating');
const Comment = require('../models/comment');
const Project = require('../models/project');

//Create storage engine
const storage = require('../models/gridfs');
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;
const upload = multer({
  storage: storage
});

// Register Route
router.get('/register', (req, res) => {
  res.render('register');
});

// Register Process
//Checking for existing Username
let flagUsername = false;
function checkingForExistingUsername(req, res, next) {
  const username = req.body.username;
  if (username !== '') {
    User.findOne({
      username: username
    }, (err, user) => {
      if (err) throw err;
      if (user) {
        if (user.username === username) {
          req.flash('error', "Потребителското име е заето");
          flagUsername = true;
          return next();
        }
      } else {
        flagUsername = false
        return next();
      }
    });
  } else {
    flagUsername = false
    return next();
  }
}

// Checking for existing Email
let flagEmail = false;
function checkingForExistingEmail(req, res, next) {
  const email = req.body.email;
  if(email !== ''){
    User.findOne({email: email}, (err, user) => {
      if(err) throw err;
      if(user){
        if(user.email === email){
          req.flash('error', "Имейлът е зает");
          flagEmail = true;
          return next();
        }
      } else {
        flagEmail = false;
        return next();
      }
    });
  } else {
    flagEmail = false;
    return next();
  }
}

// Register Process
router.post('/register', checkingForExistingUsername,  checkingForExistingEmail, (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const passwordTwo = req.body.passwordTwo;
  const email = req.body.email;
  const emailTwo = req.body.emailTwo;

  req.checkBody('username', 'Не сте въвели потребитеслко име').notEmpty();
  req.checkBody('password', 'Не сте въвели парола').notEmpty();
  req.checkBody('passwordTwo', 'Паролите не съвпадат').equals(req.body.password);
  req.checkBody('email', 'Не сте въвели имейл').notEmpty();
  req.checkBody('email', 'Невалиден имейл адрес').isEmail();
  req.checkBody('emailTwo', 'Имейлите не съвпадат').equals(req.body.email);

  const errors = req.validationErrors(true);

  if(errors || flagUsername || flagEmail){
    res.render('register', {
      errors:errors
    });
  } else {
    const user = new User({
      username:username,
      password:password,
      email:email
    });
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        if(err){
          console.log(err);
        }
        user.password = hash;
        user.save((err) => {
          if(err){
            console.log(err);
          } else {
            req.flash('success', 'Регистрацията е успешна');
            res.redirect('/users/login');
          }
        });
      });
    });
  }
});

// Login Process
router.get('/login', (req, res) => {
  res.render('login');
});
// Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/users/login',
    badRequestMessage: 'Не сте въвели данни',
    failureFlash: true
  })(req, res, next);
});
// Logout Process
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/users/login');
});

// USER PROFILE
// Profile Route
router.get('/profile/:username', (req, res) => {
  const username = req.params.username;
  User.findOne({
    username: username
  }).populate('avatar').exec((err, user) => {
    res.render('profile', {
      avatar: user.avatar,
      username: user.username,
      name: user.name,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      more_info: user.more_info
    });
  });
});
// User Settings
router.get('/settings/:username', checkForAuthentication, (req, res) => {
  const username = req.params.username;
  User.findOne({
    username: username
  }).populate('avatar').exec((err, user) => {
    res.render('settings', {
      avatar: user.avatar,
      username: user.username,
      name: user.name,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      more_info: user.more_info
    });
  });
});

router.post('/settings/:username', upload.single('file'), (req, res) => {
  file = req.file;
  const user = {};
  const username = req.params.username;

  if (file !== undefined) {
    User.findOne({
      username: username
    }).exec((err, user) => {
      if (user.avatar[0] !== undefined) {
        gfs.remove({
          _id: user.avatar[0],
          root: 'images'
        }, (err, gridStore) => {
          if (err) {
            return res.status(404).json({
              err: err
            });
          }
        });
      }
    });
    user.avatar = mongoose.Types.ObjectId(file.id);
  }
  user.name = req.body.name;
  user.gender = req.body.gender;
  user.dateOfBirth = req.body.dateOfBirth;
  user.more_info = req.body.more_info;

  User.updateOne({
    username: username
  }, user, (err) => {
    if (!err) {
      res.redirect('/users/profile/' + username);
    }
  });
});

router.get('/ratings/:username', (req, res) => {
  const username = req.params.username;
  User.findOne({
    username: username
  }).populate('avatar').exec((err, user) => {
    Rating.find({
      userId: user.id
    }).exec((err, ratings) => {
      res.render('ratings', {
        avatar: user.avatar,
        username: user.username,
        ratings: ratings,
      });
    });
  });
});

router.get('/comments/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({
      username: username
    }).populate('avatar');
    const comments = await Comment.find({
      userId: user.id
    }).sort({
      date: -1
    });
    const projects = await Project.find({}).populate({
      path: 'projectRef',
      populate: {
        path: 'image_file'
      }
    });
    res.render('comments', {
      avatar: user.avatar,
      username: user.username,
      comments: comments,
      projects: projects
    });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Access Control
function checkForAuthentication(req, res, next) {
  if (req.isAuthenticated() && req.user.username === req.path.substr(10)) {
    return next();
  } else {
    req.flash('error', 'Нямате достъп до тази страница');
    res.redirect('/');
  }
}

let gfs;
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('images');
});

module.exports = router;
