// ============================================================================
//  notation/ne/PrSS.js — 原始数列系统（Primitive Sequence System）
// ============================================================================
//  这是「硬切改写」的第一个：PrSS 在 ne-rewritten 里**没有对应物**，
//  所以不是搬运，而是把本项目的远古接口实现改写成 ne 风格 NotationDefinition。
//  算法本体（expand / Limit / compare / display / parse / FS）逐行保留，
//  只改接口层：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const + register_notation
//    display(seq)                             display: { plain, from_display }
//    able: isLimit                            is_limit: isLimit
//    semiable: 后继半展开判定                  ——（ne 无此概念，见下）
//    parse  作为记号外挂字段                   from_display: parse（视图可反解析）
//    init() → [{expr, low, subitems}]         init() → [表达式, ...]
//
//  两条必须知道的语义变化：
//
//   1. **semiable 被 ne 引擎的既有分支吸收**。旧引擎靠 semiable 判定「后继序数也能
//      半展开」；ne 的 expand_single 对非 limit 节点一律算 `FS(expr, 0)`，并要求结果
//      严格小于自身——对 PrSS 的后继（末元素 === 首元素）恰好就是「删掉末元素」，
//      与旧的 semiable 分支等价，因此这里**不再需要**该字段。
//
//   2. **low 边界退役，改由树结构决定上界**。旧 init 给的是 `{expr:[Infinity], low:[[]]}`；
//      ne 里上界 = 「先根遍历下一个节点」。旧版展开极限项时把它作为**兄弟**插进根列表，
//      ne 会把它作为**子节点**挂下去——树形不同但展开内容相同。这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';

/**
 * 标准 PrSS 展开。
 * 步骤：
 *   1. 首元素必须为 0 或 1
 *   2. 每个元素的小于它的前驱必须等于 val - 1（标准形式校验）
 *   3. 末元素若等于首元素（后继），直接删除末元素
 *   4. 否则找到最后一个小于末元素的元素作为坏根 i：
 *      结果 = good + bad 重复 (n+1) 次（n 从 0 开始）
 * @param {number[]} seq 数列
 * @param {number} n 展开索引（0 起）
 * @returns {number[]} 展开结果
 */
function expand(seq, n) {
  if (!seq || seq.length === 0) return [];

  if (seq[0] !== 0 && seq[0] !== 1) {
    throw new Error('首元素必须为 0 或 1');
  }

  // 标准形式校验：每个元素的父元素（前驱中最近的小者）必须等于 val - 1
  for (let j = 0; j < seq.length; j++) {
    const val = seq[j];
    if (val === seq[0]) continue;
    let parent = null;
    for (let i = j - 1; i >= 0; i--) {
      if (seq[i] < val) {
        parent = seq[i];
        break;
      }
    }
    if (parent === null) throw new Error(`元素 ${val} 位置 ${j} 前没有更小元素`);
    if (parent !== val - 1) throw new Error(`元素 ${val} 位置 ${j} 的父元素为 ${parent} 而非 ${val - 1}`);
  }

  const last = seq[seq.length - 1];

  // 后继：末元素 === 首元素，直接删除
  if (last === seq[0]) return seq.slice(0, -1);

  // 找最后一个小于末元素的元素
  let i = seq.length - 2;
  while (i >= 0 && seq[i] >= last) i--;
  if (i < 0) throw new Error('无效数列：没有更小的元素可作坏根');

  const good = seq.slice(0, i);
  const bad = seq.slice(i, -1);

  const result = good.slice();
  const repeat = n + 1; // n 从 0 开始
  for (let _ = 0; _ < repeat; _++) result.push(...bad);
  return result;
}

/** ω 的极限：第 n 项 [0,1,...,n] */
function Limit(n) {
  if (n === 0) return [0];
  return Limit(n - 1).concat(n);
}

/** 是否极限：末元素为 Infinity 或 > 首元素 */
function isLimit(seq) {
  if (!seq || seq.length === 0) return false;
  const last = seq[seq.length - 1];
  return last === Infinity || last > seq[0];
}

/** 是否后继：末元素 === 首元素 */
function isSuccessor(seq) {
  if (!seq || seq.length === 0) return false;
  return seq[seq.length - 1] === seq[0];
}

/** 截断：删除末元素（得到更小表达式） */
function truncate(seq) {
  if (!seq || seq.length === 0) return null;
  return seq.slice(0, -1);
}

/** 字典序比较 */
function compare(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return a.length - b.length;
}

/** 展示 */
function display(seq) {
  if (!seq || seq.length === 0) return '';
  if (seq.some((v) => v === Infinity)) return 'Limit';
  return seq.join(', ');
}

/** 输入解析："0,1,2" 或 "[0,1,2]" → 数组（支持 Infinity） */
function parse(input) {
  let cleaned = input.trim();
  const arrayMatch = cleaned.match(/^[\(\[]\s*(.*)\s*[\)\]]$/);
  if (arrayMatch) cleaned = arrayMatch[1];
  try {
    const parsed = JSON.parse(`[${cleaned.replace(/Infinity/g, '"__INF__"')}]`);
    if (!Array.isArray(parsed)) throw new Error('不是数组');
    const result = parsed.map((v) => (v === '__INF__' ? Infinity : v));
    for (const v of result) {
      if (v !== Infinity && (!Number.isInteger(v) || v < 0)) {
        throw new Error(`元素必须为非负整数: ${v}`);
      }
    }
    return result;
  } catch (err) {
    throw new Error(`PrSS 解析失败: ${err.message}`);
  }
}

/** FS：极限 [Infinity] 展开为 [0,1,...,n]，其余走标准展开 */
function FS(seq, n) {
  if (seq.length === 1 && seq[0] === Infinity) return Limit(n);
  return expand(seq, n);
}

export const PrSS = {
  id: 'prss',
  name: 'PrSS（原始数列系统）',
  simple_name: 'PrSS',
  category_id: 'category-bss',
  display: { plain: display, from_display: parse },
  is_limit: isLimit,
  compare,
  FS,
  init: () => [[Infinity]],
};

register_notation(PrSS);
