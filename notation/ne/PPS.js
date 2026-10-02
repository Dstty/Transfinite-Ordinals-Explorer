// ============================================================================
//  notation/ne/PPS.js — Parented predecessor sequence
// ============================================================================
//  硬切改写：PPS 在 ne-rewritten 里没有对应物，所以不是搬运，
//  而是把本项目的远古接口实现改写成 ne 风格 NotationDefinition。
//  算法本体（expand / Limit / compare / display / FS）逐行保留，只改接口层：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const + register_notation
//    display(seq)                             display: { plain }
//    able: isLimit                            is_limit
//    semiable: length > 0                     ——（ne 无此概念，见下）
//    init() → [{expr, low, subitems}]         init() → [表达式, ...]
//    （源文件无 parse）                        ——（不设 from_display）
//
//  两条必须知道的语义变化（与 notation/ne/PrSS.js 完全同构）：
//
//   1. **semiable 被 ne 引擎的既有分支吸收**。旧 PPS 的 semiable = `seq=>seq.length>0`；
//      ne 的 expand_single 对非 limit 节点一律算 `FS(expr, 0)` 并要求结果严格小于自身。
//      PPS 的非 limit 且非空 ⟹ 末元素 === 0 ⟹ expand(seq, 0) 走 `L = len - parentY`
//      分支且循环 0 次，结果正是「删掉末元素」，严格小于自身 —— 与旧的 semiable 分支等价，
//      因此这里**不再需要**该字段。
//
//   2. **low 边界退役，改由树结构决定上界**。旧 init 的 low 是 `[[]]`；ne 里上界 =
//      「先根遍历下一个节点」= 旧 init 的第二项 `[]`（本文件按「只取 expr」保留它，
//      正好接替 low 的「根列表下界」职责）。旧版展开极限项时把它作为**兄弟**插进根列表，
//      ne 会把它作为**子节点**挂下去——树形不同但展开内容相同。这是 ne 架构的既定语义。
//
//  ⚠ 依赖说明：远古 PPS 的 display / compare 直接用 notation/legacy/omega-Y.js 暴露的
//    全局 `sequence_display` / `sequence_compare`。ne 记号是 ES module，不能再依赖
//    经典脚本的加载顺序，故把这两个函数**逐字内联**（token 与 omega-Y.js 第 1–14 行相同），
//    使本模块自足；算法本体一行未动。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';

/**
 * PPS 展开。
 * 末元素 x 即「父元素」：若 x ∈ [1, len] 则坏根为 x（b = seq[x-1]，坏部 = seq[x..len-2]，
 * 偏移量 L = len - x，若坏部里出现 b 则用 b 迭代，否则用 x-1 迭代）；
 * 否则无坏部，只重复末元素前若干项。
 * @param {(number|number[])[]} seq 数列
 * @param {number} FSterm 展开索引（0 起）
 * @returns {Array} 展开结果
 */
const expand = (seq, FSterm) => {
  var len = seq.length;
  var x = len > 0 ? seq[len - 1] : null;
  var parentY = x;
  var rootY = null;
  var b = null;
  var badpart = [];
  var L = 0;
  var flag = false;
  if (parentY >= 1 && parentY <= len) {
    rootY = parentY;
    b = seq[rootY - 1];
    badpart = seq.slice(rootY, len - 1);
    L = len - rootY;
    flag = badpart.some(val => val === b);
  } else {
    L = len - parentY;
  }
  var goodpart = seq.slice(0, -1);
  var result = goodpart.slice();
  for (var i = 1; i <= FSterm; i++) {
    result.push(flag ? b : x - 1);

    var bad_modified = badpart.map(val => val < x ? val : val + L * i);
    result = result.concat(bad_modified);
  }
  return result;
};

/** ω 的极限：第 n 项 [0,1,...,n]（含 n = 0 的假值分支，与远古版一致） */
const Limit = (n) => n ? Limit(n - 1).concat(n) : [0];

// ---- 以下两个函数逐字内联自 notation/legacy/omega-Y.js（远古版全局依赖）----

/** 字典序比较（递归到元素级；元素可为数组，此时走 JS 的数值化比较） */
const sequence_compare = (seq1, seq2) => {
  if (seq1.length === 0) {
    if (seq2.length === 0) return 0;
    else return -1;
  } else {
    if (seq2.length === 0) return 1;
    else {
      if (seq1[0] < seq2[0]) return -1;
      else if (seq1[0] > seq2[0]) return 1;
      else return sequence_compare(seq1.slice(1), seq2.slice(1));
    }
  }
};

/** 展示：极限标记 [[Infinity]] 字符串化为 'Infinity' → 'Limit'，其余直接字符串化 */
const sequence_display = (expr) => '' + expr === 'Infinity' ? 'Limit' : '' + expr;

export const PPS = {
  id: 'pps',
  name: 'Parented predecessor sequence',
  simple_name: 'PPS',
  category_id: 'category-bss',
  display: { plain: sequence_display },
  is_limit: (seq) => seq[seq.length - 1] > 0,
  compare: sequence_compare,
  // FS：极限标记（''+m === 'Infinity'，覆盖 [[Infinity]]）→ Limit(n)，空串 → []，其余走 expand
  FS: (m, FSterm) => {
    if ('' + m === 'Infinity') return Limit(FSterm);
    if (m.length === 0) return [];
    return expand(m, FSterm);
  },
  // 旧 init: [[[Infinity]] (low [[]]), [] (low [[]])] → 只取 expr
  init: () => [[[Infinity]], []],
};

register_notation(PPS);
