// ============================================================================
//  notation/minus1-Y.js — -1Y sequence
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/minus1_Y.ts
//  id: -1y（与 ne-rewritten 一致）
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const lex_compare = U.lex_compare;
  const number_compare = U.number_compare;
  const sequence_display = U.sequence_display;
  const sequence_from_display = U.sequence_from_display;

  function INFINITY() {
    return [Infinity];
  }
  function is_infinity(e) {
    return '' + e === 'Infinity';
  }
  function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && e[e.length - 1] > 1);
  }
  function compare(a, b) {
    return lex_compare(a, b, number_compare);
  }
  function root(a) {
    if (is_infinity(a)) return -1;
    if (a.length === 0) return -1;
    let result = a.length - 2;
    while (result >= 0 && a[result] >= a[a.length - 1]) result--;
    return result;
  }
  function infinity_FS(index) {
    return [1, index + 1];
  }
  function FS(a, index) {
    if (is_infinity(a)) return infinity_FS(index);
    if (a.length === 0) return a;
    if (a[a.length - 1] === 1) return a.slice(0, a.length - 1);

    let r = root(a);
    let result = a.slice(0, a.length - 1);
    let dup = a.slice(r, a.length - 1);
    dup[0] = a[a.length - 1] - 1;
    for (let i = 0; i < index; i++) result.push(...dup);
    return result;
  }

  register.push({
    id: '-1y',
    name: '-1Y sequence',
    display: sequence_display,
    able: is_limit,
    compare,
    FS,
    parse: sequence_from_display,
    init: () => [
      { expr: INFINITY(), low: [[]], subitems: [] },
      { expr: [1], low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
  });
})();
