// ============================================================================
//  scripts/verify-loader.mjs — core/loader.js 的 mock-DOM 回归测试（Node）
// ============================================================================
//  不依赖真实浏览器：mock document/window，执行 loader.js，断言：
//    1. 注入顺序满足 dependsOn（依赖先于消费者）；
//    2. ui/app.js 最后注入且 type=module；
//    3. 单文件加载失败时记录并继续，不中断整页启动。
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
    if (el.src && !el.type) {
      // 普通 script：模拟同步加载结果
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
vm.runInThisContext(load('core/loader.js'), { filename: 'core/loader.js' });

// ---------- 断言 ----------
let pass = 0, fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.error('  ✗ ' + msg); }
};

console.log('--- 1. 依赖顺序（dependsOn 先于消费者注入）---');
const byFile = new Map(manifest.map((it) => [it.file, it]));
const injectedFiles = injected.filter((i) => i.file && !i.type).map((i) => i.file);
const pos = new Map(injectedFiles.map((f, i) => [f, i]));
for (const it of manifest) {
  for (const dep of it.dependsOn || []) {
    check(pos.has(dep) && pos.get(dep) < pos.get(it.file),
      `${it.file} 在依赖 ${dep} 之后注入`);
  }
}

console.log('--- 2. app.js 最后注入且为 module ---');
const last = injected[injected.length - 1];
check(last && last.file === 'ui/app.js' && last.type === 'module', 'ui/app.js 最后注入且 type=module');
check(injected.filter((i) => i.file === 'ui/app.js').length === 1, 'ui/app.js 只注入一次');
check(injectedFiles.length === manifest.length, `全部 ${manifest.length} 个记号文件注入`);

console.log('--- 3. 失败续载 ---');
// 重置并模拟 shared.js 加载失败
injected.length = 0;
failSet = new Set(['notation/rewritten/shared.js']);
global.NOTATION_MANIFEST = manifest;
vm.runInThisContext(load('core/loader.js'), { filename: 'core/loader.js' });
const afterFail = injected.filter((i) => i.file);
check(afterFail.some((i) => i.file === 'ui/app.js'), 'shared.js 失败后仍注入 app.js（不中断）');
check(afterFail.filter((i) => i.file === 'notation/rewritten/shared.js').length === 1, '失败文件被记录（仅注入一次）');
check(afterFail.filter((i) => i.file && !i.type).length >= manifest.length - 1, '其余记号文件继续注入');

console.log('--- 4. head 期兜底（document.body 为 null 时回退 document.head）---');
injected.length = 0;
failSet = new Set();
mockDoc.body = null;      // 模拟 <head> 解析期
mockDoc.head = mockDoc;   // 兜底目标
global.NOTATION_MANIFEST = manifest;
vm.runInThisContext(load('core/loader.js'), { filename: 'core/loader.js' });
const inHead = injected.filter((i) => i.file);
check(inHead.length === manifest.length + 1, 'body 为 null 时全部记号 + app.js 仍注入');
check(inHead[inHead.length - 1].file === 'ui/app.js', 'app.js 最后注入');
mockDoc.body = mockDoc; // 还原

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exitCode = fail ? 1 : 0;
