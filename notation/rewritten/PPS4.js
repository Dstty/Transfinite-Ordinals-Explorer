// ============================================================================
//  notation/PPS4.js — PPS4 系列（pps4 / wpps4 / ewpps4 / spps4 / tpps4）
// ============================================================================
//  移植自 ne-rewritten: src/notations/PPS/PPS.ts
//  表达式 = 自然数列 number[]
//  - pps4    Parented predecessor sequence 4
//  - wpps4   Weak PPS4
//  - ewpps4  Extremely weak PPS4
//  - spps4   Second PPS4
//  - tpps4   Third PPS4
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { lex_compare, number_compare, Y_FS_variants } = U;

  function INFINITY() {
    return [Infinity];
  }
  function is_infinity(a) {
    return '' + a === 'Infinity';
  }
  function is_limit(seq) {
    return seq.length > 0 && seq[seq.length - 1] > 0;
  }
  function is_successor(seq) {
    return seq.length > 0 && seq[seq.length - 1] === 0;
  }
  function compare(a, b) {
    return lex_compare(a, b, number_compare);
  }
  function sequence_display(expr) {
    if (is_infinity(expr)) return 'Limit';
    return '' + expr;
  }
  function sequence_from_display(str) {
    if (str === 'Limit') return INFINITY();
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal PPS sequence');
    return result;
  }
  function limit_FS(n) {
    const result = [];
    for (let i = 0; i <= n; i++) result.push(i);
    return result;
  }

  function make_expand(expand_strong) {
    return (seq, FSterm) => {
      const len = seq.length;
      const x = seq[len - 1];
      const b = seq[x - 1];
      const badpart = seq.slice(x, len - 1);
      const L = len - x;
      const flag = badpart.some((val) => val === b);
      const result = seq.slice(0, -1);

      for (let i = 1; i <= FSterm; i++) {
        result.push(flag ? b : expand_strong(seq, x, b, i, L));
        result.push(...badpart.map((v) => (v < x ? v : v + L * i)));
      }
      return result;
    };
  }

  const expand_pps4_fn = (seq, x, b) => {
    const idx = seq.slice(b, x - 1).findLastIndex((val) => val <= b);
    return idx !== -1 ? b + 1 + idx : b;
  };
  const expand_weak_fn = (seq, x, b) => {
    const idx = seq.slice(b, x - 1).findLastIndex((val) => val === b);
    return idx !== -1 ? b + 1 + idx : b;
  };
  const expand_extremely_weak_fn = (seq, x, b) => {
    for (let idx = x - 2; idx >= b; idx--) {
      if (seq[idx] === b) return b + 1 + idx;
      if (seq[idx] < b) break;
    }
    return b;
  };
  const expand_second_fn = (seq, x, b, i, L) => {
    for (let idx = x - 2; idx >= b; idx--) {
      if (seq[idx] === b) return b + 1 + idx + L * i - L;
      if (seq[idx] < b) break;
    }
    return b;
  };
  const expand_third_fn = (seq, x, b, i, L) => {
    const idx = seq.slice(b, x - 1).findLastIndex((val) => val === b);
    return idx !== -1 ? b + 1 + idx + L * i - L : b;
  };

  const expand_pps4 = make_expand(expand_pps4_fn);
  const expand_weak = make_expand(expand_weak_fn);
  const expand_extremely_weak = make_expand(expand_extremely_weak_fn);
  const expand_second = make_expand(expand_second_fn);
  const expand_third = make_expand(expand_third_fn);

  function create_pps_notation(id, name, expand_fn) {
    const variants = Y_FS_variants(expand_fn, is_infinity, limit_FS, is_limit, sequence_display);
    return {
      id,
      name,
      display: sequence_display,
      able: is_limit,
      semiable: is_successor,
      compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: sequence_from_display,
      init: () => [
        { expr: INFINITY(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
    };
  }

  register.push(create_pps_notation('pps4', 'Parented predecessor sequence 4', expand_pps4));
  register.push(create_pps_notation('wpps4', 'Weak PPS4', expand_weak));
  register.push(create_pps_notation('ewpps4', 'Extremely weak PPS4', expand_extremely_weak));
  register.push(create_pps_notation('spps4', 'Second PPS4', expand_second));
  register.push(create_pps_notation('tpps4', 'Third PPS4', expand_third));
})();
