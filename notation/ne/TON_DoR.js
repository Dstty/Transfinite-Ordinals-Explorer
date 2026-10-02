// ============================================================================
//  notation/ne/TON_DoR.js — TON Degrees of Reflection（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/TON/TON_DoR.ts
//  注册 id: ton-dr，分类 category-ton
//  算法逐行照搬，只去掉类型注解。
//  与 ne 的差异：无（本记号无 generator，不涉及 initial 调整；
//  原先静态档位就是单一 ton-dr）。
// ============================================================================
import { TON_limit, TON_noraise_compare, TON_noraise_display } from './ton_helpers.js';
import { register_notation } from '../../core/ne/registry.js';

var data = {};
var DRStd = {};
var smallpart = (term) => {
  var sow_smallpart = (a) => {
      if (a === 0) return;
      if (TON_noraise_compare(a, 0) < 0) {
        result.push(a);
      } else {
        sow_smallpart(a[0]);
        sow_smallpart(a[1]);
      }
    },
    result = [];
  sow_smallpart(term);
  return result;
};
var BuiltQ = (a, b, x) =>
  TON_noraise_compare(x, 0) < 0
    ? TON_noraise_compare(x, b) < 0 || (TON_noraise_compare(x, a) <= 0 && BuiltQ(a, b, x[0]) && BuiltQ(a, b, x[1]))
    : x === 0 || (BuiltQ(a, b, x[0]) && BuiltQ(a, b, x[1]));
var StandardQ = (a) => {
  var str = JSON.stringify(a);
  if (DRStd[str]) {
    return DRStd[str];
  } else if (
    typeof a === 'number' ||
    (StandardQ(a[1]) &&
      StandardQ(a[0]) &&
      (typeof a[0] === 'number' || TON_noraise_compare(a[1], a[0][1]) <= 0) &&
      smallpart(a[1]).every((x) => BuiltQ(x, a, x)))
  ) {
    return (DRStd[str] = true);
  } else {
    return false;
  }
};
var Copy = (x) => (typeof x === 'number' ? x : [Copy(x[0]), Copy(x[1]), -2]);
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

export const TON_DoR = {
  id: 'ton-dr',
  name: 'Degrees of Reflection',
  simple_name: 'TON_DoR',
  category_id: 'category-ton',
  display: TON_noraise_display,
  is_limit: TON_limit,
  compare: TON_noraise_compare,
  FS: (() => {
    return (term, n) => {
      if ('' + term === 'Infinity') {
        term = [-1, 0, -2];
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
  init: () => [Infinity, -1],
};

register_notation(TON_DoR);
