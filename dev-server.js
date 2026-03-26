const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '5173', 10);
const root = process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function safeJoin(base, target) {
  const targetPath = path.join(base, target);
  if (!targetPath.startsWith(base)) return base;
  return targetPath;
}

function requestHandler(req, res) {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  let filePath = safeJoin(root, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(root, 'index.html');
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=3600');
      res.end(data);
    });
  });
}

function tryReadFile(p) {
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

const useHttps = process.env.HTTPS === '1' || process.env.HTTPS === 'true';
const certPath = process.env.HTTPS_CERT || path.join(root, 'certs', 'fullchain.pem');
const keyPath = process.env.HTTPS_KEY || path.join(root, 'certs', 'privkey.pem');

let server;
if (useHttps) {
  const cert = tryReadFile(certPath);
  const key = tryReadFile(keyPath);
  if (!cert || !key) {
    console.warn('[dev-server] HTTPS enabled but cert/key not found.');
    console.warn('[dev-server] Set HTTPS_CERT and HTTPS_KEY or place:');
    console.warn(`- ${certPath}`);
    console.warn(`- ${keyPath}`);
    console.warn('[dev-server] Falling back to HTTP.');
    server = http.createServer(requestHandler);
  } else {
    server = https.createServer({ cert, key }, requestHandler);
  }
} else {
  server = http.createServer(requestHandler);
}

server.listen(PORT, HOST, () => {
  const scheme = useHttps && server instanceof https.Server ? 'https' : 'http';
  const urlStr = `${scheme}://localhost:${PORT}/`;
  console.log(`Server running at ${urlStr}`);
});
