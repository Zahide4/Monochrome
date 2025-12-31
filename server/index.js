const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');
const auth = require('./middleware/auth');

const app = express();
app.use(express.json());

// CORS Config
app.use(cors({
  origin: ["https://monochrome-beryl.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ email });
    if(existingUser) return res.status(400).send('Email already exists');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ email, username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered');
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('User not found');
    if (!user.password) return res.status(400).send('Please login with Google');
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).send('Invalid password');
    const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) { res.status(500).send('Login Error'); }
});

app.post('/api/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, sub } = ticket.getPayload();
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, username: name, googleId: sub });
      await user.save();
    }
    const appToken = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token: appToken, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) { res.status(400).send('Google Auth Failed'); }
});

// --- POST ROUTES ---

app.get('/api/posts', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let query = { isPrivate: false };
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        query = { $or: [ { isPrivate: false }, { author: decoded._id } ] };
      } catch (e) {}
    }
    const posts = await Post.find(query).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Feed Error:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// FIXING THE 500 ERROR HERE
app.get('/api/posts/mine', auth, async (req, res) => {
  try {
    // Explicitly casting user ID to ensure MongoDB query works
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const posts = await Post.find({ author: userId }).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { 
    console.error("My Logs Error:", err); // This logs to Render dashboard
    res.status(500).send('Server Error fetching user posts'); 
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.isPrivate) {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(403).json({ message: 'Unauthorized' });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (post.author._id.toString() !== decoded._id) {
            return res.status(403).json({ message: 'Access Denied' });
        }
      } catch (e) { return res.status(403).json({ message: 'Unauthorized' }); }
    }
    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Server Error' }); }
});

app.post('/api/posts', auth, async (req, res) => {
  try {
    const post = new Post({ ...req.body, author: req.user._id });
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).send('Error creating post'); }
});

app.put('/api/posts/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    
    // Initialize reactions array if it doesn't exist (Fixes crash on old posts)
    if (!post.reactions) post.reactions = [];

    const existingIndex = post.reactions.findIndex(r => r.user.toString() === req.user._id && r.emoji === emoji);
    if (existingIndex > -1) post.reactions.splice(existingIndex, 1);
    else post.reactions.push({ user: req.user._id, emoji });
    await post.save();
    const updatedPost = await Post.findById(req.params.id).populate('author', 'username');
    res.json(updatedPost);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(403).send('Not authorized');
    Object.assign(post, req.body);
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).send('Error updating'); }
});

app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).send('Error deleting'); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
