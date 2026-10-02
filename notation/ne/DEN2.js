// ============================================================================
//  notation/ne/DEN2.js — DEN2 (IBLP) 与 weak IBLP（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/DEN/DEN2.ts
//  注册 id: den2（DEN2 / IBLP）、weak-den2（weak IBLP / wIBLP）
//
//  ⚠ 与 ne 的差异：无。本文件不是 generator 家族（category-den 是纯容器分类），
//    故不涉及 initial 调整；id 与 ne 一致（den2 / weak-den2）。
//    本项目原先只静态注册了 den2（notation/legacy/DEN2.js），weak-den2 是本地
//    缺失的记号，本次随源文件一并注册。
//    ne 的 draw_diagram_control（依赖的 '@/core/diagram_types.ts' 只有类型，
//    运行时零外部依赖）按原文完整保留。
//
//  注册方式：源文件不含分类定义，category-den 由 notation/ne/categories.js 提供
//  （纯容器、无 generator），故本文件只做记号注册（register_notation ×2），
//  不涉及 ensure_category。注册顺序 den2 → weak-den2。
//
//  算法逐行照搬，只去类型注解。表达式 = Row[]，Row = [step, Entry[]]，
//  Entry = [value, marked?]；记号极限值为 [Infinity]。
// ============================================================================
import {
  boolean_compare,
  deepcopy,
  index_of_first,
  index_of_last,
  lex_compare,
  number_compare,
} from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

function toShort(expr) {
  return expr.map((row) =>
    row[1]
      .slice(0, -row[0])
      .concat([row[1][row[1].length - 1]])
      .map((x) => x[0]),
  );
}

function seq_seq_compare(m1, m2) {
  return lex_compare(m1, m2, (r1, r2) => lex_compare(r1, r2, number_compare));
}

function compare(expr1, expr2) {
  if (is_infinity(expr1) || is_infinity(expr2)) return boolean_compare(is_infinity(expr1), is_infinity(expr2));
  return seq_seq_compare(toShort(expr1), toShort(expr2));
}

const INFINITY = [Infinity];

function is_infinity(expr) {
  return '' + expr === 'Infinity';
}

function entry_display(x) {
  return (x[1] ? '*' : '') + x[0];
}

function row_display(row) {
  return '(' + row[1].map(entry_display).join(',') + ')' + row[0];
}

function display(expr) {
  return is_infinity(expr) ? 'Limit' : expr.map(row_display).join('');
}

function from_display(str) {
  const result = [];
  let i = 0;
  const s = str;

  function error() {
    throw new Error('Illegal input string: ' + s);
  }

  function skip_spaces() {
    while (i < s.length && s[i] === ' ') i++;
  }

  function parse_digits() {
    const start = i;
    while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
    if (start === i) error();
    return parseInt(s.substring(start, i), 10);
  }

  function parse_entry() {
    skip_spaces();
    let marked = false;
    if (i < s.length && s[i] === '*') {
      marked = true;
      i++;
      skip_spaces();
    }
    return marked ? [parse_digits(), true] : [parse_digits()];
  }

  function parse_row() {
    skip_spaces();
    if (i >= s.length || s[i] !== '(') error();
    i++;
    skip_spaces();
    const entries = [];
    if (i >= s.length || s[i] === ')') error(); // 括号内不允许为空
    while (true) {
      entries.push(parse_entry());
      skip_spaces();
      if (i < s.length && s[i] === ',') {
        i++;
        continue;
      }
      break;
    }
    if (i >= s.length || s[i] !== ')') error();
    i++;
    skip_spaces();
    return [parse_digits(), entries];
  }

  // 'Limit' 只允许作为整串输入 (带或不带前后空格)
  skip_spaces();
  if (s.slice(i, i + 5) === 'Limit') {
    i += 5;
    skip_spaces();
    if (i !== s.length) error();
    return INFINITY;
  }
  while (i < s.length) {
    skip_spaces();
    if (i >= s.length) break;
    if (s[i] !== '(') error();
    result.push(parse_row());
  }
  return result;
}

function values(row) {
  return row[1].map((x) => x[0]);
}

