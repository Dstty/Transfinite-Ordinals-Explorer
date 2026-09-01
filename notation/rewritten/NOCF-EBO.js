// ============================================================================
//  notation/NOCF-EBO.js — "Nothing" OCF（ψ(Ω^ψ(…)) 形式，极限 EBO）
// ============================================================================
//  移植自 ne-rewritten: src/notations/OCN/NOCF_EBO.ts
//  表达式：0 = [0]；其余 = [1, v, a]（ψ_v(a)）；显示为 ψ 无下标形式
//  id: nocf-ebo
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { boolean_compare, lex_compare, make_OCN_display } = U;

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

  register.push({
    id: 'nocf-ebo',
    name: 'Nothing OCF',
    display: make_OCN_display(to_OCN_IR),
    able: (e) => is_infinity(e) || cofinality(e) !== undefined,
    compare,
    FS: (e, index) => FS(e, from_nat(index)),
    init: () => [
      { expr: INFINITY(), low: [ZERO()], subitems: [] },
      { expr: ZERO(), low: [ZERO()], subitems: [] },
    ],
  });
})();
