// ============================================================================
//  notation/rewritten/btstar-minus1Y-nSS.js — Transfinite* (-1)Y-nSS
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/BT_star_Minus1_Y_nSS.ts
//  表达式 = Expr = Column[]；Column = [number[]（n 元行向量）, Expr[]（星顶列表）]
//  家族 n = 1..5 → id: bt*--1y-2ss .. bt*--1y-6ss（id 含 * 字符，保持原样）
//  FS = 源文件自带完整基本列函数（按 index 展开，含 is_infinity/后继裁剪处理）
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
  const N_MIN = 1;
  const N_MAX = 5;

  // ---------- 表达式基础 ----------
  function INFINITY() {
    return [[[Infinity]]];
  }
  function ZERO_COLUMN(n) {
    return [Array.from({ length: n }, () => 0), []];
  }
  function is_infinity(e) {
    return '' + e === '' + Infinity;
  }
  function infinity_FS(index, n) {
    let result = [];
    for (let i = index; i > 0; i--) {
      result = [[Array.from({ length: n }, () => i), [result]]];
    }
    return [ZERO_COLUMN(n), ...result];
  }
  function is_zero_column(c) {
    return c[0].every((x) => x === 0) && c[1].length === 0;
  }

  // ---------- 显示 ----------
  function top_display(e, html) {
    if (e.length === 0) return html ? '∗' : '*';
    let d_e = display(e, html);
    return html ? '∗<sup>' + d_e + '</sup>' : '*^' + d_e;
  }
  function column_display(c, html) {
    let result_list = [...c[0].map((x) => '' + x), ...c[1].map((x) => top_display(x, html))];
    while (result_list.length > 0 && result_list[result_list.length - 1] === '0') result_list.pop();
    return '(' + result_list.join(',') + ')';
  }
  function display(e, html) {
    if (is_infinity(e)) return 'Limit';
    return e.map((c) => column_display(c, html)).join('');
  }
  function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && !is_zero_column(e[e.length - 1]));
  }

  // ---------- 比较 ----------
  function column_compare(a, b) {
    return tuple_lex_compare(a, b, [lex_compare_by(number_compare), lex_compare_by(compare)]);
  }
  function compare(a, b) {
    return lex_compare(a, b, column_compare);
  }

  // ---------- 星顶辅助 ----------
  function remove_base(a, base) {
    return a.map((col) => [col[0].map((x, i) => (i === 0 ? x - base : x)), col[1].map((x) => remove_base(x, base))]);
  }
  function highest_without_base(c) {
    return c[1].map((x) => remove_base(x, c[0][0] + 1));
  }
  function is_one_line_column(c, value) {
    return c[0][0] === value && c[0].slice(1).every((x) => x === 0) && c[1].length === 0;
  }
  function is_special_column(c) {
    let higher_right = c[1].length - 1;
    if (higher_right < 0) return false;
    let vert_right = c[1][higher_right].length - 1;
    if (vert_right < 0) return false;
    return is_one_line_column(c[1][higher_right][vert_right], c[0][0] + 1);
  }

  // ---------- 父项（展平栈递归，带星顶比较） ----------
  function compute_parents(e, n, stack = [], parent_stack = [], forbidden_stack = []) {
    const lS0 = stack.length;
    let result = [];
    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = stack.length;
      stack.push(e[i]);
      let result_i = Array.from({ length: n + 1 }, () => -1);
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
        if (
          !forbidden_stack.includes(p) &&
          lex_compare(highest_without_base(stack[p]), highest_without_base(col), compare) < 0
        )
          break;
        p = n === 0 ? p - 1 : parent_stack[p][n - 1];
      }
      result_i[n] = p;

      forbidden_stack.push(iS);
      result[i] = [result_i, col[1].map((x) => compute_parents(x, n, stack, parent_stack, forbidden_stack))];
      forbidden_stack.pop();
    }
    stack.splice(lS0);
    parent_stack.splice(lS0);
    return result;
  }

  // ---------- 尾层 / 根层 ----------
  function compute_tail_layer(e) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return [-1, false];
    let current = e,
      layer = 0;
    while (true) {
      let right = current.length - 1;
      let higher_right = current[right][1].length - 1;
      if (current[right][1].length === 0) {
        return [layer, false];
      }
      if (is_special_column(current[right])) {
        return [layer, true];
      }
      if (current[right][1][higher_right].length === 0) {
        return [layer, false];
      }
      current = current[right][1][higher_right];
      layer++;
    }
  }
  function compute_root_layer(e, r) {
    let layer = 0;
    let len = e.length;
    let current = e;
    while (len <= r) {
      layer++;
      let right = current.length - 1;
      let higher_right = current[right][1].length - 1;
      current = current[right][1][higher_right];
      len += current.length;
    }
    return [layer, r - (len - current.length)];
  }
  function root(e, P) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return undefined;

    let current_P = P;
    let [tail_layer] = compute_tail_layer(e);
    for (let k = 0; k < tail_layer; k++) {
      let right = current_P.length - 1;
      let higher_right = current_P[right][1].length - 1;
      current_P = current_P[right][1][higher_right];
    }
    let right = current_P.length - 1;
    let b = index_of_last(current_P[right][0], (x) => x >= 0);
    let r = current_P[right][0][b];
    return [r, b];
  }

  // ---------- 上升 ----------
  function ascension_vector(e, r, b) {
    let stack = [...e];

    let current = e;
    let [tail_layer] = compute_tail_layer(e);
    for (let k = 0; k < tail_layer; k++) {
      let right = current.length - 1;
      let higher_right = current[right][1].length - 1;
      current = current[right][1][higher_right];
      stack.push(...current);
    }

    let e_r = stack[r];
    let e_right = stack[stack.length - 1];
    return Array.from({ length: b }, (_, j) => e_right[0][j] - e_r[0][j]);
  }
  function undefined_AT(e) {
    return e.map((col) => [undefined, col[1].map(undefined_AT)]);
  }
  function ascension_thresholds(e, P, r, b, thresholds_stack = []) {
    if (r === undefined) {
      return undefined_AT(e);
    }
    const lS0 = thresholds_stack.length;
    const result = [];

    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = thresholds_stack.length;

      if (iS < r && i !== e.length - 1) {
        thresholds_stack.push(undefined);
        result[i] = [undefined, col[1].map(undefined_AT)];
      } else {
        let Ai;
        if (iS === r) {
          Ai = b;
        } else if (iS > r) {
          Ai = 0;
          while (P[i][0][Ai] >= r && thresholds_stack[P[i][0][Ai]] > Ai) Ai++;
        }
        thresholds_stack.push(Ai);
        result[i] = [Ai, col[1].map((x, ix) => ascension_thresholds(x, P[i][1][ix], r, b, thresholds_stack))];
      }
    }

    thresholds_stack.splice(lS0);
    return result;
  }
  function ascend_vector(v, A, V, w) {
    return v.map((x, i) => x + (i < A ? V[i] * w : 0));
  }
  function ascend_replace(e, tail, tail_layer, A, V, w) {
    let result = [];
    for (let i = 0; i < e.length; i++) {
      if (tail_layer === 0 && i === e.length - 1) {
        result.push(...tail);
      } else {
        const col = e[i];
        const Ai = A[i][0];
        const higher_right = col[1].length - 1;

        const new_col_lower = ascend_vector(col[0], Ai ?? 0, V, w);
        const new_tail_layer = i !== e.length - 1 || tail_layer === undefined ? undefined : tail_layer - 1;
        result[i] = [
          new_col_lower,
          col[1].map((x, ix) =>
            ascend_replace(x, tail, ix === higher_right ? new_tail_layer : undefined, A[i][1][ix], V, w),
          ),
        ];
      }
    }
    return result;
  }

  // ---------- 特殊列展开 ----------
  function FS_special(e, tail_layer, index) {
    const right = e.length - 1;
    const higher_right = e[right][1].length - 1;

    if (tail_layer === 0) {
      let vert_right = e[right][1][higher_right].length - 1;
      let new_vert = e[right][1][higher_right].slice(0, vert_right);
      return [
        ...e.slice(0, right),
        [e[right][0], [...e[right][1].slice(0, higher_right), ...Array.from({ length: index }, () => new_vert)]],
      ];
    }
    return [
      ...e.slice(0, right),
      [
        e[right][0],
        [...e[right][1].slice(0, higher_right), FS_special(e[right][1][higher_right], tail_layer - 1, index)],
      ],
    ];
  }

  // ---------- 基本列 ----------
  function FS(e, index, n) {
    if (is_infinity(e)) return infinity_FS(index, n);
    if (e.length === 0) return e;
    if (!is_limit(e)) return e.slice(0, -1);

    const P = compute_parents(e, n);
    const [r, b] = root(e, P);
    const [t_layer, is_special] = compute_tail_layer(e);
    if (is_special) return FS_special(e, t_layer, index);
    const [r_layer, ri] = compute_root_layer(e, r);
    const A = ascension_thresholds(e, P, r, b);
    const V = ascension_vector(e, r, b);

    let current = e,
      current_A = A;
    for (let k = 0; k < r_layer; k++) {
      const right = current.length - 1;
      const higher_right = current[right][1].length - 1;
      current = current[right][1][higher_right];
      current_A = current_A[right][1][higher_right];
    }
    const copy_part = current.slice(ri);
    const copy_part_A = current_A.slice(ri);
    for (let k = r_layer; k < t_layer; k++) {
      const right = current.length - 1;
      const higher_right = current[right][1].length - 1;
      current = current[right][1][higher_right];
      current_A = current_A[right][1][higher_right];
    }
    const right = current.length - 1;
    const tail_top = current[right][1].slice(0, -1);
    const tail_top_A = current_A[right][1].slice(0, -1);

    let result = [];
    for (let w = index; w > 0; w--) {
      result = ascend_replace(copy_part, result, t_layer - r_layer, copy_part_A, V, w);
      if (b === n) {
        result[0][1] = tail_top.map((x, ix) => ascend_replace(x, [], undefined, tail_top_A[ix], V, w - 1));
      }
    }
    result = ascend_replace(e, result, t_layer, A, V, 0);
    return result;
  }

  // ---------- 解析 ----------
  function from_display(s, n) {
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
    function parse_higher() {
      if (i >= s.length || (s[i] !== '*' && s[i] !== '∗')) error();
      i++;
      skip_spaces();
      if (i < s.length && s[i] === '^') {
        i++;
        return parse_expr();
      }
      return [];
    }
    function parse_column() {
      skip_spaces();
      if (i >= s.length || s[i] !== '(') error();
      i++;

      const numbers = [];
      const higher = [];

      skip_spaces();
      while (i < s.length && s[i] !== ')' && s[i] >= '0' && s[i] <= '9' && numbers.length < n) {
        numbers.push(parse_number());
        skip_spaces();
        if (i < s.length && s[i] === ',') i++;
        skip_spaces();
      }

      while (i < s.length && s[i] !== ')') {
        skip_spaces();
        if (s[i] === '*' || s[i] === '∗') {
          if (numbers.length !== n) error();
          higher.push(parse_higher());
        } else {
          error();
        }
        skip_spaces();
        if (i < s.length && s[i] === ',') i++;
      }

      if (i >= s.length) error();
      i++;

      const arr = numbers.slice(0, n);
      while (arr.length < n) arr.push(0);
      return [arr, higher];
    }
    function parse_expr() {
      const result = [];
      skip_spaces();
      while (i < s.length && s[i] === '(') {
        result.push(parse_column());
        skip_spaces();
      }
      return result;
    }

    skip_spaces();
    if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
      i += 5;
      skip_spaces();
      if (i !== s.length) error();
      return INFINITY();
    }

    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return result;
  }

  // ---------- 注册家族 ----------
  function register_one(n) {
    register.push({
      id: 'bt*--1y-' + (n + 1) + 'ss',
      name: 'BT*(-1)Y-' + (n + 1) + 'SS v1',
      display: (e) => display(e, false),
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

  // —— 家族注册表：档位 K = n+1（id 后缀）支持 2..100；>100 报错 ——
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'btstar-minus1y-nss',
    label: 'BT*(-1)Y-nSS',
    start: N_MIN + 1, // 最小档 bt*--1y-2ss
    max: 100,
    match(lower) {
      const m = /^bt\*--1y-(\d{1,3})ss(?!['-])/.exec(lower); // bt*--1y-30ss（不吃 v2 的尾撇 / v3 的 -v3）
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (k) => 'bt*--1y-' + k + 'ss',
    ensure(k) {
      const id = 'bt*--1y-' + k + 'ss';
      if (!window.register.some((x) => x.id === id)) register_one(k - 1);
      return id;
    },
  });
})();
