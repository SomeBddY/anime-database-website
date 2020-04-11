const mongoose = require('mongoose');
const config = require('../config/database');

// Connecting DB
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

const User = require('../models/user');
const Project = require('../models/project');

//User userSchema
const commentSchema = mongoose.Schema({
  comment:{
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  date: {
    type: Date
  }
});

const Comment = module.exports = conn.model('Comment', commentSchema);
