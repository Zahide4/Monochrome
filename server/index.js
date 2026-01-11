const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const Joi = require('joi');

// SECURITY MIDDLEWARE
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const User = require('./models/User');
const Post = require('./models/Post');

// ============================================
// CRITICAL: ENV VALIDATION
// ============================================
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'ADMIN_SETUP_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);

// ============================================
// ENHANCED CORS CONFIGURATION
// ============================================
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL || "https://monochromeblog.vercel.app"]
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// ============================================
// ENHANCED HELMET CONFIGURATION
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://ik.imagekit.io"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ============================================
// ENHANCED RATE LIMITING
// ============================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 posts per hour
  message: 'Too many posts created, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);

// ============================================
// VALIDATION SCHEMAS
// ============================================
const schemas = {
  register: Joi.object({
    email: Joi.string().email().lowercase().trim().max(255).required(),
    username: Joi.string().trim().min(2).max(50).required(),
    password: Joi.string().min(8).max(128).required()
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .message('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  }),
  
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required()
  }),
  
  post: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    content: Joi.string().trim().min(1).max(50000).required(),
    isPrivate: Joi.boolean().default(false)
  }),
  
  comment: Joi.object({
    text: Joi.string().trim().min(1).max(1000).required()
  }),
  
  reaction: Joi.object({
    emoji: Joi.string().valid('like', 'heart').required()
  }),
  
  adminUpdate: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    content: Joi.string().trim().min(1).max(50000),
    isPrivate: Joi.boolean(),
    hiddenByAdmin: Joi.boolean(),
    takedownReason: Joi.string().trim().max(500).allow(null, '')
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors 
      });
    }
    
    req.body = value; // Use sanitized values
    next();
  };
};

// ============================================
// MONGODB CONNECTION WITH SECURITY OPTIONS
// ============================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB Connected Securely'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ============================================
// UTILITY FUNCTIONS
// ============================================
const isAdmin = (user) => user && user.role === 'admin';

// Enhanced error handler
const handleError = (res, err, defaultMessage = 'An error occurred') => {
  console.error('Error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: defaultMessage });
  } else {
    return res.status(500).json({ 
      message: defaultMessage, 
      error: err.message 
    });
  }
};

// ============================================
// AUTH MIDDLEWARE
// ============================================
const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// ============================================
// AUDIT LOGGING
// ============================================
const auditLog = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    success: details.success !== false,
    ...details
  };
  
  // In production, send to logging service (e.g., Winston, Loggly)
  console.log('[AUDIT]', JSON.stringify(logEntry));
};

// ============================================
// ROUTES
// ============================================

app.get('/ping', (req, res) => res.send('pong'));

// --- REGISTRATION ---
app.post('/api/register', authLimiter, validate(schemas.register), async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      auditLog('REGISTER_FAILED', null, { 
        reason: 'email_exists', 
        email,
        ip: req.ip 
      });
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Enhanced bcrypt with 12 rounds
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({ 
      email, 
      username, 
      password: hashedPassword, 
      role: 'user' 
    });
    await user.save();
    
    auditLog('REGISTER_SUCCESS', user._id, { 
      email, 
      username,
      ip: req.ip 
    });
    
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    auditLog('REGISTER_ERROR', null, { 
      error: err.message,
      ip: req.ip 
    });
    handleError(res, err, 'Registration failed');
  }
});

// --- ADMIN SETUP (SECURED) ---
app.post('/api/setup-admin', authLimiter, async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    if (!email || !secretKey) {
      return res.status(400).json({ message: 'Email and secret key required' });
    }
    
    if (secretKey !== process.env.ADMIN_SETUP_KEY) {
      auditLog('ADMIN_SETUP_FAILED', null, { 
        reason: 'invalid_key', 
        email,
        ip: req.ip 
      });
      return res.status(403).json({ message: 'Invalid setup key' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.role = 'admin';
    await user.save();
    
    auditLog('ADMIN_PROMOTED', user._id, { 
      email,
      ip: req.ip 
    });
    
    res.json({ message: 'User promoted to admin' });
  } catch (err) {
    handleError(res, err, 'Admin setup failed');
  }
});

// --- LOGIN ---
app.post('/api/login', authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      auditLog('LOGIN_FAILED', null, { 
        reason: 'user_not_found', 
        email,
        ip: req.ip 
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      auditLog('LOGIN_FAILED', user._id, { 
        reason: 'oauth_only', 
        email,
        ip: req.ip 
      });
      return res.status(400).json({ message: 'Please use Google login' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      auditLog('LOGIN_FAILED', user._id, { 
        reason: 'invalid_password',
        ip: req.ip 
      });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    auditLog('LOGIN_SUCCESS', user._id, { 
      email,
      ip: req.ip 
    });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (err) {
    handleError(res, err, 'Login failed');
  }
});

// --- GOOGLE LOGIN ---
app.post('/api/google-login', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }
    
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    const normalizedEmail = payload.email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        email: normalizedEmail,
        username: payload.name,
        googleId: payload.sub,
        role: 'user'
      });
      await user.save();
      
      auditLog('GOOGLE_REGISTER', user._id, { 
        email: normalizedEmail,
        ip: req.ip 
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    const appToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    auditLog('GOOGLE_LOGIN_SUCCESS', user._id, { 
      email: normalizedEmail,
      ip: req.ip 
    });

    res.json({
      token: appToken,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    auditLog('GOOGLE_LOGIN_FAILED', null, { 
      error: error.message,
      ip: req.ip 
    });
    handleError(res, error, 'Google authentication failed');
  }
});

// --- GET ALL POSTS ---
app.get('/api/posts', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let query = { isPrivate: false, hiddenByAdmin: { $ne: true } };

    if (token) {
      try {
        let cleanToken = token.trim();
        if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
          cleanToken = cleanToken.slice(1, -1);
        }
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);

        if (isAdmin(user)) {
          query = { 
            $or: [
              { $or: [{ isPrivate: false }, { hiddenByAdmin: true }] }, 
              { author: decoded._id }
            ] 
          };
        } else {
          query = {
            $or: [
              { isPrivate: false, hiddenByAdmin: { $ne: true } },
              { author: decoded._id }
            ]
          };
        }
      } catch (e) {
        // Invalid token, continue with public query
      }
    }
    
    const posts = await Post.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(100); // Limit results for performance
      
    res.json(posts);
  } catch (err) {
    handleError(res, err, 'Failed to fetch posts');
  }
});

