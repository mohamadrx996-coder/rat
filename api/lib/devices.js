import crypto from 'node:crypto';

export function createDevice(store, { name, host, port, token }) {
  const id = crypto.randomUUID();
  const device = {
    id,
    name: String(name || '').trim() || 'UNNAMED',
    host: String(host || '').trim(),
    port: Number(port),
    token: token ? String(token) : crypto.randomBytes(24).toString('hex'),
    lastSeen: null,
    lastStatus: 'offline',
    createdAt: Date.now(),
  };
  store.set(id, device);
  return device;
}

export function getDevice(store, id) {
  return store.get(id) || null;
}

export function listDevices(store) {
  return Array.from(store.values());
}

export function updateDevice(store, id, patch) {
  const d = store.get(id);
  if (!d) return null;
  if (patch.name !== undefined) d.name = String(patch.name).trim() || 'UNNAMED';
  if (patch.host !== undefined) d.host = String(patch.host).trim();
  if (patch.port !== undefined) d.port = Number(patch.port);
  if (patch.token !== undefined) d.token = String(patch.token);
  return d;
}

export function touchDevice(store, id, online) {
  const d = store.get(id);
  if (!d) return null;
  d.lastSeen = Date.now();
  d.lastStatus = online ? 'online' : 'offline';
  return d;
}

export function deleteDevice(store, id) {
  store.delete(id);
}
