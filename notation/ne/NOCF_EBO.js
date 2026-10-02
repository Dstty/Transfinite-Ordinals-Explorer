// ============================================================================
//  notation/ne/NOCF_EBO.js — Nothing OCF（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/OCN/NOCF_EBO.ts
//  注册 id: nocf-ebo，分类 category-ocf
//  算法逐行照搬，只去掉类型注解。表达式：Expr = [0] | [1, Expr, Expr]。
//  与 ne 的差异：无（单体记号，不涉及 generator / initial 调整）。
// ============================================================================
import { boolean_compare, lex_compare } from '../../core/ne/utils.js';
import { make_OCN_display } from './OCN_utils.js';
import { register_notation } from '../../core/ne/registry.js';

function INFINITY() {
  return [Infinity];
}

function is_infinity(a) {
  return a[0] === Infinity;
}

function is_zero(a) {
  return a[0] === 0;
}

function infinity_FS(index) {
  let result = [0];
  for (let i = 0; i < index; i++) result = [1, result, [0]];
  return [1, [0], result];
}

function to_OCN_IR(e) {
  if (is_infinity(e)) return { type: 'constant', display: 'Limit', display_latex: '\\text{Limit}' };
  if (is_zero(e)) return { type: 'number', value: 0 };
  const [, v, a] = e;
  if (is_zero(v)) return { type: 'psi', arg: to_OCN_IR(a) };
  return { type: 'psi', sub: to_OCN_IR(v), arg: to_OCN_IR(a) };
}

function compare(a, b) {
  if (is_infinity(a) || is_infinity(b)) {
    return boolean_compare(is_infinity(a), is_infinity(b));
  }
  if (is_zero(a) || is_zero(b)) {
    return boolean_compare(!is_zero(a), !is_zero(b));
  }
  return lex_compare([a[1], a[2]], [b[1], b[2]], compare);
}

function cofinality(e) {
  if (is_zero(e)) return undefined;
  let [, v, a] = e;
  if (is_zero(a)) {
    if (is_zero(v)) return undefined;
    let cf_v = cofinality(v);
    if (cf_v === undefined) return v;
    return cf_v;
  }
  let cf_a = cofinality(a);
  if (cf_a === undefined) return undefined;
  if (compare(cf_a, v) <= 0) return cf_a;
  return [0];
}

function ZERO() {
  return [0];
}

function from_nat(n) {
  let result = [0];
  for (let i = 0; i < n; i++) {
    result = [1, [0], result];
  }
  return result;
}

function to_nat(e) {
  if (is_zero(e)) return 0;
  if (compare(e[1], ZERO()) !== 0) throw new Error('not a natural number');
  return 1 + to_nat(e[2]);
}

function FS(e, index) {
  if (is_infinity(e)) return infinity_FS(to_nat(index));
  if (is_zero(e)) return e;

  let [, v, a] = e;
  if (is_zero(a)) {
    if (is_zero(v)) return ZERO();
    let cf_v = cofinality(v);
    if (cf_v === undefined) return index;
    return [1, FS(v, index), [0]];
  }
  let cf_a = cofinality(a);
  if (cf_a === undefined) {
    return [1, v, FS(a, [0])];
  }
  if (compare(cf_a, v) <= 0) {
    return [1, v, FS(a, index)];
  }
  let result = [0];
  let index_nat = to_nat(index);
  let cf_a_pred = FS(cf_a, [0]);
  for (let i = 0; i < index_nat; i++) {
    result = FS(a, [1, cf_a_pred, result]);
  }
  return [1, v, result];
}

export const NOCF_EBO = {
  id: 'nocf-ebo',
  name: 'Nothing OCF',
  simple_name: 'NOCF (EBO)',
  category_id: 'category-ocf',
  is_limit: (e) => is_infinity(e) || cofinality(e) !== undefined,
  compare,
  FS: (e, index) => FS(e, from_nat(index)),
  display: make_OCN_display(to_OCN_IR),
  credit_text_id: 'credit.nocf',

  init: () => [INFINITY(), ZERO()],
};

register_notation(NOCF_EBO);
