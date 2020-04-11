const mongoose = require('mongoose');
const config = require('../config/database');

// Connecting DB
const deprecations = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};
mongoose.connect(config.database, deprecations);
const conn = mongoose.connection;

// Rating route
const Rating = require('../models/rating');

// User userSchema
const userSchema = mongoose.Schema({
  username:{
    type: String,
    required: true,
  },
  password:{
    type: String,
    required: true
  },
  email:{
    type: String,
    required: true
  },
  ratings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating'
  },
  role: {
    type: String,
    enum: ['admin', 'standard-user'],
    default: 'standard-user'
  },
  avatar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GridFs'
  },
  name: {
    type: String
  },
  gender: {
    type: String,
    enum: ['Мъж', 'Жена']
  },
  dateOfBirth: {
    type: Date
  },
  more_info: {
    type: String
  }
});

const User = module.exports = conn.model('User', userSchema);
