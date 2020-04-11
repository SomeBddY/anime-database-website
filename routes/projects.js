const express = require('express');
const router = express.Router();
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const config = require('../config/database');
const Project = require('../models/project');
const Rating = require('../models/rating');

//Create storage engine
const storage = require('../models/gridfs')

const upload = multer({
  storage: storage
});

// Route To Single Project
router.get('/:projectId', (req, res) => {
  const requestedProjectId = req.params.projectId;
  Project.findById({_id: requestedProjectId}).populate('image_file').exec((err, project) => {
    Rating.find({projectId: requestedProjectId}, (err, ratings) => {
      Rating.countDocuments({projectId: requestedProjectId}, (err, count) => {
        if(err) return next(err);
        res.render('project', {
          projectId: project._id,
          image_file: project.image_file[0].filename,
          title: project.title,
          genre: project.genre,
          format: project.format,
          episodes: project.episodes,
          year: project.year,
          duration: project.duration,
          state: project.state,
          studio: project.studio,
          producer: project.producer,
          ratings: ratings,
          count: count,
          summary: project.summary,
          trailer: project.trailer
        });
      });
    });
  });
});

// Add Rating
router.post('/:projectId', (req, res) => {
  const requestedRating = req.body.rating;
  const user = req.user;
  const requestedProjectId = req.params.projectId;

  Rating.findOne({userId: user.id, projectId: requestedProjectId}, (err, rating) => {
    if(!err){
      if(!rating){
        Rating.create({rating: requestedRating, userId: user.id, projectId: requestedProjectId}, (err, rating) => {
          if(err){
            console.log(err);
            return;
          } else {
            res.redirect('/projects/'+requestedProjectId);
          }
        });
      } else {
        Rating.updateOne({userId: user.id, projectId: requestedProjectId}, {$set: {rating: requestedRating}}, (err) => {
          res.redirect('/projects/'+requestedProjectId);
        });
      }
    }
  });
});

// Editing Route
router.get('/edit/:projectId', checkForAuthentication, (req, res) => {
  const requestedProjectId = req.params.projectId;
  Project.findById({_id: requestedProjectId}).populate('image_file').exec((err, project) => {
    Rating.find({projectId: requestedProjectId}, (err, ratings) => {
      Rating.countDocuments({projectId: requestedProjectId}, (err, count) => {
        if(err) return next(err);
          res.render('edit-project', {
            projectId: project._id,
            image_file: project.image_file[0].filename,
            title: project.title,
            genre: project.genre,
            format: project.format,
            episodes: project.episodes,
            year: project.year,
            duration: project.duration,
            state: project.state,
            studio: project.studio,
            producer: project.producer,
            ratings: ratings,
            count: count,
            summary: project.summary,
            trailer: project.trailer
          });
      });
    });
  });
});

//Editing Process
router.post('/edit/:projectId', upload.single('file'), (req, res) => {
  file = req.file;
  const project = {};
  const requestedProjectId = req.params.projectId;

  if(file !== undefined){
    project.image_file = mongoose.Types.ObjectId(file.id);
  }
  project.title = req.body.title;
  project.genre = req.body.genre;
  project.format = req.body.format;
  project.episodes = req.body.episodes;
  project.year = req.body.year;
  project.duration = req.body.duration;
  project.state = req.body.state;
  project.studio = req.body.studio;
  project.producer = req.body.producer;
  project.summary = req.body.summary;
  project.trailer = req.body.trailer;

  Project.update({_id: requestedProjectId}, project, (err) => {
    if(!err || file === undefined){
      res.redirect('/projects/'+requestedProjectId);
    }
  });
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


module.exports = router;
