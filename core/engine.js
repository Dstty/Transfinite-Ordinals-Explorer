/* ============================================================================
 * ⚠️ 远古引擎（移植自远古版 framework.js，去 Vue 化）
 *
 * 严禁任何修改！本文件是展开核心，行为与远古版（reference/framework.original.js）
 * 完全一致。远古引擎没有任何问题——只要出现展开行为异常，问题一定出在
 * 记号层的 able / semiable（以及 FS / compare）上，不要怀疑引擎本身。
 *
 * 如有必要修改引擎，请先得到用户明确确认后再动手。
 * ========================================================================== */

// ============================================================================
//  core/engine.js — 展开核心（移植自远古版 framework.js，去 Vue 化）
// ============================================================================
//  纯逻辑模块：不依赖 React / DOM，可独立测试。
//  数据模型：节点 = { expr, low, subitems }；树 = 节点列表。
//
//  原始参考：reference/framework.original.js（Hyp cos 的 notation-explorer）
// ============================================================================

// ----------------------------------------------------------------------------
//  工具：深比较 / 深拷贝
//  远古版用 JSON.stringify/parse 做相等判断与拷贝，表达式含 Infinity 时会
//  退化成 "null"，这里用更稳的实现（行为等价，且不破坏 Infinity）。
// ----------------------------------------------------------------------------

