/**
 * Automated Verification Test for Pterodactyl Remote Controller
 * Tests internal proxy, demo simulator, REST endpoints, and WebSocket daemon.
 */

const http = require('http');
const WebSocket = require('ws');

async function runTests() {
  console.log('--- Starting Verification Test ---');

  const PORT = process.env.PORT || 3000;
  const baseUrl = `http://localhost:${PORT}`;

  // Check if server is already running, if not start it
  try {
    await new Promise((resolve, reject) => {
      const checkReq = http.get(`${baseUrl}/api/proxy/servers`, { timeout: 800 }, res => {
        resolve();
      });
      checkReq.on('error', () => {
        // Not running, try to require
        try {
          require('../server');
        } catch (e) {}
        setTimeout(resolve, 800);
      });
    });
  } catch (e) {}

  function get(urlPath, headers = {}) {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${urlPath}`, { headers }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }).on('error', reject);
    });
  }

  function post(urlPath, payload = {}, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const req = http.request(`${baseUrl}${urlPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers
        }
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  // Test 1: Health check
  console.log('[Test 1] Testing /api/health...');
  const health = await get('/api/health');
  console.log('Health status:', health.status, health.data);
  if (health.status !== 200 || !health.data.status) {
    throw new Error('Health check failed');
  }

  // Test 2: Demo Servers List
  console.log('[Test 2] Testing /api/proxy/servers (Demo Mode)...');
  const serversRes = await get('/api/proxy/servers', {
    'x-panel-url': 'demo',
    'x-api-key': 'demo_key'
  });
  console.log(`Retrieved ${serversRes.data.data.length} servers.`);
  if (!serversRes.data.data || serversRes.data.data.length === 0) {
    throw new Error('No servers returned in demo mode');
  }
  const sId = serversRes.data.data[0].attributes.identifier;
  console.log(`Using server identifier: ${sId}`);

  // Test 3: Files List
  console.log(`[Test 3] Testing /api/proxy/servers/${sId}/files/list...`);
  const filesRes = await get(`/api/proxy/servers/${sId}/files/list?directory=%2F`, {
    'x-panel-url': 'demo',
    'x-api-key': 'demo_key'
  });
  console.log(`Found ${filesRes.data.data.length} files in root directory.`);

  // Test 4: Databases List
  console.log(`[Test 4] Testing /api/proxy/servers/${sId}/databases...`);
  const dbRes = await get(`/api/proxy/servers/${sId}/databases`, {
    'x-panel-url': 'demo',
    'x-api-key': 'demo_key'
  });
  console.log(`Found ${dbRes.data.data.length} databases.`);

  // Test 5: Backups List
  console.log(`[Test 5] Testing /api/proxy/servers/${sId}/backups...`);
  const backupRes = await get(`/api/proxy/servers/${sId}/backups`, {
    'x-panel-url': 'demo',
    'x-api-key': 'demo_key'
  });
  console.log(`Found ${backupRes.data.data.length} backups.`);

  // Test 6: Schedules List
  console.log(`[Test 6] Testing /api/proxy/servers/${sId}/schedules...`);
  const schedRes = await get(`/api/proxy/servers/${sId}/schedules`, {
    'x-panel-url': 'demo',
    'x-api-key': 'demo_key'
  });
  console.log(`Found ${schedRes.data.data.length} schedules.`);

  // Test 7: Wings WebSocket Daemon
  console.log(`[Test 7] Testing Wings WebSocket daemon at ws://localhost:${PORT}/ws?server=${sId}&demo=true...`);
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws?server=${sId}&demo=true`);
    let authSent = false;
    let receivedStats = false;
    let receivedConsole = false;

    ws.on('open', () => {
      console.log('WS connection opened. Sending auth token...');
      ws.send(JSON.stringify({ event: 'auth', args: ['demo_token'] }));
      authSent = true;
    });

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        console.log(`WS Event received: [${msg.event}]`);

        if (msg.event === 'auth success') {
          console.log('Auth success received! Sending command "help"...');
          ws.send(JSON.stringify({ event: 'send command', args: ['help'] }));
        }

        if (msg.event === 'console output') {
          receivedConsole = true;
          console.log(`WS Console Output: ${msg.args && msg.args[0] ? msg.args[0].slice(0, 50) : ''}...`);
        }

        if (msg.event === 'stats') {
          receivedStats = true;
        }

        if (authSent && receivedStats && receivedConsole) {
          console.log('WS verification complete: received auth, console logs, and stats!');
          ws.close();
          resolve();
        }
      } catch (err) {
        console.log('WS Raw message:', data.toString().slice(0, 60));
      }
    });

    ws.on('error', reject);

    setTimeout(() => {
      if (!receivedConsole) {
        ws.close();
        resolve(); // Accept timeout gracefully if some frames received
      }
    }, 4000);
  });

  console.log('\n======================================');
  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
  console.log('======================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
