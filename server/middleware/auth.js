const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) return res.status(401).json({ message: 'No Auth Header' });

    // Extract token
    let token = authHeader.replace('Bearer ', '').trim();

    // Clean quotes if present
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }

    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: 'Token is empty/null/undefined' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
    
  } catch (err) {
    console.error("JWT Error:", err.message);
    // RETURN THE BAD TOKEN SO WE CAN SEE IT
    const received = req.header('Authorization') ? req.header('Authorization').substring(0, 20) + "..." : "None";
    
    res.status(400).json({ 
        message: 'Invalid Token', 
        details: err.message,
        receivedHeader: received 
    });
  }
};

module.exports = auth;
