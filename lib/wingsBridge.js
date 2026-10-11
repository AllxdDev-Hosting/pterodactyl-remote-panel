/**
 * Pterodactyl Wings WebSocket Bridge
 * Proxies bidirectional WebSocket traffic between the browser client and the Wings Daemon.
 * Bypasses CORS and SSL certificate mismatch issues.
 */

const WebSocket = require('ws');
const { handleMockWebSocket } = require('./mockDaemon');

function setupWingsBridge(browserWs, req) {
  let wingsWs = null;
  let isDemo = false;
  let isClosed = false;

  // Check URL query parameters for instant setup
  const urlObj = new URL(req.url, 'http://localhost');
  const queryDemo = urlObj.searchParams.get('demo');
  const queryServerId = urlObj.searchParams.get('serverId');
  const querySocket = urlObj.searchParams.get('socket');
  const queryToken = urlObj.searchParams.get('token');
  const queryOrigin = urlObj.searchParams.get('origin');

  if (queryDemo === 'true' || querySocket === 'demo') {
    isDemo = true;
    handleMockWebSocket(browserWs, queryServerId || 'b3c8f10a');
    return;
  }

  function forwardToBrowser(data) {
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(data.toString());
    }
  }

  function connectToWings(socketUrl, token, origin) {
    if (wingsWs) {
      try { wingsWs.close(); } catch (_) {}
    }

    try {
      // Create outbound WebSocket connection to Wings Daemon
      const headers = {
        'User-Agent': 'Pterodactyl-Remote-Panel/1.0'
      };
      if (origin) {
        headers['Origin'] = origin;
      }

      wingsWs = new WebSocket(socketUrl, {
        headers,
        rejectUnauthorized: false, // Allow custom or self-signed Wings certificates
        handshakeTimeout: 10000
      });

      wingsWs.on('open', () => {
        // Authenticate immediately upon connection
        if (token) {
          wingsWs.send(JSON.stringify({
            event: 'auth',
            args: [token]
          }));
        }
        forwardToBrowser(JSON.stringify({
          event: 'bridge:connected',
          args: ['Connected to Wings Daemon via internal bridge']
        }));
      });

      wingsWs.on('message', (data) => {
        forwardToBrowser(data);
      });

      wingsWs.on('error', (err) => {
        console.error('[Wings Bridge Error]:', err.message);
        forwardToBrowser(JSON.stringify({
          event: 'daemon error',
          args: [`Wings Bridge Error: ${err.message}`]
        }));
      });

      wingsWs.on('close', (code, reason) => {
        forwardToBrowser(JSON.stringify({
          event: 'daemon error',
          args: [`Wings connection closed (Code: ${code}, Reason: ${reason || 'Disconnected'})`]
        }));
      });

    } catch (err) {
      console.error('[Wings Bridge Exception]:', err);
      forwardToBrowser(JSON.stringify({
        event: 'daemon error',
        args: [`Failed to initialize Wings bridge: ${err.message}`]
      }));
    }
  }

  // Handle messages from browser client
  browserWs.on('message', (message) => {
    try {
      const msgStr = message.toString();
      
      // Control messages for the bridge itself
      let parsed = null;
      try {
        parsed = JSON.parse(msgStr);
      } catch (_) {}

      if (parsed && parsed.action === 'connect_wings') {
        if (parsed.demo || parsed.socketUrl === 'demo') {
          isDemo = true;
          handleMockWebSocket(browserWs, parsed.serverId || 'b3c8f10a');
          return;
        }
        connectToWings(parsed.socketUrl, parsed.token, parsed.origin);
        return;
      }

      if (parsed && parsed.action === 'refresh_token') {
        if (wingsWs && wingsWs.readyState === WebSocket.OPEN) {
          wingsWs.send(JSON.stringify({
            event: 'auth',
            args: [parsed.token]
          }));
        }
        return;
      }

      // If Wings connection is active, forward raw message
      if (wingsWs && wingsWs.readyState === WebSocket.OPEN) {
        wingsWs.send(msgStr);
      }
    } catch (err) {
      console.error('[Browser Message Handle Error]:', err);
    }
  });

  browserWs.on('close', () => {
    isClosed = true;
    if (wingsWs) {
      try { wingsWs.close(); } catch (_) {}
      wingsWs = null;
    }
  });

  // If query parameters provided socket & token, connect immediately
  if (querySocket && queryToken) {
    connectToWings(querySocket, queryToken, queryOrigin);
  }
}

module.exports = {
  setupWingsBridge
};
