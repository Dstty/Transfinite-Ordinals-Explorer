// ============================================================================
//  scripts/verify-uibridge.mjs — 阶段四适配层（core/ne/uiBridge.js）验证
// ============================================================================
//  用同 id 的两个记号做端到端测试：
//    notation/user/PrSS.js   → 远古接口，id `prss`（写进 window.register）
//    notation/ne/PrSS.js     → ne 原生， id `prss`（写进 core/ne registry）
//  验证：
//    1. 默认 → 同 id 取 **ne** 版，且能被旧引擎 expandNode 展开
//    2. ?legacy=1 → 同 id 取远古版（与改造前一致）
//  用法：node scripts/verify-uibridge.mjs [--legacy]
// ============================================================================
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { expand_ne, make_tree } from '../core/ne/uiEngine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 开关已改为「默认 ne、?legacy=1 退回远古」，故这里默认断言 ne 侧
const wantNe = !process.argv.includes('--legacy');

// ---- mock 浏览器环境 ----
globalThis.window = globalThis;
globalThis.location = { search: wantNe ? '' : '?legacy=1' };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.register = [];

// ---- 旧注册表：PrSS 用于「同 id 取舍」测试，CNF 用于「下界借用」测试 ----
// （必须有旧 CNF：ne 版 CNF 的下界要从它 init 里手写的 low 借，
//   而 ne 的 compare 不接受 [] 作下界 —— 这是 A 方案的核心难点）
for (const rel of ['notation/user/PrSS.js', 'notation/user/CNF.js']) {
  vm.runInThisContext(readFileSync(join(root, rel), 'utf8'), { filename: rel });
}

// ---- ne 注册表：装载全部 ne 记号 ----
await import('../notation/ne/categories.js');
for (const f of readdirSync(join(root, 'notation/ne'))
  .filter((f) => f.endsWith('.js') && f !== 'categories.js' && !f.startsWith('_'))
  .sort()) {
  try {
    await import('../notation/ne/' + f);
  } catch {
    /* 个别文件失败不影响本验证 */
  }
}

const { getNotation, getAllNotations, NOTATION_META, buildNameMap, USE_NE, ne_unsafe_ids } =
  await import('../core/ne/uiBridge.js');
const { expandNode } = await import('../core/engine.js');

let pass = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) {
    pass++;
    console.log('  ✓ ' + msg);
  } else {
    fail++;
    console.error('  ✗ ' + msg);
  }
};

console.log(`模式: ${wantNe ? '?ne=1（ne 接管同名 id）' : '默认（远古优先）'}   USE_NE=${USE_NE}\n`);

// ---- 1. 同 id 的取舍 ----
const prss = getNotation('prss');
check(!!prss, 'getNotation("prss") 有结果');
check(!!prss._ne === wantNe, `prss 来源${wantNe ? '应为 ne 版' : '应仍为远古版'}（_ne=${prss._ne}）`);

// ---- 2. 全部记号数量：远古 2 个 + 可接管的 ne（同 id 替换而非重复） ----
// ⚠ 本脚本只装 2 个远古记号（PrSS / CNF，够测「同 id 取舍」与「借下界」两件事），
//   所以「不接管」的 ne 记号在这里**没有远古版可回落**，会被整条跳过。
//   浏览器里全部远古记号都在，未接管的那些会回落到远古版，总数仍是 ne 注册数
//   （见 .tmp-ne/verify-notation-list.mjs 的「getAllNotations() = 197」）。
const reg = await import('../core/ne/registry.js');
const neIds = reg.list_notations().map((d) => d.id);
const unsafeSet = new Set(ne_unsafe_ids());
const adapted = neIds.filter((id) => !unsafeSet.has(id));
const legacyHere = ['prss', 'cnf'];
const expectedIds = new Set([...legacyHere, ...adapted]);
const all = getAllNotations();
const ids = all.map((n) => n.id);
const got = new Set(ids);
check(got.size === ids.length, 'getAllNotations 无重复 id');
check(
  expectedIds.size === got.size && [...expectedIds].every((id) => got.has(id)),
  `远古 ∪ 可接管 ne 全部在内（期望 ${expectedIds.size} 个，实得 ${all.length} 个）`,
);
check(
  all.length === legacyHere.length + (adapted.length - legacyHere.filter((i) => adapted.includes(i)).length),
  `getAllNotations 返回 ${all.length} 个记号（= 2 远古 + ${adapted.length} 可接管 ne − 其中 ${legacyHere.filter((i) => adapted.includes(i)).length} 个与远古同 id）`,
);
check(ids.filter((i) => i === 'prss').length === 1, '同 id 只出现一次');

