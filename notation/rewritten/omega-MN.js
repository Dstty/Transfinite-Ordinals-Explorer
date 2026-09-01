// ============================================================================
//  notation/omega-MN.js — ω mountain notation（ωMN）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/Omega_MN.ts
//  表达式 = Column[]，Column = Entry[]，Entry = [number, Sep]，Sep = number
//  id: omega-mn
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { deepcopy, lex_compare, number_compare, MN_FS_variants } = U;

  function INFINITY() {
    return [[[Infinity]]];
  }
  function is_infinity(m) {
    return ('' + m).startsWith('Infinity');
  }
  function entry_compare(a, b) {
    return lex_compare(a, b, number_compare);
  }
  function column_compare(a, b) {
    return lex_compare(a, b, entry_compare);
  }
  function mountain_compare(a, b) {
    if (is_infinity(a) && is_infinity(b)) return 0;
    if (is_infinity(a)) return 1;
    if (is_infinity(b)) return -1;
    return lex_compare(a, b, column_compare);
  }
  function mountain_is_limit(m) {
    return is_infinity(m) || (m.length > 0 && m[m.length - 1].length > 0);
  }
  function sep_display(sep, simple) {
    if (simple && sep === 0) return '';
    return ','.repeat(sep + 1);
  }
  function vertical_display(v) {
    return v.map((s) => sep_display(s, false)).join('/');
  }
  function entry_display([v, sep], simple) {
    let d_sep = sep_display(sep, simple);
    let d_v = '' + v;
    if (simple && d_v.length >= 2) d_v = '(' + d_v + ')';
    return d_sep + d_v;
  }
  function column_display(col, simple) {
    if (simple && col.length === 0) return '0';
    let result = col.map((e) => entry_display(e, simple)).join('');
    return simple ? result : '(' + result + ')';
  }
  function mountain_display(m, simple) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col) => column_display(col, simple)).join(simple ? ' ' : '');
  }
  function to_data_key(m) {
    return mountain_display(m, true);
  }
  function mountain_from_display(str) {
    if (str === 'Limit') return [[[Infinity]]];
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
  function from_display_simple(s) {
    let i = 0;
    function error() {
      throw new Error('Illegal input string: ' + s);
    }
    function skip_spaces() {
      while (i < s.length && s[i] === ' ') i++;
    }
    function parse_sep() {
      let count = 0;
      while (i < s.length && s[i] === ',') {
        count++;
        i++;
      }
      return count === 0 ? 0 : count - 1;
    }
    function parse_entry() {
      const sep = parse_sep();
      let v;
      if (i < s.length && s[i] === '(') {
        i++;
        const start = i;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        if (start === i) error();
        if (i >= s.length || s[i] !== ')') error();
        v = parseInt(s.substring(start, i), 10);
        i++;
      } else if (i < s.length && s[i] >= '0' && s[i] <= '9') {
        v = s.charCodeAt(i) - 48;
        i++;
      } else {
        error();
      }
      return [v, sep];
    }
    function parse_column() {
      const col = [];
      while (i < s.length && s[i] !== ' ') {
        col.push(parse_entry());
      }
      return col;
    }
    function parse_expr() {
      const result = [];
      while (true) {
        skip_spaces();
        if (i >= s.length) break;
        if (s[i] === '0' && (i + 1 >= s.length || s[i + 1] === ' ')) {
          result.push([]);
          i++;
          continue;
        }
        result.push(parse_column());
      }
      return result;
    }
    skip_spaces();
    if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
      i += 5;
      skip_spaces();
      if (i !== s.length) error();
      return INFINITY();
    }
    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return result;
  }
  function vertical_compare(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  }
  function vertical_diff(v1, v2) {
    let i = 0;
    while (i < v2.length && v1[i] === v2[i]) i++;
    return v1[i];
  }
  function vertical_increase(v, s) {
    let i = v.length;
    while (i > 0 && v[i - 1] < s) --i;
    return v.slice(0, i).concat([s]);
  }
  function find_index_below_row(Vi, v) {
    const working = [[]].concat(Vi);
    let i1 = 0,
      i2 = working.length - 1;
    while (i1 < i2) {
      const i = Math.ceil((i1 + i2) / 2);
      if (vertical_compare(working[i], v) < 0) i1 = i;
      else i2 = i - 1;
    }
    return i1;
  }
  function parent(m, V, [i, j]) {
    const pi = m[i][j][0] - 1;
    const pj = find_index_below_row(V[pi], V[i][j]);
    return [pi, pj];
  }
  function column_verticals(column) {
    const v = [[]];
    for (let j = 0; j < column.length; j++) v.push(vertical_increase(v[j], column[j][1]));
    return v.slice(1);
  }
  function mountain_verticals(m) {
    return m.map(column_verticals);
  }
  function get_references(m, r_tops) {
    const verticals = column_verticals(m[m.length - 1]);
    verticals.unshift([]);
    const ref = [];
    let i = 0,
      j = 0;
    while (i < verticals.length && j < r_tops.length) {
      if (vertical_compare(verticals[i], r_tops[j]) < 0) {
        ref[j] = i;
        i++;
      } else {
        j++;
      }
    }
    return ref;
  }
  function expand(m0, index, shorter = false) {
    const rightmost = m0.length - 1;
    const topmost = m0[rightmost].length - 1;
    const m = deepcopy(m0);

    if (topmost === -1) {
      m.pop();
      return m;
    }

    const tr_entry = m[rightmost][topmost];
    const tr_separator = tr_entry[1];
    const V0 = mountain_verticals(m);
    const BRij = parent(m, V0, [rightmost, topmost]);
    const width = rightmost - BRij[0];
    const top_verticals = V0[BRij[0]].slice(0, BRij[1]);
    top_verticals.push(V0[rightmost][topmost]);

    if (tr_separator === 0) {
      m[rightmost].pop();
    } else {
      const new_tr_separator = tr_separator - 1;
      if (
        vertical_compare(
          vertical_increase(V0[BRij[0]][BRij[1] - 1] ?? [], new_tr_separator),
          V0[rightmost][topmost - 1] ?? [],
        ) <= 0
      )
        m[rightmost].pop();
      else m[rightmost][topmost][1] = new_tr_separator;
    }
    m[rightmost] = m[rightmost].concat(m[BRij[0]].slice(BRij[1]));
    const V = mountain_verticals(m);
    const magma_checks_list = [];
    for (let i = BRij[0] + 1; i <= rightmost; i++) {
      magma_checks_list[i] = [];
      for (let j = 0; j < m[i].length; j++) {
        let working = [i, j];
        while (working[0] > BRij[0]) {
          if (m[working[0]].length <= working[1]) --working[1];
          working = parent(m, V, working);
        }
        magma_checks_list[i][j] =
          working[0] === BRij[0] &&
          working[1] <= BRij[1] &&
          !vertical_compare(V[working[0]][working[1] - 1] ?? [], V[i][j - 1] ?? [])
            ? working[1]
            : -1;
      }
    }
    for (let n = 1; n <= index; n++) {
      const refs = get_references(m, top_verticals);
      refs[-1] = -1;
      for (let dx = 1; dx <= width; dx++) {
        const x = BRij[0] + dx;
        const source_magmas = magma_checks_list[x];
        const target_column = [];
        m[x].forEach((entry, y) => {
          const value = entry[0];
          if (~source_magmas[y]) {
            const BR_index = source_magmas[y];
            for (let j = refs[BR_index - 1] + 1; j <= refs[BR_index]; j++) {
              if (j === refs[BR_index]) target_column.push([value + width * n, entry[1]]);
              else target_column.push([value + width * n, m[BRij[0] + width * n][j][1]]);
            }
          } else {
            target_column.push([value + (value > BRij[0] ? width * n : 0), entry[1]]);
          }
        });
        m[x + width * n] = target_column;
      }
    }
    if (shorter) m.pop();
    return m;
  }
  function infinity_FS(n) {
    return [[], [[1, n]]];
  }
  function calc_ancestor_depths(m) {
    if (!Array.isArray(m) || m.length === 0) return [];
    const V = m.map(column_verticals);
    const depthMap = Array.from({ length: m.length }, () => []);
    const visited = new Set();
    function getDepth(i, j) {
      const key = i + ',' + j;
      if (visited.has(key)) return 0;
      visited.add(key);
      const [pCol, pRow] = parent(m, V, [i, j]);
      if (pCol < 0 || pCol >= m.length || pRow < 0 || pRow >= m[pCol].length) {
        visited.delete(key);
        return 0;
      }
      const depth = 1 + getDepth(pCol, pRow);
      visited.delete(key);
      return depth;
    }
    for (let i = 0; i < m.length; i++) {
      const column = m[i];
      for (let j = 0; j < column.length; j++) {
        depthMap[i][j] = getDepth(i, j);
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
        entry[0] = depthMap[i][j] + 1;
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
          let j0 = find_index_below_row(V[i1], j === 0 ? [0] : V[i][j - 1].concat([0]));
          if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
            entry[0] = i1 + 1;
            break;
          }
        }
      }
    }
    return om;
  }

  const variants = MN_FS_variants(expand, is_infinity, infinity_FS, mountain_is_limit, to_data_key);

  register.push({
    id: 'omega-mn',
    name: 'ω mountain notation',
    display: (m) => mountain_display(m, false),
    able: mountain_is_limit,
    compare: mountain_compare,
    FS: variants.FS,
    FSalter: variants.FS_alter,
    parse: mountain_from_display,
    init: () => [
      { expr: INFINITY(), low: [[]], subitems: [] },
      { expr: [[]], low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
    debug: { convert_to_layer, convert_from_layer },
  });
})();
