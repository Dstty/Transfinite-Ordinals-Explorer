// ============================================================================
//  notation/ne/BM-BOCF.js — BMS → BOCF 转换器记号（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/translators/BM-BOCF.ts
//  注册 id: translator-bm-bocf，分类 category-translators
//
//  它是一个「不展开、只翻译」的记号：FS / compare / is_limit / display 全部直接复用
//  BM4，靠 display_equiv 提供四个 OCF 视图（OCF / OCF full / n.s. OCF / n.s. OCF full）。
//  这正是 ne 里 BMS 的 OCF 显示方式——本项目原先把它挂在 bm4 的 views 上，
//  后按要求暂时下线，现按 ne 的结构以独立记号形式提供。
//
//  算法逐行照搬，只去类型注解。OCF = [] | [OCF, OCF, OCF]。
// ============================================================================
import { BM4, standardize } from './BM.js';
import { make_OCN_display, merge_sum } from './OCN_utils.js';
import { deepcopy, lex_compare, number_compare } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';

const ZERO = [];
const ONE = [[], [], []];

function iz(a) {
  return a.length == 0;
}

function compare(a, b) {
  return lex_compare(a, b, compare);
}

function col_eq(a, b) {
  return lex_compare(a, b, number_compare) === 0;
}

function eq(a, b) {
  return compare(a, b) === 0;
}

function lt(a, b) {
  return compare(a, b) < 0;
}

function gt(a, b) {
  return compare(a, b) > 0;
}

function add(a, b) {
  if (iz(a)) {
    return b;
  }
  if (iz(b)) {
    return a;
  }
  if (lt([a[0], a[1], []], [b[0], b[1], []])) {
    return b;
  }
  return [a[0], a[1], add(a[2], b)];
}

function suc(a) {
  return add(a, ONE);
}

function sub(a, b) {
  if (iz(a)) {
    return [];
  }
  if (iz(b)) {
    return a;
  }
  if (gt([a[0], a[1], []], [b[0], b[1], []])) {
    return a;
  }
  return sub(a[2], b[2]);
}

function s(a, b) {
  if (iz(a)) {
    return [[], []];
  }
  if (lt([a[0], a[1], []], b)) {
    return [[], a];
  }
  let s1 = s(a[2], b);
  return [[a[0], a[1], s1[0]], s1[1]];
}

function l(a) {
  if (iz(a)) {
    return [];
  }
  if (iz(a[2])) {
    return a;
  }
  return l(a[2]);
}

function ttc(a, b) {
  if (iz(a)) {
    return [];
  }
  if (iz(ttc(a[2], b)) && lt([a[0], a[1], []], [b, [], []])) {
    return [];
  }
  return [a[0], a[1], ttc(a[2], b)];
}

function exp(a) {
  if (lt(a, [[], [ONE, [], []], []])) {
    return [[], a, []];
  }
  if (iz(a)) throw new Error('Illegal state');
  let p = s(a[1], [suc(a[0]), [], []])[0];
  return [a[0], add(p, sub(a, [a[0], p, []])), []];
}

function log(a) {
  if (iz(a)) {
    return [];
  }
  let [p, q] = s(a[1], [suc(a[0]), [], []]);
  if (iz(a[0]) && iz(p)) {
    if (!lt(a[1], [[], [ONE, [], []], []])) {
      if (iz(q)) throw new Error('Illegal state');
      if (eq(log(q), q) && iz(q[2]) && lt(a[1], [ONE, [], []])) {
        return [a[0], a[1], []];
      }
    }
    return q;
  }
  let m = add([a[0], p, []], q);
  if (!lt(a[1], [a[0], [suc(a[0]), [], []], []])) {
    if (eq(log(a[1]), a[1]) && iz(a[2]) && lt(a[1], [suc(a[0]), [], []])) {
      return [a[0], a[1], []];
    }
  }
  return m;
}

function P(M, r, n) {
  if (r == -1) {
    return n - 1;
  }
  let q = P(M, r - 1, n);
  while (q > -1 && M[q][r] >= M[n][r]) {
    q = P(M, r - 1, q);
  }
  return q;
}

function C(M, n) {
  let X = [];
  for (let i = 0; i < M.length; i++) {
    if (P(M, 0, i) == n) {
      X.push(i);
    }
  }
  return X;
}

function D(M, n) {
  let X = 0;
  for (let i = 0; i < M.length; i++) {
    if (P(M, 0, i) == n && M[i][1] > 0) {
      X++;
    }
  }
  return X;
}

function U(M, n) {
  if (M[n][1] == 0 || M[n][2] == 1 || n + 1 == M.length) {
    return -1;
  }
  let m = P(M, 1, n);
  let L = [M[m][0] + 1, M[n][1], M[m][2] + 1];
  if (P(M, 1, n) == P(M, 1, n + 1) && col_eq(M[n + 1], L)) {
    return n + 1;
  }
  let q = n;
  while (q != -1) {
    q = P(M, 0, q);
    if (P(M, 1, n) == P(M, 1, q) && col_eq(M[q], L) && M[n + 1][0] > M[q][0]) {
      return q;
    }
  }
  return -1;
}

function v(M, n) {
  if (M[n][1] == 0) {
    return [];
  }
  if (M[n][2] == 0) {
    let u = U(M, n) >= 0 ? l(v(M, U(M, n))) : ONE;
    return add(v(M, P(M, 1, n)), u);
  }
  let p = ONE;
  for (let i of C(M, n)) {
    if (!col_eq(M[i], [M[n][0] + 1, M[n][1], 1])) {
      continue;
    }
    let q = [];
    for (let j of C(M, i)) {
      q = add(q, o(M, j));
    }
    p = add(p, exp(q));
  }
  return add(v(M, P(M, 1, n)), exp(p));
}

