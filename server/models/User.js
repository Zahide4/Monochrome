const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  username: { type: String, required: true, trim: true },
  password: { type: String }, // Hashed
  googleId: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' } 
});

module.exports = mongoose.model('User', UserSchema);
