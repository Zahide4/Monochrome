const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Access Denied: Missing Authorization Header' });
    }

    // 1. Remove "Bearer " (Case insensitive)
    let token = authHeader.replace(/^Bearer\s+/i, "");

    // 2. Remove any extra quotes (common React artifact)
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }
    
    // 3. Remove ALL whitespace/newlines (The "Invisible Killer")
    token = token.replace(/\s/g, '');

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: Token is empty' });
    }

    // 4. Verify
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error("❌ JWT VERIFY ERROR:");
        console.error("Received Header:", authHeader);
        console.error("Cleaned Token:  ", "[" + token + "]"); // Brackets show hidden spaces
        console.error("Reason:", err.message);
        
        res.status(400).json({ 
            message: 'Invalid Token', 
            details: err.message,
            tip: "Check Render Logs for the exact token received."
        });
    }
    
  } catch (err) {
    res.status(500).json({ message: 'Server Error in Auth Middleware' });
  }
};

module.exports = auth;
