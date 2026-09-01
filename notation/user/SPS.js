// ============================================================================
//  notation/SPS.js — 强数列系统 (Strong Primitive Sequence)
// ============================================================================
//  远古版接口。算法逻辑来自用户旧版 SPS.js（模块化重写版）。
//  与 PrSS 的区别：展开时若 bad part 严格上升（强展开），坏部分元素
//  加上 i+1 的偏移。
// ============================================================================
;(() => {
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

  register.push({
    id: 'sps',
    name: 'SPS',
    display,
    able: isLimit,
    compare,
    FS: expandNormal,
    init: () => ([
      { expr: [Infinity], low: [[]], subitems: [] },  // 极限 ε₀，与 PrSS 一致
    ]),
    parse,
  });
})();
