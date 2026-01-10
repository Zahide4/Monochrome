const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// SECURITY
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: ["https://monochrome-beryl.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
});
app.use('/api', limiter);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error(err));

const isAdmin = (user) => user && user.role === 'admin';

// --- AUTH MIDDLEWARE ---
const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Missing Authorization Header' });

    // Clean Token
    let token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1);

    if (!process.env.JWT_SECRET) {
        console.error("❌ CRITICAL: JWT_SECRET is missing!");
        return res.status(500).json({ message: 'Server Config Error' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // This contains { _id, role }
    next();
    
  } catch (err) {
    console.error("❌ JWT Error:", err.message);
    res.status(400).json({ message: 'Invalid Token', details: err.message });
  }
};

app.get('/ping', (req, res) => res.send('pong'));

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ email });
    if(existingUser) return res.status(400).send('Email exists');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ email, username, password: hashedPassword, role: 'user' });
    await user.save();
    res.status(201).send('Registered');
  } catch (err) { res.status(500).send('Error'); }
});

app.post('/api/setup-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    if (secretKey !== process.env.JWT_SECRET) return res.status(403).send('Forbidden');
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('Not found');
    user.role = 'admin';
    await user.save();
    res.send('Promoted');
  } catch (err) { res.status(500).send('Error'); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('User not found');
    
    if (user.password) {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).send('Invalid Credentials');
    } else {
        return res.status(400).send('Use Google Login');
    }
    
    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) { res.status(500).send('Error'); }
});

app.post('/api/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = new User({ email: payload.email, username: payload.name, googleId: payload.sub, role: 'user' });
      await user.save();
    }
    const appToken = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: appToken, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) { res.status(400).send('Auth Failed'); }
});

// --- POST ROUTES ---

// 1. Get All Posts (Feed)
app.get('/api/posts', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let query = { isPrivate: false, hiddenByAdmin: { $ne: true } };

    if (token) {
      try {
        // We try to decode cleanly. If it fails, we just show public posts.
        let cleanToken = token.trim();
        if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) cleanToken = cleanToken.slice(1, -1);
        
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);
        
        if (isAdmin(user)) {
           query = { $or: [ { isPrivate: false }, { hiddenByAdmin: true } ] };
        } else {
           query = {
             $or: [
               { isPrivate: false, hiddenByAdmin: { $ne: true } },
               { author: decoded._id } 
             ]
           };
        }
      } catch (e) {
          // Token invalid? Just ignore and show public.
          console.log("Feed Auth Warning:", e.message);
      }
    }
    const posts = await Post.find(query).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).send('Server Error'); }
});

// 2. My Logs (FIXED)
app.get('/api/posts/mine', auth, async (req, res) => {
  try {
    // Debugging: Ensure we have an ID
    if (!req.user || !req.user._id) {
        console.error("MyLogs Failed: No user ID in token", req.user);
        return res.status(400).json({ message: "User ID missing from token" });
    }
    
    // Explicit Cast to ObjectId to prevent 500 errors
    const userId = new mongoose.Types.ObjectId(req.user._id);
    
    const posts = await Post.find({ author: userId }).populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { 
    console.error("My Logs Error:", err);
    res.status(500).json({ message: "Server Error Fetching Logs", error: err.message }); 
  }
});

// 3. Get Single Post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');
    if (!post) return res.status(404).json({ message: 'Not found' });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    if (token) {
       try { 
         let cleanToken = token.trim();
         if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) cleanToken = cleanToken.slice(1, -1);
         const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET); 
         user = await User.findById(decoded._id);
       } catch (e) {}
    }

    if (user && isAdmin(user)) {
      if (post.isPrivate && !post.hiddenByAdmin) {
         return res.status(403).json({ message: 'Compliance: Admin cannot view private user posts.' });
      }
      return res.json(post);
    }

    if (user && post.author._id.toString() === user._id.toString()) {
       return res.json(post);
    }

    if (post.hiddenByAdmin) return res.status(403).json({ message: 'Content Removed by Admin' });
    if (post.isPrivate) return res.status(403).json({ message: 'Private Post' });

    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Error' }); }
});

// 4. Create Post (FIXED)
app.post('/api/posts', auth, async (req, res) => {
  try {
    console.log("Attempting to create post for:", req.user._id); // DEBUG LOG
    
    if (!req.body.title || !req.body.content) {
        return res.status(400).json({ message: "Title and Content required" });
    }

    const post = new Post({ 
        title: req.body.title,
        content: req.body.content,
        isPrivate: req.body.isPrivate || false,
        author: req.user._id // Mongoose handles the cast
    });
    
    await post.save();
    console.log("Post created successfully:", post._id);
    res.json(post);
  } catch (err) { 
    console.error("Create Post Error:", err);
    res.status(500).json({ message: "Failed to create post", error: err.message }); 
  }
});

// 5. Update Post
app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let post;

    if (isAdmin(user)) post = await Post.findById(req.params.id);
    else post = await Post.findOne({ _id: req.params.id, author: req.user._id });

    if (!post) return res.status(403).send('Not authorized');

    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;
    
    if (isAdmin(user)) {
       if (req.body.hiddenByAdmin === true) {
          post.hiddenByAdmin = true;
          if (req.body.takedownReason) post.takedownReason = req.body.takedownReason;
       } 
       else if (req.body.hiddenByAdmin === false) {
          post.hiddenByAdmin = false;
          post.takedownReason = null; 
          post.isPrivate = false; 
       }
    } else {
       if (req.body.isPrivate !== undefined) post.isPrivate = req.body.isPrivate;
    }

    await post.save();
    res.json(post);
  } catch (err) { res.status(500).send('Error'); }
});

// 6. Delete Post
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (isAdmin(user)) await Post.findByIdAndDelete(req.params.id);
    else {
       const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
       if(!post) return res.status(403).send('Unauthorized');
    }
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).send('Error'); }
});

// 7. Reactions & Comments
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

app.delete('/api/posts/:id/comment/:commentId', auth, async (req, res) => {
   try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);
    const user = await User.findById(req.user._id);
    if (comment.user.toString() !== req.user._id && !isAdmin(user)) return res.status(401).send('Unauthorized');
    comment.deleteOne();
    await post.save();
    const uPost = await Post.findById(req.params.id).populate('author', 'username').populate('comments.user', 'username');
    res.json(uPost);
   }} catch (err) { res.status(500).send('Error'); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running`));
