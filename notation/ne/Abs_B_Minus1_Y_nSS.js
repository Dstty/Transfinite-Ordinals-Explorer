// ============================================================================
//  notation/ne/Abs_B_Minus1_Y_nSS.js — abs B(-1)Y-nSS 家族（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/BM-like/Minus1_Y_nSS-series/Abs_B_Minus1_Y_nSS.ts
//  注册 id: bt--1y-1ss .. bt--1y-6ss（generator: start = 0，id 用 n+1）
//
//  ⚠ 与 ne 的一处差异：ne 的 initial = 3（默认只水合 bt--1y-1ss..bt--1y-4ss，更高档位
//    由 UI 的「+」按需生成）。本项目原先由 core/notation-manifest.js 的
//    notation/rewritten/bt-minus1Y-nSS.js 条目静态注册到 bt--1y-6ss，这里把 initial
//    设为 5 以保持档位不缩水；generator 本身的行为与 ne 一致。
//
//  源文件 import 的 FS_default_LNZ_variant 来自 '@/notations/notation_utils.ts'，
//  本项目已把它搬到 core/ne/notationUtils.js（与其他记号共用，无内联副本）。
//  源文件从 T_Minus1_Y_nSS.ts import 的 from_display，本项目对应已搬好的
//  notation/ne/T_Minus1_Y_nSS.js（该文件保留 export from_display 就是为此）。
//
//  算法逐行照搬，未做改写。表达式 = Expr = Column[]，Column = [number[], Expr]。
// ============================================================================
import {
  bind2,
  bind3,
  index_of_last,
  lex_compare,
  lex_compare_by,
  number_compare,
  tuple_lex_compare,
} from '../../core/ne/utils.js';
import { from_display } from './T_Minus1_Y_nSS.js';
import { FS_default_LNZ_variant } from '../../core/ne/notationUtils.js';
import { ensure_category } from '../../core/ne/registry.js';

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
    result = [[Array.from({ length: n }, () => i), result]];
  }
  return [ZERO_COLUMN(n), ...result];
}

function is_zero_column(c) {
  return c[0].every((x) => x === 0) && c[1].length === 0;
}

function is_one_column(c) {
  let n = c[0].length;
  return n === 0
    ? c[1].length === 1 && is_zero_column(c[1][0])
    : c[0][0] === 1 && c[0].slice(1).every((x) => x === 0) && c[1].length === 0;
}

function column_display(c) {
  let result_list = [...c[0].map((x) => '' + x), display(c[1], false)];
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

function column_compare(a, b) {
  return tuple_lex_compare(a, b, [lex_compare_by(number_compare), compare]);
}

function compare(a, b) {
  return lex_compare(a, b, column_compare);
}

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

function compute_tail_layer(e) {
  if (e.length === 0 || is_zero_column(e[e.length - 1])) return -1;
  let current = e,
    layer = 0;
  while (true) {
    let right = current.length - 1;
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
    let right = current.length - 1;
    current = current[right][1];
    len += current.length;
  }
  return [layer, r - (len - current.length)];
}

function root(e, P) {
  if (e.length === 0 || is_zero_column(e[e.length - 1])) return undefined;

  let current_P = P;
  let tail_layer = compute_tail_layer(e);
  for (let k = 0; k < tail_layer; k++) {
    let right = current_P.length - 1;
    current_P = current_P[right][1];
  }
  let right = current_P.length - 1;
  let b = index_of_last(current_P[right][0], (x) => x >= 0);
  let r = current_P[right][0][b];
  return [r, b];
}

function ascension_vector(e, r, b) {
  let stack = [...e];

  let current = e;
  let tail_layer = compute_tail_layer(e);
  for (let k = 0; k < tail_layer; k++) {
    let right = current.length - 1;
    current = current[right][1];
    stack.push(...current);
  }

  let e_r = stack[r];
  let e_right = stack[stack.length - 1];
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
      let Ai = undefined;
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
  let result = [];
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

  let current = e,
    current_A = A;
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

export const category_abs_bm_bt_minus1_y_nss = {
  id: 'category-bm-bt-minus1-y-nss',
  name: 'Absolute Branching -1Y-nSS',
  simple_name: 'abs BnSS',
  parent_id: 'category-minus1-y-nss-series',
  generator: { start: 0, initial: 5, create: (n) => abs_B_Minus1_Y_nSS(n) },
};

export function abs_B_Minus1_Y_nSS(n) {
  return {
    id: 'bt--1y-' + (n + 1) + 'ss',
    category_id: 'category-bm-bt-minus1-y-nss',
    name: 'abs B' + (n + 1) + 'SS',

    display: { plain: display, from_display: (s) => from_display(s, n) },
    is_limit: (e) => is_limit(e),
    compare,
    ...FS_default_LNZ_variant(
      bind3(FS, n),
      compare,
      is_infinity,
      bind2(infinity_FS, n),
      bind2(is_limit, n),
      display,
    ),

    credit_text_id: 'credit.community_y',

    init: () => [INFINITY(), []],
  };
}

// 分类注册后立即水合其下属成员（ensure_category 内部完成；幂等，可安全重跑）
ensure_category(category_abs_bm_bt_minus1_y_nss);
