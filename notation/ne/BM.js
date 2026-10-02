// ============================================================================
//  notation/ne/BM.js — Bashicu 矩阵系统（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BM.ts
//  注册 id: bm4（BMS）、tri-bm4（三角 BMS / 1Y-BMS）、0y（0-Y 序列）
//
//  ⚠ 与 ne 的差异（仅一处）：
//    ne 的 BM.ts 还给三个记号挂了 draw_diagram（依赖 '@/notations/draw_mountain_diagram.ts'
//    的 DiagramControl / draw_mountain_diagram 图元层）。本项目 ne 侧尚无该图元层，
//    故不搬 draw_diagram；mountain_view 的纯数据部分（build_bm_mountain_source，
//    零外部依赖）按原文保留。其余字段（id / name / simple_name / category_id /
//    display / display_equiv / is_limit / compare / FS 变体 / credit_text_id / init /
//    debug）全部保留，算法逐行照搬，只去类型注解。
//
//  表达式 = number[][]（每列是行值数组）。init() 返回表达式数组 [Limit, 空矩阵]。
//  BMS ↔ 三角 BMS 的转换器在 ./BM_converter.js（互相 import，运行期才调用）。
// ============================================================================
import { boolean_compare, index_of_last, lex_compare, number_compare } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';
import { BM_to_triangular, triangular_to_BM } from './BM_converter.js';

export function INFINITY() {
  return [[Infinity]];
}

export function is_infinity(a) {
  return ('' + a).startsWith('Infinity');
}

export function compare(a, b) {
  if (is_infinity(a) || is_infinity(b)) {
    return boolean_compare(is_infinity(a), is_infinity(b));
  }
  return lex_compare(a, b, (x, y) => lex_compare(normalize_col(x), normalize_col(y), number_compare));
}

export function column_display(col) {
  const n_col = normalize_col(col);
  if (n_col.length === 0) return '(0)';
  return '(' + n_col + ')';
}

export function display(a) {
  if (is_infinity(a)) return 'Limit';
  return a.map(column_display).join('');
}

export function from_display(s, std = false) {
  s = s.trim();
  if (s === 'Limit') return INFINITY();
  if (s === '') return [];

  function error() {
    throw new Error(`Illegal input string: ${s}`);
  }

  function skip_spaces(i) {
    while (i < s.length && s[i] === ' ') i++;
    return i;
  }

  function parse_column(start) {
    if (s[start] !== '(') error();
    let i = skip_spaces(start + 1);

    if (i < s.length && s[i] === ')') return [[], i + 1];

    const col = [];
    while (i < s.length) {
      i = skip_spaces(i);

      if (i < s.length && s[i] >= '0' && s[i] <= '9') {
        let num = 0;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') {
          num = num * 10 + (s.charCodeAt(i) - 48);
          i++;
        }
        col.push(num);
        i = skip_spaces(i);
        if (i < s.length && s[i] === ',') {
          i++;
        } else if (i < s.length && s[i] === ')') {
          i++;
          break;
        } else {
          error();
        }
      } else {
        error();
      }
    }
    return [col, i];
  }

  function parse_expression(start) {
    const result = [];
    let i = start;
    while (i < s.length) {
      i = skip_spaces(i);
      if (i >= s.length || s[i] !== '(') break;
      const [col, end] = parse_column(i);
      result.push(col);
      i = end;
    }
    return [result, i];
  }

  const [result, end] = parse_expression(0);
  if (end !== s.length) error();
  return std ? standardize(result) : normalize(result);
}

export function is_limit(a) {
  return is_infinity(a) || (a.length > 0 && a[a.length - 1].length > 0 && a[a.length - 1][0] > 0);
}

export function normalize_col(col) {
  return col.slice(0, index_of_last(col, (x) => x > 0) + 1);
}

export function normalize(m) {
  return m.map(normalize_col);
}

export function standardize(m, min = 0) {
  if (m.length === 0) return m;
  const H = Math.max(...m.map((col) => col.length), min);
  return m.map((col) => [...col, ...Array.from({ length: H - col.length }, () => 0)]);
}