function pleasant_until(rows, t) {
  let t_check = values(t).slice(t[0]);
  let t_max = t_check[0],
    t_min = t_check[t_check.length - 1];
  for (let n = 0; n < rows.length; n++) {
    let s_check = rows[n][1];
    let i1 = index_of_first(s_check, ([x]) => x < t_max);
    let i2 = index_of_last(s_check, ([x]) => x > t_min);
    if (~i1 && ~i2 && i1 <= i2 && s_check.slice(i1, i2 + 1).some(([x]) => !t_check.includes(x))) return n;
  }
  return -1;
}

function is_limit(expr) {
  if (is_infinity(expr)) return true;
  if (expr.length === 0) return false;
  let active = expr[expr.length - 1];
  if (!active[1][active[0]]?.[0]) return false;
  return pleasant_until(expr.slice(active[1][active[0]][0] - 1, -1), active) === -1;
}

function cut(expr) {
  return deepcopy(expr.slice(0, -1));
}

function seqFrom(expr, i, j) {
  let row = expr[i],
    val = row[1][j][0],
    threshold = row[1][j + row[0]]?.[0] ?? 0;
  let record = [[i + 1, j], [val]];
  while (val > threshold) {
    row = expr[val - 1];
    let idx = row[0];
    record[record.length - 1][1] = idx;
    val = row[1][idx]?.[0];
    record.push([val]);
  }
  record.pop();
  return record;
}

function apv(s, t, step_t) {
  return s.map((x) =>
    x < t[t.length - 1] ? x : x >= t[step_t] ? x - t[step_t] + t[0] : t[t.lastIndexOf(x) - step_t],
  );
}

function ap(s, t) {
  return [s[0], apv(values(s), values(t), t[0]).map((x) => [x])];
}

function copy(raw, flag) {
  let active = raw[raw.length - 1];
  let expr = cut(raw);
  let begin = active[1][active[0]][0];
  let end = ~flag ? active[1][active[0]][0] + flag : raw.length + 1;
  let offset = raw.length - begin;
  expr = expr.concat(raw.slice(begin - 1, end - 1).map((row) => ap(row, active)));
  for (let i = begin - 1; i < end - 1; ++i) {
    let row = raw[i];
    let target_row = expr[i + offset];
    for (let j = 0; j < row[1].length; ++j) {
      if (!row[1][j][1]) continue;
      let seq = seqFrom(raw, i, j);
      let no_move = seq.findIndex((x) => x[0] < active[1][active[0]][0]);
      if (no_move === -1) {
        target_row[1][j][1] = true;
        continue;
      }
      if (seq[no_move][0] < active[1][active[1].length - 1][0]) {
        target_row[1][j][1] = true;
        continue;
      }
      let c = seq[no_move - 1][0] + offset,
        row_c = expr[c - 1],
        b = row_c[1][seq[no_move - 1][1]][0];
      if (
        target_row[1][j + target_row[0] - 1]?.[0] <= active[1][active[1].length - 1][0] &&
        active[1].find((x) => x[0] === b)?.[1]
      )
        target_row[1][j][1] = true;
    }
  }
  return expr;
}

function compTo(raw, r, already) {
  let expr = deepcopy(raw);
  for (let j = raw[r][1].length - 1; j >= 0; --j) {
    if (!raw[r][1][j][1]) continue;
    let n = raw[r][1][j][0];
    let seq = seqFrom(raw, r, j);
    let t = seq[seq.length - 1][0];
    let T = already[t - 1];
    if (!T) continue;
    let q = T.length;
    let entries = deepcopy(expr[r][1])
      .concat(T.map((x) => [x]))
      .concat(
        Array(q)
          .fill(0)
          .map((_, k) => [n + 1 + k, true]),
      );
    entries.sort((x, y) => y[0] - x[0]);
    expr[r] = [expr[r][0] + q, entries];
  }
  return expr;
}

