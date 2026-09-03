// ============================================================================
//  notation/rewritten/nBM-BHM.js — BMS(n rows) + BHM 家族（n = 1..8）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BHM.ts（BM_BHM(n) 工厂，逐行移植）
//  BHM = Bashicu hyper matrix：末列顶行行号 top < n 时回退普通 BMS（BM4）展开，
//  否则按 BHM 的多 bad-root 规则展开（ascension_thresholds / extend 选根）。
//  表达式 = BMS 矩阵（number[][]）；显示 = 标准 BMS 显示（(0)(1,1,1) 形式）。
//  id: 1-bm-bhm .. 8-bm-bhm
//  注意：base 'bhm' 不在此注册（避免与 notation/legacy/BHM.js 的 legacy id 冲突）。
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
    BM_expand,
    BM_display,
    BM_from_display,
    sequence_FS_variants,
    bind3,
  } = U;

  // ---------- BHM 展开辅助（BHM.ts 的 ascension_thresholds / ascension_vector /
  //            ascend_vector / compute_expansion / extend / BHM_expand） ----------
  function ascension_thresholds(P, r, roots, b) {
    const result = Array(P.length).fill(0);
    result[r] = b;
    for (let i = r + 1; i < P.length; i++) {
      if (roots.includes(i)) {
        result[i] = b;
      } else {
        let threshold = 0;
        while (threshold < P[i].length && threshold < b && threshold < result[P[i][threshold]]) threshold++;
        result[i] = threshold;
      }
    }
    return result;
  }

  function ascension_vector(m, r, b) {
    const right = m.length - 1;
    return Array.from({ length: b }, (_, i) => m[right][i] - (m[r][i] ?? 0));
  }

  function ascend_vector(col, V, A, w) {
    return Array.from({ length: Math.max(col.length, A) }, (_, j) => (col[j] ?? 0) + w * (V[j] ?? 0) * (j < A ? 1 : 0));
  }

  function compute_expansion(m, r, V, A, index, shorter) {
    const right = m.length - 1;
    const result = m.slice(0, right);
    for (let w = 1; w <= index + 1; ++w) {
      if (shorter && w > index) break;
      for (let i = r; i < right; ++i) {
        result.push(ascend_vector(m[i], V, A[i], w));
        if (w > index) break;
      }
    }
    return result;
  }

  function extend(m, r, V, A) {
    const right = m.length - 1;
    const res = compute_expansion(m, r, V, A, 1, true);
    res.push(ascend_vector(m[right], V, A[right], 1));
    return res;
  }

  // 纯 BHM 展开（不检查 top < n）
  function BHM_expand(m, index, shorter) {
    const right = m.length - 1;
    if (right < 0) return [];
    const top = m[right].length - 1;
    if (top < 0) return m.slice(0, -1);

    const P = BM_parents(m);

    const special_root = P[P[right][top]][top] ?? -1;
    const roots = [];
    for (let i = right; (i = top > 0 ? P[i][top - 1] : i - 1) > special_root; ) {
      if ((P[i][top] ?? -1) === special_root) roots.push(i);
    }

    const A = [];
    for (const r of roots) {
      A[r] = ascension_thresholds(P, r, roots, top);
    }

    const V = [];
    for (const r of roots) {
      V[r] = ascension_vector(m, r, top);
    }

    const threshold = extend(m, roots[0], V[roots[0]], A[roots[0]]);
    let ri = roots.findIndex((r) => BM_compare(extend(m, r, V[r], A[r]), threshold) < 0);
    if (ri === -1) ri = roots.length;
    const r_actual = roots[ri - 1];
    return compute_expansion(m, r_actual, V[r_actual], A[r_actual], index, shorter);
  }

  // BM_BHM_expand(m, index, n, shorter)：顶行行号 < n → 普通 BMS 展开
  function BM_BHM_expand(m, index, n, shorter) {
    const right = m.length - 1;
    if (right < 0) return [];
    const top = m[right].length - 1;
    if (top < 0) return m.slice(0, -1);

    if (top < n) return BM_expand(m, index, shorter);
    return BHM_expand(m, index, shorter);
  }

  // ---------- 工厂：注册 n=1..MAX_N 的每个实例 ----------
  function make_BM_BHM(n) {
    // sequence_FS_variants(bind3(BM_BHM_expand, n), is_infinity, infinity_FS, is_limit, display)
    const variants = sequence_FS_variants(
      bind3(BM_BHM_expand, n),
      BM_is_infinity,
      BM_infinity_FS,
      BM_is_limit,
      BM_display,
    );

    register.push({
      id: n + '-bm-bhm',
      name: 'BMS(' + n + ' rows) + BHM',
      display: BM_display,
      able: BM_is_limit,
      compare: BM_compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: BM_from_display,
      init: () => [
        { expr: BM_INFINITY(), low: [[]], subitems: [] },
        { expr: [[], Array(n + 2).fill(1)], low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
      debug: { BHM_expand, BM_BHM_expand },
    });
  }

  const STATIC_MAX = 8; // 静态预注册常用小档；更大的 n 由家族注册表按需生成
  for (let n = 1; n <= STATIC_MAX; n++) make_BM_BHM(n);

  // —— 家族注册表：n 支持 1..100；>100 报错（见 core/register.js resolveFamilyInput）——
  function ensure_bm_bhm(n) {
    const id = n + '-bm-bhm';
    if (!window.register.some((x) => x.id === id)) make_BM_BHM(n);
    return id;
  }
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'bm-bhm',
    label: 'nBM-BHM',
    start: 1,
    max: 100,
    match(lower) {
      const m = /^(\d{1,3})-?bm-?bhm/.exec(lower); // 30BM-BHM / 30bm-bhm / 30bmbhm
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (n) => n + '-bm-bhm',
    ensure: ensure_bm_bhm,
  });
})();
