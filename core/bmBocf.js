// ============================================================================
//  core/bmBocf.js — BMS → BOCF(OCN) 转换（移植自 ne-rewritten）
// ============================================================================
//  移植自 SmileLee-lyx/ne-rewritten 的 src/notations/translators/BM-BOCF.ts
//  （solarzone 的 BMS↔BOCF 算法，去 TypeScript 类型，逻辑逐行保留）。
//
//  用途：给 BMS(bm4) 提供 OCF / OCF full / n.s. OCF / n.s. OCF full 四种
//  等价显示（NOTATION_META views 声明，core/converters.js 的 'bm-ocf' kind 调用）。
//  输出 OCNDisplayIR（与本地 shared.js 的 display_OCN_IR 兼容）。
//
//  依赖：window.NEUTILS（BM_standardize / lex_compare / number_compare）。
// ============================================================================

// OCF: [] | [OCF, OCF, OCF]
const ZERO = [];
const ONE = [[], [], []];

function iz(a) {
  return a.length === 0;
}

function compare(a, b) {
  return window.NEUTILS.lex_compare(a, b, compare);
}

function col_eq(a, b) {
  return window.NEUTILS.lex_compare(a, b, window.NEUTILS.number_compare) === 0;
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
  if (iz(a)) return b;
  if (iz(b)) return a;
  if (lt([a[0], a[1], []], [b[0], b[1], []])) return b;
  return [a[0], a[1], add(a[2], b)];
}

function suc(a) {
  return add(a, ONE);
}

function sub(a, b) {
  if (iz(a)) return [];
  if (iz(b)) return a;
  if (gt([a[0], a[1], []], [b[0], b[1], []])) return a;
  return sub(a[2], b[2]);
}

function s(a, b) {
  if (iz(a)) return [[], []];
  if (lt([a[0], a[1], []], b)) return [[], a];
  const s1 = s(a[2], b);
  return [[a[0], a[1], s1[0]], s1[1]];
}

function l(a) {
  if (iz(a)) return [];
  if (iz(a[2])) return a;
  return l(a[2]);
}

function ttc(a, b) {
  if (iz(a)) return [];
  if (iz(ttc(a[2], b)) && lt([a[0], a[1], []], [b, [], []])) return [];
  return [a[0], a[1], ttc(a[2], b)];
}

function exp(a) {
  if (lt(a, [[], [ONE, [], []], []])) return [[], a, []];
  if (iz(a)) throw new Error('Illegal state');
  const p = s(a[1], [suc(a[0]), [], []])[0];
  return [a[0], add(p, sub(a, [a[0], p, []])), []];
}

function log(a) {
  if (iz(a)) return [];
  const [p, q] = s(a[1], [suc(a[0]), [], []]);
  if (iz(a[0]) && iz(p)) {
    if (!lt(a[1], [[], [ONE, [], []], []])) {
      if (iz(q)) throw new Error('Illegal state');
      if (eq(log(q), q) && iz(q[2]) && lt(a[1], [ONE, [], []])) {
        return [a[0], a[1], []];
      }
    }
    return q;
  }
  const m = add([a[0], p, []], q);
  if (!lt(a[1], [a[0], [suc(a[0]), [], []], []])) {
    if (eq(log(a[1]), a[1]) && iz(a[2]) && lt(a[1], [suc(a[0]), [], []])) {
      return [a[0], a[1], []];
    }
  }
  return m;
}

// --------------------------------------------------------------------------
//  BMS 矩阵（Expr = number[][]，列至少 3 行）→ OCF
// --------------------------------------------------------------------------
function P(M, r, n) {
  if (r === -1) return n - 1;
  let q = P(M, r - 1, n);
  while (q > -1 && M[q][r] >= M[n][r]) {
    q = P(M, r - 1, q);
  }
  return q;
}

function C(M, n) {
  const X = [];
  for (let i = 0; i < M.length; i++) {
    if (P(M, 0, i) === n) X.push(i);
  }
  return X;
}

