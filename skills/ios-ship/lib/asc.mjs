// App Store Connect API client: just enough for ios-ship's devices, certificates and profiles.
// Auth is a short-lived ES256 JWT signed with the team API key (config.keyPath).
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = 'https://api.appstoreconnect.apple.com/v1';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function token(config) {
  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: config.issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = createPrivateKey(readFileSync(config.keyPath));
  const signature = sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' });
  return `${data}.${signature.toString('base64url')}`;
}

export function client(config) {
  async function request(method, path, body) {
    const res = await fetch(path.startsWith('http') ? path : BASE + path, {
      method,
      headers: { Authorization: `Bearer ${token(config)}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = (json.errors || []).map((e) => e.detail || e.title).join('; ');
      throw new Error(`App Store Connect ${method} ${path}: ${res.status} ${detail}`);
    }
    return json;
  }

  // Follows `links.next` so callers always get the whole collection.
  async function all(path) {
    const out = [];
    let next = path;
    while (next) {
      const page = await request('GET', next);
      out.push(...page.data);
      next = page.links?.next;
    }
    return out;
  }

  return {
    request,
    listDevices: () => all('/devices?limit=200'),
    registerDevice: (udid, name) =>
      request('POST', '/devices', {
        data: { type: 'devices', attributes: { name, udid, platform: 'IOS' } },
      }),
    listCertificates: (type) => all(`/certificates?limit=200${type ? `&filter[certificateType]=${type}` : ''}`),
    createCertificate: (type, csrContent) =>
      request('POST', '/certificates', {
        data: { type: 'certificates', attributes: { certificateType: type, csrContent } },
      }),
    listProfiles: () => all('/profiles?limit=200'),
    deleteProfile: (id) => request('DELETE', `/profiles/${id}`),
  };
}
