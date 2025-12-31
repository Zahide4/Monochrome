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
app.use(cors());

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if(existingUser) return res.status(400).send('Email already exists');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ email, username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered');
  } catch (err) { res.status(400).send(err.message); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send('User not found');
  if (!user.password) return res.status(400).send('Please login with Google');
  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(400).send('Invalid password');
  const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);
  res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
});

app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;
  try {
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

// --- Post Routes ---

app.get('/api/posts', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  let query = { isPrivate: false };
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      query = {}; 
    } catch (e) {}
  }
  const posts = await Post.find(query).populate('author', 'username').sort({ createdAt: -1 });
  res.json(posts);
});

app.get('/api/posts/mine', auth, async (req, res) => {
  const posts = await Post.find({ author: req.user._id }).populate('author', 'username').sort({ createdAt: -1 });
  res.json(posts);
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.isPrivate) {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) throw new Error();
      jwt.verify(token, process.env.JWT_SECRET);
    }
    res.json(post);
  } catch (err) { res.status(403).json({ message: 'Unauthorized' }); }
});

app.post('/api/posts', auth, async (req, res) => {
  const post = new Post({ ...req.body, author: req.user._id });
  await post.save();
  res.json(post);
});

// Toggle Reaction Route
app.put('/api/posts/:id/react', auth, async (req, res) => {
  const { emoji } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');

    // Check if user already reacted with this specific emoji
    const existingIndex = post.reactions.findIndex(r => r.user.toString() === req.user._id && r.emoji === emoji);

    if (existingIndex > -1) {
      // Remove reaction (Toggle off)
      post.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction (Toggle on)
      post.reactions.push({ user: req.user._id, emoji });
    }
    
    await post.save();
    // Return the full post so UI updates instantly
    const updatedPost = await Post.findById(req.params.id).populate('author', 'username');
    res.json(updatedPost);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/api/posts/:id', auth, async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
  if (!post) return res.status(403).send('Not authorized');
  Object.assign(post, req.body);
  await post.save();
  res.json(post);
});

app.delete('/api/posts/:id', auth, async (req, res) => {
  await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
  res.json({ message: 'Deleted' });
});

app.listen(process.env.PORT, () => console.log('Server running'));
