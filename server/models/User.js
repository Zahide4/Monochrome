const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String }, // Optional for Google users
  googleId: { type: String }, // For Google users
});
module.exports = mongoose.model('User', UserSchema);
