// ============================================================================
//  notation/rewritten/bt-minus1Y-nSS.js — Branching Transfinite (-1)Y-nSS
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/BT_Minus1_Y_nSS.ts
//  表达式 = Expr = [number[], Expr][]（Column = [number[] 行向量, Expr 嵌套]）
//  from_display 原样复制自 T_Minus1_Y_nSS.ts（源文件即从该文件 import）
//  id: bt--1y-1ss .. bt--1y-6ss（n = 0..5，见下方常量）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    index_of_last,
    lex_compare,
    lex_compare_by,
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
  function ZERO_COLUMN(n) {
    return [Array.from({ length: n }, () => 0), []];
  }
  // 供 from_display 复制的辅助（与 T_Minus1_Y_nSS.ts 内同名定义一致）
  function EMPTY_COLUMN(n) {
    return [Array.from({ length: n }, () => 0), []];
  }
  function ONE_COLUMN(n) {
    return n === 0 ? [[], [EMPTY_COLUMN(n)]] : [[1, ...Array.from({ length: n - 1 }, () => 0)], []];
  }
  function is_infinity(e) {
    return '' + e === '' + Infinity;
  }
  function infinity_FS(index, n) {
    let result = [];
    for (let i = index; i > 0; i--) {
      result = [[Array.from({ length: n }, () => i), result]];
    }
    return [ZERO_COLUMN(n), ...result];
  }

  // ---------- 显示（顶层 / 嵌套短写） ----------
  function is_zero_column(c) {
    return c[0].every((x) => x === 0) && c[1].length === 0;
  }
  function is_one_column(c) {
    const n = c[0].length;
    return n === 0
      ? c[1].length === 1 && is_zero_column(c[1][0])
      : c[0][0] === 1 && c[0].slice(1).every((x) => x === 0) && c[1].length === 0;
  }
  function column_display(c) {
    const result_list = [...c[0].map((x) => '' + x), display(c[1], false)];
    while (result_list.length > 0 && result_list[result_list.length - 1] === '0') result_list.pop();
    return '(' + result_list.join(',') + ')';
  }
  function display(e, top_level = true) {
    if (is_infinity(e)) return 'Limit';

    if (!top_level) {
      if (e.every(is_zero_column)) {
        return '' + e.length;
      }
      if (e.length === 2 && is_zero_column(e[0]) && is_one_column(e[1])) {
        return 'ω';
      }
    }

    return e.map(column_display).join('');
  }
  function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && !is_zero_column(e[e.length - 1]));
  }

  // ---------- 比较 ----------
  function column_compare(a, b) {
    return tuple_lex_compare(a, b, [lex_compare_by(number_compare), compare]);
  }
  function compare(a, b) {
    return lex_compare(a, b, column_compare);
  }

  // ---------- 父项（展平栈递归） ----------
  function compute_parents(e, n, stack = [], parent_stack = [], forbidden_stack = []) {
    const lS0 = stack.length;
    const result = [];
    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = stack.length;
      stack.push(e[i]);
      const result_i = Array.from({ length: n + 1 }, () => -1);
      parent_stack.push(result_i);
      for (let j = 0; j < n; j++) {
        let p = iS;
        while (p >= 0) {
          if (stack[p][0][j] < col[0][j]) break;
          p = j === 0 ? p - 1 : parent_stack[p][j - 1];
        }
        if (p < 0) break;
        result_i[j] = p;
      }
      let p = iS;
      while (p >= 0) {
        if (compare(stack[p][1], col[1]) < 0 && !forbidden_stack.includes(p)) break;
        p = n === 0 ? p - 1 : parent_stack[p][n - 1];
      }
      result_i[n] = p;

      forbidden_stack.push(iS);
      result[i] = [result_i, compute_parents(col[1], n, stack, parent_stack, forbidden_stack)];
      forbidden_stack.pop();
    }
    stack.splice(lS0);
    parent_stack.splice(lS0);
    return result;
  }

  // ---------- 尾层 / 根层 ----------
  function compute_tail_layer(e) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return -1;
    let current = e;
    let layer = 0;
    while (true) {
      const right = current.length - 1;
      if (current[right][1].length === 0) {
        return layer;
      }
      if (!is_limit(current[right][1])) {
        return layer;
      }
      current = current[right][1];
      layer++;
    }
  }
  function compute_root_layer(e, r) {
    let layer = 0;
    let len = e.length;
    let current = e;
    while (len <= r) {
      layer++;
      const right = current.length - 1;
      current = current[right][1];
      len += current.length;
    }
    return [layer, r - (len - current.length)];
  }
  function root(e, P) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return undefined;

    let current_P = P;
    const tail_layer = compute_tail_layer(e);
    for (let k = 0; k < tail_layer; k++) {
      const right = current_P.length - 1;
      current_P = current_P[right][1];
    }
    const right = current_P.length - 1;
    const b = index_of_last(current_P[right][0], (x) => x >= 0);
    const r = current_P[right][0][b];
    return [r, b];
  }

  // ---------- 上升 ----------
  function ascension_vector(e, r, b) {
    const stack = [...e];

    let current = e;
    const tail_layer = compute_tail_layer(e);
    for (let k = 0; k < tail_layer; k++) {
      const right = current.length - 1;
      current = current[right][1];
      stack.push(...current);
    }

    const e_r = stack[r];
    const e_right = stack[stack.length - 1];
    return Array.from({ length: b }, (_, j) => e_right[0][j] - e_r[0][j]);
  }
  function ascension_thresholds(e, P, r, b, thresholds_stack = []) {
    if (r === undefined) {
      return e.map((col) => [undefined, ascension_thresholds(col[1], [], undefined, b, [])]);
    }
    const lS0 = thresholds_stack.length;
    const result = [];

    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = thresholds_stack.length;

      if (iS < r && i !== e.length - 1) {
        thresholds_stack.push(undefined);
        result[i] = [undefined, ascension_thresholds(col[1], [], undefined, b, [])];
      } else {
        let Ai;
        if (iS === r) {
          Ai = b;
        } else if (iS > r) {
          Ai = 0;
          while (P[i][0][Ai] >= r && thresholds_stack[P[i][0][Ai]] > Ai) Ai++;
        }
        thresholds_stack.push(Ai);
        result[i] = [Ai, ascension_thresholds(col[1], P[i][1], r, b, thresholds_stack)];
      }
    }

    thresholds_stack.splice(lS0);
    return result;
  }
  function ascend_vector(v, A, V, w) {
    return v.map((x, i) => x + (i < A ? V[i] * w : 0));
  }
  function ascend_replace(e, tail, tail_layer, A, V, w) {
    const result = [];
    for (let i = 0; i < e.length; i++) {
      if (tail_layer === 0 && i === e.length - 1) {
        result.push(...tail);
      } else {
        const col = e[i];
        const Ai = A[i][0];

        const new_col_lower = ascend_vector(col[0], Ai ?? 0, V, w);
        const new_tail_layer = i !== e.length - 1 || tail_layer === undefined ? undefined : tail_layer - 1;
        result[i] = [new_col_lower, ascend_replace(col[1], tail, new_tail_layer, A[i][1], V, w)];
      }
    }
    return result;
  }

  // ---------- 基本列 ----------
  function FS(e, index, n) {
    if (is_infinity(e)) return infinity_FS(index, n);
    if (e.length === 0) return e;
    if (!is_limit(e)) return e.slice(0, -1);

    const P = compute_parents(e, n);
    const [r, b] = root(e, P);
    const t_layer = compute_tail_layer(e);
    const [r_layer, ri] = compute_root_layer(e, r);
    const A = ascension_thresholds(e, P, r, b);
    const V = ascension_vector(e, r, b);

    let current = e;
    let current_A = A;
    for (let k = 0; k < r_layer; k++) {
      const right = current.length - 1;
      current = current[right][1];
      current_A = current_A[right][1];
    }
    const copy_part = current.slice(ri);
    const copy_part_A = current_A.slice(ri);
    for (let k = r_layer; k < t_layer; k++) {
      const right = current.length - 1;
      current = current[right][1];
      current_A = current_A[right][1];
    }
    const right = current.length - 1;
    const tail_top = current[right][1].slice(0, -1);
    const tail_top_A = current_A[right][1].slice(0, -1);

    let result = [];
    for (let w = index; w > 0; w--) {
      result = ascend_replace(copy_part, result, t_layer - r_layer, copy_part_A, V, w);
      if (b === n) {
        result[0][1] = ascend_replace(tail_top, [], undefined, tail_top_A, V, w - 1);
      }
    }
    result = ascend_replace(e, result, t_layer, A, V, 0);
    return result;
  }

  // ---------- 解析（原样复制自 T_Minus1_Y_nSS.ts 的 from_display） ----------
  function from_display(s, n) {
    let i = 0;

    function error() {
      throw new Error('Illegal input string: ' + s);
    }
    function skip_spaces() {
      while (i < s.length && s[i] === ' ') i++;
    }
    function parseNumber() {
      skip_spaces();
      const start = i;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
      if (start === i) error();
      return parseInt(s.substring(start, i), 10);
    }
    function parseExpr(top_level) {
      skip_spaces();

      if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
        i += 5;
        return INFINITY();
      }

      if (!top_level) {
        if (i < s.length && s[i] >= '0' && s[i] <= '9') {
          const num = parseNumber();
          return Array.from({ length: num }, () => EMPTY_COLUMN(n));
        }
        if (i < s.length && (s[i] === 'ω' || s[i] === 'w')) {
          i++;
          return [EMPTY_COLUMN(n), ONE_COLUMN(n)];
        }
      }

      const result = [];
      skip_spaces();
      while (i < s.length && s[i] === '(') {
        result.push(parseColumn());
        skip_spaces();
      }
      return result;
    }
    function parseColumn() {
      skip_spaces();
      if (i >= s.length || s[i] !== '(') error();
      i++;

      skip_spaces();

      const arr = [];
      for (let j = 0; j < n; j++) {
        if (j > 0) {
          skip_spaces();
          if (i >= s.length || s[i] !== ',') {
            arr.push(0);
            continue;
          }
          i++;
        }
        skip_spaces();
        if (i < s.length && s[i] >= '0' && s[i] <= '9') {
          arr.push(parseNumber());
        } else {
          arr.push(0);
        }
      }

      skip_spaces();
      let step = [];
      if (i < s.length && s[i] === ',') {
        i++;
        step = parseExpr(false);
      }

      skip_spaces();
      if (i >= s.length || s[i] !== ')') error();
      i++;

      return [arr, step];
    }

    const result = parseExpr(true);
    skip_spaces();
    if (i !== s.length) error();
    return result;
  }

  // ---------- 注册家族 ----------
  function register_one(n) {
    register.push({
      id: 'bt--1y-' + (n + 1) + 'ss',
      name: 'BT(-1)Y-' + (n + 1) + 'SS',
      display,
      able: is_limit,
      compare,
      FS: (e, index) => FS(e, index, n),
      parse: (s) => from_display(s, n),
      init: () => [
        { expr: INFINITY(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
    });
  }
  for (let n = N_MIN; n <= N_MAX; n++) register_one(n);

  // —— 家族注册表：档位 K = n+1（id 后缀）支持 1..100；>100 报错 ——
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'bt-minus1y-nss',
    label: 'BT(-1)Y-nSS',
    start: N_MIN + 1,
    max: 100,
    match(lower) {
      const m = /^bt--1y-(\d{1,3})ss/.exec(lower); // bt--1y-30ss
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (k) => 'bt--1y-' + k + 'ss',
    ensure(k) {
      const id = 'bt--1y-' + k + 'ss';
      if (!window.register.some((x) => x.id === id)) register_one(k - 1);
      return id;
    },
  });
})();
