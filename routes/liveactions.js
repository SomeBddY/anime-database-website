const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const config = require('../config/database');
const Liveaction = require('../models/liveaction');
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

// Route To Single liveaction
router.get('/:liveactionId', async (req, res, next) => {
  const requestedLiveactionId = req.params.liveactionId;
  try {
    if(requestedLiveactionId.substr(0,5) !== 'page-'){
      const liveaction = await Liveaction.findById({_id: requestedLiveactionId}).populate('image_file');
      const ratings = await Rating.find({projectId: requestedLiveactionId});
      const count = await Rating.countDocuments({projectId: requestedLiveactionId});
      const comments = await Comment.find({projectId: requestedLiveactionId}).populate({path:'userId', populate: {path: 'avatar'}}).sort({date: -1});

      res.render('liveactions', {
        liveactionId: liveaction._id,
        image_file: liveaction.image_file[0].filename,
        title: liveaction.title,
        genres: liveaction.genres,
        format: liveaction.format,
        episodes: liveaction.episodes,
        year: liveaction.year,
        duration: liveaction.duration,
        state: liveaction.state,
        cast: liveaction.cast,
        producer: liveaction.producer,
        ratings: ratings,
        count: count,
        summary: liveaction.summary,
        trailer: liveaction.trailer,
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
router.post('/:liveactionId', (req, res) => {
  const requestedRating = req.body.rating;
  const user = req.user;
  const requestedLiveactionId = req.params.liveactionId;
  const requestedComment = req.body.comment;
  if(requestedRating !== undefined) {
    Rating.findOne({userId: user.id, projectId: requestedLiveactionId}, (err, rating) => {
      if(!err){
        if(!rating){
          const rating = new Rating({
            rating: requestedRating,
            userId: user.id,
            projectId: requestedLiveactionId
          });

          rating.save((err) => {
            if(err)
              console.log(err);
            else
              res.redirect('/liveaction/'+requestedLiveactionId);
          });
        } else {
          Rating.updateOne({userId: user.id, projectId: requestedLiveactionId}, {$set: {rating: requestedRating}}, (err) => {
            res.redirect('/liveaction/'+requestediveactionId);
          });
        }
      }
    });
  } else {
    const comment = new Comment({
      comment: requestedComment,
      userId: user.id,
      projectId: requestedLiveactionId,
      date: Date.now()
    });

    comment.save((err) => {
      if (!err)
        res.redirect('/liveaction/'+requestedLiveactionId);
      else
        console.log(err);
    });
  }
});

// Editing Route
router.get('/edit/:liveactionId', checkForAuthentication, async (req, res) => {
  const requestedLiveactionId = req.params.liveactionId;
  const genresEnum = Liveaction.schema.path('genres').options.enum;
  genresEnum.sort();
  try {
    const liveaction = await Liveaction.findById({_id: requestedLiveactionId}).populate('image_file');
    const ratings = await Rating.find({projectId: requestedLiveactionId});
    const count = await Rating.countDocuments({projectId: requestedLiveactionId});

    res.render('edit-liveaction', {
      liveactionId: liveaction._id,
      image_file: liveaction.image_file[0].filename,
      title: liveaction.title,
      genresEnum: genresEnum,
      genres: liveaction.genres,
      whatType: liveaction.whatType,
      format: liveaction.format,
      episodes: liveaction.episodes,
      year: liveaction.year,
      duration: liveaction.duration,
      state: liveaction.state,
      cast: liveaction.cast,
      producer: liveaction.producer,
      ratings: ratings,
      count: count,
      summary: liveaction.summary,
      trailer: liveaction.trailer
    });
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

//Editing Process
router.post('/edit/:liveactionId', upload.single('file'), (req, res) => {
  file = req.file;
  const liveaction = {};
  const requestedLiveactionId = req.params.liveactionId;

  if(file !== undefined){
    Liveaction.findOne({_id: requestedLiveactionId}, (err, liveaction) => {
      gfs.remove({_id: liveaction.image_file[0], root: 'images'}, (err, gridStore) => {
        if(err) {
          return res.status(404).json({err: err});
        }
      });
    });
    liveaction.image_file = mongoose.Types.ObjectId(file.id);
  }
  liveaction.title = req.body.title;
  liveaction.genres = req.body.genres;
  liveaction.format = req.body.format;
  liveaction.whatType = req.body.whatType;
  liveaction.episodes = req.body.episodes;
  liveaction.year = req.body.year;
  liveaction.duration = req.body.duration;
  liveaction.state = req.body.state;
  liveaction.cast = req.body.cast;
  liveaction.producer = req.body.producer;
  liveaction.summary = req.body.summary;
  liveaction.trailer = req.body.trailer;

  Liveaction.updateOne({_id: requestedLiveactionId}, liveaction, (err) => {
    if(!err || file === undefined){
      res.redirect('/liveaction/'+requestedLiveactionId);
    }
  });
});


// Deleting liveaction
router.delete('/:liveactionId', async (req, res) => {
  const requestedLiveactionId = req.params.liveactionId;
  const imageId = req.body.image_file;
  
  try {
    await Liveaction.deleteOne({_id: requestedLiveactionId});
    await Project.deleteOne({projectRef: requestedLiveactionId})
    await Rating.deleteMany({projectId: requestedLiveactionId});
    await Comment.deleteMany({projectId: requestedLiveactionId});
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
