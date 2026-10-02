// ============================================================================
//  notation/ne/TON_DRC.js — TON Degrees of Reflection (reflection configuration)
// ============================================================================
//  移植自 ne-rewritten: src/notations/TON/TON_DRC.ts
//  注册 id: ton-drc，分类 category-ton
//  算法逐行照搬，只去掉类型注解。
//  与 ne 的差异：无（本记号无 generator，不涉及 initial 调整。
//  与 TON_DoR 的唯一差别是 BuiltQ 里用 r() 做反射配置比较）。
// ============================================================================
import { r, TON_limit, TON_noraise_compare, TON_noraise_display } from './ton_helpers.js';
import { register_notation } from '../../core/ne/registry.js';

var data = {};
var DRCStd = {};
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
var BuiltQ = (a, ap, b, x, xp) =>
  TON_noraise_compare(x, 0) < 0
    ? TON_noraise_compare(x, b) < 0 ||
      (TON_noraise_compare(r(x, xp), r(a, ap)) <= 0 && BuiltQ(a, ap, b, x[0], x) && BuiltQ(a, ap, b, x[1], x))
    : x === 0 || (BuiltQ(a, ap, b, x[0], xp) && BuiltQ(a, ap, b, x[1], xp));
var StandardQ = (a) => {
  var str = JSON.stringify(a);
  if (DRCStd[str]) {
    return DRCStd[str];
  } else if (
    typeof a === 'number' ||
    (StandardQ(a[1]) &&
      StandardQ(a[0]) &&
      (typeof a[0] === 'number' || TON_noraise_compare(a[1], a[0][1]) <= 0) &&
      smallpart(a[1]).every((x) => BuiltQ(x, a, a, x, a)))
  ) {
    return (DRCStd[str] = true);
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

export const TON_DRC = {
  id: 'ton-drc',
  name: 'Degrees of Reflection (reflection configuration)',
  simple_name: 'TON_DRC',
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

register_notation(TON_DRC);
