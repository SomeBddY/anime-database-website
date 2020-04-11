const mongoose = require('mongoose');
const config = require('../config/database');

// Connecting DB
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

// GRIDFS Model
const gfsSchema = mongoose.Schema({
    filename: String,
  }, {strict: false});
const GridFs = conn.model('GridFs', gfsSchema, 'images.files');

// RATING Route
const Rating = require('../models/rating')

// LIVEACTION Model
const liveactionSchema = mongoose.Schema({
  image_file: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'GridFs'
  }],
  title: {
    type: String,
    required: true
  },
  genres: {
    type: [String],
    enum: ['Екшън', 'Драма', 'Сейнен', 'Приключенски', 'Шонен', 'Научна фантастика', 'Комедия', 'Насилие', 'Трагедия', 'Трилър', 'Ужаси', 'Демони', 'Исторически', 'Военен'],
    required: true
  },
  format: {
    type: String,
    required: true
  },
  episodes: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  cast: {
    type: String,
    required: true
  },
  producer: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  trailer: {
    type: String,
    required: true
  }
}, {collection: 'liveactions'});

const Liveaction = conn.model('Liveaction', liveactionSchema);
module.exports = Liveaction;
