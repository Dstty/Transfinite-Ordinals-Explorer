// ============================================================================
//  notation/n-MN.js — non triangular n-MN 山记号家族（n = 1..8）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SMN/n_MN.ts（逐行移植，Sep = number）
//  表达式 = Mountain = Column[]，Column = Entry[]，Entry = [number, Sep]
//  id: 1-mn .. 8-mn；name: 'non triangular <n>MN'
//  仅 NT_infinity_FS(n)（极限的 FS）依赖参数 n，其余算法各实例共享。
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const {
    MN_FS_variants,
    lex_compare,
    number_compare,
    tuple_lex_compare,
    boolean_compare,
    deepcopy,
  } = U;

  // ---------- 极限 / 显示 ----------
  function INFINITY() {
    return [[[Infinity]]];
  }
  function is_infinity(m) {
    return '' + m === 'Infinity';
  }
  function is_limit(m) {
    return is_infinity(m) || (m.length > 0 && m[m.length - 1].length > 0);
  }
  function to_data_key(m) {
    return mountain_display(m, true);
  }
  function mountain_display(m, simple) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col) => column_display(col, simple)).join(simple ? ' ' : '');
  }
  function column_display(c, simple) {
    if (simple && c.length === 0) return '0';
    const result = c.map((e) => entry_display(e, simple)).join('');
    return simple ? result : '(' + result + ')';
  }
  function entry_display(e, simple) {
    const [v, sep] = e;
    const d_sep = sep_display(sep, simple);
    let d_v = '' + v;
    if (simple && d_v.length >= 2) d_v = '(' + d_v + ')';
    return d_sep + d_v;
  }
  function sep_display(sep, simple) {
    if (simple && sep === 0) return '';
    return ','.repeat(sep + 1);
  }

  // ---------- from_display（显示形式 → 表达式；同时容忍 :index 标记） ----------
  function from_display(str) {
    if (str === 'Limit') return INFINITY();

    let i = 0;

    function error() {
      throw new Error('Illegal input string: ' + str);
    }
    function skip_spaces() {
      while (i < str.length && str[i] === ' ') i++;
    }
    function skip_index() {
      if (i < str.length && str[i] === ':') {
        i++;
        skip_spaces();
        while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
      }
    }
    function parse_sep() {
      let count = 0;
      while (i < str.length && str[i] === ',') {
        count++;
        i++;
      }
      return count === 0 ? 0 : count - 1;
    }
    function parse_number() {
      const start = i;
      while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
      if (start === i) error();
      return parseInt(str.substring(start, i), 10);
    }
    function parse_parenthesized_column() {
      i++;
      const col = [];
      skip_spaces();
      while (i < str.length && str[i] !== ')' && str[i] !== ':') {
        skip_spaces();
        const sep = parse_sep();
        skip_spaces();
        const v = parse_number();
        col.push([v, sep]);
        skip_spaces();
      }
      skip_index();
      skip_spaces();
      if (i >= str.length || str[i] !== ')') error();
      i++;
      return col;
    }
    function parse_unparenthesized_column() {
      skip_spaces();
      if (i >= str.length) error();
      if (
        str[i] === '0' &&
        (i + 1 >= str.length ||
          str[i + 1] === ':' ||
          str[i + 1] === ' ' ||
          str[i + 1] === '(' ||
          str[i + 1] === ',')
      ) {
        i++;
        skip_index();
        return [];
      }
      const col = [];
      while (i < str.length && str[i] !== ' ' && str[i] !== '(' && str[i] !== ':') {
        if (str[i] === ',') {
          const sep = parse_sep();
          skip_spaces();
          const v = parse_number();
          col.push([v, sep]);
        } else {
          error();
        }
      }
      skip_index();
      return col;
    }

    const result = [];
    skip_spaces();
    while (i < str.length) {
      if (str[i] === '(') {
        result.push(parse_parenthesized_column());
      } else {
        result.push(parse_unparenthesized_column());
      }
      skip_spaces();
    }
    return result;
  }

  // ---------- 比较 ----------
  function sep_compare(s1, s2) {
    return number_compare(s1, s2);
  }
  function vertical_compare(v1, v2) {
    return lex_compare(v1, v2, sep_compare);
  }
  function entry_compare(e1, e2) {
    return tuple_lex_compare(e1, e2, [number_compare, number_compare]);
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

  // ---------- Vertical（每列逐 entry 累积的竖向分隔序列） ----------
  function vertical_diff(v1, v2) {
    let i = 0;
    while (i < v2.length && v1[i] === v2[i]) i++;
    return v1[i];
  }
  function vertical_increase(v, s) {
    let i = v.length;
    while (i - 1 >= 0 && sep_compare(v[i - 1], s) < 0) i--;
    return [...v.slice(0, i), s];
  }
  function column_verticals(c) {
    const result = [];
    let current = [];
    for (const e of c) {
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

  // ---------- 展开核心（n_MN.ts：fill_ghost → extend ×index → subtract_1 → clear_ghost） ----------
  function fill_ghost(m0) {
    const m = deepcopy(m0);
    const V = m.map(column_verticals);

    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i].length; j++) {
        const [pi, pj] = parent(m, V, [i, j]);
        if (pj !== m[pi].length) continue;
        const v_parent = pj === 0 ? [] : V[pi][pj - 1];
        const v = V[i][j];
        const [, sep] = m[i][j];
        if (vertical_compare(vertical_increase(v_parent, sep), v) < 0) {
          m[pi].push([0, v[v.length - 2]]);
          V[pi].push(v.slice(0, v.length - 1));
        }
      }
    }

    return m;
  }
  function clear_ghost(m) {
    return m.map((c) => c.filter((e) => e[0] !== 0));
  }
  function subtract_1(m, V) {
    V = V ?? m.map(column_verticals);
    const right = m.length - 1;
    const top = m[right].length - 1;
    const top_right_sep = m[right][top][1];
    const [Ri, Rj] = parent(m, V, [right, top]);

    const result = deepcopy(m);
    result[right].pop();

    if (top_right_sep > 0) {
      const new_sep = top_right_sep - 1;
      const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
      const v_bottom = top === 0 ? [] : V[right][top - 1];
      if (vertical_compare(vertical_increase(v_parent, new_sep), v_bottom) > 0) {
        result[right].push([Ri + 1, new_sep]);
      }
    }

    for (let j = Rj; j < m[Ri].length; j++) {
      result[right].push(deepcopy(m[Ri][j]));
    }

    return result;
  }
  function copy_column(m0i, MI0i, mr, MIr, [Ri, Rj], offset) {
    const result = [];
    let last_mi = -1;
    let ref_j = 0;
    for (let j = 0; j < m0i.length; j++) {
      if (j >= MI0i.length) {
        const entry = deepcopy(m0i[j]);
        if (entry[0] >= Ri + 1) entry[0] += offset;
        result.push(entry);
      } else {
        const [value, sep] = m0i[j];
        const new_value = value + offset;
        const current_mi = MI0i[j];
        if (current_mi !== last_mi) {
          last_mi = current_mi;
          while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
            const is_row_lifting =
              current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
            if (is_row_lifting) {
              const [, ref_sep] = mr[ref_j];
              result.push([new_value, ref_sep]);
            }
            ref_j++;
          }
        }
        result.push([new_value, sep]);
      }
    }
    return result;
  }
  function extend(m0) {
    const right = m0.length - 1;
    const top = m0[right].length - 1;

    const V0 = m0.map(column_verticals);
    const [Ri, Rj] = parent(m0, V0, [right, top]);
    const MI0 = magma_indices(m0, V0, [Ri, Rj]);

    const m = subtract_1(m0, V0);
    const V = [...V0.slice(0, right), column_verticals(m[right])];
    const MI = magma_indices(m, V, [Ri, Rj], MI0.slice(0, right));

    const offset = right - Ri;
    for (let i = Ri + 1; i < m0.length; i++) {
      m.push(copy_column(m0[i], MI0[i], m[right], MI[right], [Ri, Rj], offset));
    }
    return m;
  }
  function NT_infinity_FS(n) {
    return (index) => [[], Array.from({ length: index }, () => [1, n - 1])];
  }
  function expand(m, index, shorter = false) {
    if (is_infinity(m)) throw new Error('Illegal state');
    if (m.length === 0) return m;
    if (m[m.length - 1].length === 0) return m.slice(0, m.length - 1);
    let current = fill_ghost(m);
    for (let i = 0; i < index; ++i) current = extend(current);
    current = shorter ? current.slice(0, current.length - 1) : subtract_1(current);
    current = clear_ghost(current);
    return current;
  }

  // ---------- 层显示辅助（debug 用；来自 n_MN.ts） ----------
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
          const j0 = find_index_below_equal(V[i1], j === 0 ? [] : V[i][j - 1]);
          if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
            entry[0] = i1 + 1;
            break;
          }
        }
      }
    }

    return om;
  }

  // ---------- 工厂：注册 n=1..MAX_N 的每个实例 ----------
  function make_n_MN(n) {
    function infinity_FS(index) {
      return NT_infinity_FS(n)(index);
    }
    function display(m) {
      return mountain_display(m, false);
    }
    const variants = MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, to_data_key);

    register.push({
      id: n + '-mn',
      name: 'non triangular ' + n + 'MN',
      display,
      able: is_limit,
      compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: from_display,
      init: () => [
        { expr: INFINITY(), low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
      debug: {
        extend,
        expand,
        subtract_1,
        copy_column,
        fill_ghost,
        clear_ghost,
        column_verticals,
        magma_indices,
        convert_to_layer,
        convert_from_layer,
      },
    });
  }

  const STATIC_MAX = 8; // 静态预注册常用小档；更大的 n 由家族注册表按需生成
  for (let n = 1; n <= STATIC_MAX; n++) make_n_MN(n);

  // —— 家族注册表：n 支持 1..100；>100 报错（见 core/register.js resolveFamilyInput）——
  function ensure_mn(n) {
    const id = n + '-mn';
    if (!window.register.some((x) => x.id === id)) make_n_MN(n);
    return id;
  }
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  window.NOTATION_FAMILIES.push({
    family: 'n-mn',
    label: 'nMN',
    start: 1,
    max: 100,
    match(lower) {
      const m = /^(\d{1,3})-?mn/.exec(lower); // 30MN / 30-mn
      return m ? { n: parseInt(m[1], 10), len: m[0].length } : null;
    },
    idFor: (n) => n + '-mn',
    ensure: ensure_mn,
  });
})();