function compFrom(raw, r, T) {
  let expr = deepcopy(raw.slice(0, r));
  let q = T.length;
  let lr = raw[r][1].length < raw[r][0] * 2 ? raw[r][0] : raw[r][0] + 1;
  let cr =
    raw[r][1].length < raw[r][0] * 2
      ? raw[r][1].slice(0, -raw[r][0]).concat(raw[r][1].slice(raw[r][0]))
      : raw[r][1];
  for (let l = 0; l < q; ++l) {
    let entries = deepcopy(cr)
      .concat(T.slice(0, 1 + l).map((x) => [x]))
      .concat(
        Array(l)
          .fill(0)
          .map((_, k) => [raw[r][1][0][0] + 1 + k]),
      );
    entries.sort((x, y) => y[0] - x[0]);
    expr[r + l] = [lr + l, entries];
  }
  let entries = deepcopy(raw[r][1])
    .concat(T.map((x) => [x]))
    .concat(
      Array(q)
        .fill(0)
        .map((_, k) => [raw[r][1][0][0] + 1 + k]),
    );
  entries.sort((x, y) => y[0] - x[0]);
  expr[r + q] = [raw[r][0] + q, entries];
  for (let l = 1; l <= q; ++l) for (let k = 1; k <= l; ++k) expr[r + l][1][k][1] = true;
  let m = (x) => {
    let xx = deepcopy(x);
    xx[0] += xx[0] <= raw[r][1][0][0] ? 0 : q;
    return xx;
  };
  expr = expr.concat(raw.slice(r + 1).map((row) => [row[0], row[1].map(m)]));
  return expr;
}

function expand(raw, index, shorter = true) {
  let active = raw[raw.length - 1];
  if (!active[1][active[0]]?.[0]) return cut(raw);
  let flag = pleasant_until(raw.slice(active[1][active[0]][0] - 1, -1), active);
  let expr = raw;
  if (~flag) {
    expr = copy(expr, flag);
  } else {
    for (let n = 1; n <= index; ++n) expr = copy(expr, flag);
    expr = shorter ? cut(expr) : copy(expr, 1);
  }
  let already = [];
  for (let r = raw.length - 1; r < expr.length; ++r) {
    expr = compTo(expr, r, already);
    if (!(expr[r][1].length <= expr[r][0] * 2)) continue;
    let T = [expr[r][1][expr[r][0] - 1][0]];
    do {
      T.unshift(expr[T[0] - 1][1][1][0]);
    } while (T[0] > expr[r][1][expr[r][0]][0]);
    T = T.slice(1, -1);
    if (T.length < 1) continue;
    expr = compFrom(expr, r, T);
    already[r] = T;
    r += T.length;
  }
  return expr;
}

function Limit_row(n) {
  return [
    2,
    Array(3 + n)
      .fill(0)
      .map((x, nn) => (3 <= nn && nn < 2 + n ? [nn, true] : [nn]))
      .reverse(),
  ];
}

function infinity_FS(n) {
  const start = [
    [1, [[1], [0]]],
    [1, [[2], [1], [0]]],
  ];
  return start.concat(
    Array(n)
      .fill(0)
      .map((_, i) => Limit_row(1 + i)),
  );
}

export const draw_diagram_control = {
  default_data: { offset: 0, offset_x: 0, max_display: 40, scaling: 1.0 },
  settings: [
    { type: 'number', name: { id: 'diagram.den.offset' }, field_name: 'offset', min: 0 },
    { type: 'number', name: { id: 'diagram.den.offset-x' }, field_name: 'offset_x', min: 0 },
    { type: 'number', name: { id: 'diagram.den.max-display' }, field_name: 'max_display', min: 10 },
    { type: 'number', name: { id: 'diagram.den.scaling' }, field_name: 'scaling', max: 1, min: 0.1 },
    { type: 'info', name: { id: 'diagram.den.scroll-hint' } },
  ],
  draw_diagram: (expr, data) => {
    if (is_infinity(expr) || expr.length === 0) return undefined;
    const A = 16 * data.scaling;
    const max_display = data.max_display;
    const total = expr.length;
    const show_all = total <= max_display;
    const start = show_all ? 0 : Math.min(data.offset, total - max_display);
    const end = Math.min(start + max_display, total);
    const visible = end - start;
    const offset_x = Math.min(data.offset_x, end - 1);
    const width = (end - offset_x) * A + A;
    const height = visible * A + A / 2;
    const elements = [];
    const lines = [];
    const circles = [];
    const extra_text = [];
    const black = { type: 'text' };
    const white = { type: 'background' };
    const red = { type: 'red' };
    for (let vi = 0; vi < visible; vi++) {
      const i = start + vi;
      const entries = expr[i][1];
      const step = expr[i][0];
      const rightmost = entries[0][0] - offset_x;
      let prev;
      for (let j = 0; j < entries.length; j++) {
        const pos = entries[j][0] - offset_x;
        const mark = entries[j][1];
        if (prev !== undefined && prev >= 0) {
          lines.push({
            type: 'line',
            x1: prev * A + A / 2,
            y1: vi * A + A / 2,
            x2: pos * A + A / 2,
            y2: vi * A + A / 2,
            stroke: true,
            stroke_color: black,
            width: 1,
          });
        }
        if (pos >= 0) {
          circles.push({
            type: 'circle',
            x: pos * A + A / 2,
            y: vi * A + A / 2,
            r: A / 4,
            stroke: true,
            stroke_color: j === step ? red : black,
            fill: true,
            fill_color: mark ? black : white,
            width: 1,
          });
        }
        prev = pos;
      }
      if (rightmost >= 0) {
        extra_text.push({
          text: '' + step,
          x: rightmost * A + A,
          y: vi * A + A / 2,
          size: 0.625 * A,
          color: black,
        });
      }
    }
    elements.unshift(...circles);
    elements.unshift(...lines);
    return { width, height, elements, extra_text };
  },
  handle_action: (data, action) => {
    if (action.type === 'scroll') {
      if (action.direction === 'up') {
        return { ...data, offset: Math.max(0, data.offset - action.step) };
      } else if (action.direction === 'down') {
        return { ...data, offset: data.offset + action.step };
      } else if (action.direction === 'left') {
        return { ...data, offset_x: Math.max(0, data.offset_x - action.step) };
      } else if (action.direction === 'right') {
        return { ...data, offset_x: data.offset_x + action.step };
      }
    }
    return null;
  },
};

