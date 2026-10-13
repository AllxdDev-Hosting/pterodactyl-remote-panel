'use strict';
const express = require('express');
function accountUser(data) {
  const a = data && data.attributes;
  if (!a || !Number.isInteger(a.id) || typeof a.username !== 'string' || !a.username || typeof a.email !== 'string') throw new Error('Invalid upstream account');
  return { id: a.id, username: a.username, email: a.email, role: 'user' };
}
function upstreamRequest(fetchImpl, panel, route, apiKey, options = {}) {
  return fetchImpl(`${panel.origin}/api/client${route}`, {
    ...options, headers: { Accept: 'application/json', ...options.headers, Authorization: `Bearer ${apiKey}` },
    redirect: 'error', signal: AbortSignal.timeout(15000)
  });
}
function proxyRoute(raw, method) {
  const [pathname, search = ''] = raw.split('?');
  if (!/^\/[A-Za-z0-9_\/-]*$/.test(pathname) || pathname.includes('//')) throw new Error('Invalid proxy path');
  const params = new URLSearchParams(search);
  if ([...params.keys()].some(k => !['page', 'per_page', 'filter[*]', 'include', 'directory', 'file'].includes(k))) throw new Error('Unsupported query parameter');
  const route = pathname === '/servers' || pathname === '/' ? '' : pathname;
  const server = '/servers/[A-Za-z0-9-]+';
  const id = '[A-Za-z0-9-]+';
  const allowed = {
    GET: ['^$', '^/account$', `^${server}$`, `^${server}/(resources|websocket|databases|backups|schedules|users|startup|network/allocations)$`, `^${server}/files/(list|contents|download|upload)$`, `^${server}/backups/${id}/download$`],
    POST: [`^${server}/(power|command|databases|backups|schedules|users)$`, `^${server}/files/(write|create-folder|rename|delete|compress|decompress|copy|chmod)$`, `^${server}/databases/${id}/rotate-password$`, `^${server}/backups/${id}/(restore|lock)$`, `^${server}/schedules/${id}/(execute|tasks)$`, `^${server}/settings/(rename|reinstall)$`],
    PUT: [`^${server}/startup/variable$`, `^${server}/settings/docker-image$`, `^${server}/files/rename$`],
    DELETE: [`^${server}/(databases|backups|schedules|users)/${id}$`]
  };
  if (!(allowed[method] || []).some(p => new RegExp(p).test(route))) throw new Error('Unsupported Client API route or method');
  return route + (search ? `?${params.toString()}` : '');
}
function createProxy({ panel, fetchImpl, sessions }) {
  const router = express.Router();
  router.use(async (req, res) => {
    let route;
    try {
      if (['x-panel-url', 'x-api-key', 'authorization'].some(h => req.get(h))) throw new Error('Browser upstream overrides are forbidden');
      route = proxyRoute(req.url, req.method);
    } catch (err) { return res.status(400).json({ message: err.message }); }
    try {
      const headers = {};
      let body;
      if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers['Content-Type'] = typeof req.body === 'string' ? 'text/plain' : 'application/json';
      }
      const response = await upstreamRequest(fetchImpl, panel, route, req.session.apiKey, { method: req.method, headers, body });
      if (response.status === 401) sessions.clear(res);
      if (response.status === 204) return res.status(204).end();
      const text = await response.text();
      if (response.headers.get('content-type')?.includes('application/json')) return res.status(response.status).json(JSON.parse(text));
      res.status(response.status).type('text/plain').send(text);
    } catch { res.status(502).json({ message: 'Upstream panel request failed; no fallback data is available' }); }
  });
  return router;
}
module.exports = { createProxy, proxyRoute, upstreamRequest, accountUser };
