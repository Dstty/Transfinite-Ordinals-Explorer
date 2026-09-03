// ============================================================================
//  notation/rewritten/partial-UPMS.js — BMS(n rows) + UPMS 家族（n = 2..9）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/UPMS.ts（partial_UPMS(n)，逐行移植）
//  UPMS = Unupgrading projection matrix system。该家族仍用 UPMS 自身的展开
//  （expand(matrix, index, bm_threshold)），n 作为 bm_threshold 参数绑定；
//  与 BM_BHM 不同，这里没有「top<n 回退 BM4」的逻辑。
//  表达式 = BMS 矩阵（number[][]）；显示 = 标准 BMS 显示（(0)(1,1,1) 形式）。
//  id: upms-partial-2 .. upms-partial-9
//  注意：base 'upms' 不在此注册（避免与 notation/legacy/UPMS.js 的 legacy id 冲突）。
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    BM_INFINITY,
    BM_is_infinity,
    BM_parents,
    BM_compare,
    BM_is_limit,
    BM_infinity_FS,
    BM_standardize,
    BM_normalize,
    BM_display,
    BM_from_display,
    sequence_FS_variants0,
    lex_compare,
    lex_compare_by,
    tuple_lex_compare_by,
    boolean_compare,
    number_compare,
    bind3,
  } = U;

  // ---------- 上下文与基础判定（UPMS.ts） ----------
  function make_context(matrix) {
    const m = BM_standardize(matrix);
    const colCount = m.length;
    const rowCount = colCount === 0 ? 0 : m[0].length;
    const P = BM_parents(m);
    return { m, colCount, rowCount, P };
  }

  function is_ancestor(ctx, jCol, target, b) {
    let current = jCol;
    while (current >= target) {
      if (current === target) return true;
      current = ctx.P[current][b];
      if (current === undefined) break;
    }
    return false;
  }

  function last_column_is_zero(matrix) {
    if (matrix.length === 0) return true;
    const last = matrix[matrix.length - 1];
    for (let r = 0; r < last.length; r++) {
      if (last[r] !== 0) return false;
    }
    return true;
  }

  function find_LNZ_index(matrix) {
    if (matrix.length === 0) return -1;
    const last_col = matrix[matrix.length - 1];
    for (let r = last_col.length - 1; r >= 0; r--) {
      if (last_col[r] !== 0) return r;
    }
    return -1;
  }

  function find_bad_root(ctx) {
    const lastCol = ctx.colCount - 1;
    const t = find_LNZ_index(ctx.m);
    if (t === -1) return null;
    const rootCol = ctx.P[lastCol][t];
    if (rootCol === undefined) return null;
    return { r: rootCol, t };
  }

  function compute_delta(ctx, rootCol, t) {
    const lastCol = ctx.colCount - 1;
    const delta = new Array(ctx.rowCount);
    for (let r = 0; r < ctx.rowCount; r++) delta[r] = r >= t ? 0 : ctx.m[lastCol][r] - ctx.m[rootCol][r];
    return delta;
  }

  // ---------- 验证根（UPMS 特有逻辑） ----------
  function compare_marked_matrix(a, b) {
    return lex_compare(a, b, lex_compare_by(tuple_lex_compare_by([boolean_compare, number_compare])));
  }

  function compute_UPMS_verification_roots(ctx, rootCol, t, bm_threshold) {
    const m = ctx.m;
    const alpha = ctx.colCount - 1;
    const y = rootCol;
    const height = ctx.rowCount;
    const P = ctx.P;

    const vr = Array(alpha).fill(0);

    function get_VR(c, row) {
      return row < vr[c];
    }

    function get_base(c, k) {
      return Array.from({ length: k + 2 }, (_, r) => m[c][r] + (r <= k ? 1 : 0));
    }

    const transformed_X_value = (source, row, iCol, k) => {
      let value = m[source][row];
      let mark = row < k && get_VR(source, row);
      if (mark) value -= m[iCol][row];
      return [mark, value];
    };

    const transformed_Y_value = (source, row, jCol, k) => {
      let value = m[source][row];
      let mark = false;
      if (row < k) {
        const colIsJ = source === jCol;
        const containsJ = is_ancestor(ctx, source, jCol, row);
        if (colIsJ || containsJ) {
          mark = true;
          value -= m[jCol][row];
        }
      }
      return [mark, value];
    };

    function compute_transformed_X(c, k) {
      let u;
      const base = get_base(c, k);
      for (let candidate = c + 1; candidate <= alpha; candidate++) {
        if (lex_compare(m[candidate], base, number_compare) < 0) {
          u = candidate;
          break;
        }
      }
      if (u === undefined) return null;
      const result = [];
      for (let l = c; l < u; l++) {
        result.push(Array.from({ length: height }, (_, row) => transformed_X_value(l, row, c, k)));
      }
      return result;
    }

    function compute_transformed_Y(k) {
      let a = alpha;
      while (a !== undefined && m[a][k] !== m[y][k] + 1) a = P[a][k];
      if (a === undefined) a = alpha;
      const result = [];
      for (let l = a; l <= alpha; l++) {
        result.push(Array.from({ length: height }, (_, row) => transformed_Y_value(l, row, a, k)));
      }
      return result;
    }

    for (let row = 0; row < t; row++) {
      for (let col = y; col < alpha; col++) {
        if (col === y || row === 0) {
          vr[col]++;
          continue;
        }
        if (vr[col] !== row) {
          continue;
        }
        const parent = P[col][row];
        if (parent === undefined || parent < y || !get_VR(parent, row)) {
          continue;
        }
        if (parent !== y || row < bm_threshold) {
          vr[col]++;
          continue;
        }
        let higher_parent_escapes_bad_root = false;
        for (let vRow = row + 1; vRow < t - 1; vRow++) {
          if (P[col][vRow] !== y) {
            higher_parent_escapes_bad_root = true;
            break;
          }
        }
        if (higher_parent_escapes_bad_root) {
          continue;
        }
        const transformed_X = compute_transformed_X(col, row);
        if (transformed_X === null) {
          vr[col]++;
          continue;
        }
        const transformed_Y = compute_transformed_Y(row);
        const cmp = compare_marked_matrix(transformed_X, transformed_Y);
        if (cmp >= 0) vr[col]++;
      }
    }
    return vr;
  }

  // ---------- UPMS 展开（expand(matrix, index, bm_threshold = 1)） ----------
  function expand(matrix, index, bm_threshold = 1) {
    const ctx = make_context(matrix);
    const m = ctx.m;
    const n = Math.max(0, Math.floor(index));
    if (m.length === 0) return [];
    if (last_column_is_zero(m)) return m.slice(0, -1);
    const badRoot = find_bad_root(ctx);
    if (badRoot === null) return [];
    const { r, t } = badRoot;
    const alpha = ctx.colCount - 1;
    const delta = compute_delta(ctx, r, t);
    const vr = compute_UPMS_verification_roots(ctx, r, t, bm_threshold);
    const result = [...m.slice(0, alpha)];
    for (let w = 1; w <= n; w++) {
      for (let j = r; j < alpha; j++) {
        const result_col = [...m[j]];
        for (let k = 0; k < vr[j]; k++) result_col[k] += delta[k] * w;
        result.push(result_col);
      }
    }
    return BM_normalize(result);
  }

  // ---------- 工厂：注册 n=2..MAX_N 的每个实例 ----------
  function make_partial_UPMS(n) {
    // sequence_FS_variants0(bind3(expand, n), is_infinity, infinity_FS, is_limit, display)
    // （variants0 无 FS_alter，FSalter 取 FS_short，与 LPMS.js 一致）
    const variants = sequence_FS_variants0(
      bind3(expand, n),
      BM_is_infinity,
      BM_infinity_FS,
      BM_is_limit,
      BM_display,
    );

    register.push({
      id: 'upms-partial-' + n,
      name: 'BMS(' + n + ' rows) + UPMS',
      display: BM_display,
      able: BM_is_limit,
      compare: BM_compare,
      FS: variants.FS,
      FSalter: variants.FS_short,
      parse: BM_from_display,
      init: () => [
        { expr: BM_INFINITY(), low: [[]], subitems: [] },
        { expr: [[], Array(n + 3).fill(1)], low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
      debug: { expandUPMS: (m, index) => expand(m, index, n) },
    });
  }

  const STATIC_MAX = 9; // 静态预注册常用小档（n=2..9）；更大的 n 按需生成
  for (let n = 2; n <= STATIC_MAX; n++) make_partial_UPMS(n);

  // —— 家族注册表：n 支持 2..100（官方该家族从 2 开始）；>100 报错 ——
  function ensure_partial_upms(n) {
    const id = 'upms-partial-' + n;
    if (!window.register.some((x) => x.id === id)) make_partial_UPMS(n);
    return id;
  }
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'partial-upms',
    label: '(>n)-UPMS',
    start: 2,
    max: 100,
    match(lower) {
      // 输入形式：(>30)-UPMS / upms-partial-30 / upms30（已归一化小写无空格）
      const m1 = /^\(>(\d{1,3})\)\s*-?upms/.exec(lower);
      if (m1) return { n: parseInt(m1[1], 10), len: m1[0].length };
      const m2 = /^upms-?partial-(\d{1,3})/.exec(lower);
      if (m2) return { n: parseInt(m2[1], 10), len: m2[0].length };
      const m3 = /^upms(\d{1,3})/.exec(lower);
      if (m3) return { n: parseInt(m3[1], 10), len: m3[0].length };
      return null;
    },
    idFor: (n) => 'upms-partial-' + n,
    ensure: ensure_partial_upms,
  });
})();
