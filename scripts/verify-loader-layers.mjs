// ============================================================================
//  scripts/verify-loader-layers.mjs — 分层并行的**安全性**回归
// ============================================================================
//  loader 改成同层并行后，层内执行顺序不再保证。普通 script（legacy/rewritten/
//  user）在 IIFE 执行时就会读别的文件提供的全局（sequence_display、matrix_display、
//  window.NEUTILS、window.NEBTBM …），漏声明 dependsOn 就会在**加载时**炸。
//
//  这里按 loader 同一套分层逻辑复算层，然后在隔离的 vm context 里：
//    · trial 0 用完全逆序（最坏情况）；
//    · 其余 trial 随机打乱；
//  任何一次抛错都说明「同层存在未声明的依赖」。ne 模块是 ESM，靠 import 图，
//  不参与本测试（浏览器自己保证）。
//
//  运行：node scripts/verify-loader-layers.mjs
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
globalThis.window = {};
await import(pathToFileURL(path.join(root, 'core/notation-manifest.js')).href);
const manifest = globalThis.window.NOTATION_MANIFEST;

const byFile = new Map(manifest.map((i) => [i.file, i]));

function toLayers(list) {
  const done = new Set();
  let pending = list.slice();
  const layers = [];
  while (pending.length) {
    const layer = [];
    const rest = [];
    for (const item of pending) {
      const deps = item.dependsOn || [];
      const ready = deps.every((d) => done.has(d) || !byFile.has(d));
      (ready ? layer : rest).push(item);
    }
    if (!layer.length) {
      layer.push(...rest);
      rest.length = 0;
    }
    layer.forEach((i) => done.add(i.file));
    layers.push(layer);
    pending = rest;
  }
  return layers;
}

const boot = manifest.filter((i) => i.bootstrap);
const rest = manifest.filter((i) => !i.bootstrap);
const layers = (boot.length ? [boot] : []).concat(toLayers(rest));

const scriptLayers = layers
  .map((l) => l.filter((i) => !i.module))
  .filter((l) => l.length);

console.log('分层:', layers.map((l) => l.length).join(' / '), '（含 module）');
console.log('其中普通 script:', scriptLayers.map((l) => l.length).join(' / '));

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const errors = [];
const TRIALS = 12;

for (let t = 0; t < TRIALS; t++) {
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  ctx.register = [];
  ctx.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

  for (const layer of scriptLayers) {
    const order = layer.slice();
    if (t === 0) order.reverse();
    else shuffle(order);
    for (const item of order) {
      try {
        const code = fs.readFileSync(path.join(root, item.file), 'utf8');
        vm.runInContext(code, ctx, { filename: item.file });
      } catch (e) {
        errors.push(`trial ${t}（${t === 0 ? '逆序' : '随机'}）${item.file}: ${e.message}`);
      }
    }
  }

  if (t === 0) console.log('trial 0 逆序执行后注册数:', ctx.register.length);
}

console.log(`\n执行 ${TRIALS} 轮（逆序 1 + 随机 ${TRIALS - 1}），异常 ${errors.length} 个`);
for (const e of errors.slice(0, 20)) console.log('  ✗ ' + e);
process.exitCode = errors.length ? 1 : 0;
