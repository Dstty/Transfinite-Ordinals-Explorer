// ============================================================================
//  core/ne/targetSearch.js — 「跳到某个位置」的两条路
// ============================================================================
//  ① **解析**（ner / ne-rewritten 的做法，主路径）：
//     用记号 display spec 的 `from_display` 把用户输入的显示文本**直接解析回表达式**，
//     再在树上按表达式相等去找 —— 瞬间完成，不需要搜索。
//     ner 的 ExpandDialog 就是这一步（它没有枚举搜索）。
//  ② **搜索**（兜底）：记号没有 `from_display` 时才用；BFS 先浅后深，带三重上限。
//
//  为什么要有 ② 而主路径是 ①：实测 `bm4` 上 `(0)(1,1,1)(2,1)(1,1,1)` 一次解析就成功，
//  而枚举搜索对 BMS 这种标准项空间必然超时。此前照**自助版**的 `searchByExpansion` 做了
//  DFS 搜索、还把 ms 上限绑在 time_limit 上，所以用户一输就报超时 —— 用错了对象。
//
//  ⚠ 搜索的已知边界：搜索是纯表达式的（不受树形影响），但**在树上重放**路径时可能被
//     兄弟节点的上界挡住；UI 那边会逐个核对显示文本，不符就如实报告。
// ============================================================================

/** 比较用的规范形式：去所有空白 + 全角括号/逗号转半角（用户手输常带空格与全角）。 */
function normKey(s) {
  return String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',');
}

/** 目标文本比较时统一去掉首尾空白（用户手输常带空格）。 */
function norm(s) {
  return String(s ?? '').trim();
}

/**
 * 用 display spec 的 `from_display` 把显示文本解析回表达式。
 * @param {{from_display?: Function}} displaySpec 该记号（或当前等价视图）的 display
 * @param {string} text 用户输入
 * @returns {{ok: boolean, expr?: any, reason?: 'no-from-display'|'parse', error?: string}}
 */
export function resolve_from_display(displaySpec, text) {
  const fd = displaySpec && displaySpec.from_display;
  if (typeof fd !== 'function') return { ok: false, reason: 'no-from-display' };
  const src = norm(text);
  if (!src) return { ok: false, reason: 'parse', error: '没有输入内容' };
  try {
    const expr = fd(src);
    if (expr === undefined || expr === null) return { ok: false, reason: 'parse', error: '解析结果为空' };
    return { ok: true, expr };
  } catch (e) {
    return { ok: false, reason: 'parse', error: String(e && e.message) };
  }
}

/**
 * 在**已有的树**里按「表达式相等」找节点（比显示文本可靠：同一表达式在不同视图下文本不同）。
 * 用 `notation.compare === 0` 判定；compare 抛错时退化为 JSON 比较。
 */
export function find_expr_in_tree(rootList, def, expr) {
  let key = null;
  try {
    key = JSON.stringify(expr);
  } catch {
    key = null;
  }
  let found = null;
  let depth = 0;
  const walk = (list, d) => {
    for (const node of list) {
      if (found) return;
      let same = false;
      try {
        same = def.compare(node.expr, expr) === 0;
      } catch {
        same = key !== null && JSON.stringify(node.expr) === key;
      }
      if (same) { found = node; depth = d; return; }
      if (node.subitems && node.subitems.length) walk(node.subitems, d + 1);
    }
  };
  walk(rootList, 0);
  return found ? { found: true, node: found, depth } : null;
}

/**
 * 在**已有的树**里按显示文本找节点（不走展开搜索）。
 * @returns {{found: boolean, node?: object, depth?: number}|null}
 */
export function find_in_tree(rootList, def, target) {
  const want = norm(target);
  let found = null;
  let depth = 0;
  const walk = (list, d) => {
    for (const node of list) {
      if (found) return;
      let text = null;
      try {
        text = norm(def.display.plain(node.expr));
      } catch {
        text = null;
      }
      if (text !== null && normKey(text) === normKey(want)) { found = node; depth = d; return; }
      if (node.subitems && node.subitems.length) walk(node.subitems, d + 1);
    }
  };
  walk(rootList, 0);
  return found ? { found: true, node: found, depth } : null;
}

