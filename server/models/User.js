// server/models/User.js
// -------------------------------------------------------------
// Heart Track - User Model (Mongoose Schema)
// -------------------------------------------------------------
//  Defines the structure of user accounts stored in MongoDB.
//  Each user record includes:
//    • email        → unique login identifier (lowercased)
//    • passwordHash → bcrypt-hashed password (never stored raw)
//    • name         → optional display name for UI features
//
//  Mongoose timestamps automatically add:
//    • createdAt
//    • updatedAt
//
//  Example user document:
//    {
//      _id: "...",
//      email: "student@arizona.edu",
//      passwordHash: "$2b$12$...",
//      name: "Elias",
//      createdAt: "2025-11-10T...",
//      updatedAt: "2025-11-10T..."
//    }
// -------------------------------------------------------------

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