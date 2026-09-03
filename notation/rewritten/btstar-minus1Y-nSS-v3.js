// ============================================================================
//  notation/rewritten/btstar-minus1Y-nSS-v3.js — weak Transfinite* (-1)Y-nSS
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/BT_star_Minus1_Y_nSS-v3.ts
//  表达式 = Expr = Column[]；Column = { lower: number[]（n 元行向量）, higher: Expr[] }
//  （v3 与 v1/v2 不同：列是 {lower, higher} 对象式，且顶层父项用 height/vertical
//   （高度化）比较链，并带 FS_short（lnz-1 快捷）展开）
//  id: bt*--1y-2ss-v3 .. bt*--1y-6ss-v3（家族 n = 1..5，见下方常量）
//  compare 依赖 NEUTILS.object_lex_compare_by（与 utils.object_lex_compare 等价：
//  NEUTILS 只导出 by 版，无裸 object_lex_compare —— 见汇报）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    boolean_compare,
    index_of_last,
    lex_compare,
    lex_compare_by,
    number_compare,
    object_lex_compare_by,
    tuple_lex_compare,
    tuple_lex_compare_by,
  } = U;

  // ---------- 家族参数（可改） ----------
  const N_MIN = 1;
  const N_MAX = 5;

  // ---------- 表达式基础 ----------
  function INFINITY() {
    return [[[Infinity]]];
  }
  function ZERO_COLUMN(n) {
    return { lower: Array.from({ length: n }, () => 0), higher: [] };
  }
  function is_infinity(e) {
    return '' + e === '' + Infinity;
  }
  function infinity_FS(index, n) {
    let result = [];
    for (let i = index; i > 0; i--) {
      result = [{ lower: Array.from({ length: n }, (_, j) => i), higher: [result] }];
    }
    return [ZERO_COLUMN(n), ...result];
  }
  function is_zero_column(c) {
    return c.lower.every((x) => x === 0) && c.higher.length === 0;
  }

  // ---------- 显示 ----------
  function top_display(e, html) {
    if (e.length === 0) return html ? '∗' : '*';
    const d_e = display(e, html);
    return html ? '∗<sup>' + d_e + '</sup>' : '*^' + d_e;
  }
  function column_display(c, html) {
    if (c.higher.length === 0) return U.BM_column_display(c.lower);
    const result_list = [];
    for (const x of c.lower) result_list.push('' + x);
    for (const x of c.higher) result_list.push(top_display(x, html));
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
    return object_lex_compare_by(
      { lower: lex_compare_by(number_compare), higher: lex_compare_by(compare) },
      ['lower', 'higher'],
    )(a, b);
  }
  function compare(a, b) {
    return lex_compare(a, b, column_compare);
  }

  // ---------- 父项（下层：行 0..n-1；object 形式） ----------
  function compute_lower_parents(e, n, stack = [], parent_stack = []) {
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
          if (stack[p].lower[j] < col.lower[j]) break;
          p = j === 0 ? p - 1 : parent_stack[p][j - 1];
        }
        if (p < 0) break;
        result_i[j] = p;
      }

      result[i] = {
        parents: result_i,
        higher: col.higher.map((x) => compute_lower_parents(x, n, stack, parent_stack)),
      };
    }
    stack.splice(lS0);
    parent_stack.splice(lS0);
    return result;
  }

  // ---------- 上升阈值（object：threshold / higher） ----------
  function empty_ascension_thresholds(e) {
    return e.map((col) => ({ threshold: 0, higher: col.higher.map(empty_ascension_thresholds) }));
  }
  function ascension_thresholds(e, P, r, b, thresholds_stack = []) {
    const lS0 = thresholds_stack.length;
    const result = [];

    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = thresholds_stack.length;

      if (iS < r && i !== e.length - 1) {
        thresholds_stack.push(0);
        result[i] = { threshold: 0, higher: col.higher.map(empty_ascension_thresholds) };
      } else {
        let Ai = 0;
        if (iS === r) {
          Ai = b;
        } else if (iS > r) {
          while (P[i].parents[Ai] >= r && thresholds_stack[P[i].parents[Ai]] > Ai) Ai++;
        }
        thresholds_stack.push(Ai);
        result[i] = {
          threshold: Ai,
          higher: col.higher.map((x, ix) => ascension_thresholds(x, P[i].higher[ix], r, b, thresholds_stack)),
        };
      }
    }

    thresholds_stack.splice(lS0);
    return result;
  }

  // ---------- 高度（height）表示 ----------
  function to_height(base, current, AT, n) {
    const result = [];

    for (let i = 0; i < current.length; i++) {
      const col = current[i];
      const A_col = AT[i].threshold;
      const A_children = AT[i].higher;
      const result_i_lower = Array.from({ length: n }, (_, j) => (j < A_col ? col.lower[j] - base[j] : col.lower[j]));
      const result_i_higher = Array.from({ length: col.higher.length }, (_, j) =>
        to_height(base, col.higher[j], A_children[j], n),
      );
      result.push({ lower: result_i_lower, threshold: A_col, higher: result_i_higher });
    }

    return result;
  }

  function compute_vertical(col, n) {
    const [P] = compute_lower_parents([col], n);
    const [AT] = ascension_thresholds([col], [P], 0, n);
    return Array.from({ length: col.higher.length }, (_, i) => to_height(col.lower, col.higher[i], AT.higher[i], n));
  }

  function from_height(base, height, n) {
    const result = [];

    for (let i = 0; i < height.length; i++) {
      const col = height[i].lower;
      const A_col = height[i].threshold;
      const col_children = height[i].higher;
      const result_i_lower = Array.from({ length: n }, (_, j) => (j < A_col ? col[j] + base[j] : col[j]));
      const result_i_higher = Array.from({ length: col_children.length }, (_, j) =>
        from_height(base, col_children[j], n),
      );
      result.push({ lower: result_i_lower, higher: result_i_higher });
    }

    return result;
  }

  function height_column_compare(a, b) {
    return tuple_lex_compare(
      [a.lower.map((x, ix) => [x, ix < a.threshold]), a.higher],
      [b.lower.map((x, ix) => [x, ix < b.threshold]), b.higher],
      [lex_compare_by(tuple_lex_compare_by([number_compare, boolean_compare])), lex_compare_by(height_compare)],
    );
  }
  function height_compare(a, b) {
    return lex_compare(a, b, height_column_compare);
  }
  function vertical_compare(a, b) {
    return lex_compare(a, b, height_compare);
  }

  // ---------- 父项（顶层：第 n 行，用 vertical 比较键） ----------
  function compute_top_parents(e, P, n, parent_stack = [], vertical_stack = [], outer_stack = []) {
    const lS0 = parent_stack.length;
    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const Pi = P[i];
      const iS = parent_stack.length;
      parent_stack.push(P[i].parents);

      const [{ higher: AT }] = ascension_thresholds([col], [Pi], iS, n, Array(iS).fill(0));
      const vertical = col.higher.map((col_top, j) => to_height(col.lower, col_top, AT[j], n));
      vertical_stack.push(vertical);

      let p = iS;
      while (p >= 0) {
        if (!outer_stack.includes(p) && vertical_compare(vertical_stack[p], vertical) < 0) break;
        p = parent_stack[p][n - 1];
      }
      Pi.parents[n] = p;

      outer_stack.push(iS);
      for (let j = 0; j < col.higher.length; j++) {
        compute_top_parents(col.higher[j], Pi.higher[j], n, parent_stack, vertical_stack, outer_stack);
      }
      outer_stack.pop();
    }
    parent_stack.splice(lS0);
    vertical_stack.splice(lS0);
  }
  function compute_parents(e, n) {
    const P = compute_lower_parents(e, n);
    compute_top_parents(e, P, n);
    return P;
  }

  // ---------- 层遍历 ----------
  function next_layer(current) {
    const right = current.length - 1;
    const higher_right = current[right].higher.length - 1;
    return current[right].higher[higher_right];
  }
  function skip_layer(current, layer) {
    for (let i = 0; i < layer; i++) current = next_layer(current);
    return current;
  }

  // ---------- 尾层 / 根层 ----------
  function compute_tail(e) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return [-1, -1];
    let current = e,
      layer = 0,
      len = 0;
    while (true) {
      const right = current.length - 1;
      const higher_right = current[right].higher.length - 1;
      if (higher_right === -1) return [len + right, layer];
      if (current[right].higher[higher_right].length === 0) return [len + right, layer];
      len += current.length;
      layer++;
      current = next_layer(current);
    }
  }
  function compute_root_layer(e, r) {
    let layer = 0;
    let len = 0;
    let current = e;
    while (len + current.length <= r) {
      layer++;
      len += current.length;
      current = next_layer(current);
    }
    return [layer, r - len];
  }
  function root(e, P, t_layer) {
    if (e.length === 0 || is_zero_column(e[e.length - 1])) return undefined;

    const tail_P = skip_layer(P, t_layer);
    const right = tail_P.length - 1;
    const b = index_of_last(tail_P[right].parents, (x) => x >= 0);
    const r = tail_P[right].parents[b];
    return [r, b];
  }

  // ---------- 上升 ----------
  function ascension_vector(e, b, r_layer, r_index, t_layer) {
    const r_e = skip_layer(e, r_layer);
    const t_e = skip_layer(r_e, t_layer - r_layer);

    const col_r = r_e[r_index].lower;
    const col_t = t_e[t_e.length - 1].lower;

    return Array.from({ length: b }, (_, j) => col_t[j] - col_r[j]);
  }
  function ascend_vector(v, A, V, w) {
    return v.map((x, i) => x + (i < A ? V[i] * w : 0));
  }

  // ---------- 特殊展开判定 ----------
  function is_special(e, tail_layer) {
    if (tail_layer === 0) return false;
    if (tail_layer > 1) return is_special(skip_layer(e, tail_layer - 1), 1);

    const tail = e[e.length - 1];
    const next = next_layer(e);
    const next_tail = next[next.length - 1];
    if (next_tail.higher.length > 0) return false;
    if (index_of_last(next_tail.lower, (x) => x > 0) !== 0) return false;
    return next_tail.lower[0] === tail.lower[0] + 1;
  }
  function FS_special(e, tail_layer, index) {
    const right = e.length - 1;
    const higher_right = e[right].higher.length - 1;

    if (tail_layer === 1) {
      const vert_right = e[right].higher[higher_right].length - 1;
      const new_vert = e[right].higher[higher_right].slice(0, vert_right);
      return [
        ...e.slice(0, right),
        {
          lower: e[right].lower,
          higher: [...e[right].higher.slice(0, higher_right), ...Array.from({ length: index }, () => new_vert)],
        },
      ];
    }
    return [
      ...e.slice(0, right),
      {
        lower: e[right].lower,
        higher: [
          ...e[right].higher.slice(0, higher_right),
          FS_special(e[right].higher[higher_right], tail_layer - 1, index),
        ],
      },
    ];
  }

  // ---------- 上升替换（带 vertical 临界比较） ----------
  function ascend_replace(e, tail, tail_layer, A, V, w, critical_vert) {
    const result = [];
    for (let i = 0; i < e.length; i++) {
      if (tail_layer === 0 && i === e.length - 1) {
        result.push(...tail);
      } else {
        const col = e[i];
        const Ai = A[i].threshold;
        const higher_right = col.higher.length - 1;

        const new_col_lower = ascend_vector(col.lower, Ai ?? 0, V, w);
        const new_tail_layer = i !== e.length - 1 || tail_layer === undefined ? undefined : tail_layer - 1;

        const n = col.lower.length;

        const col_vertical = compute_vertical(col, n);

        let m = 0;
        while (m < col_vertical.length && m < critical_vert.length) {
          if (m === col_vertical.length - 1 && new_tail_layer !== undefined) break;
          const cmp = height_compare(col_vertical[m], critical_vert[m]);
          if (cmp > 0) break;
          if (cmp < 0) {
            if (new_tail_layer !== undefined) m = col_vertical.length - 1;
            else m = col_vertical.length;
            break;
          }
          m++;
        }

        const new_higher = col_vertical.slice(0, m).map((x) => from_height(new_col_lower, x, n));
        for (let j = m; j < col_vertical.length; j++) {
          const new_term = ascend_replace(
            col.higher[j],
            tail,
            j === higher_right ? new_tail_layer : undefined,
            A[i].higher[j],
            V,
            w,
            critical_vert,
          );
          new_higher.push(new_term);
        }

        result[i] = {
          lower: new_col_lower,
          higher: new_higher,
        };
      }
    }
    return result;
  }

  // ---------- 基本列 ----------
  function expand(e, index, n, lnz_m1) {
    if (is_infinity(e)) return infinity_FS(index, n);
    if (e.length === 0) return e;
    if (!is_limit(e)) return e.slice(0, -1);

    const P = compute_parents(e, n);
    const [t, t_layer] = compute_tail(e);
    const rb = root(e, P, t_layer);
    const [r, b] = rb;
    if (is_special(e, t_layer)) return FS_special(e, t_layer, index);
    const [r_layer, r_index] = compute_root_layer(e, r);
    const A = ascension_thresholds(e, P, r, b);
    const V = ascension_vector(e, b, r_layer, r_index, t_layer);

    const copy_part = skip_layer(e, r_layer).slice(r_index);
    const copy_part_A = skip_layer(A, r_layer).slice(r_index);
    const e_t = skip_layer(e, t_layer);
    const tail_right = e_t.length - 1;
    const tail = e_t[tail_right];

    const critical_vert = compute_vertical(tail, n).slice(0, -1);

    let result = [];

    if (lnz_m1 && index > 0) {
      // 1: cut tail; 2: lnz-1; 3+: normal expansion.
      const skip_2 = copy_part.length === 1 || (copy_part.length === 2 && r_layer === t_layer);
      let skip_1;
      if (b === n) skip_1 = true;
      else {
        const root_column = copy_part[0];
        if (b === n - 1) skip_1 = root_column.higher.length === 0;
        else skip_1 = root_column.lower[b + 1] === 0;
      }

      if (!skip_1 && index > 0) {
        if (index === 1) {
          if (b === n) {
            result = [{ lower: tail.lower, higher: tail.higher.slice(0, -1) }];
          } else {
            result = [{ lower: tail.lower.map((x, ix) => (ix === b ? x - 1 : x)), higher: [] }];
          }
        }
        index--;
      }
      if (!skip_2 && index > 0) {
        if (index === 1) {
          result = ascend_replace([copy_part[0]], [], undefined, [copy_part_A[0]], V, 1, []);
          if (b === n) {
            result[0].higher = critical_vert.map((x) => from_height(result[0].lower, x, n));
          }
        }
        index--;
      }
    }

    for (let w = index; w > 0; w--) {
      result = ascend_replace(copy_part, result, t_layer - r_layer, copy_part_A, V, w, critical_vert);
      if (b === n) {
        result[0].higher = critical_vert.map((x) => from_height(result[0].lower, x, n));
      }
    }
    result = ascend_replace(e, result, t_layer, A, V, 0, []);
    return result;
  }

  function FS(e, index, n) {
    return expand(e, index, n, false);
  }
  function FS_short(e, index, n) {
    return expand(e, index, n, true);
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
      return { lower: arr, higher };
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
      id: 'bt*--1y-' + (n + 1) + 'ss-v3',
      name: 'weak BT*(-1)Y-' + (n + 1) + 'SS',
      display: (e) => display(e, false),
      able: is_limit,
      compare,
      FS: (e, index) => FS(e, index, n),
      FSalter: (e, index) => FS_short(e, index, n),
      parse: (s) => from_display(s, n),
      init: () => [
        { expr: INFINITY(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
    });
  }
  for (let n = N_MIN; n <= N_MAX; n++) register_one(n);

  // —— 家族注册表：档位 K = n+1（id 后缀带 -v3）支持 2..100；>100 报错 ——
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'btstar-minus1y-nss-v3',
    label: 'weak BT*(-1)Y-nSS',
    start: N_MIN + 1, // 最小档 bt*--1y-2ss-v3
    max: 100,
    match(lower) {
      const m = /^bt\*--1y-(\d{1,3})ss-v3/.exec(lower); // bt*--1y-30ss-v3
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (k) => 'bt*--1y-' + k + 'ss-v3',
    ensure(k) {
      const id = 'bt*--1y-' + k + 'ss-v3';
      if (!window.register.some((x) => x.id === id)) register_one(k - 1);
      return id;
    },
  });
})();
