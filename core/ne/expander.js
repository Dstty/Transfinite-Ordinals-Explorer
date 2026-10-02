// ============================================================================
//  core/ne/expander.js — 展开核心（移植自 ne-rewritten src/core/expander.ts）
// ============================================================================
//  与远古版 core/engine.js 的对应关系：
//    远古：FSbounded(FS, low, ...) —— 记号手写 low 边界，逐项试到越过边界
//    ne  ：get_bound(node)      —— 取「先根遍历下一个节点」的表达式当边界
//  两者语义等价（都要求新项严格落在当前项与下界之间），但边界来源从
//  记号转移到了树结构，所以记号不再需要提供 low。
//
//  插入方向（与 ne 的 docs/树展开算法.md 一致）：
//    as_sibling=true  → 作为 node 的兄弟追加到父节点子列表尾部（兄弟展开）
//    as_sibling=false → 作为 node 的首个子节点插入
// ============================================================================

import { append_sibling, get_bound, prepend_child } from './tree.js';
import { FsTrialExpansionError, TimeLimitError } from './errors.js';
import { resolve_FS } from './fsVariants.js';
import { resolve_display, run_debug_verification } from './notationDef.js';

/**
 * 「试展开次数过多」守卫阈值（模块级，由 UI 的 settings.maxFindFs 同步）。
 * 语义：单次展开中「连续」产出 ≤ bound 的项超过该值即视为基本列疑似有误
 * （防非标准表达式导入后卡死）。
 */
let max_find_fs_value = 10;

export function set_max_find_fs(value) {
  max_find_fs_value = value;
}

/** 展开过程中的共享上下文：notation 与 variant 同源，fs 由其预解析。 */
function make_ctx(notation, variant) {
  return { notation, variant, fs: resolve_FS(notation, variant) };
}

// ---------------------------------------------------------------------------
//  展开超时（用户可设，默认 5000ms；0 = 不限制）
// ---------------------------------------------------------------------------
//  JS 单线程，一个跑不完的循环会把页面冻住。用户实测踩到过：自定义记号的
//  `FS(e, i)` 结果不随 i 变化时，`generate_fs` 的 while 会永远拒绝同一个值
//  （那个 `children.length === 0` 的守卫在节点已有子节点时不生效）→ 死循环。
//
//  这里用「环境期限」而不是层层传参：同线程内展开不会交叠，`expand_item` 前后
//  设置/清除即可，改动面最小（见 uiEngine.expand_ne 的 finally）。
let expand_deadline_at = 0; // 0 = 无限制
let expand_limit_ms = 0;

/** 设定本次展开的毫秒上限（0 或负数 = 不限制）。 */
export function set_expand_deadline(ms) {
  expand_limit_ms = Number(ms) > 0 ? Math.floor(Number(ms)) : 0;
  expand_deadline_at = expand_limit_ms ? Date.now() + expand_limit_ms : 0;
}

/** 清除上限（展开结束务必调用，否则会影响后续展开）。 */
export function clear_expand_deadline() {
  expand_deadline_at = 0;
  expand_limit_ms = 0;
}

/** 当前是否已超时。 */
export function expand_deadline_exceeded() {
  return expand_deadline_at !== 0 && Date.now() > expand_deadline_at;
}

function check_deadline() {
  if (expand_deadline_at !== 0 && Date.now() > expand_deadline_at) {
    throw new TimeLimitError(expand_limit_ms);
  }
}

function is_last_child(node) {
  const p = node.parent;
  return p !== null && p.children[p.children.length - 1].index === node.index;
}

function generate_fs(node, ctx, bound) {
  const { notation, variant, fs } = ctx;
  let i;
  if (node.fs_state && node.fs_state.variant === variant) {
    i = node.fs_state.index + 1;
  } else {
    i = 0;
  }

  // 只统计「本次调用内连续 ≤ bound」的 reject 数（而非累计绝对 index），
  // 避免合法多次展开误触发。
  let consecutive_reject = 0;
  let guard = 0; // 超时检查节流：每 64 次循环查一次时钟（Date.now 不算贵，但没必要每次）
  while (true) {
    if ((guard++ & 63) === 0) check_deadline();
    if (node.children.length === 0 && consecutive_reject > max_find_fs_value) {
      throw new FsTrialExpansionError('当前节点试展开次数过多，可能基本列实现有误');
    }
    const res = fs(node.expr, i);
    if (bound === undefined || notation.compare(res, bound) > 0) {
      node.fs_state = { variant, index: i };
      return res;
    }
    i++;
    consecutive_reject++;
  }
}

/**
 * 只「展开一次」：计算 node 越过其列表下一项（bound）的下一个 FS 项并插入。
 * 无法展开时返回 undefined（此时上层链停住）：非 limit 后继只能展开出 x 一次、
 * 0 不能展开、或结果不在 bound 之上（病态 gap 视同无法展开）。
 */
