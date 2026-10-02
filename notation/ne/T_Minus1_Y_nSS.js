// ============================================================================
//  notation/ne/T_Minus1_Y_nSS.js — T(-1)Y-nSS 家族（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/Minus1_Y_nSS-series/T_Minus1_Y_nSS.ts
//  注册 id: t--1y-1ss .. t--1y-6ss（generator: start = 0，id 用 n+1）
//
//  ⚠ 与 ne 的一处差异：ne 的 initial = 3（默认只水合 t--1y-1ss..t--1y-4ss，更高档位
//    由 UI 的「+」按需生成）。本项目原先由 core/notation-manifest.js 的
//    notation/rewritten/t-minus1Y-nSS.js 条目静态注册到 t--1y-6ss，这里把 initial
//    设为 5 以保持档位不缩水；generator 本身的行为与 ne 一致。
//
//  源文件 import 的 FS_default_LNZ_variant 来自 '@/notations/notation_utils.ts'，
//  本项目已把它搬到 core/ne/notationUtils.js（与其他记号共用，无内联副本）。
//
//  ⚠ 保留 export from_display：ne 的 Abs_B_Minus1_Y_nSS.ts / Rel_B_Minus1_Y_nSS.ts
//    从本文件 import 它。
//
//  算法逐行照搬，未做改写。表达式 = Expr = Column[]，Column = [number[], Expr]。
// ============================================================================
import {
  bind2,
  bind3,
  deepcopy,
  index_of_last,
  lex_compare,
  number_compare,
  tuple_lex_compare,
} from '../../core/ne/utils.js';
import { FS_default_LNZ_variant } from '../../core/ne/notationUtils.js';
import { ensure_category } from '../../core/ne/registry.js';

function INFINITY() {
  return [[[Infinity]]];
}

function EMPTY_COLUMN(n) {
  return [Array.from({ length: n }, () => 0), []];
}

function ONE_COLUMN(n) {
  return n === 0 ? [[], [EMPTY_COLUMN(n)]] : [[1, ...Array.from({ length: n - 1 }, () => 0)], []];
}

function is_infinity(e) {
  return '' + e === 'Infinity';
}

function infinity_FS(index, n) {
  if (index === 0) return [EMPTY_COLUMN(n)];
  return [EMPTY_COLUMN(n), [Array.from({ length: n }, () => 1), infinity_FS(index - 1, n)]];
}

function column_compare(a, b) {
  return tuple_lex_compare(a, b, [(x, y) => lex_compare(x, y, number_compare), compare]);
}

function compare(a, b) {
  return lex_compare(a, b, column_compare);
}

function parents(e, n) {
  if (is_infinity(e)) return [];
  let result = [];
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
      if (compare(e[p][1], v) < 0) break;
      p = n === 0 ? p - 1 : result[p][0][n - 1];
    }
    result[i][1] = p;
  }
  return result;
}

function is_limit(e, n) {
  return is_infinity(e) || (e.length > 0 && (n === 0 ? e[e.length - 1][1].length > 0 : e[e.length - 1][0][0] > 0));
}

function root(P, n) {
  if (P.length === 0) return undefined;
  let right = P.length - 1;
  if (P[right][1] >= 0) return [P[right][1], n];
  let b = index_of_last(P[right][0], (pb) => pb >= 0);
  if (b === -1) return undefined;
  return [P[right][0][b], b];
}

function ascension_vector(e, r, b) {
  return Array.from({ length: b }, (_, i) => e[e.length - 1][0][i] - e[r][0][i]);
}

function ascension_thresholds(P, r, b) {
  let result = [];
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
  let result = [deepcopy(ei[0]), ei[1]]; // shallow copy ei[1]. aligned with T(-1)Y-nSS.

  for (let i = 0; i < b; i++) result[0][i] += delta[i] * w;
  return result;
}

