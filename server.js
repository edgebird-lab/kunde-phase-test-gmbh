import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST = path.join(import.meta.dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith('/') || !path.extname(p)) p = path.join(p, 'index.html');
  try {
    const data = fs.readFileSync(p);
    const ext = path.extname(p);
    const cacheHeaders = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (p.includes('/_astro/')) cacheHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
    else if (/.woff2?$/.test(ext)) cacheHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
    else if (/.(webp|jpg|jpeg|png|gif|svg|ico)$/.test(ext)) cacheHeaders['Cache-Control'] = 'public, max-age=86400';
    res.writeHead(200, cacheHeaders);
    res.end(data);
  } catch {
    try {
      const data = fs.readFileSync(path.join(DIST, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('404');
    }
  }
}).listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
