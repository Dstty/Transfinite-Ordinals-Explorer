// ============================================================================
//  core/ne/notationUtils.js — 基本列变体包装器（移植自 ne-rewritten src/notations/notation_utils.ts）
// ============================================================================
//  记号用 `...sequence_FS_variants(...)` 之类的展开把多个基本列变体铺进定义里，
//  供 core/ne/fsVariants.js 的 list_FS_variants / resolve_FS 选择。
//
//  提供的包装器：
//    Y_FS_variants          — Y 系（FS / FS_alter / FS_short）
//    sequence_FS_variants0  — 二元序列（FS / FS_short）
//    sequence_FS_variants   — 通用序列（FS / FS_alter / FS_short）
//    MN_FS_variants         — MN 系（同上 + FS_equiv.fast，即原 lnz-1）
//    FS_default_LNZ_variant — 单表达式记号（FS / FS_short）
//    merge_sum              — 项合并显示工具（a+a → a2）
//
//  ⚠ 与 notation/rewritten/shared.js 里的 window.NEUTILS 同名函数是**两套**：
//    那套服务远古接口记号，这套服务 ne 原生记号。两者语义一致，勿混用。
// ============================================================================

/** Y 系变体：FS 从 FS_alter 的结果里截掉末项。 */
export function Y_FS_variants(expand_longer, is_infinity, infinity_FS, is_limit, display) {
  const data = {};
  const data_short = {};

  const core = {
    FS: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      const result = core.FS_alter(seq, index);
      return result.slice(0, result.length - 1);
    },
    FS_alter: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      const data_key = display(seq);
      if (data[data_key] === undefined) data[data_key] = [];
      else if (data[data_key][index] !== undefined) return data[data_key][index];
      return (data[data_key][index] = expand_longer(seq, index));
    },
    FS_short: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      if (index === 0) return seq.slice(0, seq.length - 1);
      if (index === 1) {
        const result = core.FS_alter(seq, 1);
        return result.slice(0, seq.length);
      }
      const data_key = display(seq);
      const d = data_short[data_key];
      if (d === undefined) {
        data_short[data_key] = core.FS(seq, 1).length !== seq.length;
      }
      return core.FS(seq, index - (data_short[data_key] ? 1 : 0));
    },
  };
  return core;
}

/** 二元序列变体：FS 直接展开，FS_short 做 lnz-1。 */
export function sequence_FS_variants0(expand, is_infinity, infinity_FS, is_limit, display) {
  const data = {};
  const data_short = {};

  const core = {
    FS: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      const data_key = display(seq);
      if (data[data_key] === undefined) data[data_key] = [];
      else if (data[data_key][index] !== undefined) return data[data_key][index];
      return (data[data_key][index] = expand(seq, index));
    },
    FS_short: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      if (index === 0) return seq.slice(0, seq.length - 1);
      if (index === 1) {
        const result = core.FS(seq, 1);
        return result.slice(0, seq.length);
      }
      const data_key = display(seq);
      let d = data_short[data_key];
      if (d === undefined) {
        d = data_short[data_key] = core.FS(seq, 0).length !== seq.length;
      }
      return core.FS(seq, index - (d ? 1 : 0));
    },
  };
  return core;
}

/** 通用序列变体：expand 的第三参 shorter 区分 FS（true）与 FS_alter（false）。 */
export function sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display) {
  const data = {};
  const data_alter = {};
  const data_short = {};

  const core = {
    FS: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      const data_key = display(seq);
      if (data[data_key] === undefined) data[data_key] = [];
      else if (data[data_key][index] !== undefined) return data[data_key][index];
      return (data[data_key][index] = expand(seq, index, true));
    },
    FS_alter: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      const data_key = display(seq);
      if (data_alter[data_key] === undefined) data_alter[data_key] = [];
      else if (data_alter[data_key][index] !== undefined) return data_alter[data_key][index];
      return (data_alter[data_key][index] = expand(seq, index, false));
    },
    FS_short: (seq, index) => {
      if (is_infinity(seq)) return infinity_FS(index);
      if (!seq.length) return [];
      if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
      if (index === 0) return seq.slice(0, seq.length - 1);
      if (index === 1) {
        const result = core.FS_alter(seq, 1);
        return result.slice(0, seq.length);
      }
      const data_key = display(seq);
      let d = data_short[data_key];
      if (d === undefined) {
        d = data_short[data_key] = core.FS(seq, 1).length !== seq.length;
      }
      return core.FS(seq, index - (d ? 1 : 0));
    },
  };
  return core;
}

