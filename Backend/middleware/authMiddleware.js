/**
 * Auth Middleware
 *
 * 
 * Protects routes by verifying the JWT token sent in the Authorization header.
 *
 * Usage in server.js:
 *   const { requireAuth } = require('./middleware/authMiddleware');
 *   app.get('/protected-route', requireAuth, controllerFunction);
 *
 * The frontend must send:
 *   Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Header must be present and start with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // extract the token after "Bearer "

  try {
    // jwt.verify throws if the token is expired, tampered with, or signed with the wrong secret.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the userId to the request so controllers can use it (e.g. req.user.userId)
    req.user = payload;

    next(); // token is valid — continue to the actual route handler
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
