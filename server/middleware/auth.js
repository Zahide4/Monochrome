const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No Auth Header' });

    // 1. Clean the input
    let rawString = authHeader.replace(/^Bearer\s+/i, "").replace(/\s/g, '');
    if (rawString.startsWith('"') && rawString.endsWith('"')) {
        rawString = rawString.slice(1, -1);
    }

    // 2. Extract all potential JWT candidates
    // A JWT is 3 parts separated by dots. 
    // If we have TokenA.TokenB, we have 6 parts.
    // We split by dot, and group them into chunks of 3.
    const parts = rawString.split('.');
    const candidates = [];

    // Group into potential tokens (Part1.Part2.Part3)
    for (let i = 0; i < parts.length; i += 3) {
        if (parts[i+2]) { // Ensure we have 3 parts
            candidates.push(parts.slice(i, i+3).join('.'));
        }
    }

    if (candidates.length === 0) {
        return res.status(400).json({ message: 'No valid token format found' });
    }

    // 3. Try verifying each candidate until one works
    let verified = null;
    let lastError = null;

    for (const token of candidates) {
        try {
            verified = jwt.verify(token, process.env.JWT_SECRET);
            if (verified) break; // Found a working token!
        } catch (err) {
            lastError = err;
            // Continue to next candidate
        }
    }

    if (!verified) {
        console.error("❌ All token candidates failed verification.");
        console.error("Last Error:", lastError.message);
        return res.status(400).json({ message: 'Invalid Token', details: lastError.message });
    }

    // Success
    req.user = verified;
    next();
    
  } catch (err) {
    console.error("Auth System Error:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = auth;
