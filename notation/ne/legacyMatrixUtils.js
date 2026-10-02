// ============================================================================
//  notation/ne/legacyMatrixUtils.js — 远古矩阵三件套 + sequence_compare
// ============================================================================
//  这是「远古独有记号硬切改写」的公共依赖模块：为 MM / MM2 / MM3 / BDM / BHM2 /
//  BIM / BSM2 等一批**只存在于本项目远古侧**的矩阵记号提供 display / 极限判定 / 比较。
//
//  ## 来源（逐行照搬，未改一个字符的逻辑）
//
//    1. notation/legacy/BM.js 第 1–19 行
//         · matrix_compare  (1–17)
//         · matrix_display  (18)
//         · matrix_limit    (19)
//    2. notation/legacy/omega-Y.js 第 1–13 行
//         · sequence_compare  ← matrix_compare 依赖它（远古是全局依赖）
//
//  唯一改动：`matrix_compare` 里远古写的是 `lenDiff = col1.length-col2.length`
//  （**没有 var**，靠脚本顶层的隐式全局）。ES module 默认严格模式，照搬会
//  `ReferenceError: lenDiff is not defined`，故补 `var lenDiff`（逻辑一字未改）。
//  另外远古两个文件是经典脚本，函数用 `var` 定义在全局；这里改成 ESM 的
//  `export const`，调用关系与求值时机完全一致（都是模块求值完成后才被调用）。
//
//  ## 为什么不能复用 notation/ne/BM.js 的导出（实测证据）
//
//  远古实现与 ne 的 BM.ts 移植版**不等价**，混用会改变这些记号的显示与极限判定。
//  以下为实测（输入 → 远古 / ne）：
//
//    display([[0,0]])              → '(0,0)'   / '(0)'      （ne 的 normalize_col 去尾零）
//    display([[]])                 → '()'      / '(0)'
//    display([[0],[0,0]])          → '(0)(0,0)'/ '(0)(0)'
//    is_limit(Infinity)            → false     / true
//    compare(Infinity, [[0]])      → TypeError / 1          （远古读 Infinity.length 崩）
//    compare([Infinity], [[0]])    → TypeError('seq1.slice is not a function') / 1
//
//  即：display 与 is_limit 在很常规的输入上就分叉，compare 在 Infinity 表达式上
//  直接抛错。**因此必须把远古实现原样抽出来**，ne 侧 BM.js 保持不动。
//
//  ## 依赖范围（已一路 trace 到底）
//
//  matrix_limit  → 无依赖
//  matrix_display→ 无依赖
//  matrix_compare→ sequence_compare（本文件内）
//  sequence_compare → 仅自身递归，无其他依赖
//
//  所以本模块自包含，不需要再搬别的远古全局。
// ============================================================================

/**
 * 数列字典序比较（远古 notation/legacy/omega-Y.js 第 1–13 行，逐行照搬）。
 * 返回 -1 / 0 / 1。
 */
export const sequence_compare = (seq1, seq2) => {
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

/**
 * 矩阵比较（远古 notation/legacy/BM.js 第 1–17 行，逐行照搬）。
 * 逐列比较：短列用 0 右填充到同宽，列相等则比下一列。
 * 返回 -1 / 0 / 1。
 */
export const matrix_compare = (m1, m2) => {
  if (m1.length === 0) {
    if (m2.length === 0) return 0;
    else return -1;
  } else {
    if (m2.length === 0) return 1;
    else {
      var col1 = m1[0], col2 = m2[0];
      // 远古此处无 var（隐式全局）；ESM 严格模式必须显式声明，逻辑不变。
      var lenDiff = col1.length - col2.length;
      if (lenDiff > 0) col2 = col2.concat(Array(lenDiff).fill(0));
      else if (lenDiff < 0) col1 = col1.concat(Array(-lenDiff).fill(0));
      var cmp = sequence_compare(col1, col2);
      if (cmp) return cmp;
      else return matrix_compare(m1.slice(1), m2.slice(1));
    }
  }
};

/**
 * 矩阵显示（远古 notation/legacy/BM.js 第 18 行，逐行照搬）。
 * 每列写成 `(a,b,...)`；裸 Infinity（`'' + expr === 'Infinity'`）显示为 'Limit'。
 * 注意：**不去尾零**，也不把空列补成 (0)——这与 ne 的 display 有意不同。
 */
export const matrix_display = (expr) =>
  '' + expr === 'Infinity' ? 'Limit' : expr.map((col) => '(' + col + ')').join('');

/**
 * 极限判定（远古 notation/legacy/BM.js 第 19 行，逐行照搬）。
 * 末列首项 > 0 即为极限；空矩阵与裸 Infinity 都判 false。
 */
export const matrix_limit = (m) => m.length > 0 && m[m.length - 1][0] > 0;
