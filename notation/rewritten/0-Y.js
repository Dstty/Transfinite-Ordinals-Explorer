// ============================================================================
//  notation/0-Y.js — 0-Y sequence
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BM.ts 的 seq_0Y
//  表达式 = BMS 矩阵（number[][]）；显示为 0-Y 数列（1,ω 形式）
//  id: 0y（与 ne-rewritten 一致）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    lex_compare,
    number_compare,
    boolean_compare,
    index_of_last,
    deepcopy,
    sequence_FS_variants,
    BM_INFINITY,
    BM_is_infinity,
    BM_normalize,
    BM_standardize,
    BM_normalize_col,
    triangular_to_BM,
  } = U;

  // ---------- parents / ascending（BM4 展开核心，来自 BM.ts） ----------
  function parents(m) {
    const result = [];
    for (let i = 0; i < m.length; i++) {
      result.push([]);
      for (let j = 0; j < m[i].length; j++) {
        let p = i;
        while (true) {
          p = j > 0 ? result[p][j - 1] : p - 1;
          if (p < 0) p = undefined;
          if (p === undefined) break;
          if ((m[p][j] ?? 0) < m[i][j]) break;
        }
        if (p !== undefined) result[i].push(p);
        else break;
      }
    }
    return result;
  }
  function ascending_threshold(P, r, j_max) {
    const result = [];
    result[r] = j_max;
    for (let i = r + 1; i < P.length; i++) {
      let result_i;
      for (let j = 0; j < j_max; j++) {
        const pij = P[i][j];
        if (pij === undefined || pij < r || j >= result[pij]) {
          result_i = j;
          break;
        }
      }
      result[i] = result_i ?? j_max;
    }
    return result;
  }
  function expand(m, index, shorter) {
    if (m.length === 0) return m;

    const rightmost = m.length - 1;
    const col_last = m[rightmost];
    let topmost = col_last.length - 1;
    for (; topmost >= 0; --topmost) {
      if (col_last[topmost] > 0) break;
    }

    let result = m.slice(0, rightmost);
    if (topmost < 0) return result;

    const P = parents(m);
    const r = P[rightmost][topmost];
    const A = ascending_threshold(P, r, topmost);
    const col_r = m[r];
    const offset = Array.from({ length: topmost }, (_, j) => col_last[j] - (col_r[j] ?? 0));

    for (let w = 1; w <= index + 1; ++w) {
      if (shorter && w === index + 1) break;
      for (let i = r; i < rightmost; ++i) {
        result.push(
          Array.from({ length: Math.max(m[i].length, A[i]) }, (_, y) => {
            const val = m[i][y] ?? 0;
            return y < A[i] ? val + offset[y] * w : val;
          }),
        );
        if (w === index + 1) break;
      }
    }
    return result;
  }
  function infinity_FS(n) {
    return [[], Array.from({ length: n + 1 }, () => 1)];
  }

  // ---------- 比较 / 极限 ----------
  function is_infinity(a) {
    return BM_is_infinity(a);
  }
  function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
      return boolean_compare(is_infinity(a), is_infinity(b));
    }
    return lex_compare(a, b, (x, y) => lex_compare(BM_normalize_col(x), BM_normalize_col(y), number_compare));
  }
  function is_limit(a) {
    return is_infinity(a) || (a.length > 0 && a[a.length - 1].length > 0 && a[a.length - 1][0] > 0);
  }

  // ---------- 0-Y 显示 / 解析（来自 BM.ts 的 display_as_0Y 系） ----------
  function compute_mountain(m) {
    const P = parents(m);
    const h = Math.max(...m.map((col) => col.length));
    const diagram_rows = h + 1;
    const M = [];
    for (let i = 0; i < m.length; i++) {
      M.push([]);
      for (let j = diagram_rows - 1; j >= 0; j--) {
        if (j >= P[i].length || P[i][j] < 0) {
          M[i][j] = 1;
        } else {
          const up = M[i][j + 1] ?? 1;
          const left = M[P[i][j]][j] ?? 1;
          M[i][j] = up + left;
        }
      }
    }
    return { m, M, P };
  }
  function convert_to_0Y(m) {
    return compute_mountain(m).M.map((col) => col[0]);
  }
  function display_as_0Y(m) {
    return is_infinity(m) ? '1,ω' : convert_to_0Y(m).join(',');
  }
  function compute_0Y_mountain(seq) {
    const P = Array.from({ length: seq.length }, () => []);
    const M = Array.from({ length: seq.length }, (_, i) => [seq[i]]);
    const m = Array.from({ length: seq.length }, () => []);

    for (let j = 0; ; j++) {
      let has_next = false;
      for (let i = 0; i < seq.length; i++) {
        if (M[i][j] === 1) {
          M[i].push(1);
        } else {
          let p = j === 0 ? i - 1 : P[i][j - 1];
          while (p >= 0) {
            if (M[i][j] > M[p][j]) break;
            p = j === 0 ? p - 1 : P[p][j - 1];
          }
          if (p >= 0) {
            P[i].push(p);
            M[i].push(M[i][j] - M[p][j]);
            m[i].push((m[p][j] ?? 0) + 1);
            has_next = true;
          } else {
            throw new Error('Illegal 0Y sequence: ' + seq);
          }
        }
      }
      if (!has_next) break;
    }
    return { M, P, m };
  }
  function from_display_as_0Y(str) {
    if (str === 'Limit' || str === '1,ω' || str === '1,w') return BM_INFINITY();
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal omega-Y sequence');
    return compute_0Y_mountain(result).m;
  }

  const display = display_as_0Y;
  const from_display = from_display_as_0Y;

  const variants = sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display);

  register.push({
    id: '0y',
    name: '0-Y sequence',
    display,
    able: is_limit,
    compare,
    FS: variants.FS,
    FSalter: variants.FS_alter,
    parse: from_display,
    init: () => [
      { expr: BM_INFINITY(), low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
    debug: { triangular_to_BM },
  });
})();
