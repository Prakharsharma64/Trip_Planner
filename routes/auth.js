const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

passport.use(
  new (require('passport-local').Strategy)(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) return done(null, false, { message: 'Invalid email or password' });
        const ok = await user.comparePassword(password);
        if (!ok) return done(null, false, { message: 'Invalid email or password' });
        const { password: _, ...u } = user.toObject();
        return done(null, u);
      } catch (err) {
        return done(err);
      }
    }
  )
);

router.post(
  '/login',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email or password', details: errs.array() });
    }
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password' });
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({ token, user: { _id: user._id, email: user.email, name: user.name, role: user.role } });
    })(req, res, next);
  }
);

router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
