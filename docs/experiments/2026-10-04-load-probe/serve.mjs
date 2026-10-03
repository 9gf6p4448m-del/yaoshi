// 仿 GitHub Pages 的本機靜態伺服器：gzip（html/js/json/css/svg/glb）、Cache-Control: max-age=600、ETag。node serve.mjs <root> <port>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
const root = path.resolve(process.argv[2]), port = Number(process.argv[3] || 9880);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const GZ = new Set(['.html', '.js', '.json', '.css', '.svg', '.glb', '.webmanifest']);
const cache = new Map();
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let f = path.join(root, decodeURIComponent(u.pathname)); if (f.endsWith(path.sep) || !path.extname(f)) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  const ext = path.extname(f); let body = fs.readFileSync(f); const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: 'W/"' + crypto.createHash('md5').update(body).digest('hex').slice(0, 12) + '"' };
  if (GZ.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { const k = f + body.length; if (!cache.has(k)) cache.set(k, zlib.gzipSync(body, { level: 6 })); body = cache.get(k); h['Content-Encoding'] = 'gzip'; }
  h['Content-Length'] = body.length; res.writeHead(200, h); res.end(body);
}).listen(port, '127.0.0.1', () => console.log('serving', root, port));
