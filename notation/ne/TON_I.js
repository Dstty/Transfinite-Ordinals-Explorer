// ============================================================================
//  notation/ne/TON_I.js — TON_I（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/TON/TON_I.ts
//  注册 id: ton-i（单体记号，无 generator）
//
//  与 ne 的差异：无。旧条目 core/notation-manifest.js 的
//  notation/legacy/TON-I.js 也只有 ids: ['ton-i'] 一项，不涉及 initial 调整。
//  分类 category-ton 已由 notation/ne/categories.js 骨架注册（ne 的
//  TON/categories.ts 里该分类同样无 generator），本文件不含分类定义，
//  故无需 ensure_category。
//
//  import 对应关系：
//    './ton_helpers.ts'          → './ton_helpers.js'
//    '@/notation-definition.ts'  → 纯类型，删除
//
//  算法逐行照搬，仅去掉类型注解。
// ============================================================================
import { TON_limit, TON_noraise_compare, TON_noraise_display } from './ton_helpers.js';
import { register_notation } from '../../core/ne/registry.js';

var data = {};
var IStd = {};
var extract = (term, index) => (index.length ? extract(term[index[0]], index.slice(1)) : term);
var smallindex = (a) => {
  if (a === 0) return [];
  var sow_smallindex = (a, begin) => {
      if (a === 0) return;
      if (TON_noraise_compare(a, 0) < 0) {
        result.push(begin);
      } else {
        sow_smallindex(a[0], begin.concat(0));
        sow_smallindex(a[1], begin.concat(1));
      }
    },
    result = [];
  sow_smallindex(a, []);
  return result;
};
var Copy = (x) => (typeof x === 'number' ? x : [Copy(x[0]), Copy(x[1]), -2]);
var get_n = (term, index) => {
  var subterm,
    i,
    a = Copy(term),
    a1index = index.slice();
  for (i = 0; i < a1index.length; ) {
    if (a1index[i] === 0) {
      if (i === 0) {
        a = a[0];
      } else {
        subterm = extract(a, a1index.slice(0, i - 1));
        subterm[a1index[i - 1]] = subterm[a1index[i - 1]][0];
      }
      a1index.splice(i, 1);
    } else i++;
  }
  if (a1index.length === 0) {
    a = 0;
  } else {
    subterm = extract(a, a1index.slice(0, a1index.length - 1));
    subterm[a1index[a1index.length - 1]] = 0;
  }
  var scan = (x) => {
    if (typeof x === 'number') return;
    if (typeof x[0] === 'number') return;
    if (TON_noraise_compare(x[1], x[0][1]) > 0) x[0] = x[0][0];
    scan(x[0]);
    scan(x[1]);
  };
  scan(a);
  var alim = a;
  a = Copy(term);
  var str1 = ('' + a).split(',').map((e) => +e),
    str2 = ('' + alim).split(',').map((e) => +e),
    a2 = [];
  while (str1.length && str2.length && str1[0] === str2[0]) {
    a2.push(str1[0]);
    str1.shift();
    str2.shift();
  }
  var n = 0;
  while (a2[a2.length - 1] === -2) a2.pop();
  if (a2[a2.length - 1] === -1) {
    ++n;
    a2.pop();
  } else {
    return n;
  }
  while (a2[a2.length - 1] === -2 && a2[a2.length - 2] === -1) {
    ++n;
    a2.splice(a2.length - 2, 2);
  }
  return n;
};
var BuiltQ = (a, b, n, x) =>
  n
    ? (TON_noraise_compare(x, 0) < 0 && BuiltQ(x, b, n - 1, x)) ||
      ((TON_noraise_compare(x, 0) >= 0 || TON_noraise_compare(x, a) <= 0) &&
        (x === 0 || (BuiltQ(a, b, n, x[0]) && BuiltQ(a, b, n, x[1]))))
    : TON_noraise_compare(a, b) < 0;
var StandardQ = (a) => {
  var str = JSON.stringify(a);
  if (IStd[str]) {
    return IStd[str];
  } else if (
    typeof a === 'number' ||
    (StandardQ(a[1]) &&
      StandardQ(a[0]) &&
      (typeof a[0] === 'number' || TON_noraise_compare(a[1], a[0][1]) <= 0) &&
      smallindex(a[1]).every((index) =>
        BuiltQ(extract(a[1], index), a, get_n(a[1], index), extract(a[1], index)),
      ))
  ) {
    return (IStd[str] = true);
  } else {
    return false;
  }
};
var TON_gen = function* (term) {
  var flag = true,
    c1,
    c3,
    n = 0,
    beta = Copy(term),
    len = ('' + term).split(',').length;
  mainloop: while (true) {
    if (flag) {
      if (typeof beta === 'number' && beta >= 0) {
        beta = -1;
      } else if (beta[1] === -1) {
        beta = beta[0];
        continue;
      } else if (typeof beta[1] === 'number' && beta[1] >= 0) {
        beta[1] = -1;
      } else if (beta[1][1] === -1) {
        beta = [[beta[0], beta[1][0], -2], 0, -2];
      } else if (typeof beta[1][1] === 'number' && beta[1][1] >= 0) {
        beta[1][1] = -1;
      } else {
        c3 = beta;
        c1 = beta[1][1];
        while (typeof c1[1] !== 'number') {
          c3 = c3[1];
          c1 = c1[1];
        }
        if (c1[1] === -1) {
          c3[1] = [[c3[1][0], c1[0], -2], 0, -2];
        } else {
          c1[1] = -1;
        }
      }
    }
    flag = true;
    while (('' + beta).split(',').length < len + n * 2) {
      if (!StandardQ(beta)) continue mainloop;
      if (typeof beta !== 'number') {
        c1 = beta;
        while (typeof c1[1] !== 'number') c1 = c1[1];
        c1[1] = [c1[1], 0, -2];
      } else {
        beta = [beta, 0, -2];
      }
    }
    if (StandardQ(beta)) {
      n = yield Copy(beta);
      flag = false;
    }
  }
};

export const TON_I = {
  id: 'ton-i',
  name: 'Iteration of n-built from below (no passthrough)',
  simple_name: 'TON_I',
  category_id: 'category-ton',
  display: TON_noraise_display,
  is_limit: TON_limit,
  compare: TON_noraise_compare,
  FS: (() => {
    return (term, n) => {
      if ('' + term === 'Infinity') {
        term = [-1, [[0, [0, -1, -2], -2], 0, -2], -2];
      }
      var datakey = '' + term,
        dataterm = data[datakey];
      if (!dataterm) {
        dataterm = data[datakey] = [];
        dataterm.gen = TON_gen(term);
        dataterm[0] = dataterm.gen.next().value;
      }
      if (dataterm[n] !== undefined) return dataterm[n];
      return (dataterm[n] = dataterm.gen.next(n).value);
    };
  })(),
  credit_text_id: 'credit.ton',
  init: () => [Infinity, [-1, [0, [0, -1, -2], -2], -2], [-1, [0, 0, -2], -2], [-1, 0, -2], -1],
};

register_notation(TON_I);
