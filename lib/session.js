'use strict';
const crypto = require('node:crypto');
const TTL = 8 * 60 * 60;
function createSessionManager(secret, secure) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SESSION_SECRET must contain at least 32 UTF-8 bytes');
  const key = crypto.createHash('sha256').update(secret).digest();
  const name = secure ? '__Host-pt_session' : 'pt_session';
  const aad = Buffer.from(`pterodactyl-client-session:v1:${name}`);
  function seal(apiKey, now = Date.now()) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const data = Buffer.from(JSON.stringify({ apiKey, iat: now, exp: now + TTL * 1000 }));
    return Buffer.concat([iv, ...(() => {
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      return [cipher.getAuthTag(), encrypted];
    })()]).toString('base64url');
  }
  function open(value, now = Date.now()) {
    if (!value || value.length > 3500 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid session');
    const packed = Buffer.from(value, 'base64url');
    if (packed.length < 29) throw new Error('Invalid session');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
    decipher.setAAD(aad);
    decipher.setAuthTag(packed.subarray(12, 28));
    const session = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString());
    if (typeof session.apiKey !== 'string' || !session.apiKey || !Number.isFinite(session.iat) || !Number.isFinite(session.exp) ||
        session.iat > now || session.exp <= now || session.exp - session.iat !== TTL * 1000) throw new Error('Expired session');
    return session;
  }
  const options = { httpOnly: true, secure, sameSite: 'strict', path: '/' };
  return {
    seal, open, name,
    read(cookie = '') {
      const values = cookie.split(';').map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
      if (values.length !== 1) throw new Error('Missing session');
      return open(values[0].slice(name.length + 1));
    },
    set(res, apiKey) { res.cookie(name, seal(apiKey), { ...options, maxAge: TTL * 1000 }); },
    clear(res) { res.clearCookie(name, options); }
  };
}
module.exports = { createSessionManager, TTL };