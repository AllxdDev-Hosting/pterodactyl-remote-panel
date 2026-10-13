'use strict';
const express = require('express');
const path = require('node:path');
const { createSessionManager } = require('./lib/session');
const { createProxy, upstreamRequest, accountUser } = require('./lib/proxy');

function createApp({ env = process.env, fetchImpl = fetch } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const secure = env.VERCEL === '1' || env.NODE_ENV === 'production';
  const sessions = createSessionManager(env.SESSION_SECRET, secure);
  const panel = new URL(env.PTERODACTYL_URL || 'https://panel.allxddev.com');
  if (panel.protocol !== 'https:' || panel.username || panel.password || panel.search || panel.hash || panel.pathname !== '/') {
    throw new Error('PTERODACTYL_URL must be an HTTPS origin');
  }
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const expected = `${secure ? 'https' : req.protocol}://${req.get('host')}`;
      if (req.get('origin') !== expected || req.get('x-csrf-protection') !== '1' ||
          (req.get('sec-fetch-site') && req.get('sec-fetch-site') !== 'same-origin')) {
        return res.status(403).json({ message: 'Same-origin mutation required' });
      }
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ limit: '1mb', type: ['text/*', 'application/yaml', 'application/x-yaml'] }));
  app.post('/api/auth/login', async (req, res) => {
    sessions.clear(res);
    const body = req.body || {};
    if (Object.keys(body).some(key => key !== 'apiKey') || typeof body.apiKey !== 'string' ||
        !body.apiKey.trim() || body.apiKey.length > 1024 || /[\s\x00-\x1f]/.test(body.apiKey)) {
      return res.status(400).json({ message: 'Provide only your personal Client API key. Username/password login is unsupported.' });
    }
    try {
      const response = await upstreamRequest(fetchImpl, panel, '/account', body.apiKey);
      if (!response.ok) return res.status([401, 403].includes(response.status) ? 401 : 502).json({ message: 'Client API authentication failed at the upstream panel' });
      const user = accountUser(await response.json());
      sessions.set(res, body.apiKey);
      res.json({ success: true, user });
    } catch {
      res.status(502).json({ message: 'Unable to validate account with the upstream panel' });
    }
  });
  app.post('/api/auth/logout', (req, res) => { sessions.clear(res); res.status(204).end(); });
  const authenticate = (req, res, next) => {
    try { req.session = sessions.read(req.headers.cookie); next(); }
    catch { sessions.clear(res); res.status(401).json({ message: 'Session missing or expired. Sign in with your Client API key.' }); }
  };
  app.get('/api/auth/session', authenticate, async (req, res) => {
    try {
      const response = await upstreamRequest(fetchImpl, panel, '/account', req.session.apiKey);
      if ([401, 403].includes(response.status)) {
        sessions.clear(res);
        return res.status(401).json({ message: 'Client API key revoked or no longer authorized' });
      }
      if (!response.ok) throw new Error('Upstream unavailable');
      res.json({ user: accountUser(await response.json()) });
    } catch { res.status(502).json({ message: 'Unable to verify session with upstream panel' }); }
  });
  app.use('/api/admin', (req, res) => res.status(501).json({ message: 'Global Application API administration is unsupported. Use the original panel.' }));
  app.use(['/api/upload-proxy', '/api/download-proxy'], (req, res) => res.status(410).json({ message: 'Arbitrary destination proxies are disabled. Use authorized HTTPS Wings signed URLs directly.' }));
  app.use('/api/proxy', authenticate, createProxy({ panel, fetchImpl, sessions }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', (req, res) => res.status(404).json({ message: 'Unknown API route' }));
  app.get('/cafeblend', (req, res) => res.redirect('/'));
  app.get('/installer.sh', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(__dirname, 'instalinvps', 'installer.sh'));
  });
  app.get('/install.sh', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(__dirname, 'instalinvps', 'install.sh'));
  });
  app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));
  app.use((req, res) => res.status(404).send('Not found'));
  app.use((err, req, res, next) => res.status(err.status === 413 ? 413 : 400).json({ message: 'Invalid request body' }));
  return app;
}
let application;
function handler(req, res) {
  try { application ||= createApp(); return application(req, res); }
  catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Server configuration invalid: configure SESSION_SECRET and PTERODACTYL_URL' }));
  }
}
module.exports = handler;
module.exports.createApp = createApp;
if (require.main === module) {
  try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile(); } catch {}
  if (!process.env.SESSION_SECRET) {
    const crypto = require('node:crypto');
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  }
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Real Client API dashboard listening on port ${port}.`));
}
