// ============================================================================
//  scripts/verify-loader.mjs — core/loader.js 的 mock-DOM 回归测试（Node）
// ============================================================================
//  不依赖真实浏览器：mock document/window，执行 loader.js，断言：
//    1. 注入顺序满足 dependsOn（依赖先于消费者）；
//    2. 分层有效：同层内不存在依赖关系，bootstrap（分类骨架）单独成第 0 层；
//    3. ui/app.js 最后注入且 type=module；
//    4. 单文件加载失败时记录并继续，不中断整页启动；
//    5. <head> 期（body 为 null）回退 document.head。
//  运行：node scripts/verify-loader.mjs
// ============================================================================
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => readFileSync(join(root, p), 'utf8');

// ---------- mock 环境 ----------
const injected = [];      // 注入顺序记录
let failSet = new Set();  // 需要模拟加载失败的文件

const mockDoc = {
  createElement(tag) {
    const el = { tag, src: '', type: '', onload: null, onerror: null,
      _attrs: {}, setAttribute(k, v) { this._attrs[k] = v; } };
    return el;
  },
  appendChild(el) {
    injected.push({ file: el.src, type: el.type, attrs: el._attrs });
    // 普通 script 与 module script 都会在加载完成后触发生载回调
    // （真实浏览器里 module 的 onload 在其依赖图执行完后触发；这里 mock 成同步完成）。
    if (el.src) {
      if (failSet.has(el.src)) {
        if (el.onerror) el.onerror(new Error('mock fail: ' + el.src));
      } else if (el.onload) {
        el.onload();
      }
    }
  },
  querySelector() { return null; },
};

global.window = global;
global.document = mockDoc;
mockDoc.body = mockDoc; // loader 用 document.body.appendChild

// ---------- 跑 loader ----------
vm.runInThisContext(load('core/notation-manifest.js'), { filename: 'core/notation-manifest.js' });
const manifest = global.NOTATION_MANIFEST;

// loader 现在是异步的（层内并行、层间 await）：等它自己报完成
async function runLoader() {
  vm.runInThisContext(load('core/loader.js'), { filename: 'core/loader.js' });
  await global.__dshLoaderDone;
}

await runLoader();

// ---------- 断言 ----------
let pass = 0, fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.error('  ✗ ' + msg); }
};

console.log('--- 1. 依赖顺序（dependsOn 先于消费者注入）---');
const byFile = new Map(manifest.map((it) => [it.file, it]));
// 记号文件（含 module 条目）的注入顺序；app.js 是启动入口，单独断言
const injectedFiles = injected.filter((i) => i.file && i.file !== 'ui/app.js').map((i) => i.file);
const pos = new Map(injectedFiles.map((f, i) => [f, i]));
for (const it of manifest) {
  for (const dep of it.dependsOn || []) {
    check(pos.has(dep) && pos.get(dep) < pos.get(it.file),
      `${it.file} 在依赖 ${dep} 之后注入`);
  }
}

console.log('--- 2. 分层（同层无依赖，层数 < 条目数）---');
const layers = global.__dshLoaderLayers;
check(Array.isArray(layers) && layers.length > 1, `分层结果存在：${layers ? layers.length : 0} 层`);
const flat = layers.flat();
check(flat.length === manifest.length, `每层条目数合计 ${flat.length} = 清单 ${manifest.length}`);
check(new Set(flat).size === flat.length, '没有条目被分到两层');
const layerIndex = new Map();
layers.forEach((layer, i) => layer.forEach((f) => layerIndex.set(f, i)));
let sameLayerDep = 0;
for (const it of manifest) {
  for (const dep of it.dependsOn || []) {
    if (layerIndex.get(dep) === layerIndex.get(it.file)) sameLayerDep++;
  }
}
check(sameLayerDep === 0, `同层内依赖数为 0（实测 ${sameLayerDep}）`);
check(
  layers[0].includes('notation/ne/categories.js') && layers[0].length === 1,
  '第 0 层只有分类骨架 categories.js（bootstrap）',
);
check(
  !layers.some((l, i) => i > 0 && l.includes('notation/ne/categories.js')),
  '分类骨架不在后续层重复出现',
);
// 并行度的直接证据：最大的层有多大
const biggest = Math.max(...layers.map((l) => l.length));
check(biggest > 100, `最大的一层有 ${biggest} 个文件（并行注入，而非串行）`);

console.log('--- 3. app.js 最后注入且为 module ---');
const last = injected[injected.length - 1];
check(last && last.file === 'ui/app.js' && last.type === 'module', 'ui/app.js 最后注入且 type=module');
check(injected.filter((i) => i.file === 'ui/app.js').length === 1, 'ui/app.js 只注入一次');
check(injectedFiles.length === manifest.length, `全部 ${manifest.length} 个记号文件注入`);

console.log('--- 4. 失败续载 ---');
// 重置并模拟 shared.js 加载失败
injected.length = 0;
failSet = new Set(['notation/rewritten/shared.js']);
global.NOTATION_MANIFEST = manifest;
await runLoader();
const afterFail = injected.filter((i) => i.file);
check(afterFail.some((i) => i.file === 'ui/app.js'), 'shared.js 失败后仍注入 app.js（不中断）');
check(afterFail.filter((i) => i.file === 'notation/rewritten/shared.js').length === 1, '失败文件被记录（仅注入一次）');
check(afterFail.filter((i) => i.file && i.file !== 'ui/app.js').length === manifest.length, '其余记号文件继续注入');

console.log('--- 5. head 期兜底（document.body 为 null 时回退 document.head）---');
injected.length = 0;
failSet = new Set();
mockDoc.body = null;      // 模拟 <head> 解析期
mockDoc.head = mockDoc;   // 兜底目标
global.NOTATION_MANIFEST = manifest;
await runLoader();
const inHead = injected.filter((i) => i.file);
check(inHead.length === manifest.length + 1, 'body 为 null 时全部记号 + app.js 仍注入');
check(inHead[inHead.length - 1].file === 'ui/app.js', 'app.js 最后注入');
mockDoc.body = mockDoc; // 还原

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exitCode = fail ? 1 : 0;