function expand_single(node, ctx, as_sibling) {
  const { notation, fs } = ctx;
  const bound = get_bound(node);

  let result_expr;
  if (notation.is_limit(node.expr)) {
    result_expr = generate_fs(node, ctx, bound);
  } else {
    result_expr = fs(node.expr, 0);
    if (notation.compare(result_expr, node.expr) >= 0) return undefined;
    if (bound !== undefined && notation.compare(result_expr, bound) <= 0) return undefined;
  }

  // debug_verification（仅记号定义时生效）：校验失败仅打印警告，节点照常创建。
  if (notation.debug_verification) {
    const { passed, failed } = run_debug_verification(notation.debug_verification, result_expr);
    if (!passed) {
      console.warn(
        '[debug_verification] 展开生成的节点未通过校验（仍已创建）' +
          (failed.length > 0 ? ' [未通过: ' + failed.join(', ') + ']' : '') +
          ': ' +
          resolve_display(notation.display).plain(result_expr),
      );
    }
  }

  const new_node = as_sibling ? append_sibling(node, result_expr) : prepend_child(node, result_expr);
  dispatch_pending(node, new_node, result_expr, notation);
  return new_node;
}

/**
 * 把 node 的挂载条目（pending_items）按新节点值 v 分派：
 *   x < v  → 移给 new_node（其区间下段）
 *   x == v → 写入 new_node 的 extraData（重复值沿用覆盖语义）
 *   x > v  → 留在 node（区间上段）
 * pending_items 按 expr 递增有序。
 */
function dispatch_pending(node, new_node, v, notation) {
  const pend = node.pending_items;
  if (!pend || pend.length === 0) return;

  // pending 递增有序：二分查找第一个 expr >= v 的位置
  let lo = 0;
  let hi = pend.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notation.compare(pend[mid].expr, v) < 0) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;

  if (start > 0) {
    const np = (new_node.pending_items ??= []);
    np.push(...pend.slice(0, start));
  }

  // start 起连续 == v 的段，取末者（重复时后写覆盖）
  let end = start;
  while (end < pend.length && notation.compare(pend[end].expr, v) === 0) end++;
  if (end > start) {
    const attach = pend[end - 1];
    const nd_ed = (new_node.extraData ??= {});
    Object.assign(nd_ed, attach.extraData);
  }

  if (end < pend.length) {
    node.pending_items = pend.slice(end);
  } else {
    delete node.pending_items;
  }
}

/**
 * 多层展开的实现（行为自 ne 保留）。
 *
 * 结构要点：
 * - 带同一 tier 的递归调用构成「兄弟展开链」（tier 不递减）：每步对刚生成的节点
 *   继续 expand_single，直到其返回 undefined（链终止）；
 * - 链内「插入方向」按 next_as_sibling 延续：一旦进入兄弟展开则保持；
 *   或当某步以子节点插入后 node 恰好只有一个子（children.length === 1）时，
 *   链后续项转兄弟展开；
 * - tier > 1 时在链结构上追加 tier-1 的更深层展开。
 */
function expand_tier_impl(node, ctx, tier, as_sibling) {
  check_deadline(); // 兄弟展开链是递归且不递减 tier 的：链过长/不收敛时在这里兜住
  const new_node = expand_single(node, ctx, as_sibling);
  if (!new_node) return undefined;

  if (tier > 0) {
    const next_as_sibling = as_sibling || node.children.length === 1;
    expand_tier_impl(new_node, ctx, tier, next_as_sibling);
    if (tier > 1) {
      if (new_node.children.length > 0) {
        expand_tier_impl(new_node.children[new_node.children.length - 1], ctx, tier - 1, true);
      } else {
        expand_tier_impl(new_node, ctx, tier - 1, false);
      }
    }
  }
  return new_node;
}

/**
 * 展开当前节点（tier 语义：0=单次展开，1=单层/兄弟链到不能，≥2 多层）。
 * @returns 首个创建的节点（可用于聚焦）；undefined 表示未展开。
 */
export function expand_item(node, notation, variant, tier = 0) {
  const ctx = make_ctx(notation, variant);
  const parent = node.parent;
  // 兄弟展开的入口条件：node 是其父的末子，且父本身不是根（存在可插入的兄弟位置）。
  const as_sibling = parent?.parent !== null && is_last_child(node);
  return expand_tier_impl(node, ctx, tier, as_sibling);
}

/** 标准性检查：若 expr 可由 init 项的有限次基本列到达，则视为标准。 */
export function check_is_standard(expr, notation, variant) {
  let upper;
  let upper_fs_index = 0;

  const initial = notation.init();
  for (const e_init of initial) {
    const cmp = notation.compare(e_init, expr);
    if (cmp === 0) return true;
    if (cmp > 0) {
      upper = e_init;
    } else {
      break;
    }
  }
  if (upper === undefined) return false;

  while (true) {
    if (upper_fs_index > max_find_fs_value) return false;
    if (upper_fs_index > 0 && !notation.is_limit(upper)) return false;

    const current = resolve_FS(notation, variant)(upper, upper_fs_index);
    const cmp = notation.compare(current, expr);
    upper_fs_index++;

    if (cmp === 0) {
      return true;
    } else if (cmp > 0) {
      upper = current;
      upper_fs_index = 0;
    }
  }
}
