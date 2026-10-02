// ============================================================================
//  core/ne/legacyAdapter.js — 远古记号定义 → ne 风格定义 的适配层
// ============================================================================
//  作用：让 88 个「远古接口」记号文件（register.push 形态）在不改动源码的前提下，
//  直接跑在新的 core/ne 运行时上。迁移期它保证项目始终可运行；迁移完成后，
//  记号逐步改写成原生 ne 定义，本层退化为兜底。
//
//  字段映射：
//    远古                                   ne
//    ----                                   --
//    id / name                              id / name
//    display(expr) → HTML 字符串            display: { plain, html }（同一函数）
//    able(expr)                             is_limit(expr)      [附加收敛探测]
//    compare(a, b)                          compare(a, b)       [附加 Infinity 语义]
//    FS(expr, n)                            FS(expr, n)         [附加不增长检测]
//    FSalter(expr, n)                       FS_alter(expr, n)
//    init() → [{expr, low, subitems}, ...]  init() → [expr, ...]
//    semiable(expr)                         —（ne 无此概念）
//
//  ⚠ 三处语义差，都在本层补齐（ne 引擎本身保持与上游逐行一致）：
//
//   1. low 边界被丢弃。low 的职责由 core/ne/tree.js 的 get_bound
//      （先根遍历下一个节点）承担 —— 这正是本次迁移要做的替换。
//
//   2. Infinity 语义。远古引擎有 `'' + expr === 'Infinity'` 特判，因为旧记号的
//      compare 遇到 Infinity 会崩（如 cOCF 的 `x.slice is not a function`）。
//      ne 的记号能自己处理 Infinity，旧记号不能。这里把 Infinity 包装成最大元。
//
//   3. FS 不收敛。远古 FSbounded 有「FS 序列不再增长 → 判定不可展开（返回 null）」
//      的检测；ne 的 expander 只在 `node.children.length === 0` 时守卫，
//      递归到已有子节点的节点上时守卫失效，会死循环（cOCF 实测卡死）。
//      这里用 is_limit 收敛探测 + FS 不增长检测把旧记号约束回可终止的语义。
// ============================================================================

import { FsTrialExpansionError } from './errors.js';

/** 已适配过的定义打上标记，避免重复包装。 */
export const LEGACY_ADAPTED = Symbol('legacy-adapted');

/** 远古引擎的 Infinity 特判：`'' + expr === 'Infinity'`（覆盖裸 Infinity / 'Infinity' / [Infinity] / [[Infinity]]）。 */
export function is_infinity_expr(expr) {
  return '' + expr === 'Infinity';
}

/** 值等价（旧引擎用 JSON 字符串比较，这里沿用字符串化，对 Infinity 友好）。 */
function same_value(a, b) {
  if (a === b) return true;
  return '' + a === '' + b;
}

/**
 * 包装 compare：把 Infinity 当作最大元，且**不**调用记号自己的 compare
 * （旧记号的 compare 遇到 Infinity 常会崩）。
 *
 * 旧引擎的做法是「Infinity 时跳过上界判断」；在 ne 引擎里等价的做法是让
 * Infinity 恒为最大，这样 generate_fs 的 `compare(res, bound) > 0` 不被干扰。
 */
function make_legacy_compare(legacy) {
  const raw = legacy.compare;
  if (typeof raw !== 'function') return raw;
  return (a, b) => {
    const ai = is_infinity_expr(a);
    const bi = is_infinity_expr(b);
    if (ai || bi) return (ai ? 1 : 0) - (bi ? 1 : 0);
    return raw(a, b);
  };
}

/**
 * 包装 FS：补上远古 engine 的两条隐含前提。
 *
 * (1) 远古引擎从不把「不可展开」的表达式交给 FS —— expandTier 里
 *     `!(ableHit || semiableHit)` 就直接返回了。而 ne 的 expand_single 对
 *     非 limit 节点也要调 `FS(expr, 0)` 试探（这是 ne 的后继展开设计），
 *     旧记号的 FS 对这种输入可能不返回（cOCF 的 `FS('p(0)', 0)` 实测死循环）。
 *     这里对不可展开的输入直接返回自身 → ne 判定 `compare(res, expr) >= 0`
 *     → 视为不可展开，链终止。
 *
 * (2) 远古 FSbounded 有「FS 序列不再增长 → 没有更大的项（返回 null）」的检测；
 *     ne 引擎没有这条（守卫只在 `node.children.length === 0` 时生效，
 *     递归到已有子节点的节点上会失效）。这里补上不增长检测，
 *     抛出与 ne 守卫同族的 FsTrialExpansionError 让上层能终止。
 */