export function deepEqual(a, b) {
  if (a === b) return true;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

export function deepClone(v) {
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (Number.isNaN(v)) return v;
  if (Array.isArray(v)) return v.map(deepClone);
  const out = {};
  for (const k of Object.keys(v)) out[k] = deepClone(v[k]);
  return out;
}

// ----------------------------------------------------------------------------
//  核心：FSbounded
// ----------------------------------------------------------------------------

/**
 * 找 FS(expr, n) 中第一个 compare(结果, low[0]) > 0 的项。
 * 保证展开严格大于当前下界（严格递增）。
 *
 * 特殊情形：FS 序列不随 n 增长（后继序数没有真基本列，如 CNF 的 α+1、
 * 纯数字、(ω+1)² 等）时返回 null —— 表示"没有更大的项可展开"，
 * 调用方应视为不可再展开（而不是循环 5000 次后报错）。
 *
 * @param {(e, n)=>*} FS 基本列函数
 * @param {(a,b)=>number} compare 比较函数
 * @param {*} expr 表达式
 * @param {Array} low 下界数组（low[0] 是当前下界表达式）
 * @returns {*} 第一个超过下界的 FS 项；无更大项时返回 null
 */
export function FSbounded(FS, compare, expr, low) {
  let n = 0;
  let last = null;
  const MAX_N = 5000; // 防御：正常 FS 前几项就会超过下界，远超此值说明 FS 不收敛
  while (true) {
    const res = FS(expr, n);
    if (compare(res, low[0]) > 0) return res;
    if (last !== null && compare(res, last) === 0) {
      // FS 序列不再增长：没有更大的项
      return null;
    }
    last = res;
    n++;
    if (n > MAX_N) {
      throw new Error(`该表达式的 FS 展开 ${MAX_N} 次仍未超过下界，可能无法展开`);
    }
  }
}

// ----------------------------------------------------------------------------
//  核心：展开
// ----------------------------------------------------------------------------

/**
 * 展开一个节点（远古版 expand 逻辑，去 Vue 化）。
 *
 * 行为（与远古版一致）：
 *  1. 若节点可展开（able 或 semiable 满足），生成 newitem = FSbounded(...)
 *  2. 插入位置：若 item 是父列表最后一个 → 插入父列表（兄弟）；
 *     否则插入 item.subitems（子）
 *  3. item.low[0] 前移为 newitem.expr（下界前移，保证下次展开更大）
 *  4. tier > 0 时沿链递归展开（tier 深度控制）；tier > 1 时对子项再展开
 *  5. 所有被展开的 item 记入 extras，最后按 extra 数量在前面补 FS 项
 *
 * @param {object} notation 记号对象（含 able/semiable/compare/FS/FSalter）
 * @param {Array} parentList 包含 item 的父列表（根时为树的根列表）
 * @param {object} item 要展开的节点
 * @param {number} tier 展开深度（1 = 单链展开）
 * @param {number} extra 额外 FS 项数量
 * @param {boolean} useAlt 是否使用 FSalter（Shift 展开）
 * @returns {{changed: boolean}} 是否发生了展开
 */
export function expandNode(notation, parentList, item, tier, extra, useAlt = false) {
  const FS = useAlt && notation.FSalter ? notation.FSalter : notation.FS;
  if (typeof FS !== 'function') return { changed: false };

  const extras = new Set();
  const changedRef = { value: false };

  // init 示例的极限根（expr 含 Infinity，如 [Infinity]）字符串化即 'Infinity'：
  // 各记号的 compare 未必能处理它（如 DEN2 的 toShort 会对 Infinity 调 row.slice 崩溃），
  // 展开时对这类表达式跳过 compare 下界判断（其 FS 内部对 Infinity 有专门处理）。
  const isInfinityExpr = expr => '' + expr === 'Infinity';

  // —— 额外 FS 项：对每个被展开过的 item，在前面补 extra 个 FS 项 ——
  const expandExtra = (it) => {
    let workingLow = it.low;
    for (let i = 0; i < extra; i++) {
      // 下界已 ≥ 表达式自身 → 无可展开项（极限式 FS 项严格 < expr）
      if (!isInfinityExpr(it.expr) && notation.compare(workingLow[0], it.expr) >= 0) break;
      const fsr = FSbounded(FS, notation.compare, it.expr, workingLow);
      if (fsr === null) break; // 已无更大的项
      it.subitems.unshift({
        expr: fsr,
        low: deepClone(workingLow),
        subitems: [],
      });
      workingLow = [it.subitems[0].expr];
    }
    if (it.subitems[0]) it.low[0] = it.subitems[0].expr;
  };

  // —— 递归展开（tier 语义与远古版一致：沿链展开，深度控制分支） ——
  const expandTier = (depth, it, append) => {
    const ableHit = notation.able && notation.able(it.expr);
    const semiableHit = notation.semiable &&
      notation.semiable(it.expr) &&
      !isInfinityExpr(it.expr) &&
      notation.compare(FS(it.expr, 0), it.low[0]) > 0;
    if (!(ableHit || semiableHit)) return;
    // 下界已 ≥ 表达式自身 → 无可展开项（极限式 FS 项严格 < expr），避免 FSbounded 循环 5000 次卡死
    if (!isInfinityExpr(it.expr) && notation.compare(it.low[0], it.expr) >= 0) return;
    if (ableHit) extras.add(it);

    const fsr = FSbounded(FS, notation.compare, it.expr, it.low);
    if (fsr === null) return; // 已无更大的项（后继序数等），视为不可再展开

    const newItem = {
      expr: fsr,
      low: deepClone(it.low),
      subitems: [],
    };

    // 插入位置（与远古版 append.splice(indexOf(item.expr)+1, 0, newitem) 完全一致）：
    //  - item 在 append 中（兄弟插入场景）→ 插到 item 之后
    //  - item 不在 append 中（子插入场景）→ indexOf = -1 → 插到 append 开头
    const idx = append.findIndex(x => deepEqual(x.expr, it.expr));
    if (idx === -1) {
      append.splice(0, 0, newItem);
    } else {
      append.splice(idx + 1, 0, newItem);
    }
    it.low[0] = newItem.expr;
    changedRef.value = true;

    if (depth > 0) {
      // 沿链递归展开（tier 不变）
      const isLastInAppend = append.length > 0 && deepEqual(append[append.length - 1].expr, newItem.expr);
      expandTier(depth, newItem, isLastInAppend ? append : newItem.subitems);
      // 分支：对子项再展开（tier-1）
      if (depth > 1) {
        const lastSub = newItem.subitems.length
          ? newItem.subitems[newItem.subitems.length - 1]
          : newItem;
        expandTier(depth - 1, lastSub, newItem.subitems);
      }
    }
  };

  // item 是否是父列表最后一个（决定插入兄弟还是子）
  const isLast = parentList.length > 0 &&
    deepEqual(parentList[parentList.length - 1].expr, item.expr);
  const append = isLast ? parentList : item.subitems;

  expandTier(tier, item, append);
  extras.forEach(expandExtra);

  return { changed: changedRef.value };
}

/**
 * 判断节点是否还能展开（供 UI 显示 [+]/[-]）。
 * @param {object} notation
 * @param {object} item
 * @param {boolean} useAlt
 * @returns {boolean}
 */
export function canExpandNode(notation, item, useAlt = false) {
  const FS = useAlt && notation.FSalter ? notation.FSalter : notation.FS;
  if (typeof FS !== 'function') return false;
  // init 示例的极限根（expr 含 Infinity，如 [Infinity]）字符串化即 'Infinity'：
  // 各记号的 compare 未必能处理它（如 DEN2 的 toShort 会对 Infinity 调 row.slice 崩溃），
  // 这里直接视为可展开（其 FS 内部对 Infinity 有专门处理）。
  if ('' + item.expr === 'Infinity') return true;
  // 下界已 ≥ 表达式自身 → 无可展开项（极限式 FS 项严格 < expr），隐藏 [+]
  if (notation.compare(item.low[0], item.expr) >= 0) return false;
  // able 分支：记号自己声明可展开（PrSS 的 able=isLimit，仅极限式）
  if (notation.able) {
    try { if (notation.able(item.expr)) return true; } catch { /* ignore */ }
  }
  // semiable 分支：后继式（可半展开），需 FS(0) 超过当前低值（展开过头后 [+] 隐藏）
  if (notation.semiable) {
    try {
      return notation.semiable(item.expr) && notation.compare(FS(item.expr, 0), item.low[0]) > 0;
    } catch { return false; }
  }
  return false;
}