/**
 * 兜底搜索：从若干起点表达式找显示文本等于 target 的表达式。
 *
 * 策略 **BFS（先浅后深）**而不是 DFS —— DFS 会沿第一条链钻到 maxDepth 才回头，
 * 浅层的解会被整批错过（自助版的 searchByExpansion 就是 DFS）。
 *
 * 三重上限（都可传）：maxMs 毫秒（默认 8000，对齐自助版）/ maxNodes 出队数（默认 20000，
 * BFS 要控内存）/ maxBranch 每节点最多取前多少个基本列项（默认 16）。
 *
 * @param {object} def ne 记号定义（is_limit / FS / compare / display.plain）
 * @param {Array} seeds 起点表达式数组
 * @param {string} target 目标显示文本
 */
export function search_target(def, seeds, target, opts = {}) {
  const maxMs = opts.maxMs ?? 8000;
  const maxNodes = opts.maxNodes ?? 20000;
  const maxDepth = opts.maxDepth ?? 64;
  const maxBranch = opts.maxBranch ?? 16;
  const want = norm(target);

  const display = (e) => {
    try {
      return norm(def.display.plain(e));
    } catch {
      return null;
    }
  };
  const keyOf = (e) => {
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  };

  const t0 = Date.now();
  const seen = new Set();
  let steps = 0;
  let deepest = 0;
  let limit = null; // 'time' | 'nodes'

  /** 队列元素：{ expr, path, seedIndex, depth } */
  const queue = [];
  for (let si = 0; si < seeds.length; si++) {
    const k = keyOf(seeds[si]);
    if (seen.has(k)) continue;
    seen.add(k);
    queue.push({ expr: seeds[si], path: [], seedIndex: si, depth: 0 });
  }

  let head = 0;
  while (head < queue.length) {
    if (Date.now() - t0 > maxMs) { limit = 'time'; break; }
    if (steps > maxNodes) { limit = 'nodes'; break; }
    const cur = queue[head++];
    steps++;

    if (display(cur.expr) === want) {
      return {
        found: true, expr: cur.expr, path: cur.path, seedIndex: cur.seedIndex,
        steps, ms: Date.now() - t0, visited: seen.size, deepest,
      };
    }
    if (cur.depth > deepest) deepest = cur.depth;
    if (cur.depth >= maxDepth) continue;

    let isLimit = false;
    try {
      isLimit = !!def.is_limit(cur.expr);
    } catch {
      continue;
    }
    if (!isLimit) continue;

    for (let i = 0; i < maxBranch; i++) {
      let next;
      try {
        next = def.FS(cur.expr, i);
      } catch {
        break;
      }
      if (next === undefined || next === null) break;
      let cmp;
      try {
        cmp = def.compare(next, cur.expr);
      } catch {
        break;
      }
      if (!(cmp < 0)) break; // 基本列必须严格下降（与引擎判据一致）
      const k = keyOf(next);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ expr: next, path: [...cur.path, i], seedIndex: cur.seedIndex, depth: cur.depth + 1 });
    }
  }

  const scale = `已展开 ${steps} 个表达式（最深 ${deepest} 层，每个节点取前 ${maxBranch} 个基本列项）`;
  const why = limit === 'time'
    ? `搜索超时（>${maxMs} ms）`
    : limit === 'nodes'
      ? `搜索节点数达到上限（${maxNodes}）`
      : '搜索空间已穷尽';
  return {
    found: false,
    steps,
    ms: Date.now() - t0,
    visited: seen.size,
    deepest,
    limit,
    reason:
      `${why}，仍未找到显示为「${want}」的表达式。${scale}。\n` +
      '该记号的标准项空间可能太大 —— 若这个记号支持 from_display（能解析显示文本），' +
      '直接输入目标文本即可瞬间定位，不需要搜索。',
  };
}
