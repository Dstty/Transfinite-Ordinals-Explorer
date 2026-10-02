// ============================================================================
//  scripts/verify-expand-timeout.mjs — 展开不许卡死（模板 + 毫秒上限）
// ============================================================================
//  两件事：
//    ① 编辑器里的**新建模板必须能跑**（参考版那份 PrSS 示例，各 tier 都不许卡）；
//    ② 基本列不收敛的记号必须被 time_limit **中止**，而不是冻住页面。
//
//  为什么放在 worker 里：卡死是同步死循环，主线程里跑就真卡死了 —— 只有 worker
//  能超时强杀。所以这个脚本本身就是「卡死探测器」。
//
//  历史：上一版模板把 `FS` 写成 `e - 1`（结果不随 i 变化），第一次展开后节点有了
//  子节点，`generate_fs` 里 `children.length === 0` 的试展开守卫被绕过 → `while`
//  永远拒绝同一个值 → 页面冻死（用户实测踩到）。这里把那个坏样例留作回归对照。
//
//  运行：node scripts/verify-expand-timeout.mjs
// ============================================================================
import { Worker } from 'node:worker_threads';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOTATION_TEMPLATE } from '../ui/NotationEditor.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKER = join(here, '..', '.tmp-ne', '_tpl-worker.mjs');
const KILL_MS = Number(process.env.KILL_MS || 4000); // 真卡死时的强杀时限

/** 旧模板（有缺陷）：FS 的结果不随 i 变化 → 引擎永远试展开。留作对照。 */
const BAD_TEMPLATE = `({
  display: (e) => String(e),
  is_limit: (e) => e > 0,
  compare: (a, b) => (a === b ? 0 : a < b ? -1 : 1),
  FS: (e, i) => (e > 0 ? e - 1 : 0),
  init: () => [3],
})`;

function run(data) {
  return new Promise((resolve) => {
    const w = new Worker(WORKER, { workerData: data });
    let done = false;
    let last = '(启动中)';
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      w.terminate();
      resolve({ hang: true, last });
    }, KILL_MS);
    w.on('message', (m) => {
      if (m && m.progress) { last = m.progress; return; }
      if (done) return;
      done = true;
      clearTimeout(t);
      w.terminate();
      resolve(m);
    });
    w.on('error', (e) => { if (!done) { done = true; clearTimeout(t); resolve({ error: String(e.message) }); } });
  });
}

const failures = [];
const results = [];

// —— ① 模板必须能跑（各 tier）——
for (const tier of [0, 1, 2, 3]) {
  const c = { name: `模板 tier=${tier} 初始展开×2`, data: { source: NOTATION_TEMPLATE, tier, rounds: 2, timeLimitMs: 5000 }, expect: 'ok' };
  const r = await run(c.data);
  if (r.hang) { failures.push(`${c.name}：卡死（卡在 ${r.last}）`); results.push(['卡死', c.name]); }
  else if (r.error) { failures.push(`${c.name}：抛错 ${r.error}`); results.push(['抛错', c.name]); }
  else { results.push(['ok', c.name + '  ' + (r.log || []).slice(-1)[0]]); }
}

// —— ② 坏记号必须被上限中止（不是卡死）——
for (const tier of [0, 1]) {
  const c = { name: `坏样例 tier=${tier}（上限 800ms 应中止）`, data: { source: BAD_TEMPLATE, tier, rounds: 4, timeLimitMs: 800 } };
  const r = await run(c.data);
  if (r.hang) { failures.push(`${c.name}：**没有被上限中止**（卡在 ${r.last}）`); results.push(['卡死', c.name]); }
  else if (r.timedOut) { results.push(['中止', c.name + '  ' + r.error]); }
  else if (r.error) { results.push(['抛错', c.name + '  ' + r.error]); }
  else { failures.push(`${c.name}：竟然正常展开了？坏样例的假设不成立，需要重新核对用例`); results.push(['意外', c.name]); }
}

// —— ③ 对照：同一坏样例在「不限制」下确实会卡死（证明上限不是摆设）——
{
  const c = { name: '坏样例 不限制（对照，预期卡死）', data: { source: BAD_TEMPLATE, tier: 0, rounds: 4, timeLimitMs: 0 } };
  const r = await run(c.data);
  if (r.hang) results.push(['对照卡死', c.name + '（符合预期：上限确实必要）']);
  else if (r.timedOut) failures.push(`${c.name}：限制为 0 时仍被中止，说明期限没有真正关闭`);
  else if (r.error) results.push(['抛错', c.name + '  ' + r.error]);
  else failures.push(`${c.name}：不限制也没卡死？用例有问题`);
}

// —— ④ 旧引擎路径：core/engine.js 不许改，靠 timeGuard 包装记号加期限 ——
{
  // 病态远古记号（直接在 worker 里构造，不经注册表）：able 恒真、FS 单调增且总越过下界
  // → 旧引擎 expandTier 的沿链递归（depth 不递减）永不停止
  const c = { name: '旧引擎 病态记号（timeGuard 兜底，上限 800ms）', data: { legacyEvil: true, timeLimitMs: 800 } };
  const r = await run(c.data);
  if (r.hang) { failures.push(`${c.name}：timeGuard 没兜住，旧引擎卡死了`); results.push(['卡死', c.name]); }
  else if (r.timedOut) results.push(['中止', c.name + '  ' + r.error]);
  else if (r.error) results.push(['抛错', c.name + '  ' + r.error]);
  else { failures.push(`${c.name}：竟然正常跑完了（${(r.log || []).join('')}）—— 用例没构造出失控循环`); results.push(['意外', c.name]); }

  // 对照：不包装（上限 0）→ 应当失控（卡死或爆栈；两者都说明包装是必要的）
  const c2 = { name: '旧引擎 病态记号 不包装（对照）', data: { legacyEvil: true, timeLimitMs: 0 } };
  const r2 = await run(c2.data);
  if (r2.hang) results.push(['对照卡死', c2.name + '：卡死（符合预期）']);
  else if (r2.error && /RangeError|call stack/i.test(r2.error)) results.push(['对照爆栈', c2.name + '：' + r2.error]);
  else if (r2.timedOut) failures.push(`${c2.name}：限制为 0 仍被中止，包装器关不掉`);
  else results.push(['意外', c2.name + '：既没卡死也没爆栈？' + JSON.stringify(r2).slice(0, 120)]);
}

const label = { ok: '✓', 中止: '✓', 对照卡死: '✓', 对照爆栈: '✓', 卡死: '✗', 抛错: '✗', 意外: '✗' };
for (const [kind, text] of results) console.log(`  ${label[kind] || '?'} [${kind}] ${text}`);

console.log(`\n展开超时防护：失败 ${failures.length} 项`);
if (failures.length) {
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 2;
} else {
  console.log('✅ 模板各 tier 均不卡死；坏样例被 time_limit 中止；关掉上限时确实会卡死（对照成立）');
}
