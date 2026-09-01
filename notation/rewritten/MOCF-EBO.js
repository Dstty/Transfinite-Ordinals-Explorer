// ============================================================================
//  notation/MOCF-EBO.js — Madore's OCF（ψ 与 Ω 形式，极限 EBO）
// ============================================================================
//  移植自 ne-rewritten: src/notations/OCN/MOCF_EBO.ts
//  表达式：
//    0 = [0]；1 = [1, Expr[]]（和）；2 = [2, Expr]（ω^）；3 = [3, Expr]（Ω_）；
//    4 = [4, Expr, Expr]（ψ_v(a)）
//  id: mocf-ebo
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { boolean_compare, lex_compare, number_compare, tuple_lex_compare_by, make_OCN_display, merge_sum_OCN } = U;

  function INFINITY() {
    return [Infinity];
  }
  function is_infinity(a) {
    return a[0] === Infinity;
  }
  function is_zero(a) {
    return a[0] === 0;
  }
  function prim_list(e) {
    if (is_zero(e)) return [];
    if (e[0] !== 1) return [e];
    return e[1];
  }
  function from_prim_list(ps) {
    if (ps.length === 0) return [0];
    if (ps.length === 1) return ps[0];
    return [1, ps];
  }
  function infinity_FS(index) {
    let result = ONE();
    for (let i = 0; i < index; i++) result = [3, result];
    return [4, ZERO(), result];
  }
  function to_OCN_IR(e) {
    if (is_infinity(e)) {
      return { type: 'constant', display: 'Limit', display_latex: '\\text{Limit}' };
    }
    switch (e[0]) {
      case 0:
        return { type: 'number', value: 0 };
      case 1:
        return merge_sum_OCN(e[1].map(to_OCN_IR));
      case 2: {
        if (e[1][0] === 0) return { type: 'number', value: 1 }; // ω^0 = 1
        if (e[1][0] === 2 && e[1][1][0] === 0) return { type: 'omega' }; // ω^1 = ω
        return { type: 'omega', sup: to_OCN_IR(e[1]) };
      }
      case 3: {
        if (e[1][0] === 2 && e[1][1][0] === 0) return { type: 'Omega' }; // Ω_1 = Ω
        return { type: 'Omega', sub: to_OCN_IR(e[1]) };
      }
      case 4: {
        const arg = to_OCN_IR(e[2]);
        if (e[1][0] === 0) return { type: 'psi', arg };
        const sub = to_OCN_IR(e[1]);
        return { type: 'psi', sub, arg };
      }
    }
  }
  function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
      return boolean_compare(is_infinity(a), is_infinity(b));
    }
    function impl(a, b) {
      if (a[0] === 0 || b[0] === 0 || a[0] === 1 || b[0] === 1) {
        return lex_compare(prim_list(a), prim_list(b), impl);
      }
      if (a[0] === 2 && b[0] === 2) return impl(a[1], b[1]);
      if (a[0] === 2) return impl(a[1], b);
      if (b[0] === 2) return impl(a, b[1]);
      if (a[0] === 3) {
        if (b[0] === 3) {
          return impl(a[1], b[1]);
        }
        return tuple_lex_compare_by([impl, number_compare])([a[1], 0], [b[1], 1]);
      }
      if (b[0] === 3) {
        return tuple_lex_compare_by([impl, number_compare])([a[1], 1], [b[1], 0]);
      }
      return tuple_lex_compare_by([impl, impl])([a[1], a[2]], [b[1], b[2]]);
    }
    return impl(a, b);
  }
  function add(a, b) {
    return from_prim_list([...prim_list(a), ...prim_list(b)]);
  }
  function omega_pow(a) {
    if (a[0] >= 3) return a;
    return [2, a];
  }
  function cofinality(e) {
    switch (e[0]) {
      case 0:
        return undefined;
      case 1:
        return cofinality(e[1][e[1].length - 1]);
      case 2:
        if (is_zero(e[1])) return undefined;
        return cofinality(e[1]) ?? ZERO();
      case 3:
        return cofinality(e[1]) ?? e[1];
      case 4: {
        let [, v, a] = e;
        if (is_zero(a)) {
          return ZERO();
        }
        let cf_a = cofinality(a);
        if (cf_a === undefined) return ZERO();
        if (compare(cf_a, v) <= 0) return cf_a;
        return ZERO();
      }
      default:
        throw new Error('unreachable');
    }
  }
  function ZERO() {
    return [0];
  }
  function ONE() {
    return [2, ZERO()];
  }
  function mul_nat(e, n) {
    return from_prim_list(Array.from({ length: n }, () => e));
  }
  function from_nat(n) {
    return mul_nat(ONE(), n);
  }
  function to_nat(e) {
    let ps = prim_list(e);
    if (ps.length === 0) return 0;
    if (compare(ps[0], ONE()) !== 0) throw new Error('not a natural number');
    return ps.length;
  }
  function FS(e, index) {
    if (is_infinity(e)) return infinity_FS(to_nat(index));
    switch (e[0]) {
      case 0:
        return ZERO();
      case 1: {
        let tail_FS = FS(e[1][e[1].length - 1], index);
        return from_prim_list([...e[1].slice(0, -1), ...prim_list(tail_FS)]);
      }
      case 2: {
        if (is_zero(e[1])) return ZERO();
        let cf_e1 = cofinality(e[1]);
        if (cf_e1 === undefined) {
          let wp_prev = omega_pow(FS(e[1], ZERO()));
          return mul_nat(wp_prev, to_nat(index));
        } else {
          return omega_pow(FS(e[1], index));
        }
      }
      case 3: {
        let cf_e1 = cofinality(e[1]);
        if (cf_e1 === undefined) return index;
        let e1_FS = FS(e[1], index);
        if (is_zero(e1_FS)) return ZERO();
        return [3, e1_FS];
      }
      case 4: {
        let [, v, a] = e;
        let cf_a = cofinality(a);
        if (cf_a === undefined) {
          let i_nat = to_nat(index);
          let base;
          if (is_zero(a)) {
            if (is_zero(v)) {
              base = ZERO();
            } else {
              base = [3, v];
            }
          } else {
            let a_prev = FS(a, ZERO());
            base = [4, v, a_prev];
          }
          if (i_nat === 0) return base;
          let result = add(base, ONE());
          for (let i = 0; i < i_nat - 1; i++) {
            result = omega_pow(result);
          }
          return result;
        }
        if (compare(cf_a, v) <= 0) {
          return [4, v, FS(a, index)];
        } else {
          let cf_a_prev = FS(cf_a, ZERO());
          let i_nat = to_nat(index);
          let result = ZERO();
          for (let i = 0; i < i_nat; i++) {
            result = FS(a, [4, cf_a_prev, result]);
          }
          return [4, v, result];
        }
      }
    }
  }

  register.push({
    id: 'mocf-ebo',
    name: "Madore's OCF",
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
