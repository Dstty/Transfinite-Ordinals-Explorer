// ============================================================================
//  notation/T-minus1-Y.js — Transfinite -1Y（T(-1)Y）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/T_minus1_Y.ts
//  id: t--1y（与 ne-rewritten 一致）
//  表达式 = 嵌套数组；display 顶级逗号连接，子项括号括起
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const lex_compare = U.lex_compare;

  function INFINITY() {
    return [Infinity];
  }
  function is_infinity(e) {
    return '' + e === 'Infinity';
  }
  function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && e[e.length - 1].length > 0);
  }
  function compare(a, b) {
    return lex_compare(a, b, compare);
  }
  function root(a) {
    if (is_infinity(a)) return -1;
    if (a.length === 0) return -1;
    let result = a.length - 2;
    while (result >= 0 && compare(a[result], a[a.length - 1]) >= 0) result--;
    return result;
  }
  function infinity_FS(index) {
    if (index === 0) return [[]];
    return [[], infinity_FS(index - 1)];
  }
  function FS(a, index) {
    if (is_infinity(a)) return infinity_FS(index);
    if (a.length === 0) return a;
    if (a[a.length - 1].length === 0) return a.slice(0, -1);

    if (is_limit(a[a.length - 1])) {
      return [...a.slice(0, -1), FS(a[a.length - 1], index)];
    }

    let r = root(a);
    let result = a.slice(0, -1);
    let dup = a.slice(r, -1);
    dup[0] = a[a.length - 1].slice(0, -1);
    for (let i = 0; i < index; i++) result.push(...dup);
    return result;
  }
  function display(a, top_level = true) {
    if (is_infinity(a)) return 'Limit';
    if (top_level) return a.map((t) => display(t, false)).join(',');
    if (a.every((t) => t.length === 0)) return '' + a.length;
    return '(' + display(a, true) + ')';
  }

  register.push({
    id: 't--1y',
    name: 'Transfinite -1Y',
    display,
    able: is_limit,
    compare,
    FS,
    init: () => [
      { expr: INFINITY(), low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
  });
})();
