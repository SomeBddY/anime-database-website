//jshint esversion:6
// Loading packages
const express = require('express');
const expressValidator = require('express-validator');
const session = require('express-session');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const path = require('path');
const methodOverride = require('method-override');
const passport = require('passport');
const config = require('./config/database');



// Init App
const app = express();

// Middlewares
app.set('views', [
  path.join(__dirname, './views'),
  path.join(__dirname, './views/authentication/'),
  path.join(__dirname, './views/user-profile/'),
  path.join(__dirname, './views/projects/'),
  path.join(__dirname, './views/admin')
]);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(expressValidator());
app.use(express.static("public"));
app.use(methodOverride('_method'));
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = require('express-messages')(req, res);
  next();
});
app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Connecting DB
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

// DB MODELS
//Project MODEL
const Project = require('./models/project');
// Anime Model
const Anime = require('./models/anime');
// USER Model
const User = require('./models/user');
// RATING Model
const Rating = require('./models/rating');
// GridFS Model
const storage = require('./models/gridfs');
// Comment Model
const Comment = require('./models/comment');

const upload = multer({
  storage: storage
});

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// ROUTES
app.get('*', async (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.animes = null;
  if (res.locals.user !== null) {
    await User.findOne({
      _id: res.locals.user.id
    }).populate('avatar').exec((err, user) => {
      if (user.avatar !== undefined) {
        res.locals.user.avatar[0].filename = user.avatar[0].filename;
      }
    });
  }
  res.locals.projects = await Project.find({}).populate({
    path: 'projectRef',
    populate: {
      path: 'image_file'
    }
  });

  res.locals.globalComments = await Comment.find({}).populate({
    path: 'userId',
    populate: {
      path: 'avatar'
    }
  }).limit(4).sort({
    date: -1
  });
  next();
});

const images = require('./routes/images');
const animes = require('./routes/animes');
const mangas = require('./routes/mangas');
const games = require('./routes/games');
const liveactions = require('./routes/liveactions');
const users = require('./routes/users');
const adminPanel = require('./routes/admin-panel');

app.use('/images', images);
app.use('/anime', animes);
app.use('/manga', mangas);
app.use('/liveaction', liveactions);
app.use('/game', games);
app.use('/users', users);
app.use('/admin-panel', adminPanel);

// Home Route
app.get('/', async (req, res) => {
  let sizePerPage = 16;
  let page = req.params.page || 1;
  try {
    const projects = await Project.find({}).populate({
      path: 'projectRef',
      populate: {
        path: 'image_file'
      }
    }).skip((sizePerPage * page) - sizePerPage).sort({
      dateOfUpload: -1
    }).limit(sizePerPage);;
    const count = await Project.countDocuments({});
    const ratings = await Rating.find({});
    const comments = await Comment.find({});

    res.render('home', {
      projects: projects,
      comments: comments,
      ratings: ratings,
      current: page,
      pages: Math.ceil(count / sizePerPage)
    });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Route to Specific Project
app.get('/:route', async (req, res, next) => {
  let sizePerPage = 16;
  let page = req.params.page || 1;
  let route = req.params.route;

  function capitalize(route) {
    return route.charAt(0).toUpperCase() + route.slice(1);
  }
  try {
    if(route == 'anime' || route == 'manga' || route == 'liveaction' || route == 'game') {
      const projects = await Project.find({
        typeOfModel: capitalize(route)
      }).populate({
        path: 'projectRef',
        populate: {
          path: 'image_file'
        }
      }).skip((sizePerPage * page) - sizePerPage).sort({
        dateOfUpload: -1
      }).limit(sizePerPage);
      const count = await Project.countDocuments({
        typeOfModel: "Anime"
      });
      const ratings = await Rating.find({});
      const comments = await Comment.find({});

      res.render(route, {
        projects: projects,
        comments: comments,
        ratings: ratings,
        current: page,
        pages: Math.ceil(count / sizePerPage)
      });
    } else {
      next();
    }
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Pagination Route
app.get('/page-:page', async (req, res) => {
  let sizePerPage = 16;
  let page = req.params.page || 1;
  try {
    const projects = await Project.find({}).populate({
      path: 'projectRef',
      populate: {
        path: 'image_file'
      }
    }).skip((sizePerPage * page) - sizePerPage).sort({
      dateOfUpload: -1
    }).limit(sizePerPage);;
    const count = await Project.countDocuments({});
    const ratings = await Rating.find({});
    const comments = await Comment.find({});

    res.render('home', {
      projects: projects,
      comments: comments,
      ratings: ratings,
      current: page,
      pages: Math.ceil(count / sizePerPage)
    });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Route to Specific Project Page
app.get('/:route/page-:page', async (req, res, next) => {
  let sizePerPage = 16;
  let page = req.params.page || 1;
  let route = req.params.route;

  function capitalize(route) {
    return route.charAt(0).toUpperCase() + route.slice(1);
  }
  try {
    const projects = await Project.find({
      typeOfModel: capitalize(route)
    }).populate({
      path: 'projectRef',
      populate: {
        path: 'image_file'
      }
    }).skip((sizePerPage * page) - sizePerPage).sort({
      dateOfUpload: -1
    }).limit(sizePerPage);
    const count = await Project.countDocuments({
      typeOfModel: "Anime"
    });
    const ratings = await Rating.find({});
    const comments = await Comment.find({});

    res.render(route, {
      projects: projects,
      comments: comments,
      ratings: ratings,
      current: page,
      pages: Math.ceil(count / sizePerPage)
    });
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Init gfs
let gfs;
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('images');
  gfs.collection('posters');
  console.log('Connected to MongoDB');
});

// Check DB connection
conn.on('error', (err) => console.log(err));

// Start Server
app.listen(3000, () => console.log("Listening to port 3000!"));