// ---- 3. NOTATION_META 惰性视图 ----
const meta = NOTATION_META['prss'];
check(!!meta, 'NOTATION_META["prss"] 可读');
// prss 本身没有 display_equiv，views 为空是正常的；另取一个有视图的 ne 记号验证。
// 注意默认模式下同名 id 走远古侧，所以这一项只在 ?ne=1 下断言。
if (wantNe) {
  const v = NOTATION_META['t-omega-mn'] && NOTATION_META['t-omega-mn'].views;
  check(
    Array.isArray(v) && v.length >= 3,
    `ne 版 meta.views 已生成（t-omega-mn: ${v ? v.join(' / ') : '无'}）`,
  );
} else {
  check(meta._ne !== true, '默认模式下 meta 来自远古侧');
}
check('prss' in NOTATION_META, '"prss" in NOTATION_META');

// ---- 4. 名字映射 ----
const nm = buildNameMap();
check(nm.get('prss') === 'prss', 'buildNameMap 能解析 prss');

// ---- 5. 端到端：用**旧引擎** expandNode 展开一个 ne 记号 ----
// 取一个 ne 侧独有语义的记号：硬切后的 CNF（id `cnf`）
const cnf = getNotation('cnf');
if (!cnf) {
  console.log('\n（跳过端到端：未找到 cnf）');
} else {
  const roots = cnf.init();
  check(Array.isArray(roots) && roots.length > 0, 'cnf.init() 返回旧式节点数组');
  const first = roots[0];
  check(
    first && 'expr' in first && 'low' in first && 'subitems' in first,
    'init 节点形状为 {expr, low, subitems}',
  );
  const beforeLen = roots.length;
  const beforeSub = JSON.stringify(first.subitems);
  const res = expandNode(cnf, roots, first, 1, 0);
  check(res && typeof res.changed === 'boolean', 'expandNode 返回 {changed}');
  check(res.changed === true, `cnf 展开成功（changed=${res.changed}）`);
  // first 是根列表的最后一个节点 → 引擎按「兄弟」插进根列表，而不是写进它自己的 subitems
  check(
    roots.length > beforeLen || JSON.stringify(first.subitems) !== beforeSub,
    `展开确实写入了树（根列表 ${beforeLen} → ${roots.length}）`,
  );
  const txt = cnf.display(first.expr);
  check(typeof txt === 'string' && txt.length > 0, `display 可用："${String(txt).slice(0, 40)}"`);
}

// ---- 6. 全量冒烟：每个 ne 记号都走一遍建树 + 展开一次 ----
// 这是进浏览器前最有价值的一道检查：只测 CNF 一个说明不了其余两百个记号。
//
// ⚠ 2026-10 起 UI 的 ne 记号改走 **ne 引擎**（core/ne/uiEngine.js），所以这里也必须
//   用同一条路径 —— 继续用旧引擎 expandNode 会造成两个误导：
//     ① 测的不是用户实际走的路；
//     ② 有些记号（如 cocf）只在旧引擎下会挂，会让整个脚本卡死。
//   `_ne === true` 现在恰好等价于「UI 会用 ne 引擎跑它」（ne 引擎自己就崩的
//   记号在 core/ne/uiBridge.js 的 NE_ENGINE_BROKEN 里，已经回落到远古实现、
//   `_ne` 为假），因此这里不需要再手工维护跳过名单。
console.log('\n--- 全量冒烟（每个 ne 记号：ne 引擎建树 + 展开一次 + display）---');
{
  const neNotations = getAllNotations().filter((n) => n._ne);
  let ok = 0;
  const bad = [];
  const verbose = process.argv.includes('--verbose');
  // ⚠ 不要指望 PowerShell 管道能看到中间输出（它会缓冲到进程结束）——
  //   某个记号卡死时那样什么都看不到。verbose 模式自己落盘。
  const logPath = join(root, '.tmp-ne/uibridge-smoke.log');
  if (verbose) writeFileSync(logPath, '');
  for (const n of neNotations) {
    if (verbose) appendFileSync(logPath, `→ ${n.id}\n`);
    else process.stdout.write(`    [${ok + bad.length + 1}/${neNotations.length}] ${n.id}\r`);
    try {
      const rootList = make_tree(n, null);
      if (!rootList.length) {
        ok++;
        continue;
      }
      expand_ne(n, rootList, rootList[0], 0, 0);
      // 展示也要能跑（UI 每次渲染都会调）
      n.display(rootList[0].expr);
      ok++;
    } catch (e) {
      bad.push(`${n.id}: ${String(e.message).slice(0, 70)}`);
    }
  }
  process.stdout.write('\n');
  if (verbose) appendFileSync(logPath, `DONE ok=${ok} bad=${bad.length}\n`);
  check(bad.length === 0, `${ok}/${neNotations.length} 个 ne 记号 建树+展开+display 全部无异常`);
  for (const m of bad.slice(0, 12)) console.log('      ✗ ' + m);
  if (bad.length > 12) console.log(`      … 另有 ${bad.length - 12} 个`);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);

// ---- 诊断：哪些 ne 记号连 ne 引擎都跑不了（只能回落远古实现）----
const unsafeIds = ne_unsafe_ids();
console.log(
  `\nne 引擎自己就崩、已回落远古实现的记号: ${unsafeIds.length} 个` +
    (unsafeIds.length ? `\n  ${unsafeIds.join(', ')}` : ''),
);
process.exitCode = fail ? 1 : 0;
