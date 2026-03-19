const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Sets req.user if a valid token is present; does not 401 if missing or invalid. */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = { optionalAuth };
