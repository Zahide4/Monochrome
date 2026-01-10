const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) return res.status(401).json({ message: 'No Auth Header' });

    // 1. Basic cleaning
    let token = authHeader.replace(/^Bearer\s+/i, "").trim();

    // 2. Remove quotes
    if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }
    
    // 3. Remove whitespace
    token = token.replace(/\s/g, '');

    // 4. CRITICAL FIX: Handle Double Tokens (Token.Token)
    // A valid JWT has exactly 2 dots (3 parts). If we see more, it's corrupted.
    // We assume the FIRST token is the valid one and discard the rest.
    if ((token.match(/\./g) || []).length > 2) {
        console.log("⚠️ Detected Double-Token Corruption. Fixing...");
        const parts = token.split('.');
        // Keep only the first 3 parts (Header.Payload.Signature)
        token = parts.slice(0, 3).join('.');
    }

    if (!token) return res.status(401).json({ message: 'Empty Token' });

    // 5. Verify
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
    
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(400).json({ message: 'Invalid Token', details: err.message });
  }
};

module.exports = auth;
