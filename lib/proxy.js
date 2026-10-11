/**
 * Pterodactyl Client API Proxy & Streamer
 * Forwards HTTP requests to Pterodactyl Panel Client API,
 * eliminating browser CORS restrictions and credential leakage.
 */

const express = require('express');
const { handleMockApi } = require('./mockDaemon');

const router = express.Router();

/**
 * Main Proxy Handler for all /api/proxy/* routes
 */
router.use(async (req, res) => {
  try {
    // 1. Extract Panel URL and API Key
    const panelUrlHeader = req.headers['x-panel-url'] || req.query.panelUrl || '';
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization'] || req.query.apiKey || '';
    const isDemo = req.query.demo === 'true' || panelUrlHeader.toLowerCase() === 'demo' || !panelUrlHeader;

    // Route to Demo Simulator if in demo mode or panel not specified
    if (isDemo) {
      return handleMockApi(req, res);
    }

    // Clean panel URL and build target URL
    const cleanPanelUrl = panelUrlHeader.replace(/\/+$/, '');
    // Subpath relative to /api/proxy
    let subPath = req.originalUrl.replace(/^\/api\/proxy/, '').replace(/^\/api\/client/, '');
    const cleanPathOnly = subPath.split('?')[0];

    // If client requested /servers or / or empty, map to Pterodactyl root /api/client
    if (cleanPathOnly === '/servers' || cleanPathOnly === '/' || cleanPathOnly === '') {
      subPath = subPath.replace(/^\/servers/, '');
    }

    const urlObj = new URL(`${cleanPanelUrl}/api/client${subPath}`);
    urlObj.searchParams.delete('panelUrl');
    urlObj.searchParams.delete('apiKey');

    const targetUrl = urlObj.toString();

    // Prepare headers
    const authBearer = apiKeyHeader.startsWith('Bearer ') ? apiKeyHeader : `Bearer ${apiKeyHeader}`;
    const forwardHeaders = {
      'Authorization': authBearer,
      'Accept': req.headers['accept'] || 'application/json, text/plain, */*',
      'User-Agent': 'Pterodactyl-Remote-Panel/1.0'
    };

    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    // Prepare body for POST/PUT/PATCH
    let body = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
      if (req.body !== undefined && Object.keys(req.body).length > 0) {
        if (typeof req.body === 'string') {
          body = req.body;
        } else if (Buffer.isBuffer(req.body)) {
          body = req.body;
        } else {
          body = JSON.stringify(req.body);
          forwardHeaders['Content-Type'] = 'application/json';
        }
      } else if (typeof req.body === 'string' && req.body.length > 0) {
        body = req.body;
      }
    }

    // Execute HTTP request to remote Pterodactyl Panel
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'follow'
    });

    // Check status code
    if (response.status === 204) {
      return res.status(204).send();
    }

    // Forward content-type
    const contentType = response.headers.get('content-type') || '';
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Forward response body
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

  } catch (err) {
    console.error('[Pterodactyl Proxy Error]:', err.message);
    return res.status(502).json({
      error: true,
      message: `Proxy Error connecting to Pterodactyl: ${err.message}`
    });
  }
});

/**
 * Upload Proxy Handler for uploading files to Wings signed URLs
 */
async function handleUploadProxy(req, res) {
  try {
    const targetUrl = req.query.url;
    const isDemo = req.query.demo === 'true' || !targetUrl;

    if (isDemo) {
      return res.status(200).json({ success: true, message: 'File simulated upload success' });
    }

    // Forward file upload stream directly to Wings signed upload URL
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'multipart/form-data',
        'User-Agent': 'Pterodactyl-Remote-Panel/1.0'
      },
      body: req,
      duplex: 'half'
    });

    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (err) {
    console.error('[Upload Proxy Error]:', err.message);
    return res.status(502).json({ error: true, message: err.message });
  }
}

/**
 * Download Proxy Handler for streaming file downloads from Wings signed URLs
 */
async function handleDownloadProxy(req, res) {
  try {
    const targetUrl = req.query.url;
    const filename = req.query.filename || 'download';

    if (!targetUrl) {
      return res.status(400).send('Missing target URL');
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).send('Download failed');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (response.headers.get('content-type')) {
      res.setHeader('Content-Type', response.headers.get('content-type'));
    }

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[Download Proxy Error]:', err.message);
    return res.status(502).send(err.message);
  }
}

module.exports = {
  proxyRouter: router,
  handleUploadProxy,
  handleDownloadProxy
};
