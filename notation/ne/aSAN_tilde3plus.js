// ============================================================================
//  notation/ne/aSAN_tilde3plus.js — aSAN~3+
// ============================================================================
//  移植自 ne-rewritten: src/notations/aSAN/aSAN_tilde3plus.ts
//  注册 id: asan-tilde3plus，分类 category-asan
//  算法逐行照搬，只去掉类型注解。
//  与 ne 的差异：无（本记号无 generator，不涉及 initial 调整）。
//  源定义字段即全部字段：id / name / simple_name / category_id / display /
//  is_limit / compare / FS / credit_text_id / init（源无 display_equiv、debug、
//  FS_alter、FS_short、FS_equiv，故不凭空添加）。
//  与 aSAN3.js 的差异：trans 返回「标记对象」而非下标数组，search 为其专用遍历。
// ============================================================================
import {
  aSAN_able,
  aSAN_base,
  aSAN_compare,
  aSAN_display,
  aSAN_from_display,
  aSAN_semiable,
  INFINITY,
  is_infinity,
} from './asan_helpers.js';
import { register_notation } from '../../core/ne/registry.js';

var data = {};
var Copy = (a) => (typeof a === 'number' ? a : a.map(Copy));
var pilot = (A) => {
  if (typeof A === 'number') return A;
  for (var b = 0; b < A.length; ++b) {
    if (A[b] !== 1) return A[b];
  }
};
var pre = (A) => {
  if (typeof A === 'number') return A - 1;
  var e = A.slice();
  e.unshift(pre(e.shift()));
  return e;
};
var change = (A, n) => {
  var b,
    e = A.slice();
  for (b = 0; b < e.length; ++b) {
    if (e[b] !== 1) {
      b ? e.splice(b - 1, 2, n, pre(e[b])) : e.splice(b, 1, pre(e[b]));
      return e;
    }
  }
};
var layers = (A) => {
  var Lk,
    L = [A];
  while (true) {
    Lk = pilot(L[L.length - 1]);
    if (aSAN_base(Lk) > 1) break;
    L.push(Lk);
  }
  return L;
};
var changeL = (L, a, b) => {
  if (a === L.length - 1) return change(L[a], b);
  var x = L[a].indexOf(L[a + 1]),
    La = Copy(L[a]);
  La[x] = changeL(L, a + 1, b);
  return La;
};
var trans = (L) => {
  var n = L.length - 1,
    Trans = 0,
    Transcenders = {};
  for (var k = 1; k <= n; ++k) {
    if (!Trans && L[k - 1][0] !== L[k]) {
      Transcenders[k - 1] = true;
      Trans = 1;
    }
    if (Trans && aSAN_compare(L[n], L[k]) > 0) Trans = 0;
  }
  return Transcenders;
};
var search = (L) => {
  var T = trans(L),
    k = L.length - 1,
    N = L[k],
    o = k,
    M = N,
    Trans = 0;
  while (k--) {
    if (aSAN_compare(L[k], M) > 0) o = k;
    if (!Trans) {
      if (T[k]) {
        if (aSAN_compare(M, L[k]) > 0 && aSAN_compare(L[k], L[k + 1]) > 0) return o;
        o = k;
        M = L[k];
        Trans = 1;
      }
      if (N[1] === 1 && k > 0) continue;
    }
    if (Trans && !T[k]) continue;
    if (aSAN_compare(M, L[k]) > 0) return o;
  }
  return 0;
};
var Standard = (A) => {
  if (typeof A === 'number') return A;
  if (A.length === 1) {
    if (typeof A[0] === 'number') return A[0];
    if (A[0].length === 1) return Standard(A[0]);
  }
  if (A[A.length - 1] === 1) return Standard(A.slice(0, A.length - 1));
  return A.map(Standard);
};
var aSAN_FS = (A, FSterm) => {
  var L = layers(Copy(A)),
    m = search(L),
    f = (n) => changeL(L, m, n),
    result = FSterm + 1;
  for (var n = FSterm; n--; ) {
    result = f(result);
  }
  if (m > 0) {
    L[m - 1][L[m - 1].indexOf(L[m])] = result;
    result = L[0];
  }
  var std;
  while (JSON.stringify((std = Standard(result))) !== JSON.stringify(result)) result = std;
  return result;
};

export const aSAN_tilde3plus = {
  id: 'asan-tilde3plus',
  name: 'aSAN~3+',
  simple_name: 'aSAN~3+',
  category_id: 'category-asan',
  display: { plain: aSAN_display, from_display: aSAN_from_display },
  is_limit: aSAN_able,
  compare: aSAN_compare,
  FS: (A, FSterm) => {
    if (!aSAN_semiable(A)) return A;
    if (is_infinity(A)) return FSterm ? Array(FSterm).fill(1).concat(2) : 2;
    if (aSAN_base(A) > 1) return pre(A);
    var key = aSAN_display(A);
    if (!data[key]) data[key] = [];
    else if (data[key][FSterm] !== undefined) return data[key][FSterm];
    return (data[key][FSterm] = aSAN_FS(A, FSterm));
  },
  credit_text_id: 'credit.asan',
  init: () => [INFINITY(), 1],
};

register_notation(aSAN_tilde3plus);
