// ============================================================================
//  notation/ne/TBM.js — Transfinite Bashicu matrix（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/TBM.ts
//  注册 id: tbm（单体记号，无 generator）
//
//  与 ne 的差异：无。旧条目 core/notation-manifest.js 的
//  notation/rewritten/TBM.js 也只有 ids: ['tbm'] 一项，不涉及 initial 调整。
//  分类 category-bm-like 已由 notation/ne/categories.js 骨架注册（无 generator），
//  本文件不含分类定义，故无需 ensure_category。
//
//  import 对应关系：
//    '@/utils.ts'                 → ../../core/ne/utils.js
//                                   （lex_compare / number_compare / tuple_lex_compare）
//    '@/notations/notation_utils.ts' → ../../core/ne/notationUtils.js
//                                   （FS_default_LNZ_variant）
//    '@/notation-definition.ts'   → 纯类型，删除
//    Entry / Column / Expr / Vertical → 纯类型，删除
//
//  表达式 = Expr = Column[]，Column = Entry[]，Entry = [number, Expr]。
//  算法逐行照搬，仅去掉类型注解。文件末尾自注册（manifest 以 module: true 注入）。
//
//  ⚠ 本文件的导出面是 notation/ne/TUPMS.js 的硬依赖：TUPMS.js 从中值导入 19 个成员
//    （ascension_threshold / column_add / column_compare / column_sub / column_truncate /
//     column_verticals / compare / const_column / copy_column / display / from_display /
//     index_after / INFINITY / infinity_FS / is_one / ONE / parents / to_vertical /
//     vertical_compare），改动导出名会对 TUPMS 造成链接期失败。
// ============================================================================
import { lex_compare, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { FS_default_LNZ_variant } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

export function entry_compare(e1, e2) {
  return tuple_lex_compare(e1, e2, [number_compare, compare]);
}

export function column_compare(c1, c2) {
  return lex_compare(c1, c2, entry_compare);
}

export function compare(a, b) {
  return lex_compare(a, b, column_compare);
}

export function vertical_compare(v1, v2) {
  return lex_compare(v1, v2, compare);
}

export function index_after(V, pos) {
  for (let k = 0; k < V.length; k++) {
    if (vertical_compare(V[k], pos) > 0) return k;
  }
  return V.length;
}

export function vertical_parent(v, Pi, Vi) {
  for (let k = 0; k < Vi.length; k++) {
    if (vertical_compare(Vi[k], v) >= 0) return Pi[k];
  }
  return undefined;
}

export function vertical_add(v1, v2) {
  if (v1.length === 0) return v2.slice();
  if (v2.length === 0) return v1.slice();
  const first2 = v2[0];
  let i = v1.length;
  while (i > 0 && compare(v1[i - 1], first2) < 0) i--;
  return v1.slice(0, i).concat(v2);
}

export function parents(m, V) {
  const P = [];
  for (let i = 0; i < m.length; i++) {
    const Pi = [];
    for (let j = 0; j < m[i].length; j++) {
      const [value] = m[i][j];
      const pos = j === 0 ? [] : V[i][j - 1];
      let p = j === 0 ? i - 1 : Pi[j - 1][0];
      while (p >= 0) {
        if (m[p].length === 0) {
          if (0 < value) {
            Pi.push([p, 0]);
            break;
          }
          p = -1;
          break;
        }
        const j_p = j === 0 ? 0 : index_after(V[p], pos);
        if (j_p >= m[p].length) {
          Pi.push([p, j_p]);
          break;
        }
        const value_p = m[p][j_p][0];
        if (value_p < value) {
          Pi.push([p, j_p]);
          break;
        }
        const next = j === 0 ? [p - 1, 0] : vertical_parent(pos, P[p], V[p]);
        if (!next) {
          p = -1;
          break;
        }
        p = next[0];
      }
      if (p < 0) break;
    }
    P.push(Pi);
  }
  return P;
}

export function column_verticals(col) {
  const result = [];
  let acc = [];
  for (const [, height_expr] of col) {
    acc = vertical_add(acc, [height_expr]);
    result.push(acc.slice());
  }
  return result;
}

export function is_one(expr) {
  return expr.length === 1 && expr[0].length === 0;
}

export function to_vertical(m) {
  const v = [];
  let prev = 0;
  for (let i = 1; i <= m.length; i++) {
    if (i === m.length || m[i].length === 0) {
      v.push(m.slice(prev, i));
      prev = i;
    }
  }
  return v;
}

export function expand_limit(m, index) {
  const right = m.length - 1;
  const col = m[right];
  const last_idx = col.length - 1;
  const [v, h] = col[last_idx];
  const new_h = TBM.FS(h, index);
  const segs = to_vertical(new_h);
  const result = m.slice();
  const new_entries = col.slice(0, last_idx);
  for (const seg of segs) new_entries.push([v, seg]);
  result[right] = new_entries;
  return result;
}

function expand_successor(m, index) {
  const V = m.map(column_verticals);
  const P = parents(m, V);
  const N = m.length - 1;
  const r = P[N][m[N].length - 1][0];
  const result = m.slice(0, N);

  const b = m[N].length > 1 ? V[N][m[N].length - 2] : [];

  const offset = column_sub(m[N], m[r]);

  const A = ascension_threshold(V, P, r, b);

  for (let w = 1; w <= index; w++) {
    for (let i = r; i < N; i++) {
      result.push(copy_column(m[i], offset, A[i], w));
    }
  }
  return result;
}

export function column_sub(a, b) {
  const off = [];
  const Va = column_verticals(a);
  const Vb = column_verticals(b);
  for (let j = 0; j < a.length; j++) {
    const pos = j === 0 ? [] : Va[j - 1];
    const j_r = index_after(Vb, pos);
    const delta = a[j][0] - (j_r < Vb.length ? b[j_r][0] : 0);
    if (delta <= 0) break;
    off.push([delta, a[j][1]]);
  }
  return off;
}

export function const_column(value, vertical) {
  return vertical.map((s) => [value, s]);
}

export function ascension_threshold(V, P, r, b) {
  const A = [];
  for (let i = 0; i < V.length; i++) {
    if (i < r) {
      A.push([]);
      continue;
    }
    if (i === r) {
      A.push(b);
      continue;
    }
    let found;
    for (let j = 0; j < V[i].length; j++) {
      const pos = j === 0 ? [] : V[i][j - 1];
      const [col_p] = P[i][j];
      if (col_p < r) {
        found = pos;
        break;
      }
      if (vertical_compare(pos, A[col_p]) >= 0) {
        found = pos;
        break;
      }
      let new_pos = V[i][j];
      if (vertical_compare(new_pos, A[col_p]) >= 0) {
        found = A[col_p];
        break;
      }
    }
    A.push(found ?? V[i][V[i].length - 1]);
  }
  return A;
}

export function column_add(a, b) {
  const res = [];
  let ai = 0,
    bi = 0;
  while (ai < a.length || bi < b.length) {
    if (ai >= a.length) {
      res.push([b[bi][0], b[bi][1]]);
      bi++;
    } else if (bi >= b.length) {
      res.push([a[ai][0], a[ai][1]]);
      ai++;
    } else {
      const ea = a[ai],
        eb = b[bi];
      const cmp = compare(ea[1], eb[1]);
      const h = cmp < 0 ? ea[1] : eb[1];
      res.push([ea[0] + eb[0], h]);
      if (cmp <= 0) ai++;
      if (cmp >= 0) bi++;
    }
  }
  return res;
}

export function column_truncate(col, b) {
  const res = [];
  let ci = 0,
    vi = 0;
  while (ci < col.length && vi < b.length) {
    const e = col[ci];
    const vh = b[vi];
    const cmp = compare(e[1], vh);
    const h = cmp < 0 ? e[1] : vh;
    res.push([e[0], h]);
    if (cmp <= 0) ci++;
    if (cmp >= 0) vi++;
  }
  return res;
}

export function column_mul(col, w) {
  return col.map(([v, e]) => [v * w, e]);
}

export function copy_column(col_i, offset, A_i, w) {
  return column_add(col_i, column_mul(column_truncate(offset, A_i), w));
}

export function expand(m, index) {
  if (m.length === 0) return m;
  const N = m.length - 1;
  const last_col = m[N];
  if (last_col.length === 0) return m.slice(0, N);
  const [, last_height] = last_col[last_col.length - 1];
  if (is_one(last_height)) {
    return expand_successor(m, index);
  } else {
    return expand_limit(m, index);
  }
}

export function is_infinity(a) {
  return a.length > 0 && a[0].length > 0 && a[0][0][0] === Infinity;
}

export function ONE() {
  return [[]];
}

function OMEGA() {
  return [[], [[1, ONE()]]];
}

export function INFINITY() {
  return [[[Infinity, []]]];
}

function height_display(s, html) {
  if (s.length === 1) return undefined;
  if (compare(s, OMEGA()) === 0) return 'ω';
  return display(s, html);
}

function entry_display([v, s], html) {
  let sd = height_display(s, html);
  if (sd === undefined) return '' + v;
  if (html) return v + '<sup>' + sd + '</sup>';
  return v + '^' + sd;
}

function column_display(col, html) {
  return '(' + col.map((e) => entry_display(e, html)).join(',') + ')';
}

export function display(m, html = false) {
  if (is_infinity(m)) return 'Limit';
  return m.map((col) => column_display(col, html)).join('');
}

export function from_display(str) {
  let i = 0;
  const s = str;

  function error() {
    throw new Error(`Illegal input string: ${s}`);
  }

  function skip_spaces() {
    while (i < s.length && s[i] === ' ') i++;
  }

  function parse_number() {
    skip_spaces();
    const start = i;
    while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
    if (start === i) error();
    return parseInt(s.substring(start, i), 10);
  }

  function parse_expr() {
    const result = [];
    skip_spaces();
    while (i < s.length && s[i] === '(') {
      result.push(parse_column());
      skip_spaces();
    }
    return result;
  }

  function parse_column() {
    skip_spaces();
    if (i >= s.length || s[i] !== '(') error();
    i++;

    const entries = [];
    skip_spaces();
    if (i < s.length && s[i] !== ')') {
      entries.push(parse_entry());
      skip_spaces();
      while (i < s.length && s[i] === ',') {
        i++;
        skip_spaces();
        if (i < s.length && s[i] === ')') break;
        entries.push(parse_entry());
        skip_spaces();
      }
    }

    skip_spaces();
    if (i >= s.length || s[i] !== ')') error();
    i++;

    return entries;
  }

  function parse_height() {
    skip_spaces();
    if (i < s.length && (s[i] === 'ω' || s[i] === 'w')) {
      i++;
      return OMEGA();
    }
    return parse_expr();
  }

  function parse_entry() {
    const v = parse_number();
    skip_spaces();
    if (i < s.length && s[i] === '^') {
      i++;
      return [v, parse_height()];
    }
    return [v, ONE()];
  }

  skip_spaces();
  if (i + 5 <= s.length && s.slice(i, i + 5) === 'Limit') {
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

export function infinity_FS(index) {
  if (index === 0) return [[]];
  return [[], [[1, infinity_FS(index - 1)]]];
}

function is_limit(m) {
  if (is_infinity(m)) return true;
  if (m.length === 0) return false;
  return m[m.length - 1].length > 0;
}

export const TBM = {
  id: 'tbm',
  name: 'Transfinite Bashicu matrix',
  simple_name: 'TBMS',
  category_id: 'category-bm-like',
  display: {
    plain: (m) => display(m, false),
    html: (m) => display(m, true),
    from_display,
  },
  is_limit: is_limit,
  compare,

  ...FS_default_LNZ_variant(expand, compare, is_infinity, infinity_FS, is_limit, display),

  credit_text_id: 'credit.tbm',

  init: () => {
    return [INFINITY(), []];
  },
};

register_notation(TBM);