// --- GET USER'S POSTS ---
app.get('/api/posts/mine', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const posts = await Post.find({ author: userId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    handleError(res, err, 'Failed to fetch your posts');
  }
});

// --- GET SINGLE POST ---
app.get('/api/posts/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');
      
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      try {
        let cleanToken = token.trim();
        if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
          cleanToken = cleanToken.slice(1, -1);
        }
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        user = await User.findById(decoded._id);
      } catch (e) {
        // Invalid token, continue as guest
      }
    }

    if (user && isAdmin(user)) {
      if (post.isPrivate && !post.hiddenByAdmin) {
        return res.status(403).json({ 
          message: 'Admin cannot view private user posts' 
        });
      }
      return res.json(post);
    }
    
    if (user && post.author._id.toString() === user._id.toString()) {
      return res.json(post);
    }
    
    if (post.hiddenByAdmin) {
      return res.status(403).json({ message: 'Content removed by admin' });
    }
    
    if (post.isPrivate) {
      return res.status(403).json({ message: 'This post is private' });
    }

    res.json(post);
  } catch (err) {
    handleError(res, err, 'Failed to fetch post');
  }
});

// --- CREATE POST ---
app.post('/api/posts', auth, createLimiter, validate(schemas.post), async (req, res) => {
  try {
    const { title, content, isPrivate } = req.body;
    
    const post = new Post({
      title,
      content,
      isPrivate: isPrivate || false,
      author: req.user._id
    });
    
    await post.save();
    
    auditLog('POST_CREATED', req.user._id, { 
      postId: post._id,
      isPrivate,
      ip: req.ip 
    });
    
    res.status(201).json(post);
  } catch (err) {
    handleError(res, err, 'Failed to create post');
  }
});

// --- UPDATE POST ---
app.put('/api/posts/:id', auth, validate(schemas.adminUpdate), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const user = await User.findById(req.user._id);
    let post;
    
    if (isAdmin(user)) {
      post = await Post.findById(req.params.id);
    } else {
      post = await Post.findOne({ 
        _id: req.params.id, 
        author: req.user._id 
      });
    }

    if (!post) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;

    if (isAdmin(user)) {
      if (req.body.hiddenByAdmin === true) {
        post.hiddenByAdmin = true;
        if (req.body.takedownReason) {
          post.takedownReason = req.body.takedownReason;
        }
        
        auditLog('POST_TAKEDOWN', req.user._id, { 
          postId: post._id,
          reason: req.body.takedownReason,
          ip: req.ip 
        });
      } else if (req.body.hiddenByAdmin === false) {
        post.hiddenByAdmin = false;
        post.takedownReason = null;
        post.isPrivate = false;
        
        auditLog('POST_RESTORED', req.user._id, { 
          postId: post._id,
          ip: req.ip 
        });
      }
    } else {
      if (req.body.isPrivate !== undefined) {
        post.isPrivate = req.body.isPrivate;
      }
    }
    
    await post.save();
    res.json(post);
  } catch (err) {
    handleError(res, err, 'Failed to update post');
  }
});

// --- DELETE POST ---
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (isAdmin(user)) {
      await Post.findByIdAndDelete(req.params.id);
    } else {
      const post = await Post.findOneAndDelete({ 
        _id: req.params.id, 
        author: req.user._id 
      });
      if (!post) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    auditLog('POST_DELETED', req.user._id, { 
      postId: req.params.id,
      ip: req.ip 
    });
    
    res.json({ message: 'Post deleted' });
  } catch (err) {
    handleError(res, err, 'Failed to delete post');
  }
});

// --- REACT TO POST ---
app.put('/api/posts/:id/react', auth, validate(schemas.reaction), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.reactions) post.reactions = [];
    
    const existingIndex = post.reactions.findIndex(
      r => r.user.toString() === req.user._id && r.emoji === emoji
    );
    
    if (existingIndex > -1) {
      post.reactions.splice(existingIndex, 1);
    } else {
      post.reactions.push({ user: req.user._id, emoji });
    }
    
    await post.save();
    
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'username');
    res.json(updatedPost);
  } catch (err) {
    handleError(res, err, 'Failed to react');
  }
});

// --- ADD COMMENT ---
app.post('/api/posts/:id/comment', auth, validate(schemas.comment), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.comments) post.comments = [];
    post.comments.push({ user: req.user._id, text });
    
    await post.save();
    
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');
    res.json(updatedPost);
  } catch (err) {
    handleError(res, err, 'Failed to add comment');
  }
});

// --- DELETE COMMENT ---
app.delete('/api/posts/:id/comment/:commentId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || 
        !mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (comment.user.toString() !== req.user._id && !isAdmin(user)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    comment.deleteOne();
    await post.save();
    
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('comments.user', 'username');
    res.json(updatedPost);
  } catch (err) {
    handleError(res, err, 'Failed to delete comment');
  }
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({ 
      message: 'Internal server error', 
      error: err.message,
      stack: err.stack 
    });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log(`🔒 Security features enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});