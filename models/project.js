const mongoose = require('mongoose');
const config = require('../config/database');

// Connecting DB
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

const Anime = require('../models/anime');
const Manga = require('../models/manga');
const Liveaction = require('../models/liveaction');
const Game = require('../models/game');

const projectSchema = mongoose.Schema ({
  projectRef:{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'typeOfModel'
  },
  typeOfModel: {
    type: String,
    enum: ['Anime', 'Manga', 'Liveaction', 'Game']
  }
}, {collection: 'projects'});

const Project = conn.model('Project', projectSchema);
module.exports = Project;
