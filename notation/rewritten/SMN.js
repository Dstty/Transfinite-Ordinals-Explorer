// ============================================================================
//  notation/SMN.js — Smile 的 ω2 MN 系列
// ============================================================================
//  移植自 ne-rewritten:
//    src/notations/SMN/SA_omega2_MN.ts        (sa-omega2-mn)
//    src/notations/SMN/S_omega2_MN.ts         (s-omega2-mn)
//    src/notations/SMN/S_omega_pow_omega_MN.ts (s-omega-pow-omega-mn)
//  表达式 = Mountain（Column[]，Entry = [number, Sep, (mark)]，Sep = number[]）
//  id: sa-omega2-mn / s-omega2-mn / s-omega-pow-omega-mn
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    anti_lex_compare,
    boolean_compare,
    deepcopy,
    lex_compare,
    number_compare,
    tuple_lex_compare,
    MN_FS_variants,
  } = U;

  // ---------- 共享：极限 / 比较 / Sep 运算 ----------
  function Limit_expr() {
    return [[[Infinity]]];
  }
  function is_infinity(m) {
    return '' + m === 'Infinity';
  }
  function is_limit(m) {
    return is_infinity(m) || (m.length > 0 && m[m.length - 1].length > 0);
  }
  function sep_compare(s1, s2) {
    return anti_lex_compare(s1, s2, number_compare);
  }
  function vertical_compare(v1, v2) {
    return lex_compare(v1, v2, sep_compare);
  }
  function sep_is_one(s) {
    return s.length === 1 && s[0] === 1;
  }
  function sep_dimension(s) {
    let d = 0;
    while (s[d] === 0) d++;
    return d;
  }
  function sep_add(a, b) {
    if (b.length === 0) return a;
    let result = deepcopy(a);
    while (result.length < b.length) result.push(0);
    result[b.length - 1] += b[b.length - 1];
    for (let d = 0; d < b.length - 1; d++) {
      result[d] = b[d];
    }
    return result;
  }
  function sep_sub(a, b) {
    if (a.length > b.length) return a;
    if (a.length < b.length) return [];
    let d = a.length;
    while (d > 0 && a[d - 1] === b[d - 1]) d--;
    if (d === 0 || a[d - 1] < b[d - 1]) return [];
    let result = a.slice(0, d);
    result[d - 1] -= b[d - 1];
    return result;
  }
  function sep_increase(a, d) {
    let result = deepcopy(a);
    while (result.length <= d) result.push(0);
    result[d]++;
    result.fill(0, 0, d);
    return result;
  }
  function vertical_increase(v, s) {
    let i = v.length;
    while (i - 1 >= 0 && sep_compare(v[i - 1], s) < 0) i--;
    return [...v.slice(0, i), s];
  }
  function column_verticals(c) {
    const result = [];
    let current = [];
    for (let e of c) {
      result.push((current = vertical_increase(current, e[1])));
    }
    return result;
  }
  function find_index_below(Vi, v) {
    let l = 0,
      r = Vi.length;
    while (l < r) {
      const j = Math.ceil((l + r) / 2);
      const Vij = j === 0 ? [] : Vi[j - 1];
      if (vertical_compare(Vij, v) < 0) l = j;
      else r = j - 1;
    }
    return l;
  }
  function find_index_below_equal(Vi, v) {
    let l = 0,
      r = Vi.length;
    while (l < r) {
      const j = Math.ceil((l + r) / 2);
      const Vij = j === 0 ? [] : Vi[j - 1];
      if (vertical_compare(Vij, v) <= 0) l = j;
      else r = j - 1;
    }
    return l;
  }
  function parent(m, V, [i, j]) {
    const [value] = m[i][j];
    const pi = value - 1;
    const pj = pi === -1 ? 0 : find_index_below(V[pi], V[i][j]);
    return [pi, pj];
  }
  function magma_indices(m, V, [Ri, Rj], MI_partial) {
    const result = MI_partial ?? [];
    for (let i = result.length; i < m.length; i++) {
      result.push([]);
      if (i <= Ri) {
        // do nothing
      } else {
        for (let j = 0; j < m[i].length; j++) {
          let [pi, pj] = parent(m, V, [i, j]);
          if (pi < Ri) {
            break;
          } else if (pi === Ri) {
            result[i][j] = Math.min(pj, Rj);
          } else {
            if (pj === m[pi].length) pj--;
            if (pj >= result[pi].length) break;
            result[i][j] = result[pi][pj];
          }
        }
      }
    }
    return result;
  }
  function compute_stretch(sep, data) {
    if (data === undefined) return sep;
    let { threshold, stretch_to } = data;
    if (sep_compare(sep, threshold) <= 0) {
      return sep;
    } else {
      return sep_add(stretch_to, sep_sub(sep, threshold));
    }
  }
  function calc_ancestor_depths(m) {
    const V = m.map(column_verticals);
    const depthMap = [];
    for (let i = 0; i < m.length; i++) {
      depthMap[i] = [];
      for (let j = 0; j < m[i].length; j++) {
        const [pi, pj] = parent(m, V, [i, j]);
        depthMap[i][j] = pj === m[pi].length ? 1 : 1 + depthMap[pi][pj];
      }
    }
    return depthMap;
  }
  function convert_to_layer(om) {
    if (is_infinity(om)) return om;
    const depthMap = calc_ancestor_depths(om);
    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
      const column = dm[i];
      for (let j = 0; j < column.length; j++) {
        const entry = column[j];
        entry[0] = depthMap[i][j];
      }
    }
    return dm;
  }
  function convert_from_layer(dm) {
    if (is_infinity(dm)) return dm;
    const om = deepcopy(dm);
    let V = om.map(column_verticals);
    for (let i = 0; i < om.length; i++) {
      const column = om[i];
      for (let j = 0; j < column.length; j++) {
        const entry = column[j];
        let i1 = i,
          j1 = j - 1;
        while (true) {
          if (i1 === 0) {
            entry[0] = 1;
            break;
          }
          if (j1 >= 0) {
            [i1, j1] = parent(om, V, [i1, j1]);
          } else {
            i1 = i1 - 1;
          }
          let j0 = find_index_below_equal(V[i1], j === 0 ? [] : V[i][j - 1]);
          if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
            entry[0] = i1 + 1;
            break;
          }
        }
      }
    }
    return om;
  }
  // ---------- 工厂：三种 SMN ----------
  function make_SMN(cfg) {
    const { id, name, entry_display, entry_compare, sep_display, S, stretch_data_top, stretch_data_list, subtract_1, copy_column, infinity_FS } = cfg;

    function display(m) {
      return is_infinity(m) ? 'Limit' : m.map((c) => '(' + c.map(entry_display).join('') + ')').join('');
    }
    function column_compare(c1, c2) {
      return lex_compare(c1, c2, entry_compare);
    }
    function mountain_compare(m1, m2) {
      return lex_compare(m1, m2, column_compare);
    }
    function compare(a, b) {
      if (is_infinity(a) || is_infinity(b)) {
        return boolean_compare(is_infinity(a), is_infinity(b));
      }
      return mountain_compare(a, b);
    }
    function extend(m0) {
      const right = m0.length - 1;
      const top = m0[right].length - 1;

      const V0 = m0.map(column_verticals);
      const [Ri, Rj] = parent(m0, V0, [right, top]);
      const MI0 = magma_indices(m0, V0, [Ri, Rj]);
      const SD0 = stretch_data_list(m0, V0, MI0);

      const m = subtract_1(m0, V0, SD0[Rj]);
      const V = [...V0.slice(0, right), column_verticals(m[right])];
      const MI = magma_indices(m, V, [Ri, Rj], MI0.slice(0, right));

      const offset = right - Ri;
      for (let i = Ri + 1; i < m0.length; i++) {
        m.push(copy_column(m0[i], MI0[i], V0[i], m[right], MI[right], [Ri, Rj], SD0, offset, V0[right][top]));
      }
      return m;
    }
    function expand(m, index, shorter = false) {
      if (is_infinity(m)) return infinity_FS(index);
      if (m.length === 0) return m;
      if (m[m.length - 1].length === 0) return m.slice(0, m.length - 1);
      let current = m;
      for (let i = 0; i < index; ++i) current = extend(current);
      current = shorter ? current.slice(0, current.length - 1) : subtract_1(current);
      return current;
    }
    const variants = MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, display);

    register.push({
      id,
      name,
      display,
      able: is_limit,
      compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: cfg.from_display,
      init: () => [
        { expr: Limit_expr(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
      debug: { extend, expand, subtract_1, copy_column, stretch_data_list, column_verticals, magma_indices, convert_to_layer, convert_from_layer },
    });
  }

  // ---------- SA_omega2_MN（Entry = [number, Sep, mark]） ----------
  {
    function sep_display(sep) {
      return ';'.repeat(sep[1]) + ','.repeat(sep[0]);
    }
    function entry_display([v, sep, mark]) {
      return sep_display(sep) + (mark ? '*' : '') + v;
    }
    function from_display(str) {
      if (str === 'Limit') return Limit_expr();
      function normalizeSep(s) {
        while (s.length > 0 && s[s.length - 1] === 0) s.pop();
        return s;
      }
      function parseSimpleSep(start) {
        let c0 = 0,
          c1 = 0;
        while (start + c1 < str.length && str[start + c1] === ';') c1++;
        while (start + c1 + c0 < str.length && str[start + c1 + c0] === ',') c0++;
        return [normalizeSep([c0, c1]), start + c1 + c0];
      }
      function parseExprPrefix(start) {
        const result = [];
        let i = start;
        while (i < str.length && str[i] === '(') {
          i++;
          const col = [];
          while (i < str.length && str[i] !== ')') {
            const [sep, nextI] = parseSimpleSep(i);
            i = nextI;
            let mark = i < str.length && str[i] === '*';
            if (mark) i++;
            let valueStart = i;
            while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
            const valueStr = str.substring(valueStart, i);
            if (valueStr === '') throw new Error('illegal input string: ' + str);
            col.push([parseInt(valueStr), sep, mark]);
          }
          result.push(col);
          if (i === str.length || str[i] !== ')') throw new Error('illegal input string: ' + str);
          i++;
        }
        return [result, i];
      }
      const [result, end] = parseExprPrefix(0);
      if (end !== str.length) throw new Error('illegal input string: ' + str);
      return result;
    }
    function entry_compare(e1, e2) {
      return tuple_lex_compare(e1, e2, [number_compare, sep_compare, undefined]);
    }
    function S(c, j) {
      if (j > c.length) return S(c, j - 1);
      if (j < 0) return [];
      if (c[j][1][1]) return [];
      if (c[j][2]) return c[j][1];
      return S(c, j - 1);
    }
    function stretch_data_top(m, V) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);

      if (m[right][top][1][0] === 0) {
        const threshold = S(m[Ri], Rj - 1);
        let stretch_to = S(m[right], top - 1);
        let force = false;
        if (sep_compare(stretch_to, threshold) <= 0) {
          stretch_to = sep_increase(stretch_to, 0);
          force = true;
        }
        return { threshold, stretch_to, force };
      } else {
        return undefined;
      }
    }
    function stretch_data_list(m, V, MI) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);
      const result = [];

      let ref_j = -1;
      for (let j = 0; j < Rj; j++) {
        while (ref_j + 1 <= top && MI[right][ref_j + 1] <= j) ref_j++;
        if (m[Ri][j][1][0] !== 0) {
          result[j] = undefined;
        } else {
          const threshold = S(m[Ri], j - 1);
          const stretch_to = S(m[right], ref_j - 1);
          result[j] = { threshold, stretch_to, force: false };
        }
      }

      result[Rj] = stretch_data_top(m, V);

      return result;
    }
    function subtract_1(m, V, SD_top) {
      V = V ?? m.map(column_verticals);
      SD_top = SD_top ?? stretch_data_top(m, V);
      const right = m.length - 1;
      const top = m[right].length - 1;
      const top_right_sep = m[right][top][1];
      const [Ri, Rj] = parent(m, V, [right, top]);

      const result = deepcopy(m);
      result[right].pop();

      const top_right_sep_dimension = sep_dimension(top_right_sep);
      if (sep_is_one(top_right_sep)) {
        // do nothing
      } else if (top_right_sep_dimension === 0) {
        const new_sep = [top_right_sep[0] - 1, ...top_right_sep.slice(1)];

        const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
        const v_bottom = top === 0 ? [] : V[right][top - 1];
        if (vertical_compare(vertical_increase(v_parent, new_sep), v_bottom) > 0) {
          result[right].push([Ri + 1, new_sep, top_right_sep[0] === 0]);
        }
      } else if (SD_top.force) {
        const new_sep = SD_top.stretch_to;
        result[right].push([Ri + 1, new_sep, true]);
      }

      for (let j = Rj; j < m[Ri].length; j++) {
        result[right].push(deepcopy(m[Ri][j]));
      }

      return result;
    }
    function copy_column(m0i, MI0i, V0i, mr, MIr, [Ri, Rj], SD, offset, stretch_v_max) {
      const result = [];
      let last_mi = -1;
      let ref_j = 0;
      for (let j = 0; j < m0i.length; j++) {
        if (j >= MI0i.length) {
          let entry = deepcopy(m0i[j]);
          if (entry[0] >= Ri + 1) entry[0] += offset;
          result.push(entry);
        } else {
          const [value, sep, mark] = m0i[j];
          const new_value = value + offset;
          let current_mi = MI0i[j];
          if (current_mi !== last_mi) {
            last_mi = current_mi;
            while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
              const is_row_lifting =
                current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
              if (is_row_lifting) {
                let [, ref_sep, ref_mark] = mr[ref_j];
                result.push([new_value, ref_sep, ref_mark]);
              }
              ref_j++;
            }
          }
          const new_sep = vertical_compare(V0i[j], stretch_v_max) > 0 ? sep : compute_stretch(sep, SD[current_mi]);
          result.push([new_value, new_sep, mark]);
        }
      }
      return result;
    }
    function infinity_FS(index) {
      return [[], [[1, [index, 1], false]]];
    }

    make_SMN({
      id: 'sa-omega2-mn',
      name: "Smile's Astral ω2 MN",
      entry_display,
      entry_compare,
      sep_display,
      S,
      stretch_data_top,
      stretch_data_list,
      subtract_1,
      copy_column,
      infinity_FS,
      from_display,
    });
  }

  // ---------- S_omega2_MN（Entry = [number, Sep]） ----------
  {
    function sep_display(sep) {
      return ';'.repeat(sep[1]) + ','.repeat(sep[0]);
    }
    function entry_display([v, sep]) {
      return sep_display(sep) + v;
    }
    function from_display(str) {
      if (str === 'Limit') return Limit_expr();
      function normalizeSep(s) {
        while (s.length > 0 && s[s.length - 1] === 0) s.pop();
        return s;
      }
      function parseSimpleSep(start) {
        let c0 = 0,
          c1 = 0;
        while (start + c1 < str.length && str[start + c1] === ';') c1++;
        while (start + c1 + c0 < str.length && str[start + c1 + c0] === ',') c0++;
        return [normalizeSep([c0, c1]), start + c1 + c0];
      }
      function parseExprPrefix(start) {
        const result = [];
        let i = start;
        while (i < str.length && str[i] === '(') {
          i++;
          const col = [];
          while (i < str.length && str[i] !== ')') {
            const [sep, nextI] = parseSimpleSep(i);
            i = nextI;
            let valueStart = i;
            while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
            const valueStr = str.substring(valueStart, i);
            if (valueStr === '') throw new Error('illegal input string: ' + str);
            col.push([parseInt(valueStr), sep]);
          }
          result.push(col);
          if (i === str.length || str[i] !== ')') throw new Error('illegal input string: ' + str);
          i++;
        }
        return [result, i];
      }
      const [result, end] = parseExprPrefix(0);
      if (end !== str.length) throw new Error('illegal input string: ' + str);
      return result;
    }
    function entry_compare(e1, e2) {
      return tuple_lex_compare(e1, e2, [number_compare, sep_compare]);
    }
    function S(c, j, bound) {
      if (j > c.length) return S(c, j - 1, bound);
      if (j < 0) return [];
      if (sep_compare(c[j][1], bound) >= 0) return [];
      let current = c[j][1];
      let previous = S(c, j - 1, bound);
      return sep_compare(current, previous) < 0 ? previous : current;
    }
    function stretch_data_top(m, V) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);

      let top_right_sep = m[right][top][1];

      if (sep_dimension(top_right_sep) > 0) {
        const threshold = S(m[Ri], Rj - 1, top_right_sep);
        let stretch_to = S(m[right], top - 1, top_right_sep);
        let force = false;
        if (sep_compare(stretch_to, threshold) <= 0) {
          stretch_to = sep_increase(stretch_to, 0);
          force = true;
        }
        return { threshold, stretch_to, force };
      } else {
        const threshold = [top_right_sep[0] - 1, ...top_right_sep.slice(1)];
        const stretch_to = threshold;
        let force = false;
        if (!sep_is_one(top_right_sep)) {
          const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
          const v_bottom = top === 0 ? [] : V[right][top - 1];
          if (vertical_compare(vertical_increase(v_parent, stretch_to), v_bottom) > 0) {
            force = true;
          }
        }
        return { threshold, stretch_to, force };
      }
    }
    function stretch_data_list(m, V, MI) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);
      const result = [];

      let ref_j = -1;
      for (let j = 0; j < Rj; j++) {
        while (ref_j + 1 <= top && MI[right][ref_j + 1] <= j) ref_j++;
        let current_top_sep = m[Ri][j][1];

        const threshold = S(m[Ri], j - 1, current_top_sep);
        const stretch_to = S(m[right], ref_j - 1, current_top_sep);
        result[j] = { threshold, stretch_to, force: false };
      }

      result[Rj] = stretch_data_top(m, V);

      return result;
    }
    function subtract_1(m, V, SD_top) {
      V = V ?? m.map(column_verticals);
      SD_top = SD_top ?? stretch_data_top(m, V);
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);

      const result = deepcopy(m);
      result[right].pop();

      if (SD_top.force) {
        const new_sep = SD_top.stretch_to;
        result[right].push([Ri + 1, new_sep]);
      }

      for (let j = Rj; j < m[Ri].length; j++) {
        result[right].push(deepcopy(m[Ri][j]));
      }

      return result;
    }
    function copy_column(m0i, MI0i, V0i, mr, MIr, [Ri, Rj], SD, offset, stretch_v_max) {
      const result = [];
      let last_mi = -1;
      let ref_j = 0;
      for (let j = 0; j < m0i.length; j++) {
        if (j >= MI0i.length) {
          let entry = deepcopy(m0i[j]);
          if (entry[0] >= Ri + 1) entry[0] += offset;
          result.push(entry);
        } else {
          const [value, sep] = m0i[j];
          const new_value = value + offset;
          let current_mi = MI0i[j];
          if (current_mi !== last_mi) {
            last_mi = current_mi;
            while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
              const is_row_lifting =
                current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
              if (is_row_lifting) {
                let [, ref_sep] = mr[ref_j];
                result.push([new_value, ref_sep]);
              }
              ref_j++;
            }
          }
          const new_sep = vertical_compare(V0i[j], stretch_v_max) > 0 ? sep : compute_stretch(sep, SD[current_mi]);
          result.push([new_value, new_sep]);
        }
      }
      return result;
    }
    function infinity_FS(index) {
      return [[], [[1, [index, 1]]]];
    }

    make_SMN({
      id: 's-omega2-mn',
      name: "Smile's ω2 MN",
      entry_display,
      entry_compare,
      sep_display,
      S,
      stretch_data_top,
      stretch_data_list,
      subtract_1,
      copy_column,
      infinity_FS,
      from_display,
    });
  }

  // ---------- S_omega_pow_omega_MN（Entry = [number, Sep]，长 Sep 显示 [..]） ----------
  {
    function sep_display(sep) {
      if (sep.length <= 2) return ';'.repeat(sep[1]) + ','.repeat(sep[0]);
      return '[' + sep.slice().reverse().join(',') + ']';
    }
    function entry_display([v, sep]) {
      return sep_display(sep) + v;
    }
    function from_display(str) {
      if (str === 'Limit') return Limit_expr();
      function normalizeSep(s) {
        while (s.length > 0 && s[s.length - 1] === 0) s.pop();
        return s;
      }
      function parseSimpleSep(start) {
        let c0 = 0,
          c1 = 0;
        while (start + c1 < str.length && str[start + c1] === ';') c1++;
        while (start + c1 + c0 < str.length && str[start + c1 + c0] === ',') c0++;
        return [normalizeSep([c0, c1]), start + c1 + c0];
      }
      function parseExprPrefix(start) {
        const result = [];
        let i = start;
        while (i < str.length && str[i] === '(') {
          i++;
          const col = [];
          while (i < str.length && str[i] !== ')') {
            const [sep, nextI] = parseSimpleSep(i);
            i = nextI;
            let valueStart = i;
            while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
            const valueStr = str.substring(valueStart, i);
            if (valueStr === '') throw new Error('illegal input string: ' + str);
            col.push([parseInt(valueStr), sep]);
          }
          result.push(col);
          if (i === str.length || str[i] !== ')') throw new Error('illegal input string: ' + str);
          i++;
        }
        return [result, i];
      }
      const [result, end] = parseExprPrefix(0);
      if (end !== str.length) throw new Error('illegal input string: ' + str);
      return result;
    }
    function entry_compare(e1, e2) {
      return tuple_lex_compare(e1, e2, [number_compare, sep_compare]);
    }
    function S_default(bound) {
      let d = sep_dimension(bound);
      if (d === bound.length - 1 && bound[d] === 1) return [];
      let result = deepcopy(bound);
      result[d]--;
      return result;
    }
    function S(c, j, bound) {
      if (j > c.length) return S(c, j - 1, bound);
      if (j < 0) return S_default(bound);
      if (sep_compare(c[j][1], bound) >= 0) return S_default(bound);
      let current = c[j][1];
      let previous = S(c, j - 1, bound);
      return sep_compare(current, previous) < 0 ? previous : current;
    }
    function stretch_data_top(m, V) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);

      let top_right_sep = m[right][top][1];

      const threshold = S(m[Ri], Rj - 1, top_right_sep);
      let stretch_to = S(m[right], top - 1, top_right_sep);
      let force = false;
      if (sep_is_one(top_right_sep)) {
        // do nothing
      } else if (sep_dimension(top_right_sep) > 0) {
        if (sep_compare(stretch_to, sep_increase(threshold, sep_dimension(top_right_sep) - 1)) < 0) {
          stretch_to = sep_increase(stretch_to, sep_dimension(top_right_sep) - 1);
          force = true;
        }
      } else {
        const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
        const v_bottom = top === 0 ? [] : V[right][top - 1];
        if (vertical_compare(vertical_increase(v_parent, stretch_to), v_bottom) > 0) {
          force = true;
        }
      }
      return { threshold, stretch_to, force };
    }
    function stretch_data_list(m, V, MI) {
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);
      const result = [];

      let ref_j = -1;
      for (let j = 0; j < Rj; j++) {
        while (ref_j + 1 <= top && MI[right][ref_j + 1] <= j) ref_j++;
        let current_top_sep = m[Ri][j][1];
        const threshold = S(m[Ri], j - 1, current_top_sep);
        const stretch_to = S(m[right], ref_j - 1, current_top_sep);
        result[j] = { threshold, stretch_to, force: false };
      }

      result[Rj] = stretch_data_top(m, V);

      return result;
    }
    function subtract_1(m, V, SD_top) {
      V = V ?? m.map(column_verticals);
      SD_top = SD_top ?? stretch_data_top(m, V);
      const right = m.length - 1;
      const top = m[right].length - 1;
      const [Ri, Rj] = parent(m, V, [right, top]);

      const result = deepcopy(m);
      result[right].pop();

      if (SD_top.force) {
        const new_sep = SD_top.stretch_to;
        result[right].push([Ri + 1, new_sep]);
      }

      for (let j = Rj; j < m[Ri].length; j++) {
        result[right].push(deepcopy(m[Ri][j]));
      }

      return result;
    }
    function copy_column(m0i, MI0i, V0i, mr, MIr, [Ri, Rj], SD, offset, stretch_v_max) {
      const result = [];
      let last_mi = -1;
      let ref_j = 0;
      for (let j = 0; j < m0i.length; j++) {
        if (j >= MI0i.length) {
          let entry = deepcopy(m0i[j]);
          if (entry[0] >= Ri + 1) entry[0] += offset;
          result.push(entry);
        } else {
          const [value, sep] = m0i[j];
          const new_value = value + offset;
          let current_mi = MI0i[j];
          if (current_mi !== last_mi) {
            last_mi = current_mi;
            while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
              const is_row_lifting =
                current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
              if (is_row_lifting) {
                let [, ref_sep] = mr[ref_j];
                result.push([new_value, ref_sep]);
              }
              ref_j++;
            }
          }
          const new_sep = vertical_compare(V0i[j], stretch_v_max) > 0 ? sep : compute_stretch(sep, SD[current_mi]);
          result.push([new_value, new_sep]);
        }
      }
      return result;
    }
    function infinity_FS(index) {
      return [[], [[1, [...Array.from({ length: index }, () => 0), 1]]]];
    }

    make_SMN({
      id: 's-omega-pow-omega-mn',
      name: "Smile's ω^ω MN",
      entry_display,
      entry_compare,
      sep_display,
      S,
      stretch_data_top,
      stretch_data_list,
      subtract_1,
      copy_column,
      infinity_FS,
      from_display,
    });
  }
})();
