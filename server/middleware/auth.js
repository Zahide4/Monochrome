const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        console.log("⚠️ Auth Failed: Missing Header");
        return res.status(401).json({ message: 'No authentication token found.' });
    }

    // 1. CLEAN THE TOKEN
    // Removes 'Bearer ', trims whitespace, and removes double quotes if present
    let token = authHeader.replace('Bearer ', '').trim();
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1); // Remove quotes "..."
    }

    if (!token) {
        console.log("⚠️ Auth Failed: Empty Token");
        return res.status(401).json({ message: 'Token string is empty.' });
    }

    // 2. CHECK SECRET
    if (!process.env.JWT_SECRET) {
        console.error("❌ CRITICAL: JWT_SECRET IS MISSING ON SERVER!");
        return res.status(500).json({ message: 'Server Config Error' });
    }

    // 3. VERIFY
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
    
  } catch (err) {
    // LOG EXACT ERROR TO RENDER
    console.error("❌ JWT Verify Error:", err.message);
    
    // Send detailed error to frontend for you to see
    res.status(400).json({ 
        message: 'Invalid Token', 
        details: err.message 
    });
  }
};

module.exports = auth;
