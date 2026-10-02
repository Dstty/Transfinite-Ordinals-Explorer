// ============================================================================
//  scripts/verify-ne-integration.mjs — ne 原生记号集成自检
// ============================================================================
//  用途：把 notation/ne/ 下所有 ne 原生记号一起加载，检查
//    1. 每个文件能否装载（含跨文件 import 是否齐全）
//    2. 注册到的 id 汇总（含 generator 家族水合出的档位）
//    3. 冒烟展开：每个记号展开根的首个节点（tier=1）不抛错
//    4. 展开变体 / 等价显示视图的覆盖情况
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

const neDir = join(root, 'notation/ne');
// 约定：下划线开头的文件不是记号文件（临时脚本/探针），不进装载清单
const files = readdirSync(neDir)
  .filter((f) => f.endsWith('.js') && f !== 'categories.js' && !f.startsWith('_'))
  .sort();

// 分类骨架先于记号加载（与浏览器 loader 的清单顺序一致）
await import(url('notation/ne/categories.js'));

const loadErrors = [];
for (const f of files) {
  try {
    await import(url('notation/ne/' + f));
    console.log(`load  ok   ${f}`);
  } catch (e) {
    loadErrors.push(`${f}: ${e.message}`);
    console.log(`load  ERR  ${f}  ${e.message}`);
  }
}

const notations = myReg.list_notations();
console.log(`\n注册记号共 ${notations.length} 个（ne 注册表）`);

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
    smokeErrors.push(`${n.id}: ${e.message}`);
    console.log(`  ERR  ${n.id.padEnd(32)} ${e.message}`);
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

console.log(`\n装载失败: ${loadErrors.length ? loadErrors.length + ' 个' : '无'}`);
for (const e of loadErrors) console.log(`  ${e}`);
console.log(`冒烟失败: ${smokeErrors.length ? smokeErrors.length + ' 个' : '无'}`);

process.exitCode = loadErrors.length ? 1 : 0;
