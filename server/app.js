// Builds the Express app: security headers, sign-in, the data API and the built browser app.
const path = require('path');
const express = require('express');
const compression = require('compression');
const { attach, requireAuth } = require('./middleware/auth');
const { securityHeaders } = require('./middleware/security');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

// The browser app (React) is built from web/ into dist/ with `npm run build`.
const DIST = path.join(__dirname, '..', 'dist');

const app = express();
app.set('trust proxy', 1); // behind Cloud Run's load balancer
app.disable('x-powered-by');

app.use(compression()); // /api/snapshot is tens of MB of JSON: gzip makes it roughly a tenth of that
app.use(securityHeaders);
// A backup restore carries the whole database; every other body is small.
app.use('/api/system/import', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(attach); // reads the session cookie; never blocks by itself

app.use('/auth', authRoutes);
app.use('/api', requireAuth, apiRoutes);

// The built browser app holds no data (that is behind /api), so it is served to everyone;
// the app itself shows the sign-in page until a session exists.
app.use(express.static(DIST));
app.use(['/api', '/auth'], (req, res) => res.status(404).json({ error: 'Not found.' }));
app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));

module.exports = app;
