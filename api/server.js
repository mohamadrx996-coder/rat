import http from 'node:http';
import handler from './index.js';

const PORT = process.env.PORT || 3001;

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'OPTIONS') return resolve({});
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const server = http.createServer(async (req, res) => {
  req.body = await parseJsonBody(req);

  const wrapper = Object.create(res);
  wrapper.statusCode = 200;
  wrapper.status = function (code) {
    this.statusCode = code;
    return this;
  };
  wrapper.setHeader = (name, value) => {
    res.setHeader(name, value);
    return wrapper;
  };
  wrapper.json = function (body) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(this.statusCode);
    res.end(JSON.stringify(body));
    return this;
  };

  handler(req, wrapper);
});

server.listen(PORT, () => {
  console.log(`OPS//TERMINAL API running on http://localhost:${PORT}`);
});
