// ============================================================================
//  notation/ne/TON_MC.js — TON_MC（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/TON/TON_MC.ts
//  注册 id: ton-mc（单体记号，无 generator）
//
//  与 ne 的差异：无。旧条目 core/notation-manifest.js 的
//  notation/legacy/TON-MC.js 也只有 ids: ['ton-mc'] 一项，不涉及 initial 调整。
//  分类 category-ton 已由 notation/ne/categories.js 骨架注册（ne 的
//  TON/categories.ts 里该分类同样无 generator），本文件不含分类定义，
//  故无需 ensure_category。
//
//  import 对应关系：
//    './ton_helpers.ts'          → './ton_helpers.js'（r / raise / TON_compare /
//                                   TON_limit / TON_main_display）
//    '@/notation-definition.ts'  → 纯类型，删除
//
//  算法逐行照搬，仅去掉类型注解。
// ============================================================================
import { r, raise, TON_compare, TON_limit, TON_main_display } from './ton_helpers.js';
import { register_notation } from '../../core/ne/registry.js';

var data = {};
var MCStd = {};
var mark = (sys) => {
  var res = sys;
  for (var i = sys; i > 0; i--) res = [[-1, sys, -2], res, -2];
  for (i = sys - 1; i > 0; i--) res = [-1, res, -2];
  return res;
};
var mark_FS = (sys, n) => {
  var i,
    res = sys - 1;
  for (i = 0; i < n; ++i) res = [sys - 1, res, -2];
  for (i = sys - 1; i > 0; i--) res = [-1, res, -2];
  return res;
};
var extract = (term, index) => (index.length ? extract(term[index[0]], index.slice(1)) : term);
var subterm_index = (a) => {
  var sow_subterms = (a, begin) => {
      result.push(begin.slice());
      if (typeof a === 'number') return;
      sow_subterms(a[0], begin.concat(0));
      sow_subterms(a[1], begin.concat(1));
    },
    result = [];
  sow_subterms(a, []);
  return result;
};
var BuiltQ = (a, b, n) => {
  if (!(n > 0)) return TON_compare(a, b) < 0;
  var extractparent = (x) => (x.length ? extract(a, x.slice(0, x.length - 1)) : b),
    refresh_totest = (d, e) => {
      if (typeof extract(a, d) === 'number' || TON_compare(extract(a, d), extractparent(e)) < 0) return;
      totest.push(d);
      refresh_totest(d.concat(0), e);
      refresh_totest(d.concat(1), e);
    },
    totest = [];
  return subterm_index(a).every((x) => {
    if (TON_compare(r(extract(a, x), extractparent(x)), r(a, b)) <= 0) return true;
    if (x.some((t, zindex) => TON_compare(extract(a, x.slice(0, zindex)), b) < 0)) return true;
    totest = [];
    refresh_totest(x, x);
    for (var y = x.slice(); y.length > 0; y.pop()) {
      if (
        x.slice(y.length).every(
          (t, dz) => TON_compare(extract(a, x.slice(0, y.length + dz)), extractparent(y)) >= 0,
        ) &&
        totest.every((z) => TON_compare(extract(a, z), extractparent(y)) >= 0) &&
        BuiltQ(extract(a, y), extractparent(y), n - 1)
      )
        return true;
    }
    return false;
  });
};
var StandardQ = (n, a) => {
  var str = JSON.stringify(a);
  if (MCStd[str]) {
    return MCStd[str];
  } else if (
    typeof a === 'number' ||
    (StandardQ(n, a[1]) &&
      StandardQ(n, a[0]) &&
      (typeof a[0] === 'number' || TON_compare(a[1], a[0][1]) <= 0) &&
      BuiltQ(a[1], a, n))
  ) {
    return (MCStd[str] = true);
  } else {
    return false;
  }
};
var Copy = (x) => (typeof x === 'number' ? x : [Copy(x[0]), Copy(x[1]), -2]);
var regress = (x) => typeof x === 'number' ? x : x[0] === -1 && x[1] > 0 ? x[1] - 1 : [regress(x[0]), regress(x[1]), -2];
var regress_repeated = (x) => {
  var x1;
  while ('' + (x1 = regress(x)) !== '' + x) x = x1;
  return x1;
};
var TON_gen = function* (term, sys) {
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
        beta = [[beta[0], beta[1][0], -2], sys, -2];
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
          c3[1] = [[c3[1][0], c1[0], -2], sys, -2];
        } else {
          c1[1] = -1;
        }
      }
    }
    flag = true;
    while (('' + beta).split(',').length < len + n * 2) {
      if (!StandardQ(sys, beta)) continue mainloop;
      if (typeof beta !== 'number') {
        c1 = beta;
        while (typeof c1[1] !== 'number') c1 = c1[1];
        c1[1] = [c1[1], sys, -2];
      } else {
        beta = [beta, sys, -2];
      }
    }
    if (StandardQ(sys, beta)) {
      n = yield regress_repeated(beta);
      flag = false;
    }
  }
};

export const TON_MC = {
  id: 'ton-mc',
  name: 'TON (reflection configuration) without passthrough',
  simple_name: 'TON_MC',
  category_id: 'category-ton',
  display: TON_main_display,
  is_limit: TON_limit,
  compare: TON_compare,
  FS: (() => {
    return (term, n) => {
      var i,
        res,
        sys = typeof term === 'number' ? term : Math.max(0, ...('' + term).split(',').map(Number));
      if (sys === Infinity) {
        res = [n, n, -2];
        for (i = 0; i < n; ++i) res = [-1, res, -2];
        return res;
      }
      term = raise(term, sys);
      if (sys >= 1 && '' + term === '' + mark(sys)) return mark_FS(sys, n);
      var datakey = '' + term,
        dataterm = data[datakey];
      if (!dataterm) {
        dataterm = data[datakey] = [];
        dataterm.gen = TON_gen(term, sys);
        dataterm[0] = dataterm.gen.next().value;
      }
      if (dataterm[n] !== undefined) return dataterm[n];
      return (dataterm[n] = dataterm.gen.next(n).value);
    };
  })(),
  credit_text_id: 'credit.ton',
  init: () => [Infinity, 0, -1],
};

register_notation(TON_MC);
