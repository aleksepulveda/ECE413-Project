// server/config/database.js
// Central place to connect to MongoDB using Mongoose.

const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri =
    process.env.MONGO_URI ||           // what .env currently uses
    process.env.MONGODB_URI ||        // fallback if we ever rename
    'mongodb://127.0.0.1:27017/hearttrack';

  await mongoose.connect(uri);
  console.log('Connected to MongoDB at', uri);
};
