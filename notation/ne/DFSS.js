// ============================================================================
//  notation/ne/DFSS.js — 双排序数列系统（Double Fixed-point Sequence System）
// ============================================================================
//  硬切改写：DFSS 在 ne-rewritten 里没有对应物，所以不是搬运，而是把本项目的
//  远古接口实现改写成 ne 风格 NotationDefinition。
//  算法本体（expand / isLimit / isSuccessor / truncate / compare / display / parse /
//  FS）逐行保留，只改接口层：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const + register_notation
//    display(seq)                             display: { plain, from_display }
//    able: isLimit                            is_limit: isLimit
//    semiable: isSuccessor && length > 1      ——（ne 无此概念，见下）
//    parse（记号外挂字段）                      from_display: parse（视图可反解析，返回表达式本身）
//    init() → [{expr, low, subitems}]         init() → [表达式, ...]
//
//  两条必须知道的语义变化：
//
//   1. **semiable 被 ne 引擎的既有分支吸收**。旧 DFSS 的
//      `semiable = isSuccessor(seq) && seq.length > 1` 与 notation/user/PrSS.js（远古版）
//      逐字相同，PrSS 的硬切已按同一判据处理：ne 的 expand_single 对非 limit 节点
//      一律算 `FS(expr, 0)` 并要求结果严格小于自身。DFSS 的非 limit 且非 [Infinity]
//      ⟹ 末元素 ≤ 首元素 ⟹ 可展开的正当表达式只有「末元素 === 首元素」（后继）一种，
//      此时 expand(seq, 0) 走 `last === seq[0] → seq.slice(0, -1)`，严格小于自身 ——
//      与旧的 semiable 分支等价，因此这里**不再需要**该字段。
//      （唯一形式差异：`length > 1` 那一项被去掉，单元素后继 [0] / [1] 在旧引擎下是
//       死叶子、在 ne 下会展开到 []；这与 PrSS 的处理完全一致，属 ne 既定语义。）
//
//   2. **low 边界退役，改由树结构决定上界**。旧 init 的 low 是 `[[]]`；ne 里上界 =
//      「先根遍历下一个节点」，单节点根列表下上界为 undefined（首项取 FS(·, 0)）。
//      旧版会把极限项作为**兄弟**插进根列表，ne 会把它作为**子节点**挂下去——
//      树形不同但展开内容相同，这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';

/**
 * DFSS 展开。
 * @param {number[]} seq
 * @param {number} n 展开索引（0 起）
 * @returns {number[]}
 */
function expand(seq, n) {
  if (!seq || seq.length === 0) return [];

  // 与 PrSS 一致：极限 [Infinity] → [0,1,...,n]（ε₀ 基本列）
  if (seq.length === 1 && seq[0] === Infinity) {
    const out = [];
    for (let k = 0; k <= n; k++) out.push(k);
    return out;
  }

  if (seq[0] !== 0 && seq[0] !== 1) {
    throw new Error('首元素必须为 0 或 1');
  }

  // 标准形式校验（同 PrSS）
  for (let j = 0; j < seq.length; j++) {
    const val = seq[j];
    if (val === seq[0]) continue;
    let parent = null;
    for (let i = j - 1; i >= 0; i--) {
      if (seq[i] < val) { parent = seq[i]; break; }
    }
    if (parent === null) throw new Error(`元素 ${val} 位置 ${j} 前没有更小元素`);
    if (parent !== val - 1) throw new Error(`元素 ${val} 位置 ${j} 的父元素为 ${parent} 而非 ${val - 1}`);
  }

  const last = seq[seq.length - 1];

  // 后继：末元素 === 首元素
  if (last === seq[0]) return seq.slice(0, -1);

  // 找所有 (last-1) 元素（从后往前）
  const targetIndices = [];
  for (let idx = seq.length - 2; idx >= 0; idx--) {
    if (seq[idx] === last - 1) targetIndices.push(idx);
  }
  if (targetIndices.length === 0) {
    throw new Error('无效数列：找不到 (last-1) 元素');
  }
  // targetIndices 从后往前收集：取第二个（若存在），否则取第一个
  const i = targetIndices.length >= 2 ? targetIndices[1] : targetIndices[0];

  const good = seq.slice(0, i);
  const bad = seq.slice(i, -1);

  const result = good.slice();
  const repeat = n + 1;  // 0 起 → 1 起
  for (let _ = 0; _ < repeat; _++) result.push(...bad);
  return result;
}

/** 是否极限：末元素 > 首元素，或极限标记 [Infinity] */
function isLimit(seq) {
  if (!seq || seq.length === 0) return false;
  if (seq.length === 1 && seq[0] === Infinity) return true;
  return seq[seq.length - 1] > seq[0];
}

/** 是否后继：末元素 === 首元素（原 semiable 用它，接口层去掉 semiable 后保留算法本体） */
function isSuccessor(seq) {
  if (!seq || seq.length === 0) return false;
  return seq[seq.length - 1] === seq[0];
}

/** 截断：删除末元素（原 semiable 分支的辅助函数，同上保留） */
function truncate(seq) {
  if (!seq || seq.length === 0) return null;
  return seq.slice(0, -1);
}

function compare(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return a.length - b.length;
}

function display(seq) {
  if (!seq || seq.length === 0) return "";
  if (seq.length === 1 && seq[0] === Infinity) return "Limit";
  return seq.join(", ");
}

function parse(input) {
  let cleaned = input.trim();
  const arrayMatch = cleaned.match(/^[\(\[]\s*(.*)\s*[\)\]]$/);
  if (arrayMatch) cleaned = arrayMatch[1];
  try {
    const parsed = JSON.parse(`[${cleaned}]`);
    if (!Array.isArray(parsed)) throw new Error('不是数组');
    for (const v of parsed) {
      if (!Number.isInteger(v) || v < 0) throw new Error(`元素必须为非负整数: ${v}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`DFSS 解析失败: ${err.message}`);
  }
}

export const DFSS = {
  id: 'dfss',
  name: 'DFSS',
  simple_name: 'DFSS',
  category_id: 'category-bss',
  display: { plain: display, from_display: parse },
  is_limit: isLimit,
  compare,
  FS: expand,
  // 旧 init: [{ expr: [Infinity], low: [[]], subitems: [] }] → 只取 expr
  init: () => [[Infinity]],
};

register_notation(DFSS);