function D(M, n) {
  let X = 0;
  for (let i = 0; i < M.length; i++) {
    if (P(M, 0, i) === n && M[i][1] > 0) X++;
  }
  return X;
}

function U(M, n) {
  if (M[n][1] === 0 || M[n][2] === 1 || n + 1 === M.length) return -1;
  const m = P(M, 1, n);
  const L = [M[m][0] + 1, M[n][1], M[m][2] + 1];
  if (P(M, 1, n) === P(M, 1, n + 1) && col_eq(M[n + 1], L)) return n + 1;
  let q = n;
  while (q !== -1) {
    q = P(M, 0, q);
    if (P(M, 1, n) === P(M, 1, q) && col_eq(M[q], L) && M[n + 1][0] > M[q][0]) return q;
  }
  return -1;
}

function v(M, n) {
  if (M[n][1] === 0) return [];
  if (M[n][2] === 0) {
    const u = U(M, n) >= 0 ? l(v(M, U(M, n))) : ONE;
    return add(v(M, P(M, 1, n)), u);
  }
  let p = ONE;
  for (const i of C(M, n)) {
    if (!col_eq(M[i], [M[n][0] + 1, M[n][1], 1])) continue;
    let q = [];
    for (const j of C(M, i)) {
      q = add(q, o(M, j));
    }
    p = add(p, exp(q));
  }
  return add(v(M, P(M, 1, n)), exp(p));
}

function o(M, n) {
  let S = [];
  const u = [...Array(M.length).keys()].map((x) => U(M, x));
  for (const i of C(M, n)) {
    if (col_eq(M[i], [M[n][0] + 1, M[n][1], 1])) continue;
    if (u.includes(i)) {
      const c = C(M, i);
      if (c.length) {
        if (col_eq(M[c[c.length - 1]], [M[i][0] + 1, M[i][1], 1])) continue;
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
  if (iz(c)) return [a, b, []];
  if (lt(b, c[1]) && gt(c, [a, [], []])) {
    const t = ttc(c[1], suc(c[0]));
    return sp(a, add(t, sub([c[0], c[1], []], [c[0], t, []])), c[2]);
  }
  return sp(a, add(b, [c[0], c[1], []]), c[2]);
}

function sf(a) {
  if (iz(a)) return [];
  return add(sp(sf(a[0]), [], sf(a[1])), sf(a[2]));
}

// --------------------------------------------------------------------------
//  OCF → OCNDisplayIR
// --------------------------------------------------------------------------
function to_nat(q) {
  if (iz(q)) return 0;
  if (iz(q[0]) && iz(q[1])) return to_nat(q[2]) + 1;
  throw new Error('not a natural number');
}

function getCoef(x) {
  if (iz(x[2])) return 1;
  return getCoef(x[2]) + 1;
}

function to_IR(q) {
  if (iz(q)) return { type: 'number', value: 0 };
  if (iz(q[0]) && iz(q[1])) return { type: 'number', value: to_nat(q) };
  const [a, b] = s(q, [q[0], q[1], []]);
  if (iz(a)) throw new Error('Illegal state');
  let m = { type: 'psi', sub: to_IR(a[0]), arg: to_IR(a[1]) };
  if (iz(a[1])) m = { type: 'Omega', sub: to_IR(a[0]) };
  if (iz(a[1]) && eq(a[0], ONE)) m = { type: 'Omega' };
  if (iz(a[0])) m = { type: 'psi', arg: to_IR(a[1]) };
  if (eq(a[0], []) && eq(a[1], ONE)) {
    m = { type: 'omega' };
  } else if (!eq(log([a[0], a[1], []]), [a[0], a[1], []])) {
    m = { type: 'omega', sup: to_IR(log(a)) };
  }
  if (getCoef(a) > 1) m = { type: 'mul_nat', value: m, coe: getCoef(a) };
  if (!iz(b)) {
    const b_ir = to_IR(b);
    m = b_ir.type === 'sum' ? merge_sum([m, ...b_ir.terms]) : merge_sum([m, b_ir]);
  }
  return m;
}

function to_IR_full(q) {
  if (iz(q)) return { type: 'number', value: 0 };
  if (iz(q[0]) && iz(q[1])) return { type: 'number', value: to_nat(q) };
  const [a, b] = s(q, [q[0], q[1], []]);
  if (iz(a)) throw new Error('Illegal state');
  let m = { type: 'psi', sub: to_IR_full(a[0]), arg: to_IR_full(a[1]) };
  if (getCoef(a) > 1) m = { type: 'mul_nat', value: m, coe: getCoef(a) };
  if (!iz(b)) {
    const b_ir = to_IR_full(b);
    m = b_ir.type === 'sum' ? merge_sum([m, ...b_ir.terms]) : merge_sum([m, b_ir]);
  }
  return m;
}

const EBO_IR = { type: 'constant', display: 'EBO', display_latex: '\\text{EBO}' };
const LIMIT = [[], [1, 1, 1], [2, 1, 1], [3, 1], [2]];

function merge_sum(terms) {
  // BM-BOCF.ts 用的是 OCN_utils 的 merge_sum（OCNDisplayIR 版），
  // 本地对应 window.NEUTILS.merge_sum_OCN
  return window.NEUTILS.merge_sum_OCN(terms);
}

function matrixEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!col_eq(a[i], b[i])) return false;
  }
  return true;
}

