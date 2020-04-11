const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

const config = require('../config/database');
const storage = require('../models/gridfs');
const Anime = require('../models/anime');
const Manga = require('../models/manga');
const Liveaction = require('../models/liveaction');
const Game = require('../models/game');
const Project = require('../models/project');

const upload = multer({
  storage: storage
});

// Administrative panel
router.get('/', (req, res) => {
  res.render('admin-panel');
});

// Upload Anime
router.get('/compose-anime', (req, res) => {
  const genresEnum = Anime.schema.path('genres').options.enum;
  genresEnum.sort();
  res.render('compose-anime', {
    genresEnum: genresEnum
  });
});

router.post('/compose-anime', upload.single('file'), async (req, res) => {
  file = req.file;
  try {
    const anime = new Anime({
      image_file: mongoose.Types.ObjectId(file.id),
      title: req.body.title,
      genres: req.body.genres,
      format: req.body.format,
      episodes: req.body.episodes,
      year: req.body.year,
      duration: req.body.duration,
      state: req.body.state,
      studio: req.body.studio,
      producer: req.body.producer,
      summary: req.body.summary,
      trailer: req.body.trailer
    });
    const project = new Project({
      projectRef: mongoose.Types.ObjectId(anime.id),
      typeOfModel: 'Anime'
    });

    await project.save();
    await anime.save();
    res.redirect('/');

  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Upload Manga
router.get('/compose-manga', (req, res) => {
  const genresEnum = Anime.schema.path('genres').options.enum;
  genresEnum.sort();
  res.render('compose-manga', {
    genresEnum: genresEnum
  });
});

router.post('/compose-manga', upload.single('file'), async (req, res) => {
  file = req.file;
  try {
    const manga = new Manga({
      image_file: mongoose.Types.ObjectId(file.id),
      title: req.body.title,
      genres: req.body.genres,
      chapters: req.body.chapters,
      volumes: req.body.volumes,
      year: req.body.year,
      state: req.body.state,
      author: req.body.author,
      summary: req.body.summary,
    });
    const project = new Project({
      projectRef: mongoose.Types.ObjectId(manga.id),
      typeOfModel: 'Manga'
    });

    await project.save();
    await manga.save();
    res.redirect('/');

  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Upload Liveaction
router.get('/compose-liveaction', (req, res) => {
  const genresEnum = Liveaction.schema.path('genres').options.enum;
  genresEnum.sort();
  res.render('compose-liveaction', {
    genresEnum: genresEnum
  });
});

router.post('/compose-liveaction', upload.single('file'), async (req, res) => {
  file = req.file;
  try {
    const liveaction = new Liveaction({
      image_file: mongoose.Types.ObjectId(file.id),
      title: req.body.title,
      genres: req.body.genres,
      format: req.body.format,
      episodes: req.body.episodes,
      year: req.body.year,
      duration: req.body.duration,
      state: req.body.state,
      cast: req.body.cast,
      producer: req.body.producer,
      summary: req.body.summary,
      trailer: req.body.trailer
    });
    const project = new Project({
      projectRef: mongoose.Types.ObjectId(liveaction.id),
      typeOfModel: 'Liveaction'
    });

    await project.save();
    await liveaction.save();
    res.redirect('/');

  } catch(err) {
    console.log("Error: ", err);
    res.status(500).send("Something went wrong");
  }
});

// Upload Game
router.get('/compose-game', (req, res) => {
  const genresEnum = Game.schema.path('genres').options.enum;
  genresEnum.sort();
  res.render('compose-game', {
    genresEnum: genresEnum
  });
});

router.post('/compose-game', upload.single('file'), async (req, res) => {
  file = req.file;
  try {
    const game = new Game({
      image_file: mongoose.Types.ObjectId(file.id),
      title: req.body.title,
      genres: req.body.genres,
      company: req.body.company,
      publisher: req.body.publisher,
      year: req.body.year,
      platform: req.body.platform,
      requirements: req.body.requirements,
      summary: req.body.summary,
      trailer: req.body.trailer
    });
    const project = new Project({
      projectRef: mongoose.Types.ObjectId(game.id),
      typeOfModel: 'Game'
    });

    await project.save();
    await game.save();
    res.redirect('/');

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
module.exports = router;