function FS(e, index, n) {
  if (is_infinity(e)) return infinity_FS(index, n);
  if (e.length === 0) return e;

  let right = e.length - 1;
  if (is_limit(e[right][1], n)) {
    return [...e.slice(0, -1), [e[right][0].slice(), FS(e[right][1], index, n)]];
  }

  let P = parents(e, n);
  let rb = root(P, n);
  if (rb === undefined) return e.slice(0, -1);
  let [r, b] = rb;
  let width = right - r;

  let V = ascension_vector(e, r, b);
  let A = ascension_thresholds(P, r, b);
  let result = e.slice(0, -1).map((c) => [deepcopy(c[0]), c[1]]);

  for (let w = 1; w <= index; w++) {
    for (let i = r; i < right; i++) {
      result.push(ascend(e[i], V, A[i], w));
    }
    if (b === n) result[r + w * width][1] = e[right][1].slice(0, -1);
  }
  return result;
}

function is_zero_column(c) {
  return c[0].every((x) => x === 0) && c[1].length === 0;
}

function is_one_column(c) {
  let n = c[0].length;
  return n === 0 ? c[1].length === 1 : c[0][0] === 1 && c[0].slice(1).every((x) => x === 0) && c[1].length === 0;
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
    if (e.length === 2 && is_one_column(e[1])) {
      return 'ω';
    }
  }

  return e.map(column_display).join('');
}

export function from_display(s, n) {
  let i = 0;

  function error() {
    throw new Error(`Illegal input string: ${s}`);
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
    let step = [];

    if (n === 0) {
      // n 为 0(即 1SS)时行标段为空, 括号内的内容整体就是末项(step)表达式,
      // 与 display 的 () / (1) / (2) / (ω) 等写法对应。
      step = parseExpr(false);
    } else {
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
      if (i < s.length && s[i] === ',') {
        i++;
        step = parseExpr(false);
      }
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

// ---- BOCF 等价显示（n === 1 时提供） ----

function INFINITY_BOCF() {
  return [Infinity];
}

function bocf_from_2ss(e) {
  if (is_infinity(e)) return INFINITY_BOCF();

  let i = 0;

  function impl(base) {
    let result = [];

    while (i < e.length) {
      let [[x], y] = e[i];
      if (x <= base) break;
      i++;
      let inner = impl(x);
      result.push([1, bocf_from_2ss(y), inner]);
    }

    if (result.length === 1) return result[0];
    return [0, result];
  }

  return impl(-1);
}

function display_bocf(e, html) {
  if (is_infinity(e)) return 'Limit';

  function impl(a) {
    if (a[0] === 0) {
      if (a[1].length === 0) return '0';
      return a[1].map(impl).join('+');
    }
    let str_index = impl(a[1]);
    let str_inner = impl(a[2]);
    if (str_inner === '0') {
      if (str_index === '0') return '1';
      if (str_index === '1') return 'Ω';
      return html ? 'Ω<sub>' + str_index + '</sub>' : 'Ω(' + str_index + ')';
    }
    return html ? 'ψ<sub>' + str_index + '</sub>(' + str_inner + ')' : 'ψ(' + str_index + ',' + str_inner + ')';
  }

  return impl(e);
}

// ---------------------------------------------------------------------------
//  注册
// ---------------------------------------------------------------------------

export const category_bm_t_minus1_y_nss = {
  id: 'category-bm-t-minus1-y-nss',
  name: 'Transfinite -1Y-nSS',
  simple_name: 'TnSS',
  parent_id: 'category-minus1-y-nss-series',
  generator: { start: 0, initial: 5, create: (n) => T_Minus1_Y_nSS(n) },
};

export function T_Minus1_Y_nSS(n) {
  let display_equiv = {};
  if (n === 1) {
    display_equiv = {
      BOCF: {
        plain: (e) => display_bocf(bocf_from_2ss(e), false),
        html: (e) => display_bocf(bocf_from_2ss(e), true),
      },
    };
  }

  return {
    id: 't--1y-' + (n + 1) + 'ss',
    category_id: 'category-bm-t-minus1-y-nss',
    name: 'T' + (n + 1) + 'SS',

    display: { plain: display, from_display: (s) => from_display(s, n) },
    display_equiv,

    is_limit: bind2(is_limit, n),
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

    init: () => [INFINITY(), [EMPTY_COLUMN(n)], []],
  };
}

// 分类注册后立即水合其下属成员（ensure_category 内部完成；幂等，可安全重跑）
ensure_category(category_bm_t_minus1_y_nss);
