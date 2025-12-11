// server/config/database.js
// -------------------------------------------------------------
// Heart Track - MongoDB Connection (Mongoose)
// -------------------------------------------------------------
//  • Centralizes the database connection logic for the backend.
//  • Uses Mongoose to establish a connection to MongoDB.
//  • Pulls the URI from process.env.MONGODB_URI if available,
//    otherwise falls back to: mongodb://127.0.0.1:27017/hearttrack
//  • Exported as an async function and invoked in server.js
//    during backend startup.
// -------------------------------------------------------------


const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri =
    process.env.MONGODB_URI ||        // fallback if we ever rename
    'mongodb://127.0.0.1:27017/hearttrack';

  await mongoose.connect(uri);
  console.log('Connected to MongoDB at', uri);
};