function o(M, n) {
  let S = [];
  let u = [...Array(M.length).keys()].map((x) => U(M, x));
  for (let i of C(M, n)) {
    if (col_eq(M[i], [M[n][0] + 1, M[n][1], 1])) {
      continue;
    }
    if (u.includes(i)) {
      let c = C(M, i);
      if (c.length) {
        if (col_eq(M[c.at(-1)], [M[i][0] + 1, M[i][1], 1])) {
          continue;
        }
      } else {
        continue;
      }
    }
    S = add(S, o(M, i));
  }
  return [v(M, n), S, []];
}

function _o(M) {
  let S = [];
  for (let i = 0; i < M.length; i++) {
    if (col_eq(M[i], [0, 0, 0])) {
      S = add(S, o(M, i));
    }
  }
  return sf(S);
}

function NS(M) {
  let S = [];
  for (let i = 0; i < M.length; i++) {
    if (col_eq(M[i], [0, 0, 0])) {
      S = add(S, o(M, i));
    }
  }
  return S;
}

function sp(a, b, c) {
  if (iz(c)) {
    return [a, b, []];
  }
  if (lt(b, c[1]) && gt(c, [a, [], []])) {
    let t = ttc(c[1], suc(c[0]));
    return sp(a, add(t, sub([c[0], c[1], []], [c[0], t, []])), c[2]);
  }
  return sp(a, add(b, [c[0], c[1], []]), c[2]);
}

function sf(a) {
  if (iz(a)) {
    return [];
  }
  return add(sp(sf(a[0]), [], sf(a[1])), sf(a[2]));
}

function to_nat(q) {
  if (iz(q)) {
    return 0;
  }
  if (iz(q[0]) && iz(q[1])) {
    return to_nat(q[2]) + 1;
  }
  throw new Error('not a natural number');
}

function getCoef(x) {
  if (iz(x[2])) {
    return 1;
  }
  return getCoef(x[2]) + 1;
}

function to_IR(q) {
  if (iz(q)) {
    return { type: 'number', value: 0 };
  }
  if (iz(q[0]) && iz(q[1])) {
    return { type: 'number', value: to_nat(q) };
  }
  let [a, b] = s(q, [q[0], q[1], []]);
  if (iz(a)) throw new Error('Illegal state');
  let m = { type: 'psi', sub: to_IR(a[0]), arg: to_IR(a[1]) };
  if (iz(a[1])) {
    m = { type: 'Omega', sub: to_IR(a[0]) };
  }
  if (iz(a[1]) && eq(a[0], ONE)) {
    m = { type: 'Omega' };
  }
  if (iz(a[0])) {
    m = { type: 'psi', arg: to_IR(a[1]) };
  }
  if (eq(a[0], []) && eq(a[1], ONE)) {
    m = { type: 'omega' };
  } else if (!eq(log([a[0], a[1], []]), [a[0], a[1], []])) {
    m = { type: 'omega', sup: to_IR(log(a)) };
  }

  if (getCoef(a) > 1) {
    m = { type: 'mul_nat', value: m, coe: getCoef(a) };
  }
  if (!iz(b)) {
    const b_ir = to_IR(b);
    m = b_ir.type === 'sum' ? merge_sum([m, ...b_ir.terms]) : merge_sum([m, b_ir]);
  }
  return m;
}

function to_IR_full(q) {
  if (iz(q)) {
    return { type: 'number', value: 0 };
  }
  if (iz(q[0]) && iz(q[1])) {
    return { type: 'number', value: to_nat(q) };
  }
  let [a, b] = s(q, [q[0], q[1], []]);
  if (iz(a)) throw new Error('Illegal state');
  let m = { type: 'psi', sub: to_IR_full(a[0]), arg: to_IR_full(a[1]) };

  if (getCoef(a) > 1) {
    m = { type: 'mul_nat', value: m, coe: getCoef(a) };
  }
  if (!iz(b)) {
    const b_ir = to_IR_full(b);
    m = b_ir.type === 'sum' ? merge_sum([m, ...b_ir.terms]) : merge_sum([m, b_ir]);
  }
  return m;
}

const EBO_IR = { type: 'constant', display: 'EBO', display_latex: '\\text{EBO}' };

export const LIMIT = [[], [1, 1, 1], [2, 1, 1], [3, 1], [2]];

function make_display(to_ocf, to_ir, name) {
  return make_OCN_display(
    (e) => (BM4.compare(e, LIMIT) === 0 ? EBO_IR : to_ir(to_ocf(standardize(e, 3)))),
    name,
  );
}

export const Translator_BM_BOCF = {
  id: 'translator-bm-bocf',
  name: 'BMS-BOCF (EBO)',
  category_id: 'category-translators',
  credit_text_id: 'credit.solarzone',

  display: BM4.display,
  FS: BM4.FS,
  FS_short: BM4.FS_short,
  FS_alter: BM4.FS_alter,
  is_limit: BM4.is_limit,
  compare: BM4.compare,
  init: () => [deepcopy(LIMIT), []],

  display_equiv: {
    OCF: make_display(_o, to_IR),
    'OCF full': make_display(_o, to_IR_full),
    'n.s. OCF': make_display(NS, to_IR),
    'n.s. OCF full': make_display(NS, to_IR_full),
  },
};

register_notation(Translator_BM_BOCF);
