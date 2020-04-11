const express = require('express');
const router = express.Router();
const config = require('../config/database');
const mongoose = require('mongoose');
const storage = require('../models/gridfs')
const Grid = require('gridfs-stream');

// Connect to database
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

// Route To Image
router.get('/uploads/:filename', (req, res) => {
  gfs.files.findOne({
    filename: req.params.filename
  }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    } else {
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        let readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    }
  });
});

// Deleteing Image
router.delete('/uploads/:filename', (req, res) => {
  gfs.remove({filename: req.params.filename, root: 'images'}, (err, gridStore) => {
    if(err) {
      return res.status(404).json({err: err});
    }
    res.redirect('/');
  });
});

// Init gfs
let gfs;
conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('images');
});

module.exports = router;
