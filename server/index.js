const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// --- SECURITY PACKAGES ---
const mongoSanitize = require('express-mongo-sanitize'); // Prevents NoSQL Injection
const helmet = require('helmet'); // Hides server info
const xss = require('xss-clean'); // Prevents script injection
const hpp = require('hpp'); // Prevents param pollution
const rateLimit = require('express-rate-limit'); // Prevents Brute Force

require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');
const auth = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1); // Fix for Render + Rate Limit

// --- 1. SECURITY MIDDLEWARE ---
app.use(helmet()); // Secure HTTP Headers
app.use(express.json({ limit: '10kb' })); // prevent DoS with huge payloads
app.use(mongoSanitize()); // STOP NoSQL Injection (The likely hack)
app.use(xss()); // Clean input
app.use(hpp());

// Rate Limit: Max 150 requests per 10 mins
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 150,
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

// CORS: Strictly allow ONLY Vercel and Localhost
app.use(cors({
  origin: ["monochrome-npxbzamej-cremier4-2389s-projects.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- DB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error(err));

// Helper
const isAdmin = (user) => user && user.role === 'admin';

app.get('/ping', (req, res) => res.send('pong'));

// --- AUTH ROUTERS ---

// Register (Strict Whitelisting)
app.post('/api/register', async (req, res) => {
  try {
    // SECURITY: Only accept these specific fields. Ignore 'role' if sent.
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) return res.status(400).send('All fields required');

    const existingUser = await User.findOne({ email });
    if(existingUser) return res.status(400).send('Email already exists');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({ 
      email, 
      username, 
      password: hashedPassword, 
      role: 'user' // FORCE USER ROLE
    });
    
    await user.save();
    res.status(201).send('User registered');
  } catch (err) { res.status(500).send('Server Error'); }
});

// Admin Promotion (Protected via Secret)
app.post('/api/setup-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    // Check internal secret
    if (secretKey !== process.env.JWT_SECRET) return res.status(403).send('Forbidden');
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found');
    
    user.role = 'admin';
    await user.save();
    res.send(`User ${user.username} promoted to Admin.`);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid Credentials'); // Vague error is safer
    
    if (!user.password) return res.status(400).send('Use Google Login');
    
    // 2. Check Password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).send('Invalid Credentials');
    
    // 3. Issue Token
    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) { res.status(500).send('Login Error'); }
});

app.post('/api/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, sub } = ticket.getPayload();
    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, username: name, googleId: sub, role: 'user' });
      await user.save();
    }
    const appToken = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: appToken, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) { res.status(400).send('Google Auth Failed'); }
});

// --- POST ROUTES (COMPLIANCE & PRIVACY) ---

// 1. Get Feed
app.get('/api/posts', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let query = { isPrivate: false, hiddenByAdmin: false }; // Default: Public & Safe

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);
        
        if (isAdmin(user)) {
           // ADMIN: Public + Hidden By Admin (To Review)
           query = { $or: [ { isPrivate: false }, { hiddenByAdmin: true } ] };
        } else {
           // USER: Public + Own Private + Own Hidden
           query = {
             $or: [
               { isPrivate: false, hiddenByAdmin: false },
               { author: decoded._id }
             ]
           };
        }
      } catch (e) {}
    }
    const posts = await Post.find(query).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).send('Server Error'); }
});

// 2. Get Single Post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');
      
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    if (token) {
       try { 
         const decoded = jwt.verify(token, process.env.JWT_SECRET); 
         user = await User.findById(decoded._id);
       } catch (e) {}
    }

    // ADMIN COMPLIANCE:
    if (user && isAdmin(user)) {
      // Cannot view private user posts unless they are hidden (flagged) by admin
      if (post.isPrivate && !post.hiddenByAdmin) {
         return res.status(403).json({ message: 'Compliance: Admin cannot view private user posts.' });
      }
      return res.json(post);
    }

    // STANDARD PRIVACY
    if (post.isPrivate || post.hiddenByAdmin) {
       if (!user || post.author._id.toString() !== user._id.toString()) {
          return res.status(403).json({ message: 'Unauthorized' });
       }
    }
    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Server Error' }); }
});

// 3. Create Post
app.post('/api/posts', auth, async (req, res) => {
  try {
    // SECURITY: Explicitly pick fields. Don't use req.body directly.
    const post = new Post({ 
        title: req.body.title,
        content: req.body.content,
        isPrivate: req.body.isPrivate,
        author: req.user._id 
        // hiddenByAdmin is false by default
    });
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).send('Error'); }
});

// 4. Update Post
app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let post;

    if (isAdmin(user)) {
      // Admin can find ANY post
      post = await Post.findById(req.params.id);
    } else {
      // User can only find OWN post
      post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    }

    if (!post) return res.status(403).send('Not authorized');

    // Update Content
    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;
    
    if (isAdmin(user)) {
       // Admin Controls
       if (req.body.hiddenByAdmin !== undefined) {
          post.hiddenByAdmin = req.body.hiddenByAdmin;
          if(post.hiddenByAdmin) post.isPrivate = true; // Safety: Make private if hidden
       }
    } else {
       // User Controls
       if (req.body.isPrivate !== undefined) post.isPrivate = req.body.isPrivate;
    }

    await post.save();
    res.json(post);
  } catch (err) { res.status(500).send('Error'); }
});

// 5. Delete Post
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (isAdmin(user)) {
       await Post.findByIdAndDelete(req.params.id);
    } else {
       const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
       if(!post) return res.status(403).send('Unauthorized');
    }
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).send('Error'); }
});

// 6. My Posts
app.get('/api/posts/mine', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const posts = await Post.find({ author: userId }).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).send('Error'); }
});

// 7. Reactions
app.put('/api/posts/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    if(!post.reactions) post.reactions = [];
    
    const existingIndex = post.reactions.findIndex(r => r.user.toString() === req.user._id && r.emoji === emoji);
    if (existingIndex > -1) post.reactions.splice(existingIndex, 1);
    else post.reactions.push({ user: req.user._id, emoji });
    
    await post.save();
    const uPost = await Post.findById(req.params.id).populate('author', 'username');
    res.json(uPost);
  } catch (err) { res.status(500).send(err.message); }
});

// 8. Add Comment
app.post('/api/posts/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if(!text) return res.status(400).send('Text required');
    
    const post = await Post.findById(req.params.id);
    if (!post.comments) post.comments = [];
    
    post.comments.push({ user: req.user._id, text });
    await post.save();
    
    const uPost = await Post.findById(req.params.id).populate('author', 'username').populate('comments.user', 'username');
    res.json(uPost);
  } catch (err) { res.status(500).send('Error'); }
});

// 9. Delete Comment
app.delete('/api/posts/:id/comment/:commentId', auth, async (req, res) => {
   try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);
    
    if(!comment) return res.status(404).send('Comment not found');

    const user = await User.findById(req.user._id);
    
    // Allow if Admin OR Comment Owner
    if (comment.user.toString() !== req.user._id && !isAdmin(user)) {
       return res.status(401).send('Unauthorized');
    }
    
    comment.deleteOne();
    await post.save();
    
    const uPost = await Post.findById(req.params.id).populate('author', 'username').populate('comments.user', 'username');
    res.json(uPost);
   } catch (err) { res.status(500).send('Error'); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running`));
