// Real Chromium smoke test and repeatable cold-load comparison (no external network).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const delay = Number(process.env.TEST_LATENCY_MS || 80);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    const compressed = gzipSync(bytes);
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store' });
      res.end(compressed);
    }, delay);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ ...(process.env.TEST_BROWSER === 'chromium' ? {} : { channel: 'chrome' }), headless: true });
  const results = [];
  for (const path of ['/', '/dist/', '/dist/?legacy=1']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => requests.push(req.url()));
    // Baseline source uses CDN React: supply the identical installed version locally.
    await page.route('https://cdnjs.cloudflare.com/**', async route => {
      const reactDOM = route.request().url().includes('/react-dom/');
      const file = reactDOM ? 'react-dom/umd/react-dom.production.min.js' : 'react/umd/react.production.min.js';
      const body = await readFile(resolve(root, 'node_modules', file));
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.fulfill({ contentType: 'text/javascript', body });
    });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    const start = performance.now();
    await page.goto(base + path, { waitUntil: 'commit' });
    const input = page.getByPlaceholder('输入 记号名 表达式', { exact: false });
    await input.waitFor({ state: 'visible', timeout: 60000 });
    const readyMs = Math.round(performance.now() - start);
    const bootRequests = requests.slice();
    // Verify registry completeness through the visible notation list and two tree commands.
    await input.fill('list');
    await input.press('Enter');
    await page.waitForTimeout(100);
    const listText = await page.locator('#root').innerText();
    for (const command of ['PrSS 0,1,2', 'bm4']) {
      await input.fill(command);
      await input.press('Enter');
      await page.waitForTimeout(100);
      assert.ok((await page.locator('#root').innerText()).length > listText.length, `Missing tree: ${command}`);
    }
    assert.deepEqual(errors, [], `${path} browser exceptions`);
    const legacyCount = await page.evaluate(() => window.register.length);
    results.push({ path, readyMs, requests: bootRequests.length, scripts: bootRequests.filter(url => /\.js(?:$|\?)/.test(url)).length, legacyCount, listText });
    if (path.startsWith('/dist/')) assert.ok(bootRequests.every(url => url.startsWith(base)), 'Production must load only same-origin startup resources');
    await context.close();
  }
  assert.equal(results[0].legacyCount, results[1].legacyCount, 'Legacy registry changed during bundling');
  assert.equal(results[0].listText, results[1].listText, 'Visible notation list changed during bundling');
  console.log(JSON.stringify({ simulatedRequestLatencyMs: delay, results: results.map(({ listText, ...rest }) => rest) }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
