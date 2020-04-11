const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const config = require('../config/database');
const Manga = require('../models/manga');
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

// Route To Single manga
router.get('/:mangaId', async (req, res, next) => {
  const requestedMangaId = req.params.mangaId;
  try {
    if(requestedMangaId.substr(0,5) !== 'page-' ){
      const manga = await Manga.findById({_id: requestedMangaId}).populate('image_file');
      const ratings = await Rating.find({projectId: requestedMangaId});
      const count = await Rating.countDocuments({projectId: requestedMangaId});
      const comments = await Comment.find({projectId: requestedMangaId}).populate({path:'userId', populate: {path: 'avatar'}}).sort({date: -1});

      res.render('mangas', {
        mangaId: manga._id,
        image_file: manga.image_file[0].filename,
        title: manga.title,
        genres: manga.genres,
        chapters: manga.chapters,
        volumes: manga.volumes,
        year: manga.year,
        state: manga.state,
        author: manga.author,
        ratings: ratings,
        count: count,
        summary: manga.summary,
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
router.post('/:mangaId', (req, res) => {
  const requestedRating = req.body.rating;
  const user = req.user;
  const requestedMangaId = req.params.mangaId;
  const requestedComment = req.body.comment;
  if(requestedRating !== undefined) {
    Rating.findOne({userId: user.id, projectId: requestedMangaId}, (err, rating) => {
      if(!err){
        if(!rating){
          const rating = new Rating({
            rating: requestedRating,
            userId: user.id,
            projectId: requestedMangaId
          });

          rating.save((err) => {
            if(err)
              console.log(err);
            else
              res.redirect('/manga/'+requestedMangaId);
          });
        } else {
          Rating.updateOne({userId: user.id, projectId: requestedMangaId}, {$set: {rating: requestedRating}}, (err) => {
            res.redirect('/manga/'+requestedMangaId);
          });
        }
      }
    });
  } else {
    const comment = new Comment({
      comment: requestedComment,
      userId: user.id,
      projectId: requestedMangaId,
      date: Date.now()
    });

    comment.save((err) => {
      if (!err)
        res.redirect('/manga/'+requestedMangaId);
      else
        console.log(err);
    });
  }
});

// Editing Route
router.get('/edit/:mangaId', checkForAuthentication, async (req, res) => {
  const requestedMangaId = req.params.mangaId;
  const genresEnum = Manga.schema.path('genres').options.enum;
  genresEnum.sort();
  try {
    const manga = await Manga.findById({_id: requestedMangaId}).populate('image_file');
    const ratings = await Rating.find({projectId: requestedMangaId});
    const count = await Rating.countDocuments({projectId: requestedMangaId});

    res.render('edit-manga', {
      mangaId: manga._id,
      image_file: manga.image_file[0].filename,
      title: manga.title,
      genres: manga.genres,
      genresEnum: genresEnum,
      chapters: manga.chapters,
      volumes: manga.volumes,
      year: manga.year,
      state: manga.state,
      author: manga.author,
      ratings: ratings,
      count: count,
      summary: manga.summary
    });
  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

//Editing Process
router.post('/edit/:mangaId', upload.single('file'), (req, res) => {
  file = req.file;
  const manga = {};
  const requestedMangaId = req.params.mangaId;

  if(file !== undefined){
    Manga.findOne({_id: requestedMangaId}, (err, manga) => {
      gfs.remove({_id: manga.image_file[0], root: 'images'}, (err, gridStore) => {
        if(err) {
          return res.status(404).json({err: err});
        }
      });
    });
    manga.image_file = mongoose.Types.ObjectId(file.id);
  }
  manga.title = req.body.title;
  manga.genres = req.body.genres;
  manga.format = req.body.format;
  manga.whatType = req.body.whatType;
  manga.episodes = req.body.episodes;
  manga.year = req.body.year;
  manga.duration = req.body.duration;
  manga.state = req.body.state;
  manga.studio = req.body.studio;
  manga.producer = req.body.producer;
  manga.summary = req.body.summary;
  manga.trailer = req.body.trailer;

  Manga.updateOne({_id: requestedMangaId}, manga, (err) => {
    if(!err || file === undefined){
      res.redirect('/manga/'+requestedMangaId);
    }
  });
});


// Deleting manga
router.delete('/:mangaId', async (req, res) => {
  const requestedMangaId = req.params.mangaId;
  const imageId = req.body.image_file;
  
  try {
    await Manga.deleteOne({_id: requestedMangaId});
    await Project.deleteOne({projectRef: requestedMangaId})
    await Rating.deleteMany({projectId: requestedMangaId});
    await Comment.deleteMany({projectId: requestedMangaId});
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
