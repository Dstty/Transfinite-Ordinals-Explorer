// ============================================================================
//  notation/ne/SPS.js — 强数列系统（Strong Primitive Sequence）
// ============================================================================
//  硬切改写：SPS 在 ne-rewritten 里没有对应物，所以不是搬运，而是把本项目的
//  远古接口实现改写成 ne 风格 NotationDefinition。
//  算法本体（expandNormal / isLimit / display / compare / parse / FS）逐行保留，
//  只改接口层：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const + register_notation
//    display(expr)                            display: { plain, from_display }
//    able: isLimit                            is_limit: isLimit
//    parse（记号外挂字段）                      from_display: parse（视图可反解析，返回表达式本身）
//    init() → [{expr, low, subitems}]         init() → [表达式, ...]
//
//  两条必须知道的语义变化：
//
//   1. **SPS 原本没有 semiable，ne 引擎给非 limit 节点补齐了「后继展开」**。
//      旧引擎的 expandTier 只在 `able || semiable` 命中时才调 FS，而 SPS 的
//      able 仅是「末元素 > 0」，所以旧接口下**所有末元素为 0 的表达式都是死叶子**，
//      expandNormal 里 `expr[末] === 0 → 删掉末元素` 那条分支是**不可达的死代码**。
//      ne 的 expand_single 对非 limit 节点一律算 `FS(expr, 0)` 并要求结果严格小于自身：
//      对 SPS 恰好就是「删掉末元素」（严格递减），于是这条分支被激活。
//      算法本体一个字未改——变的只是引擎调用 FS 的时机，且这正是 ne 的既定语义
//      （同 PrSS 的处理）。
//
//   2. **low 边界退役，改由树结构决定上界**。旧 init 的 low 是 `[[]]`，且根列表只有
//      一个节点 `[Infinity]`；ne 里上界 = 「先根遍历下一个节点」，单节点根列表下
//      上界为 undefined（首项取 FS(·, 0)），展开树因此只含子节点、不再往根列表插兄弟。
//      树形不同但展开内容相同，这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';

/**
 * 标准展开。
 * 末元素为 0 → 直接删除（后继）；
 * 否则从后往前找 lastNumber-1 元素构成 bad part，重复 (n+1) 次。
 * @param {number[]} expr
 * @param {number} n 展开索引（0 起）
 * @returns {number[]}
 */
function expandNormal(expr, n) {
  // 与 PrSS 一致：极限 [Infinity] → [0,1,...,n]（ε₀ 基本列）
  if (expr.length === 1 && expr[0] === Infinity) {
    const out = [];
    for (let k = 0; k <= n; k++) out.push(k);
    return out;
  }

  if (expr.length > 0 && expr[expr.length - 1] === 0) {
    return expr.slice(0, -1);
  }

  const sequence = expr.slice();
  const lastNumber = sequence[sequence.length - 1];
  const badPart = [];

  // 从后往前收集 bad part，直到遇到 lastNumber-1
  for (let i = 0; i < sequence.length; i++) {
    const idx = sequence.length - 1 - i;
    badPart.unshift(sequence[idx]);
    if (sequence[idx] === lastNumber - 1) break;
  }
  badPart.pop();          // 移除 bad part 最后一个元素（即 lastNumber-1 本身）
  sequence.pop();         // 移除原序列最后一个元素

  const isStrongExpand = badPart.length > 0 && badPart[0] < badPart[badPart.length - 1];

  const repeat = n + 1;   // 0 起 → 1 起
  for (let i = 0; i < repeat; i++) {
    for (const j of badPart) {
      if (isStrongExpand && j >= lastNumber) {
        sequence.push(j + i + 1);
      } else {
        sequence.push(j);
      }
    }
  }
  return sequence;
}

/** 是否极限：末元素 > 0 */
function isLimit(expr) {
  return expr.length > 0 && expr[expr.length - 1] > 0;
}

function display(expr) {
  if (expr.length === 1 && expr[0] === Infinity) return "Limit";
  return expr.join(',');
}

function compare(seq1, seq2) {
  const len = Math.min(seq1.length, seq2.length);
  for (let i = 0; i < len; i++) {
    if (seq1[i] < seq2[i]) return -1;
    if (seq1[i] > seq2[i]) return 1;
  }
  if (seq1.length < seq2.length) return -1;
  if (seq1.length > seq2.length) return 1;
  return 0;
}

function parse(str) {
  return str.split(',').map(Number);
}

export const SPS = {
  id: 'sps',
  name: 'SPS',
  simple_name: 'SPS',
  category_id: 'category-bss',
  display: { plain: display, from_display: parse },
  is_limit: isLimit,
  compare,
  FS: expandNormal,
  // 旧 init: [{ expr: [Infinity], low: [[]], subitems: [] }] → 只取 expr
  init: () => [[Infinity]],
};

register_notation(SPS);
