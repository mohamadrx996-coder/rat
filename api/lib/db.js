import crypto from 'node:crypto';

const store = new Map();

export function createSession({ port, host }) {
  const id = crypto.randomUUID();
  const agentToken = crypto.randomBytes(24).toString('hex');
  const session = {
    id,
    port: Number(port),
    host: host ? String(host).trim() : '',
    agentToken,
    devices: new Map(),
    createdAt: Date.now(),
  };
  store.set(id, session);
  return session;
}

export function getSession(id) {
  return store.get(id) || null;
}

export function findByToken(token) {
  for (const s of store.values()) {
    if (s.agentToken === token) return s;
  }
  return null;
}

export function deleteSession(id) {
  store.delete(id);
}

export function updateSession(id, patch) {
  const s = store.get(id);
  if (!s) return null;
  if (patch.host !== undefined) s.host = patch.host;
  if (patch.port !== undefined) s.port = Number(patch.port);
  return s;
}