export function parents(m) {
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

export function expand(m, index, shorter) {
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

export function infinity_FS(n) {
  return [[], Array.from({ length: n + 1 }, () => 1)];
}

export function triangular_infinity_FS(n) {
  let result = [[]];
  for (let i = 1; i <= n; i++) {
    result.push(Array.from({ length: i }, (_, j) => i - j));
  }
  return result;
}

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

export function convert_to_0Y(m) {
  return compute_mountain(m).M.map((col) => col[0]);
}

export function display_as_0Y(m) {
  return is_infinity(m) ? '1,ω' : convert_to_0Y(m).join(',');
}

export function compute_0Y_mountain(seq) {
  const P = Array.from({ length: seq.length }, () => []);
  const M = Array.from({ length: seq.length }, (_, i) => [seq[i]]);
  const m = Array.from({ length: seq.length }, (_) => []);

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

export function from_display_as_0Y(str) {
  if (str === 'Limit' || str === '1,ω' || str === '1,w') return INFINITY();
  const result = str.split(',').map((s) => parseInt(s.trim(), 10));
  if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal omega-Y sequence');
  return compute_0Y_mountain(result).m;
}

function entry_display_simple(e) {
  let str = '' + e;
  return str.length > 1 ? '(' + str + ')' : str;
}

function column_display_simple(col) {
  let N = index_of_last(col, (x) => x > 0) + 1;
  if (N === 0) return '0';
  return col.slice(0, N).map(entry_display_simple).join('');
}

export function display_simple(m) {
  if (is_infinity(m)) return 'Limit';
  return m.map(column_display_simple).join(' ');
}

export function from_display_simple(s, std = false) {
  if (s === 'Limit') return INFINITY();

  let i = 0;

  function error() {
    throw new Error('Illegal input string: ' + s);
  }

  function skip_spaces() {
    while (i < s.length && s[i] === ' ') i++;
  }

  function parse_value() {
    if (i < s.length && s[i] === '(') {
      i++;
      const start = i;
      while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
      if (start === i) error();
      if (i >= s.length || s[i] !== ')') error();
      const v = parseInt(s.substring(start, i), 10);
      i++;
      return v;
    }
    if (i < s.length && s[i] >= '0' && s[i] <= '9') {
      const v = s.charCodeAt(i) - 48;
      i++;
      return v;
    }
    error();
  }

  function parse_entry() {
    return parse_value();
  }

  function parse_column() {
    const col = [];
    while (i < s.length && s[i] !== ' ') {
      col.push(parse_entry());
    }
    return col;
  }

  function parse_expr() {
    const result = [];
    while (i < s.length) {
      skip_spaces();
      if (i >= s.length) break;
      if (s[i] === '0' && (i + 1 >= s.length || s[i + 1] === ' ')) {
        result.push([]);
        i++;
        continue;
      }
      result.push(parse_column());
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
  return std ? standardize(result) : normalize(result);
}

// ---- 山脉视图数据（HTML 版与画布版共用"形状 + 布局"） ----

/** 由表达式与等价表示算出"形状 + 布局":画布版与 HTML 版共用这一份数据。 */
function build_bm_mountain_source(m, current_equiv) {
  const { M, P } = compute_mountain(m);
  const h = M[0].length - 1; // 行数 - 1

  // 行就是矩阵行号,故节点在列内的下标即行号。
  const shape = m.map((_, i) =>
    Array.from({ length: h + 1 }, (_, j) => ({
      vertical: j,
      text: '' + (current_equiv === '0Y' ? M[i][j] : ((m[i] ?? [])[j] ?? 0)),
    })),
  );

  // left legs: 从上方元素 (j+1) 指向其父项
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < P[i].length; j++) {
      if (P[i][j] >= 0 && j + 1 <= h) shape[i][j + 1].leg_target = [P[i][j], j];
    }
  }

  return {
    shape,
    layout: {
      vertical_display: (v) => '' + v,
      vertical_compare: (a, b) => a - b,
      // 分割线恒为 0:各行等距 40px,且不画水平网格线(与原实现一致)。
      separator_count: () => 0,
      row_label: () => undefined, // 不显示行标
    },
  };
}

export const BM4 = {
  id: 'bm4',
  name: 'Bashicu matrix system',
  simple_name: 'BMS',
  category_id: 'category-bm-like',
  display: { plain: display, from_display },
  display_equiv: {
    '0Y': {
      plain: display_as_0Y,
      from_display: from_display_as_0Y,
    },
    simple: {
      plain: display_simple,
      from_display: from_display_simple,
      name: { id: 'display.simple' },
    },
    'tri BMS': {
      plain: (e) => display(BM_to_triangular(e)),
      from_display: (str) => triangular_to_BM(from_display(str)),
      name: { id: 'display.triangular-bms' },
    },
    '1Y': {
      plain: (e) => display_as_0Y(BM_to_triangular(e)),
      from_display: (str) => triangular_to_BM(from_display_as_0Y(str)),
    },
    'tri simple': {
      plain: (e) => display_simple(BM_to_triangular(e)),
      from_display: (str) => triangular_to_BM(from_display_simple(str)),
      name: { id: 'display.triangular-bms-simple' },
    },
  },
  is_limit: is_limit,
  compare,
  mountain_view: (expr, data) => build_bm_mountain_source(expr, data?.current_equiv ?? 'BMS'),

  ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),

  credit_text_id: ['credit.bashicu', 'credit.bashicu-converter'],
  init: () => [INFINITY(), []],

  debug: { compute_0Y_mountain, BM_to_triangular, triangular_to_BM },
};

export const TriangularBM4 = {
  id: 'tri-bm4',
  name: 'Triangular BMS',
  simple_name: '1Y-BMS',
  category_id: 'category-bm-like',
  display: { plain: display, from_display },
  display_equiv: {
    '1Y': {
      plain: display_as_0Y,
      from_display: from_display_as_0Y,
    },
    simple: {
      plain: display_simple,
      from_display: from_display_simple,
      name: { id: 'display.simple' },
    },
    'nt BMS': {
      plain: (e) => display(triangular_to_BM(e)),
      from_display: (str) => BM_to_triangular(from_display(str)),
      name: { id: 'display.non-triangular-bms' },
    },
    '0Y': {
      plain: (e) => display_as_0Y(triangular_to_BM(e)),
      from_display: (str) => BM_to_triangular(from_display_as_0Y(str)),
    },
    'nt simple': {
      plain: (e) => display_simple(triangular_to_BM(e)),
      from_display: (str) => BM_to_triangular(from_display_simple(str)),
      name: { id: 'display.non-triangular-bms-simple' },
    },
  },
  is_limit: is_limit,
  compare,
  mountain_view: (expr, data) => build_bm_mountain_source(expr, data?.current_equiv ?? 'BMS'),

  ...sequence_FS_variants(expand, is_infinity, triangular_infinity_FS, is_limit, display),

  credit_text_id: ['credit.bashicu', 'credit.bashicu-converter'],
  init: () => [INFINITY(), []],

  debug: { compute_0Y_mountain, BM_to_triangular, triangular_to_BM },
};

export const seq_0Y = {
  id: '0y',
  name: '0-Y sequence',
  simple_name: '0Y',
  category_id: 'category-y',
  display: { plain: display_as_0Y, from_display: from_display_as_0Y },
  display_equiv: {
    BMS: {
      plain: display,
      from_display,
    },
    '1Y': {
      plain: (e) => display_as_0Y(BM_to_triangular(e)),
      from_display: (str) => triangular_to_BM(from_display_as_0Y(str)),
    },
    'tri BMS': {
      plain: (e) => display(BM_to_triangular(e)),
      from_display: (str) => triangular_to_BM(from_display(str)),
    },
  },
  is_limit: is_limit,
  compare,
  mountain_view: (expr, data) => build_bm_mountain_source(expr, data?.current_equiv ?? '0Y'),

  ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),

  credit_text_id: ['credit.yukito', 'credit.bashicu-converter'],
  init: () => [INFINITY(), []],
};

register_notation(BM4);
register_notation(TriangularBM4);
register_notation(seq_0Y);
