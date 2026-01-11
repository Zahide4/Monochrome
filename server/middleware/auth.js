const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No Auth Header' });

    let rawString = authHeader.replace(/^Bearer\s+/i, "").replace(/\s/g, '');
    if (rawString.startsWith('"') && rawString.endsWith('"')) {
        rawString = rawString.slice(1, -1);
    }

    const parts = rawString.split('.');
    const candidates = [];

    for (let i = 0; i < parts.length; i += 3) {
        if (parts[i+2]) { 
            candidates.push(parts.slice(i, i+3).join('.'));
        }
    }

    if (candidates.length === 0) {
        return res.status(400).json({ message: 'No valid token format found' });
    }

    let verified = null;
    let lastError = null;

    for (const token of candidates) {
        try {
            verified = jwt.verify(token, process.env.JWT_SECRET);
            if (verified) break; 
        } catch (err) {
            lastError = err;
        }
    }

    if (!verified) {
        console.error("❌ All token candidates failed verification.");
        console.error("Last Error:", lastError.message);
        return res.status(400).json({ message: 'Invalid Token', details: lastError.message });
    }


    req.user = verified;
    next();
    
  } catch (err) {
    console.error("Auth System Error:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = auth;
