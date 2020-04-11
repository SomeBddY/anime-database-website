const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const config = require('../config/database');
const Game = require('../models/game');
const Rating = require('../models/rating');
const Comment = require('../models/comment');
const Project = require('../models/project');
const User = require('../models/user');

//Create storage engine
const storage = require('../models/gridfs')
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;
const upload = multer({
  storage: storage
});

// Route To Single game
router.get('/:gameId', async (req, res, next) => {
  const requestedGameId = req.params.gameId;
  try {
    if(requestedGameId.substr(0,5) !== 'page-'){
      const game = await Game.findById({_id: requestedGameId}).populate('image_file');
      const ratings = await Rating.find({projectId: requestedGameId});
      const count = await Rating.countDocuments({projectId: requestedGameId});
      const comments = await Comment.find({projectId: requestedGameId}).populate({path:'userId', populate: {path: 'avatar'}}).sort({date: -1});

      res.render('games', {
        gameId: game._id,
        image_file: game.image_file[0].filename,
        title: game.title,
        genres: game.genres,
        company: game.company,
        publisher: game.publisher,
        year: game.year,
        platform: game.platform,
        ratings: ratings,
        count: count,
        summary: game.summary,
        requirements: game.requirements,
        trailer: game.trailer,
        comments: comments
      });
    } else {
      return next();
    }
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Add Rating
router.post('/:gameId', (req, res) => {
  const requestedRating = req.body.rating;
  const user = req.user;
  const requestedGameId = req.params.gameId;
  const requestedComment = req.body.comment;
  if(requestedRating !== undefined) {
    Rating.findOne({userId: user.id, projectId: requestedGameId}, (err, rating) => {
      if(!err){
        if(!rating){
          const rating = new Rating({
            rating: requestedRating,
            userId: user.id,
            projectId: requestedGameId
          });

          rating.save((err) => {
            if(err)
              console.log(err);
            else
              res.redirect('/game/'+requestedGameId);
          });
        } else {
          Rating.updateOne({userId: user.id, projectId: requestedGameId}, {$set: {rating: requestedRating}}, (err) => {
            res.redirect('/game/'+requestedGameId);
          });
        }
      }
    });
  } else {
    const comment = new Comment({
      comment: requestedComment,
      userId: user.id,
      projectId: requestedGameId,
      date: Date.now()
    });

    comment.save((err) => {
      if (!err)
        res.redirect('/game/'+requestedGameId);
      else
        console.log(err);
    });
  }
});

// Editing Route
router.get('/edit/:gameId', checkForAuthentication, async (req, res) => {
  const requestedGameId = req.params.gameId;
  const genresEnum = Game.schema.path('genres').options.enum;
  genresEnum.sort();
  try {
    const game = await Game.findById({_id: requestedGameId}).populate('image_file');
    const ratings = await Rating.find({projectId: requestedGameId});
    const count = await Rating.countDocuments({projectId: requestedGameId});

    res.render('edit-game', {
      gameId: game._id,
      image_file: game.image_file[0].filename,
      title: game.title,
      genres: game.genres,
      genresEnum: genresEnum,
      company: game.company,
      publisher: game.publisher,
      year: game.year,
      platform: game.platform,
      ratings: ratings,
      count: count,
      summary: game.summary,
      requirements: game.requirements,
      trailer: game.trailer
    });
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

//Editing Process
router.post('/edit/:gameId', upload.single('file'), (req, res) => {
  file = req.file;
  const game = {};
  const requestedGameId = req.params.gameId;

  if(file !== undefined){
    Game.findOne({_id: requestedGameId}, (err, game) => {
      gfs.remove({_id: game.image_file[0], root: 'images'}, (err, gridStore) => {
        if(err) {
          return res.status(404).json({err: err});
        }
      });
    });
    game.image_file = mongoose.Types.ObjectId(file.id);
  }
  game.title = req.body.title;
  game.genres = req.body.genres;
  game.company = req.body.company;
  game.publisher= req.body.publisher;
  game.year = req.body.year;
  game.platfrom = req.body.platform;
  game.requirements = req.body.requirements;
  game.summary = req.body.summary;
  game.trailer = req.body.trailer;

  Game.updateOne({_id: requestedGameId}, game, (err) => {
    if(!err || file === undefined){
      res.redirect('/game/'+requestedGameId);
    }
  });
});


// Deleting game
router.delete('/:gameId', async (req, res) => {
  const requestedGameId = req.params.gameId;
  const imageId = req.body.image_file;
  
  try {
    await Game.deleteOne({_id: requestedGameId});
    await Project.deleteOne({projectRef: requestedGameId})
    await Rating.deleteMany({projectId: requestedGameId});
    await Comment.deleteMany({projectId: requestedGameId});
    res.send('Deleting successful');
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Access Control
function checkForAuthentication(req, res, next) {
  if(req.isAuthenticated() && req.user.role === 'admin'){
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