/**
 * 生成「旧引擎语义的 FS 包装」：不可展开输入短路 + 不增长检测。
 *
 * FS 与 FSalter **共用**这一个包装：远古引擎对两者的调用时机完全相同
 * （expandTier 在 `!(ableHit || semiableHit)` 时直接 return，两者都不会被调到），
 * 只包 FS、让 FSalter 走 raw 是遗漏 —— ne 引擎在非 limit 节点上会**同时**试探
 * FS 与 FS_alter。
 */
function make_legacy_fs(legacy, raw) {
  if (typeof raw !== 'function') return raw;
  const able = typeof legacy.able === 'function' ? legacy.able : null;
  const semiable = typeof legacy.semiable === 'function' ? legacy.semiable : null;

  const expandable = (expr) => {
    if (!able && !semiable) return true; // 记号没声明 able，保持原样交给 FS
    try {
      if (able && able(expr)) return true;
      if (semiable && semiable(expr)) return true;
    } catch {
      return false;
    }
    return false;
  };

  return (expr, n) => {
    if (!expandable(expr)) return expr;

    const res = raw(expr, n);
    if (n > 0) {
      let prev;
      try {
        prev = raw(expr, n - 1);
      } catch {
        prev = undefined;
      }
      if (prev !== undefined && same_value(res, prev)) {
        throw new FsTrialExpansionError(
          `基本列不收敛：FS(expr, ${n}) 与 FS(expr, ${n - 1}) 相同，该表达式无法继续展开`,
        );
      }
    }
    return res;
  };
}

/** FS 的包装（不可展开短路 + 不增长检测）。 */
function make_legacy_FS(legacy) {
  return make_legacy_fs(legacy, legacy.FS);
}

/**
 * 包装 is_limit：在 able 的基础上补「FS 确实能产生更小项」的探测。
 *
 * 极限序数的基本列必然严格小于自身；若 able 说可展开、而 FS(expr, 0) 并不小于
 * expr（不收敛），则按不可展开处理 —— 这与远古 FSbounded 判定 null 的行为一致。
 */
function make_legacy_is_limit(legacy) {
  const able = legacy.able;
  if (typeof able !== 'function') return () => false;
  const compare = make_legacy_compare(legacy);
  return (expr) => {
    let ok;
    try {
      ok = able(expr);
    } catch {
      return false;
    }
    if (!ok) return false;
    // Infinity 走记号自己的 FS 特判（旧引擎对其跳过下界判断）
    if (is_infinity_expr(expr)) return true;
    try {
      const r0 = legacy.FS(expr, 0);
      if (compare(r0, expr) >= 0) return false;
    } catch {
      return false;
    }
    return true;
  };
}

/**
 * 判断一个对象是否已经是 ne 风格定义。
 * 判据：display 是对象（{plain,...}）。
 */
export function is_ne_style(def) {
  if (!def) return false;
  return typeof def.display === 'object' && def.display !== null;
}

/**
 * 把远古记号定义包装成 ne 风格 NotationDefinition。
 * 已是 ne 风格的直接返回，不做二次包装。
 */
export function adapt_legacy_notation(legacy) {
  if (legacy[LEGACY_ADAPTED]) return legacy;
  if (is_ne_style(legacy)) return legacy;

  const adapted = {
    id: legacy.id,
    name: legacy.name,
    // 远古 display 返回的就是 HTML（含 <sup>/<sub>），plain/html 用同一函数：
    // 与旧行为完全一致，不引入额外的标签剥离。
    display: { plain: legacy.display, html: legacy.display },
    is_limit: make_legacy_is_limit(legacy),
    compare: make_legacy_compare(legacy),
    FS: make_legacy_FS(legacy),
    init: () => legacy.init().map((node) => node.expr),
    // 原样保留，便于调试与后续替换
    legacy_source: legacy,
  };
  // FSalter 也要过「不可展开短路」（原先只包了 FS，是遗漏 —— 见 make_legacy_fs 注释）
  if (legacy.FSalter) adapted.FS_alter = make_legacy_fs(legacy, legacy.FSalter);

  Object.defineProperty(adapted, LEGACY_ADAPTED, { value: true, enumerable: false });
  return adapted;
}

/**
 * 从一个「远古记号对象数组」批量适配（供 loader 一次性把 window.register 收编进新注册表）。
 */
export function adapt_all(list) {
  return list.map(adapt_legacy_notation);
}
