// ============================================================================
//  scripts/verify-ne-integration.mjs — ne 原生记号集成自检
// ============================================================================
//  用途：把**清单里声明的** ne 记号全部加载，检查
//    1. 每个文件能否装载（含跨文件 import 是否齐全）
//    2. 注册到的 id 汇总（含 generator 家族水合出的档位）
//    3. 冒烟展开：每个记号展开根的首个节点（tier=1）不抛错
//    4. 展开变体 / 等价显示视图的覆盖情况
//
//  装载口径与浏览器**同源**：读 core/notation-manifest.js（core/loader.js 读的
//  也是它），而不是扫目录。两者曾经差 1 个：translator-bm-bocf 被清单注释掉、
//  文件仍在 notation/ne/ 里，扫目录会把它算进来 —— 于是脚本量到 230、浏览器
//  实际 229，「脚本跑的和线上跑的不是同一个集合」。现在不会再漂。
//
//  退出码：装载失败 / 清单声明但文件缺失 / **已知回落之外**的冒烟失败 → 1。
//  已知回落集合来自 core/ne/knownBroken.js（uiBridge 的回落判定也用它）。
//
//  这是单个记号搬运验证（.tmp-ne/verify-port.mjs）之外的**集成层**检查，
//  能发现跨文件问题（如依赖模块没搬、id 冲突）。
//
//  运行：node scripts/verify-ne-integration.mjs
// ============================================================================
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (rel) => pathToFileURL(join(root, rel)).href;

const myReg = await import(url('core/ne/registry.js'));
const myTree = await import(url('core/ne/tree.js'));
const myExp = await import(url('core/ne/expander.js'));
const fsVariants = await import(url('core/ne/fsVariants.js'));
const { NE_ENGINE_BROKEN_IDS } = await import(url('core/ne/knownBroken.js'));

// ---------------------------------------------------------------------------
//  装载清单：与浏览器同一份来源、同一份顺序
// ---------------------------------------------------------------------------
// notation-manifest.js 是普通脚本（写 window.NOTATION_MANIFEST），这里给个
// 假的 window 接住它，不启动任何 DOM 相关逻辑。
globalThis.window = {};
await import(url('core/notation-manifest.js'));

const manifest = globalThis.window.NOTATION_MANIFEST || [];
if (!manifest.length) {
  console.error('清单为空：core/notation-manifest.js 没有导出 window.NOTATION_MANIFEST');
  process.exit(1);
}

const neEntries = manifest.filter((e) => typeof e.file === 'string' && e.file.startsWith('notation/ne/'));
const neFiles = neEntries.map((e) => e.file);

// 目录里有、清单没声明的文件：浏览器不会加载，这里也不加载 —— 但如实提示一句，
// 免得「脚本量和线上量不一样」又被当成新记号或新回归排查。
const declared = new Set(neFiles);
const neDir = join(root, 'notation/ne');
const onDisk = readdirSync(neDir)
  .filter((f) => f.endsWith('.js') && !f.startsWith('_')) // 下划线开头是临时探针，不是记号
  .map((f) => 'notation/ne/' + f)
  .sort();
const undeclared = onDisk.filter((f) => !declared.has(f));
const missing = neFiles.filter((f) => !onDisk.includes(f));

console.log(`装载口径：清单 ne 条目 ${neFiles.length} 个（含分类骨架 categories.js）`);
if (undeclared.length) console.log(`  目录中有但清单未声明（不加载）: ${undeclared.join(', ')}`);
if (missing.length) console.error(`  ✗ 清单声明的文件不存在: ${missing.join(', ')}`);

const loadErrors = [];
for (const rel of neFiles) {
  const short = rel.replace('notation/ne/', '');
  try {
    await import(url(rel));
    console.log(`load  ok   ${short}`);
  } catch (e) {
    loadErrors.push(`${rel}: ${e.message}`);
    console.log(`load  ERR  ${short}  ${e.message}`);
  }
}

const notations = myReg.list_notations();
console.log(`\n注册记号共 ${notations.length} 个（ne 注册表）`);

// ---------------------------------------------------------------------------
//  冒烟展开：区分「已知回落」与「意外失败」
// ---------------------------------------------------------------------------
const KNOWN_BROKEN = new Set(NE_ENGINE_BROKEN_IDS);
console.log('\n冒烟展开（展开根的首个节点，tier=1）:');
let smokeOk = 0;
const smokeErrors = [];
for (const n of notations) {
  try {
    const r = myTree.init_dataset(n);
    if (r.children.length === 0) continue;
    myExp.expand_item(r.children[0], n, fsVariants.default_FS_variant(n), 1);
    smokeOk++;
  } catch (e) {
    const known = KNOWN_BROKEN.has(n.id);
    smokeErrors.push({ id: n.id, msg: e.message, known });
    console.log(`  ERR  ${n.id.padEnd(32)} ${e.message}${known ? '  [已知回落]' : '  [意外]'}`);
  }
}
console.log(`  成功 ${smokeOk}/${notations.length}`);

const withVariants = notations.filter((n) => fsVariants.list_FS_variants(n).length > 1);
const withViews = notations.filter((n) => Object.keys(n.display_equiv ?? {}).length > 0);
console.log(`\n带多个展开变体的记号: ${withVariants.length} / ${notations.length}`);
console.log(`带等价显示视图的记号: ${withViews.length} / ${notations.length}`);
for (const n of withViews) {
  console.log(`  ${n.id.padEnd(30)} [${Object.keys(n.display_equiv).join(' | ')}]`);
}

// ---------------------------------------------------------------------------
//  结论
// ---------------------------------------------------------------------------
const knownFails = smokeErrors.filter((e) => e.known);
const unexpected = smokeErrors.filter((e) => !e.known);

console.log(`\n装载失败: ${loadErrors.length ? loadErrors.length + ' 个' : '无'}`);
for (const e of loadErrors) console.log(`  ${e}`);
if (unexpected.length) {
  console.log(`冒烟失败（意外，需处理）: ${unexpected.length} 个`);
  for (const e of unexpected) console.log(`  ✗ ${e.id}: ${e.msg}`);
}
console.log(
  `冒烟失败: ${smokeErrors.length} 个` +
    (smokeErrors.length ? `（已知回落 ${knownFails.length}，意外 ${unexpected.length}）` : ''),
);
if (undeclared.length) {
  console.log(`未加载（清单外）: ${undeclared.length} 个 —— 浏览器同样不加载，不算回归`);
}

const bad = loadErrors.length + missing.length + unexpected.length;
process.exitCode = bad ? 1 : 0;
