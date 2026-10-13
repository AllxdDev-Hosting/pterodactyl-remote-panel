'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('../server');
const { createSessionManager, TTL } = require('../lib/session');
const { proxyRoute } = require('../lib/proxy');
const secret = 'offline-test-secret-'.repeat(3);

test('authenticated encryption, expiry, tampering and key rotation', () => {
  assert.throws(() => createSessionManager('short', true));
  const s = createSessionManager(secret, true);
  const token = s.seal('offline-key', 1000);
  assert.equal(s.open(token, 1001).apiKey, 'offline-key');
  assert.notEqual(s.seal('offline-key', 1000), token);
  assert(!Buffer.from(token, 'base64url').includes(Buffer.from('offline-key')));
  const tampered = Buffer.from(token, 'base64url'); tampered[20] ^= 1;
  assert.throws(() => s.open(tampered.toString('base64url'), 1001));
  assert.throws(() => s.open(token, 1000 + TTL * 1000));
  assert.throws(() => s.open(token, 999));
  assert.throws(() => createSessionManager(secret + 'rotated', true).open(token, 1001));
  assert.throws(() => createSessionManager(secret, false).open(token, 1001));
});

test('path restrictions reject traversal, destinations and Application API', () => {
  for (const p of ['/../application', '/%2e%2e/account', '/servers/%252e%252e', '//evil.test', '/https://evil.test', '/account?url=https://evil.test', '/servers?panelUrl=x', '/servers?demo=true', '/application/users', '/servers/a\\b']) {
    assert.throws(() => proxyRoute(p, 'GET'), p);
  }
  assert.equal(proxyRoute('/servers', 'GET'), '');
  assert.equal(proxyRoute('/servers/a/files/contents?file=%2Fhello', 'GET'), '/servers/a/files/contents?file=%2Fhello');
  assert.equal(proxyRoute('/servers/a/startup/variable', 'PUT'), '/servers/a/startup/variable');
  assert.equal(proxyRoute('/servers/a/files/rename', 'PUT'), '/servers/a/files/rename');
  assert.throws(() => proxyRoute('/account', 'DELETE'));
});

test('offline HTTP auth, CSRF, no fallback, roles, proxy and static assets', async t => {
  const calls = [];
  let failure = false;
  let status = 200;
  let malformed = false;
  const upstream = async (url, options) => {
    calls.push({ url, options });
    assert(url.startsWith('https://panel.allxddev.com/api/client'));
    assert.equal(options.redirect, 'error');
    if (failure) throw new Error('offline unavailable');
    if (options.headers.Authorization !== 'Bearer offline-key') return Response.json({ errors: [] }, { status: 401 });
    if (url.endsWith('/account')) return Response.json(malformed ? {} : { attributes: { id: 7, username: 'Test', email: 'test@example.invalid', admin: true } }, { status });
    if (options.method === 'POST') return new Response(null, { status: 204 });
    return Response.json({ data: [] }, { status });
  };
  const app = createApp({ env: { SESSION_SECRET: secret }, fetchImpl: upstream });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Origin: base, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' };
  const login = body => fetch(base + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal((await fetch(base + '/api/proxy/servers')).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await login({ type: 'demo', email: 'admin', password: 'admin123' })).status, 400);
  assert.equal((await login({ apiKey: 'invalid' })).status, 401);
  malformed = true;
  assert.equal((await login({ apiKey: 'offline-key' })).status, 502);
  malformed = false;
  failure = true;
  assert.equal((await login({ apiKey: 'offline-key' })).status, 502);
  failure = false;
  const signed = await login({ apiKey: 'offline-key' });
  assert.equal(signed.status, 200);
  const account = await signed.json();
  assert.equal(account.user.role, 'user');
  assert(!JSON.stringify(account).includes('offline-key'));
  const setCookie = signed.headers.getSetCookie().at(-1);
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
  const cookie = setCookie.split(';')[0];
  const auth = { Cookie: cookie };
  assert.equal((await fetch(base + '/api/auth/session', { headers: auth })).status, 200);
  assert.equal((await fetch(base + '/api/proxy/servers', { headers: auth })).status, 200);
  assert.equal((await fetch(base + '/api/admin/users', { headers: { ...auth, 'x-user-role': 'admin' } })).status, 501);
  assert.equal((await fetch(base + '/api/proxy/servers', { headers: { ...auth, 'x-panel-url': 'https://evil.test' } })).status, 400);
  assert.equal((await fetch(base + '/api/proxy/servers?url=https://evil.test', { headers: auth })).status, 400);
  assert.equal((await fetch(base + '/api/download-proxy?url=https://evil.test', { headers: auth })).status, 410);
  const write = '/api/proxy/servers/abc/files/write?file=%2Fempty';
  assert.equal((await fetch(base + write, { method: 'POST', headers: auth, body: '' })).status, 403);
  assert.equal((await fetch(base + write, { method: 'POST', headers: { ...headers, ...auth, Origin: 'https://evil.test' }, body: '""' })).status, 403);
  assert.equal((await fetch(base + write, { method: 'POST', headers: { ...headers, ...auth, 'Content-Type': 'text/plain' }, body: '' })).status, 204);
  assert.equal(calls.at(-1).options.body, '');
  failure = true;
  const failed = await fetch(base + '/api/proxy/servers', { headers: auth });
  assert.equal(failed.status, 502); assert(!('data' in await failed.json()));
  failure = false; status = 403;
  assert.equal((await fetch(base + '/api/proxy/servers', { headers: auth })).status, 403);
  status = 401;
  assert.match((await fetch(base + '/api/proxy/servers', { headers: auth })).headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  status = 200;
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /Username\/password login is unsupported/);
  assert(!html.includes('form-login-demo'));
  for (const match of html.matchAll(/(?:src|href)="((?:js|css|vendor)\/[^\"]+)"/g)) assert.equal((await fetch(`${base}/${match[1]}`)).status, 200, match[1]);
  assert.equal((await fetch(base + '/ws')).status, 404);
  assert.equal((await fetch(base + '/api/unknown')).status, 404);
  const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { ...headers, ...auth } });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
});

test('serverless export, config validation and frontend syntax', () => {
  assert.equal(typeof require('../api/index'), 'function');
  assert.throws(() => createApp({ env: {} }));
  assert.throws(() => createApp({ env: { SESSION_SECRET: secret, PTERODACTYL_URL: 'http://bad.test' } }));
  for (const file of fs.readdirSync(path.join(__dirname, '../public/js'))) {
    new vm.Script(fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8'), { filename: file });
  }
  for (const file of ['lib/mockDaemon.js', 'lib/wingsBridge.js', 'public/js/admin.js', 'public/cafeblend.html']) assert(!fs.existsSync(path.join(__dirname, '..', file)), file);
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json')));
  assert.equal(config.routes[0].dest, '/api/index.js');
});