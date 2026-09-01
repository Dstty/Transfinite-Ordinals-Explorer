// ============================================================================
//  scripts/list-notation.mjs — 记号注册验证与清单检查（Node 脚本）
// ============================================================================
//  用途（深度整理后替代根目录 _list_v2.mjs）：
//    1. 读取 core/notation-manifest.js 的清单；
//    2. 在 Node 中模拟浏览器：global.window = global，并用 vm.runInThisContext
//       逐个执行记号文件（顶层 var 会进入 global，模拟浏览器顶层 <script>
//       跨文件可见的语义，legacy 系列依赖链才能被正确验证）；
//    3. 校验每个文件实际注册的 id 是否与清单 ids 字段一致；
//    4. 汇总输出全部注册记号与加载失败的文件。
//
//  运行：node scripts/list-notation.mjs
// ============================================================================
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 模拟浏览器全局：window.register / window.NOTATION_MANIFEST / window.NEUTILS 等
global.window = global;
global.register = [];

function runFile(relPath) {
  const file = join(root, relPath);
  if (!existsSync(file)) throw new Error(`${relPath}: 文件不存在`);
  const code = readFileSync(file, 'utf8');
  // runInThisContext：在全局作用域执行（非严格模式），顶层 var 声明进入 global，
  // 与浏览器顶层 <script> 的行为一致。
  vm.runInThisContext(code, { filename: relPath });
}

// 1) 加载清单（manifest 文件直接给 window.NOTATION_MANIFEST 赋值）
runFile('core/notation-manifest.js');
const manifest = global.NOTATION_MANIFEST || [];
console.log(`=== manifest: ${manifest.length} 个条目 ===\n`);

// 2) 按清单顺序加载记号文件，收集失败与 id 校验
const failed = [];
const registered = new Map(); // id -> 首次出现的 file
for (const item of manifest) {
  const before = new Set(global.register.map((n) => n.id));
  try {
    runFile(item.file);
  } catch (e) {
    failed.push(`${item.file}: ${e.message}`);
    continue;
  }
  const after = global.register.filter((n) => !before.has(n.id)).map((n) => n.id);
  const declared = item.ids || [];
  const missing = declared.filter((id) => !after.includes(id));
  const extra = after.filter((id) => !declared.includes(id));
  if (missing.length || extra.length) {
    console.warn(`[id 不一致] ${item.file}`);
    if (missing.length) console.warn(`  清单声明但未注册: ${missing.join(', ')}`);
    if (extra.length) console.warn(`  实际注册但清单未声明: ${extra.join(', ')}`);
  }
  for (const id of after) if (!registered.has(id)) registered.set(id, item.file);
}

// 3) 汇总
console.log('\n=== 已注册记号（id\tname\t来源文件）===');
for (const n of global.register) {
  console.log(`${n.id}\t${n.name}\t${registered.get(n.id) || '?'}`);
}

if (failed.length) {
  console.log('\n=== 加载失败的条目 ===');
  for (const f of failed) console.log(`  ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\n全部 ${manifest.length} 个条目加载成功，共注册 ${global.register.length} 个记号。`);
}
