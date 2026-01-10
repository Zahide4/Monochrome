const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emoji: { type: String, required: true }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  
  // ADMIN FIELDS
  hiddenByAdmin: { type: Boolean, default: false },
  takedownReason: { type: String, default: null }, 
  
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reactions: [ReactionSchema],
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);
