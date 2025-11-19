// server/models/User.js
// MongoDB model for user accounts.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      // We will store a bcrypt hash here, not the raw password.
      type: String,
      required: true
    },
    name: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true // adds createdAt, updatedAt automatically
  }
);

module.exports = mongoose.model('User', userSchema);

/*
// Now every user document in Mongo will look like:
{
  "_id": "...",
  "email": "student@arizona.edu",
  "passwordHash": "$2b$12$...",
  "name": "Elias",
  "createdAt": "...",
  "updatedAt": "..."
}
*/