// ============================================================================
//  notation/DFSS.js — 双排序数列系统 (Double Fixed-point Sequence System)
// ============================================================================
//  远古版接口。算法逻辑来自用户旧版 DFSS.js（修复乱码注释）。
//  与 PrSS 的区别：坏根取「最后一个 (last-1) 元素」；若存在两个以上，
//  取倒数第二个（i = targetIndices[1]）。
// ============================================================================
;(() => {
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

  /** 是否后继：末元素 === 首元素 */
  function isSuccessor(seq) {
    if (!seq || seq.length === 0) return false;
    return seq[seq.length - 1] === seq[0];
  }

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
    if (!seq || seq.length === 0) return "0";
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

  register.push({
    id: 'dfss',
    name: 'DFSS',
    display,
    able: isLimit,
    semiable: (seq) => isSuccessor(seq) && seq.length > 1,
    compare,
    FS: expand,
    init: () => ([
      { expr: [Infinity], low: [[]], subitems: [] },  // 极限 ε₀，与 PrSS 一致
    ]),
    parse,
  });
})();