/**
 * MN 系的基本列：FS / FS_alter / FS_short 与 sequence_FS_variants 完全一致（同一实现），
 * 原先 MN 专属的 lnz-1（第 1 项改用截断）现在作为额外变体 FS_equiv.fast 保留。
 */
export function MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, display, compare_col, truncate) {
  const base = sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display);
  const data_short = {};

  if (compare_col === undefined && truncate !== undefined) {
    throw new Error('MN_FS_variants with truncate must have compare_col');
  }

  /** 原 MN 的 lnz-1：与 FS_short 的区别是第 1 项用「末列去掉最后一个元素」的截断。 */
  const fast = (seq, index) => {
    if (is_infinity(seq)) return infinity_FS(index);
    if (!seq.length) return [];
    if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
    if (index === 0) return seq.slice(0, seq.length - 1);
    const data_key = display(seq);
    let d = data_short[data_key];
    if (d === undefined) {
      let target = base.FS(seq, 1);
      let d0;
      if (truncate !== undefined) {
        const seq_truncate = truncate(seq);
        d0 = compare_col(seq_truncate[seq.length - 1], target[seq.length - 1]) !== 0;
      } else {
        // 注意：索引用 seq.length 而非 target.length —— 与 ne 原版一致
        d0 = target[seq.length - 1].length !== seq[seq.length - 1].length - 1;
      }
      let d1 = target.length !== seq.length;
      d = data_short[data_key] = [d0, d1];
    }
    let current = 1;
    if (d[0]) {
      if (index === current) {
        if (truncate !== undefined) return truncate(seq);
        let result = seq.slice();
        result[result.length - 1] = result[result.length - 1].slice(0, -1);
        return result;
      } else current++;
    }
    if (d[1]) {
      if (index === current) {
        return base.FS(seq, 1).slice(0, seq.length);
      } else current++;
    }
    return base.FS(seq, 1 + index - current);
  };

  return { ...base, FS_equiv: { fast } };
}

/** 相邻相同项合并（'1','1' → '2'；'a','a' → 'a2'），用于 OCF 类显示。 */
export function merge_sum(terms) {
  let result = [];
  let i = 0;
  while (i < terms.length) {
    let j = i + 1;
    let t = terms[i];
    while (j < terms.length && terms[j] === t) j++;
    if (j === i + 1) {
      result.push(terms[i]);
    } else {
      let count = j - i;
      if (t === '1') result.push('' + count);
      else result.push(t + count);
    }
    i = j;
  }
  return result.join('+');
}

/** 单表达式记号（如 OCF）：FS / FS_short，FS_short 用「反复截断到不超过 FS(·,0)」实现。 */
export function FS_default_LNZ_variant(expand, compare, is_infinity, infinity_FS, is_limit, display) {
  const data = {};
  const data_short = {};

  const core = {
    FS: (expr, index) => {
      if (is_infinity(expr)) return infinity_FS(index);
      if (!is_limit(expr)) return expand(expr, 0);
      const data_key = display(expr);
      if (data[data_key] === undefined) data[data_key] = [];
      else if (data[data_key][index] !== undefined) return data[data_key][index];
      return (data[data_key][index] = expand(expr, index));
    },
    FS_short: (expr, index) => {
      if (is_infinity(expr)) return infinity_FS(index);
      if (!is_limit(expr) || index === 0) return expand(expr, 0);
      const data_key = display(expr);
      let d = data_short[data_key];
      if (d === undefined) {
        const truncate = core.FS(expr, 0);
        const FS1 = core.FS(expr, 1);
        let result = FS1;
        while (true) {
          const result_truncate = core.FS(result, 0);
          if (compare(result_truncate, truncate) <= 0) break;
          result = result_truncate;
        }
        d = data_short[data_key] = [compare(result, FS1) !== 0, result];
      }
      if (index === 1) return d[1];
      return core.FS(expr, index - (d[0] ? 1 : 0));
    },
  };
  return core;
}
