const { PROD } = require('../config');

// Security headers on every response, and no caching of data or sign-in answers.
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'",
  });
  if (PROD) res.set('Strict-Transport-Security', 'max-age=31536000');
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) res.set('Cache-Control', 'no-store');
  next();
}

module.exports = { securityHeaders };
