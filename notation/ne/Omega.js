// ============================================================================
//  notation/ne/Omega.js — 自然数 ω（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Misc/Omega.ts
//  这是本项目第一个「ne 原生风格」记号：ES module + NotationDefinition，
//  init() 返回表达式数组，树由 core/ne 拥有（无 low 边界）。
//  作为对照，notation/rewritten/ 下的记号仍是远古 register.push 接口。
// ============================================================================
import { number_compare } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';

export function is_infinity(a) {
  return a === Infinity;
}

export function compare(a, b) {
  return number_compare(a, b);
}

export function display(a) {
  return a === Infinity ? 'ω' : '' + a;
}

export function from_display(s) {
  s = s.trim().toLowerCase();
  // 注意：ne 原版在 toLowerCase() 之后仍比较 'Infinity' / 'Limit'，
  // 这两支永远不会命中（大小写已归一）；这里按原意修正为小写比较。
  if (s === 'ω' || s === 'w' || s === 'infinity' || s === 'limit') return Infinity;
  if (!/^-?\d+$/.test(s)) throw new Error(`Illegal input string: ${s}`);
  return parseInt(s, 10);
}

export const omega = {
  id: 'omega',
  name: '自然数 ω',
  simple_name: 'ω',
  display: { plain: display, from_display },
  is_limit: is_infinity,
  compare,
  FS: (a, i) => (is_infinity(a) ? i : a > 0 ? a - 1 : 0),
  init: () => [Infinity, 0],
};

register_notation(omega);
