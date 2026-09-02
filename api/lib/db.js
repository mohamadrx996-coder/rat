import crypto from 'node:crypto';

const store = new Map();

export function createSession({ host, port }) {
  const id = crypto.randomUUID();
  const agentToken = crypto.randomBytes(24).toString('hex');
  const session = {
    id,
    host: String(host).trim(),
    port: Number(port),
    agentToken,
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