function operate(expr, index) {
  if (is_infinity(expr)) {
    return infinity_FS(index + 2);
  }

  if (index === 0) return expr.slice(0, expr.length - 1);
  if (index === 1) return expand(expr, 1, true).slice(0, expr.length);
  return expand(expr, index - 1, true);
}

function from_operation_seq(seq) {
  let result = INFINITY;
  for (let i of seq) result = operate(result, i);
  return result;
}

const seq_cache = {};

function to_operate_seq(expr) {
  if (is_infinity(expr)) return [];

  const data_key = display(expr);
  if (data_key in seq_cache) return seq_cache[data_key];

  const result = [];

  let current = INFINITY;
  while (true) {
    let i = 0,
      cmp,
      next;

    while (true) {
      next = operate(current, i);
      cmp = compare(next, expr);
      if (cmp >= 0) break;
      i++;
    }

    current = next;
    result.push(i);
    if (cmp === 0) break;
  }

  return (seq_cache[data_key] = result);
}

function display_op_seq(expr) {
  return '' + to_operate_seq(expr);
}

function from_display_op_seq(str) {
  const seq = str.split(',').map(Number);
  if (!seq.every((x) => !Number.isNaN(x))) throw new Error('illegal input: ' + str);
  return from_operation_seq(seq);
}

export const DEN2 = {
  id: 'den2',
  name: 'DEN2 (IBLP)',
  simple_name: 'IBLP',
  category_id: 'category-den',
  display: { plain: display, from_display },
  display_equiv: {
    'op seq': {
      plain: display_op_seq,
      from_display: from_display_op_seq,
      name: { id: 'display.op-seq' },
    },
  },
  is_limit,
  compare,
  ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),
  draw_diagram: draw_diagram_control,
  credit_text_id: 'credit.den23',

  init: () => [INFINITY, []],

  debug: { expand },
};

function weak_is_limit(expr) {
  if (is_infinity(expr)) return true;
  if (expr.length === 0) return false;
  let active = expr[expr.length - 1];
  if (active[1].length === 2) return false;
  return pleasant_until(expr.slice(active[1][active[0]][0] - 1, -1), active) === -1;
}

function weak_expand(raw, index, shorter = true) {
  if (!weak_is_limit(raw)) return cut(raw);
  return expand(raw, index, shorter);
}

export const weak_DEN2 = {
  id: 'weak-den2',
  name: 'weak IBLP',
  simple_name: 'wIBLP',
  category_id: 'category-den',
  display: { plain: display, from_display },
  is_limit: weak_is_limit,
  compare,
  ...sequence_FS_variants(weak_expand, is_infinity, infinity_FS, weak_is_limit, display),
  draw_diagram: draw_diagram_control,
  credit_text_id: 'credit.den23',

  init: () => [INFINITY, []],
};

register_notation(DEN2);
register_notation(weak_DEN2);
