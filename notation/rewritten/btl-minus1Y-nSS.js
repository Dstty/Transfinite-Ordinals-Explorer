// ============================================================================
//  notation/rewritten/btl-minus1Y-nSS.js — Asheep's Transfinite nSS (BTL(-1)Y-nSS)
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/BTL_Minus1_Y_nSS.ts
//  注册表视图表达式 = ExprCompact = [lower, mark, higher][]（列 = 三元组）；
//  内部算法统一用 Expr = Column[]（Column = { lower: number[], mark: number,
//  higher: Expr[] }），边界处 compactify / decompactify 互相转换。
//  展开类型：lower / higher / star / mark / mark*（见源文件注释）
//  id: btl--1y-2ss .. btl--1y-6ss（家族 n = 1..5，见下方常量）
//  compare 依赖 NEUTILS.object_lex_compare_by（与 utils.object_lex_compare 等价：
//  NEUTILS 只导出 by 版，无裸 object_lex_compare —— 见汇报）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    index_of_last,
    lex_compare,
    lex_compare_by,
    number_compare,
    object_lex_compare_by,
  } = U;

  // ---------- 家族参数（可改） ----------
  const N_MIN = 1;
  const N_MAX = 5;

  // ---------- 表达式基础（compact ↔ 内部 Expr） ----------
  function is_infinity(e) {
    return '' + e === '' + Infinity;
  }
  function INFINITY() {
    return [[[Infinity]]];
  }
  function INFINITY_compact() {
    return INFINITY();
  }
  function compactify(e) {
    if (is_infinity(e)) return INFINITY_compact();
    return e.map((col) => [col.lower, col.mark, col.higher.map(compactify)]);
  }
  function decompactify(e) {
    if (is_infinity(e)) return INFINITY();
    return e.map((col) => ({ lower: col[0], mark: col[1], higher: col[2].map(decompactify) }));
  }
  function ZERO_COLUMN(n) {
    return { lower: Array.from({ length: n }, () => 0), mark: 0, higher: [] };
  }
  function infinity_FS(index, n) {
    let result = [];
    for (let i = index; i > 0; i--) {
      result = [{ lower: Array.from({ length: n }, () => i), mark: i, higher: [result] }];
    }
    return [ZERO_COLUMN(n), ...result];
  }
  function is_zero_column(col) {
    return col.lower.every((x) => x === 0) && col.higher.length === 0;
  }

  // ---------- 显示 ----------
  function top_display(e, u, html, use_sc) {
    if (e.length === 0) return '' + u;
    const d_e = display(e, html, use_sc);
    return html ? '' + u + '<sup>' + d_e + '</sup>' : '' + u + '^' + d_e;
  }
  function column_display(col, html, use_sc) {
    if (col.higher.length > 0) {
      const higher_display = col.higher.map((x) => top_display(x, col.mark, html, use_sc));

      if (use_sc) {
        return '(' + col.lower.join(',') + ';' + higher_display.join(',') + ')';
      } else {
        let j = col.lower.length;
        if (col.higher[0].length > 0) {
          j = index_of_last(col.lower, (x) => x !== col.mark) + 1;
        }
        return '(' + [...col.lower.slice(0, j), ...higher_display].join(',') + ')';
      }
    } else {
      const j = index_of_last(col.lower, (x) => x > 0) + 1;
      return '(' + col.lower.slice(0, j).join(',') + ')';
    }
  }
  function display(e, html, separate) {
    if (is_infinity(e)) return 'Limit';
    return e.map((c) => column_display(c, html, separate)).join('');
  }
  function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && !is_zero_column(e[e.length - 1]));
  }

  // ---------- 比较 ----------
  function column_compare(a, b) {
    return object_lex_compare_by(
      {
        lower: lex_compare_by(number_compare),
        mark: number_compare,
        higher: lex_compare_by(compare),
      },
      ['lower', 'mark', 'higher'],
    )(a, b);
  }
  function compare(a, b) {
    return lex_compare(a, b, column_compare);
  }

  // ---------- 星顶辅助 ----------
  function remove_base(e, base) {
    function expr_remove_base(a) {
      return a.map(col_remove_base);
    }
    function col_remove_base(col) {
      return {
        lower: col.lower.map((x, i) => (i === 0 ? x - base : x)),
        mark: col.mark,
        higher: col.higher.map(expr_remove_base),
      };
    }
    return expr_remove_base(e);
  }
  function higher_remove_base(c) {
    return c.higher.map((x) => remove_base(x, c.lower[0] + 1));
  }
  function is_one_line_column(c, value) {
    return c.lower[0] === value && c.lower.slice(1).every((x) => x === 0) && c.higher.length === 0;
  }

  // ---------- 父项（含展开类型） ----------
  function compute_parents(e, n, column_stack = [], parent_stack = [], outer_stack = []) {
    const lS0 = column_stack.length;
    const result = [];

    for (let i = 0; i < e.length; i++) {
      const col = e[i];
      const iS = column_stack.length;
      column_stack.push(e[i]);
      const result_i = {
        entry_parents: Array.from({ length: n + 1 }, () => -1),
        type: undefined,
        is_tail: false,
      };
      parent_stack.push(result_i);
      for (let j = 0; j < n; j++) {
        let p = iS;
        while (p >= 0) {
          if (column_stack[p].lower[j] < col.lower[j]) break;
          p = j === 0 ? p - 1 : parent_stack[p].entry_parents[j - 1];
        }
        if (p < 0) break;
        result_i.entry_parents[j] = p;
      }
      {
        let p = iS;
        while (p >= 0) {
          if (column_stack[p].mark < col.mark && outer_stack.includes(p)) {
            result_i.type = 'mark';
            if (col.higher.length === 1 && col.higher[0].length === 0) {
              result_i.type = 'mark*';
            }
            break;
          } else if (
            column_stack[p].mark <= col.mark &&
            !outer_stack.includes(p) &&
            lex_compare(higher_remove_base(column_stack[p]), higher_remove_base(col), compare) < 0
          ) {
            result_i.type = 'higher';
            break;
          }
          p = parent_stack[p].entry_parents[n - 1];
        }
        result_i.entry_parents[n] = p;
        if (p < 0) {
          if (lS0 > 0 && is_one_line_column(col, column_stack[lS0 - 1].lower[0] + 1)) {
            result_i.type = 'star';
          } else {
            result_i.type = 'lower';
          }
          result_i.is_tail = true;
        } else {
          const higher_right = col.higher.length - 1;
          if (col.higher[higher_right].length === 0) result_i.is_tail = true;
        }
      }

      outer_stack.push(iS);
      result[i] = {
        ...result_i,
        higher: col.higher.map((x) => compute_parents(x, n, column_stack, parent_stack, outer_stack)),
      };
      outer_stack.pop();
    }
    column_stack.splice(lS0);
    parent_stack.splice(lS0);
    return result;
  }

  // ---------- 层遍历 ----------
  function get_right_higher(e) {
    const right = e.length - 1;
    const higher_right = e[right].higher.length - 1;
    return e[right].higher[higher_right];
  }
  function skip_to_layer(e, layer) {
    let current = e;
    for (let k = 0; k < layer; k++) current = get_right_higher(current);
    return current;
  }

  // ---------- 尾层 / 根层 ----------
  function compute_tail_info(P) {
    let current_P = P,
      layer = 0;
    while (true) {
      const right = current_P.length - 1;
      if (current_P[right].is_tail) return [layer, current_P[right].type];
      current_P = get_right_higher(current_P);
      layer++;
    }
  }
  function root(P, t_layer) {
    let current_P = P;
    for (let k = 0; k < t_layer; k++) {
      const right = current_P.length - 1;
      const higher_right = current_P[right].higher.length - 1;
      current_P = current_P[right].higher[higher_right];
    }
    const right = current_P.length - 1;
    const b = index_of_last(current_P[right].entry_parents, (x) => x >= 0);
    const r = current_P[right].entry_parents[b];
    return [r, b];
  }
  function compute_root_layer(e, r) {
    let layer = 0;
    let len = e.length;
    let current = e;
    while (len <= r) {
      layer++;
      current = get_right_higher(current);
      len += current.length;
    }
    return [layer, r - (len - current.length)];
  }

  // ---------- 上升 ----------
  function ascension_vector(e, r, b, t_layer) {
    const stack = [...e];

    let current = e;
    for (let k = 0; k < t_layer; k++) {
      const right = current.length - 1;
      const higher_right = current[right].higher.length - 1;
      current = current[right].higher[higher_right];
      stack.push(...current);
    }

    const e_r = stack[r];
    const e_right = stack[stack.length - 1];
    return Array.from({ length: b }, (_, j) => e_right.lower[j] - e_r.lower[j]);
  }
  function undefined_AT(e) {
    return e.map((col) => ({ higher: col.higher.map(undefined_AT) }));
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
        result[i] = { higher: col.higher.map(undefined_AT) };
      } else {
        let Ai = undefined;
        if (iS === r) {
          Ai = b;
        } else if (iS > r) {
          Ai = 0;
          while (P[i].entry_parents[Ai] >= r && thresholds_stack[P[i].entry_parents[Ai]] > Ai) Ai++;
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
  function ascend_vector(v, A, V, w) {
    return v.map((x, i) => x + (i < A ? V[i] * w : 0));
  }
  function ascend_replace(e, tail, t_layer, A, V, w) {
    const result = [];
    for (let i = 0; i < e.length; i++) {
      if (t_layer === 0 && i === e.length - 1) {
        result.push(...tail);
      } else {
        const col = e[i];
        const Ai = A[i].threshold;
        const higher_right = col.higher.length - 1;

        const new_col_lower = ascend_vector(col.lower, Ai ?? 0, V, w);
        const new_tail_layer = i !== e.length - 1 || t_layer === undefined ? undefined : t_layer - 1;
        result[i] = {
          lower: new_col_lower,
          mark: col.mark,
          higher: col.higher.map((x, ix) =>
            ascend_replace(x, tail, ix === higher_right ? new_tail_layer : undefined, A[i].higher[ix], V, w),
          ),
        };
        if (result[i].higher.length === 0) result[i].mark = 0;
      }
    }
    return result;
  }

  // ---------- star 展开 ----------
  function FS_star(e, tail_layer, index) {
    const right = e.length - 1;
    const higher_right = e[right].higher.length - 1;

    if (tail_layer === 1) {
      const vert_right = e[right].higher[higher_right].length - 1;
      const new_vert = e[right].higher[higher_right].slice(0, vert_right);
      return [
        ...e.slice(0, right),
        {
          lower: e[right].lower,
          mark: higher_right === 0 && index === 0 ? 0 : e[right].mark,
          higher: [...e[right].higher.slice(0, higher_right), ...Array.from({ length: index }, () => new_vert)],
        },
      ];
    }
    return [
      ...e.slice(0, right),
      {
        lower: e[right].lower,
        mark: e[right].mark,
        higher: [...e[right].higher.slice(0, higher_right), FS_star(e[right].higher[higher_right], tail_layer - 1, index)],
      },
    ];
  }

  // ---------- 基本列 ----------
  function FS(e, index, n) {
    if (is_infinity(e)) return infinity_FS(index, n);
    if (e.length === 0) return e;

    if (!is_limit(e)) return e.slice(0, -1);

    const P = compute_parents(e, n);
    const [t_layer, type] = compute_tail_info(P);

    if (type === undefined) return e.slice(0, -1);
    if (type === 'star') return FS_star(e, t_layer, index);

    const rb = root(P, t_layer);
    const [r, b] = rb;
    const [r_layer, ri] = compute_root_layer(e, r);
    const V = ascension_vector(e, r, b, t_layer);
    const A = ascension_thresholds(e, P, r, b);

    let copy_part = skip_to_layer(e, r_layer).slice(ri);
    let copy_part_A = skip_to_layer(A, r_layer).slice(ri);
    let diff_layer = t_layer - r_layer;
    if (type === 'mark') {
      const higher_right = copy_part[0].higher.length - 1;
      copy_part = [
        {
          lower: copy_part[0].lower,
          mark: 0,
          higher: [],
        },
        ...copy_part[0].higher[higher_right],
      ];
      copy_part_A = [
        {
          threshold: b,
          higher: [],
        },
        ...copy_part_A[0].higher[higher_right],
      ];
      diff_layer--;
    }
    const current = skip_to_layer(e, t_layer);
    const current_A = skip_to_layer(A, t_layer);
    const right = current.length - 1;
    const tail_top = current[right].higher.slice(0, -1);
    const tail_top_A = current_A[right].higher.slice(0, -1);
    const tail_mark = tail_top.length === 0 ? 0 : current[right].mark;

    let result = [];
    for (let w = index; w > 0; w--) {
      result = ascend_replace(copy_part, result, diff_layer, copy_part_A, V, w);
      if (type === 'higher' || type === 'mark') {
        result[0].mark = tail_mark;
        result[0].higher = tail_top.map((x, ix) => ascend_replace(x, [], undefined, tail_top_A[ix], V, w - 1));
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
    function parse_column() {
      skip_spaces();
      if (i >= s.length || s[i] !== '(') error();
      i++;

      const numbers = [];
      const higher = [];
      let mark;
      let in_higher = false;
      let expect_value = true;

      while (i < s.length && s[i] !== ')') {
        skip_spaces();
        if (i >= s.length) break;

        if (s[i] === ',' || s[i] === ';') {
          if (expect_value) error();
          if (s[i] === ';') {
            if (numbers.length !== n) error();
            in_higher = true;
          }
          i++;
          expect_value = true;
          continue;
        }

        if (!expect_value) error();
        const m = parse_number();

        skip_spaces();
        if (i < s.length && s[i] === '^') {
          in_higher = true;
          if (mark === undefined) {
            mark = m;
          } else if (m !== mark) {
            error();
          }
          i++;
          higher.push(parse_expr());
        } else if (in_higher || numbers.length >= n) {
          if (mark === undefined) {
            mark = m;
          } else if (m !== mark) {
            error();
          }
          higher.push([]);
        } else {
          numbers.push(m);
        }
        expect_value = false;
      }

      if (i >= s.length) error();
      i++;

      while (numbers.length < n) numbers.push(mark ?? 0);

      const final_mark = higher.length === 0 ? 0 : mark ?? 0;
      if (higher.length > 0 && final_mark === 0) error();

      return { lower: numbers, mark: final_mark, higher };
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

  // ---------- 注册家族（表达式以 ExprCompact 存储） ----------
  function register_one(n) {
    register.push({
      id: 'btl--1y-' + (n + 1) + 'ss',
      name: 'AT' + (n + 1) + 'SS',
      display: (e) => display(decompactify(e), false, true),
      able: (e) => is_limit(decompactify(e)),
      compare: (a, b) => compare(decompactify(a), decompactify(b)),
      FS: (e, index) => compactify(FS(decompactify(e), index, n)),
      parse: (s) => compactify(from_display(s, n)),
      init: () => [
        { expr: INFINITY_compact(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
    });
  }
  for (let n = N_MIN; n <= N_MAX; n++) register_one(n);

  // —— 家族注册表：档位 K = n+1（id 后缀）支持 2..100；>100 报错 ——
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'btl-minus1y-nss',
    label: 'ATnSS',
    start: N_MIN + 1, // 最小档 btl--1y-2ss
    max: 100,
    match(lower) {
      const m = /^btl--1y-(\d{1,3})ss/.exec(lower); // btl--1y-30ss
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (k) => 'btl--1y-' + k + 'ss',
    ensure(k) {
      const id = 'btl--1y-' + k + 'ss';
      if (!window.register.some((x) => x.id === id)) register_one(k - 1);
      return id;
    },
  });
})();
