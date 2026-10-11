/**
 * Pterodactyl Remote Control Panel Server
 * Standalone browser-based remote management system for Pterodactyl.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { proxyRouter, handleUploadProxy, handleDownloadProxy } = require('./lib/proxy');
const { setupWingsBridge } = require('./lib/wingsBridge');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Upload Proxy route BEFORE json body parsers so request stream is preserved
app.post('/api/upload-proxy', handleUploadProxy);
app.get('/api/download-proxy', handleDownloadProxy);

// Body Parsers for standard API requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb', type: ['text/*', 'application/yaml', 'application/x-yaml'] }));

// Mount Pterodactyl Client API proxy
app.use('/api/proxy', proxyRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    name: 'Pterodactyl Remote Control Panel',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket Server for realtime Wings Daemon communications
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  setupWingsBridge(ws, req);
});

// Start listening
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Pterodactyl Remote Control Panel is running!`);
  console.log(` Local URL : http://localhost:${PORT}`);
  console.log(` WebSocket : ws://localhost:${PORT}/ws`);
  console.log(` Mode      : Live Client API & Wings Proxy + Demo Mode`);
  console.log(`====================================================`);
});
