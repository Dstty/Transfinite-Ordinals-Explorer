// ============================================================================
//  scripts/serve-nocache.mjs — 本地静态服务器（强制回源，禁缓存）
// ============================================================================
//  为什么需要它：Python http.server 只发 Last-Modified，浏览器会自行做启发式缓存，
//  改了文件刷新不生效（踩过）。这个服务器对每个响应都发 no-store，改完直接刷新即可。
//
//  用法：node scripts/serve-nocache.mjs [端口]      默认 8000
//        → http://127.0.0.1:8000
//  根目录按脚本自身位置推断（../），所以在任意检出位置都能用。
// ============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
};

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

createServer(async (req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = join(ROOT, normalize(pathname).replace(/^[/\\]+/, ''));
  // 目录穿越防护：解析后必须仍在 ROOT 之内
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    res.writeHead(403, NO_CACHE).end('403');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      ...NO_CACHE,
    });
    res.end(body);
    console.log(`200 ${req.url}`);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...NO_CACHE }).end('404');
    console.log(`404 ${req.url}`);
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT} (no-store)`);
});
