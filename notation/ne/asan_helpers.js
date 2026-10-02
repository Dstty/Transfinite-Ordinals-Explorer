// ============================================================================
//  notation/ne/asan_helpers.js — aSAN 系共享工具（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/aSAN/asan_helpers.ts
//  被 notation/ne/aSAN.js / aSAN2.js / aSAN3.js / aSAN_tilde3plus.js 共用
//  （独立模块，不内联进各记号文件）。
//
//  算法逐行照搬，只去掉类型注解。表达式 = any（number | any[]）。
//  与 ne 的差异：无（纯工具模块，不注册记号/分类，不涉及 initial 调整）。
// ============================================================================
import { boolean_compare } from '../../core/ne/utils.js';

/** 记号极限的特殊值: aSAN 中无法由普通标准项表示的极限 ([1, ω])。 */
export function INFINITY() {
  return [1, Infinity];
}

export function is_infinity(a) {
  return Array.isArray(a) && a.length === 2 && a[0] === 1 && a[1] === Infinity;
}

export var aSAN_compare = (a, b) => {
  if (is_infinity(a) || is_infinity(b)) return boolean_compare(is_infinity(a), is_infinity(b));
  if (typeof a === 'number') {
    if (typeof b === 'number') return a > b ? 1 : a < b ? -1 : 0;
    a = [a];
  }
  if (typeof b === 'number') b = [b];
  if (a.length > b.length) return 1;
  if (a.length < b.length) return -1;
  var tmp, k;
  for (k = a.length; k--; ) {
    tmp = aSAN_compare(a[k], b[k]);
    if (tmp !== 0) return tmp;
  }
  return 0;
};

export var aSAN_display = (a) =>
  typeof a === 'number' ? '' + a : is_infinity(a) ? 'Limit' : '(' + a.map(aSAN_display).join() + ')';

export function aSAN_from_display(s) {
  let i = 0;

  function error() {
    throw new Error('Illegal input string: ' + s);
  }

  function skip_spaces() {
    while (i < s.length && s[i] === ' ') i++;
  }

  function parse_number() {
    const start = i;
    while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
    if (start === i) error();
    return parseInt(s.substring(start, i), 10);
  }

  function parse_value() {
    skip_spaces();
    if (i >= s.length) error();
    if (s[i] === '(') {
      i++;
      const result = [];
      skip_spaces();
      if (i < s.length && s[i] === ')') {
        i++;
        return result;
      }
      while (true) {
        result.push(parse_value());
        skip_spaces();
        if (i >= s.length) error();
        if (s[i] === ',') {
          i++;
          continue;
        }
        if (s[i] === ')') {
          i++;
          return result;
        }
        error();
      }
    }
    if (s.slice(i, i + 5) === 'Limit') {
      i += 5;
      return INFINITY();
    }
    return parse_number();
  }

  skip_spaces();
  const result = parse_value();
  skip_spaces();
  if (i !== s.length) error();
  return result;
}

export var aSAN_base = (A) => (typeof A === 'number' ? A : aSAN_base(A[0]));

export var aSAN_able = (a) => typeof a !== 'number' && aSAN_base(a) === 1;

export var aSAN_semiable = (a) => a !== 1;
