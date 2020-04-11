const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const config = require('../config/database');
const Anime = require('../models/anime');
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

// Route To Single anime
router.get('/:animeId', async (req, res, next) => {
  const requestedAnimeId = req.params.animeId;
  try {
    if(requestedAnimeId.substr(0,5) !== 'page-'){
      const anime = await Anime.findById({_id: requestedAnimeId}).populate('image_file');
      const ratings = await Rating.find({projectId: requestedAnimeId});
      const count = await Rating.countDocuments({projectId: requestedAnimeId});
      const comments = await Comment.find({projectId: requestedAnimeId}).populate({path:'userId', populate: {path: 'avatar'}}).sort({date: -1});

      res.render('animes', {
        animeId: anime._id,
        image_file: anime.image_file[0].filename,
        title: anime.title,
        genres: anime.genres,
        format: anime.format,
        episodes: anime.episodes,
        year: anime.year,
        duration: anime.duration,
        state: anime.state,
        studio: anime.studio,
        producer: anime.producer,
        ratings: ratings,
        count: count,
        summary: anime.summary,
        trailer: anime.trailer,
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
router.post('/:animeId', (req, res) => {
  const requestedRating = req.body.rating;
  const user = req.user;
  const requestedAnimeId = req.params.animeId;
  const requestedComment = req.body.comment;
  if(requestedRating !== undefined) {
    Rating.findOne({userId: user.id, projectId: requestedAnimeId}, (err, rating) => {
      if(!err){
        if(!rating){
          const rating = new Rating({
            rating: requestedRating,
            userId: user.id,
            projectId: requestedAnimeId
          });

          rating.save((err) => {
            if(err)
              console.log(err);
            else
              res.redirect('/anime/'+requestedAnimeId);
          });
        } else {
          Rating.updateOne({userId: user.id, projectId: requestedAnimeId}, {$set: {rating: requestedRating}}, (err) => {
            res.redirect('/anime/'+requestedAnimeId);
          });
        }
      }
    });
  } else {
    const comment = new Comment({
      comment: requestedComment,
      userId: user.id,
      projectId: requestedAnimeId,
      date: Date.now()
    });

    comment.save((err) => {
      if (!err)
        res.redirect('/anime/'+requestedAnimeId);
      else
        console.log(err);
    });
  }
});

// Editing Route
router.get('/edit/:animeId', checkForAuthentication, async (req, res) => {
  const requestedAnimeId = req.params.animeId;
  const genresEnum = Anime.schema.path('genres').options.enum;
  genresEnum.sort();
  try {
    const anime = await Anime.findById({_id: requestedAnimeId}).populate('image_file');
    const ratings = await Rating.find({projectId: requestedAnimeId});
    const count = await Rating.countDocuments({projectId: requestedAnimeId});

    res.render('edit-anime', {
      animeId: anime._id,
      image_file: anime.image_file[0].filename,
      title: anime.title,
      genresEnum: genresEnum,
      genres: anime.genres,
      whatType: anime.whatType,
      format: anime.format,
      episodes: anime.episodes,
      year: anime.year,
      duration: anime.duration,
      state: anime.state,
      studio: anime.studio,
      producer: anime.producer,
      ratings: ratings,
      count: count,
      summary: anime.summary,
      trailer: anime.trailer
    });
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

//Editing Process
router.post('/edit/:animeId', upload.single('file'), (req, res) => {
  file = req.file;
  const anime = {};
  const requestedAnimeId = req.params.animeId;

  if(file !== undefined){
    Anime.findOne({_id: requestedAnimeId}, (err, anime) => {
      gfs.remove({_id: anime.image_file[0], root: 'images'}, (err, gridStore) => {
        if(err) {
          return res.status(404).json({err: err});
        }
      });
    });
    anime.image_file = mongoose.Types.ObjectId(file.id);
  }
  anime.title = req.body.title;
  anime.genres = req.body.genres;
  anime.format = req.body.format;
  anime.whatType = req.body.whatType;
  anime.episodes = req.body.episodes;
  anime.year = req.body.year;
  anime.duration = req.body.duration;
  anime.state = req.body.state;
  anime.studio = req.body.studio;
  anime.producer = req.body.producer;
  anime.summary = req.body.summary;
  anime.trailer = req.body.trailer;

  Anime.updateOne({_id: requestedAnimeId}, anime, (err) => {
    if(!err || file === undefined){
      res.redirect('/anime/'+requestedAnimeId);
    }
  });
});


// Deleting anime
router.delete('/:animeId', async (req, res) => {
  const requestedAnimeId = req.params.animeId;
  const imageId = req.body.image_file;
  try {
    await Anime.deleteOne({_id: requestedAnimeId});
    await Project.deleteOne({projectRef: requestedAnimeId})
    await Rating.deleteMany({projectId: requestedAnimeId});
    await Comment.deleteMany({projectId: requestedAnimeId});
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