/** BMS 矩阵序比较（移植 ne-rewritten BM.ts 的 compare：逐列 normalize 后字典序）。 */
function bm_compare(a, b) {
  const U = window.NEUTILS;
  return U.lex_compare(a, b, (x, y) =>
    U.lex_compare(U.BM_normalize_col(x), U.BM_normalize_col(y), U.number_compare),
  );
}

function isZeroIR(ir) {
  return !!ir && ir.type === 'number' && ir.value === 0;
}
function isZeroMatrix(M) {
  return M.length === 0 || M.every((col) => col.every((v) => v === 0));
}

/**
 * BMS 矩阵 → OCN 显示 IR。
 * @param {number[][]} M BMS 矩阵（列内为数字，列数 ≥3 行时会补零）
 * @param {'ocf'|'ocf-full'|'ns'|'ns-full'} mode
 *   ocf      标准形式（sf 归一）
 *   ocf-full 标准形式 + 完整 psi 展开
 *   ns       n.s.（非标准）
 *   ns-full  n.s. + 完整展开
 * @returns {object|null} OCNDisplayIR（与 shared.js display_OCN_IR 兼容）；
 *   超出 BOCF 表示范围（转换抛错或非零矩阵得 0）时返回 null，由显示层提示。
 */
export function bm_to_ocf_IR(M, mode) {
  try {
    const std = window.NEUTILS.BM_standardize(M, 3);
    const lim = window.NEUTILS.BM_standardize(LIMIT, 3);
    // EBO 极限特判（与 BM-BOCF.ts 的 BM4.compare(e, LIMIT) === 0 语义一致）
    if (matrixEq(std, lim)) return EBO_IR;
    // BOCF 表示范围只到 EBO：超过 EBO 极限的矩阵一律判超范围
    if (bm_compare(std, lim) > 0) return null;
    const q = mode === 'ns' || mode === 'ns-full' ? NS(std) : _o(std);
    const ir = mode === 'ocf-full' || mode === 'ns-full' ? to_IR_full(q) : to_IR(q);
    // 兜底：非零矩阵转换出 0 → 超出范围
    if (isZeroIR(ir) && !isZeroMatrix(std)) return null;
    return ir;
  } catch (e) {
    // 栈溢出 / Illegal state 等 → 超出范围（记录原因便于排查）
    console.warn('[bmBocf] BMS→BOCF 超出范围:', window.NEUTILS.BM_display(M), '·', e.message);
    return null;
  }
}
