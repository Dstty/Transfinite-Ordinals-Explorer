// ============================================================================
//  notation/rewritten/minus1Y-nSS.js — (-1)Y n-tuple Sequence System (-1Y-nSS)
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/Minus1_Y_nSS.ts
//  表达式 = Expr = Column[]；Column = [number[]（n 元向量）, number（步数）]
//  id: -1y-1ss .. -1y-6ss（n = 0..5，见下方常量）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    deepcopy,
    index_of_last,
    lex_compare,
    number_compare,
    tuple_lex_compare,
  } = U;

  // ---------- 家族参数（可改） ----------
  const N_MIN = 0;
  const N_MAX = 5;

  // ---------- 表达式基础 ----------
  function INFINITY() {
    return [[[Infinity]]];
  }
  function EMPTY_COLUMN(n) {
    return [Array.from({ length: n }, () => 0), 0];
  }
  function is_infinity(e) {
    return '' + e === 'Infinity';
  }
  function infinity_FS(index, n) {
    return [EMPTY_COLUMN(n), [Array.from({ length: n }, () => 1), index]];
  }

  // ---------- 比较 ----------
  function column_compare(a, b) {
    return tuple_lex_compare(a, b, [
      (x, y) => lex_compare(x, y, number_compare),
      number_compare,
    ]);
  }
  function compare(a, b) {
    return lex_compare(a, b, column_compare);
  }

  // ---------- 父项 / 极限 / 根 ----------
  function parents(e, n) {
    if (is_infinity(e)) return [];
    const result = [];
    for (let i = 0; i < e.length; i++) {
      result[i] = [Array.from({ length: n }, () => -1), -1];

      for (let j = 0; j < n; j++) {
        let v = e[i][0][j] ?? 0;
        let p = j === 0 ? i - 1 : result[i][0][j - 1];
        while (p >= 0) {
          if (e[p][0][j] < v) break;
          p = j === 0 ? p - 1 : result[p][0][j - 1];
        }
        if (p < 0) break;
        result[i][0][j] = p;
      }

      let v = e[i][1];
      let p = n === 0 ? i - 1 : result[i][0][n - 1];
      while (p >= 0) {
        if (e[p][1] < v) break;
        p = n === 0 ? p - 1 : result[p][0][n - 1];
      }
      result[i][1] = p;
    }
    return result;
  }
  function is_limit(e, n) {
    return is_infinity(e) || (e.length > 0 && (n === 0 ? e[e.length - 1][1] > 0 : e[e.length - 1][0][0] > 0));
  }
  function root(P, n) {
    if (P.length === 0) return undefined;
    const right = P.length - 1;
    if (P[right][1] >= 0) return [P[right][1], n];
    const b = index_of_last(P[right][0], (pb) => pb >= 0);
    if (b === -1) return undefined;
    return [P[right][0][b], b];
  }

  // ---------- 上升 ----------
  function ascension_vector(e, r, b) {
    return Array.from({ length: b }, (_, i) => e[e.length - 1][0][i] - e[r][0][i]);
  }
  function ascension_thresholds(P, r, b) {
    const result = [];
    result[r] = b;
    for (let i = r + 1; i < P.length; i++) {
      let ai = 0;
      while (ai < b) {
        let p = i;
        while (p > r) p = P[p][0][ai];
        if (p < r) break;
        ai++;
      }
      result[i] = ai;
    }
    return result;
  }
  function ascend(ei, delta, b, w) {
    const result = [deepcopy(ei[0]), ei[1]]; // 浅拷贝 ei[1]（与源文件一致）
    for (let i = 0; i < b; i++) result[0][i] += delta[i] * w;
    return result;
  }

  // ---------- 基本列 ----------
  function FS(e, index, n) {
    if (is_infinity(e)) return infinity_FS(index, n);
    if (e.length === 0) return e;
    const P = parents(e, n);
    const rb = root(P, n);
    if (rb === undefined) return e.slice(0, -1);
    const right = e.length - 1;
    const [r, b] = rb;
    const width = right - r;

    const V = ascension_vector(e, r, b);
    const A = ascension_thresholds(P, r, b);
    const result = e.slice(0, -1).map((c) => [deepcopy(c[0]), c[1]]);

    for (let w = 1; w <= index; w++) {
      for (let i = r; i < right; i++) {
        result.push(ascend(e[i], V, A[i], w));
      }
      if (b === n) result[r + w * width][1] = e[right][1] - 1;
    }
    return result;
  }

  // ---------- 显示 / 解析 ----------
  function column_display(c) {
    const result_list = [...c[0], c[1]];
    while (result_list.length > 0 && result_list[result_list.length - 1] === 0) result_list.pop();
    return '(' + result_list.join(',') + ')';
  }
  function display(e) {
    if (is_infinity(e)) return 'Limit';
    return e.map(column_display).join('');
  }
  function from_display(s, n) {
    if (s.trim() === 'Limit') return INFINITY();

    let i = 0;
    function error() {
      throw new Error('Illegal input string: ' + s);
    }
    function skip_spaces() {
      while (i < s.length && s[i] === ' ') i++;
    }
    function parse_number() {
      skip_spaces();
      const start = i;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
      if (start === i) error();
      return parseInt(s.substring(start, i), 10);
    }
    function parse_column() {
      skip_spaces();
      if (i >= s.length || s[i] !== '(') error();
      i++;

      skip_spaces();
      const values = [];

      if (i < s.length && s[i] !== ')') {
        values.push(parse_number());
        while (true) {
          skip_spaces();
          if (i >= s.length || s[i] !== ',') break;
          i++;
          skip_spaces();
          if (i < s.length && s[i] === ')') break;
          values.push(parse_number());
        }
      }

      skip_spaces();
      if (i >= s.length || s[i] !== ')') error();
      i++;

      const arr = values.slice(0, n);
      while (arr.length < n) arr.push(0);
      const step = values.length > n ? values[n] : 0;
      return [arr, step];
    }
    function parse_expr() {
      const result = [];
      skip_spaces();
      while (i < s.length) {
        if (s[i] !== '(') break;
        result.push(parse_column());
        skip_spaces();
      }
      return result;
    }

    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return result;
  }

  // ---------- 注册家族 ----------
  function register_one(n) {
    register.push({
      id: '-1y-' + (n + 1) + 'ss',
      name: '(-1)Y-' + (n + 1) + 'SS',
      display,
      able: (e) => is_limit(e, n),
      compare,
      FS: (e, index) => FS(e, index, n),
      parse: (s) => from_display(s, n),
      init: () => [
        { expr: INFINITY(), low: [[]], subitems: [] },
        { expr: [EMPTY_COLUMN(n)], low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
    });
  }
  for (let n = N_MIN; n <= N_MAX; n++) register_one(n);

  // —— 家族注册表：档位 K = n+1（id 后缀）支持 1..100；>100 报错 ——
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'minus1y-nss',
    label: '-1Y-nSS',
    start: N_MIN + 1, // 最小档 -1y-1ss
    max: 100,
    match(lower) {
      const m = /^-1y-(\d{1,3})ss/.exec(lower); // -1y-30ss
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (k) => '-1y-' + k + 'ss',
    ensure(k) {
      const id = '-1y-' + k + 'ss';
      if (!window.register.some((x) => x.id === id)) register_one(k - 1);
      return id;
    },
  });
})();
