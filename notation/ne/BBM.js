// ============================================================================
//  notation/ne/BBM.js — Branching BMS（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BBM.ts
//  注册 id: bbm（单体记号，无 generator）
//
//  与 ne 的差异：无。本项目原先没有同 id 条目（属本地缺失的新记号），
//  因此不涉及 initial / 档位调整。
//
//  依赖（源文件的 3 个 import 对应关系）：
//    '@/utils.ts'                    → ../../core/ne/utils.js
//    '@/notation-definition.ts'      → 纯类型，删除
//    '@/notations/notation_utils.ts' → ../../core/ne/notationUtils.js（FS_default_LNZ_variant）
//  三者都已搬运，无需内联或替代。
//
//  ⚠ 该记号的「无穷」是数值 Infinity 本身（ne 的 INFINITY 常量），不是函数：
//    init() 返回 [Infinity, []]。表达式 = Expr = Column[]，
//    Column = Entry[]，Entry = { value: number; height: Expr }。
//
//  算法逐行照搬，仅去掉类型注解。文件末尾自注册（manifest 以 module: true 注入）。
// ============================================================================
import {
  bind2,
  boolean_compare,
  lex_compare,
  lex_compare_by,
  number_compare,
  object_lex_compare_by,
} from '../../core/ne/utils.js';
import { FS_default_LNZ_variant } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

export const INFINITY = Infinity;
export const INFINITY_height = Infinity;

export function is_infinity(e) {
  return e === INFINITY;
}

export function infinity_FS(index) {
  if (index === 0) return [[]];
  let col = [{ value: index - 1, height: [] }];
  for (let i = index - 1; i > 0; i--) {
    col = [{ value: i - 1, height: [col] }];
  }
  return [[], col];
}

export function to_height(e, r) {
  const result = [];

  for (let i = 0; i < e.length; i++) {
    const col = e[i];

    const result_col = [];

    for (const entry of col) {
      const p = entry.value;
      let mark, value;
      if (p < r) {
        [mark, value] = [false, p];
      } else {
        [mark, value] = [true, p - r];
      }
      result_col.push({
        mark,
        value,
        height: to_height(entry.height, r),
      });
    }

    result.push(result_col);
  }

  return result;
}

export function from_height(h, r) {
  const result = [];

  for (let i = 0; i < h.length; i++) {
    const col = h[i];

    const result_col = [];

    for (const entry of col) {
      const { mark, value } = entry;
      result_col.push({
        value: value + (mark ? r : 0),
        height: from_height(entry.height, r),
      });
    }

    result.push(result_col);
  }

  return result;
}

export function height_compare(a, b) {
  if (is_infinity(a) || is_infinity(b)) return boolean_compare(is_infinity(a), is_infinity(b));
  return lex_compare(a, b, lex_compare_by(height_entry_comparator));
}

const height_entry_comparator = object_lex_compare_by(
  { mark: boolean_compare, value: number_compare, height: height_compare },
  ['mark', 'value', 'height'],
);

export function vertical_compare(a, b) {
  return lex_compare(a, b, height_compare);
}

export function has_next_layer(expr) {
  const right = expr.length - 1;
  if (right === -1) return false;
  const top = expr[right].length - 1;
  return top !== -1;
}

export function next_layer(expr) {
  const right = expr.length - 1;
  const top = expr[right].length - 1;
  return expr[right][top].height;
}

export function skip_layers(expr, l) {
  for (let i = 0; i < l; i++) expr = next_layer(expr);
  return expr;
}

export function tail_layer(expr) {
  if (!has_next_layer(expr)) return -1;
  return 1 + tail_layer(next_layer(expr));
}

export function tail(expr, t_layer) {
  let current_left = 0;
  let current = expr;
  for (let i = 0; i < t_layer; i++) {
    current_left += current.length;
    current = next_layer(current);
  }
  return current_left + current.length - 1;
}

export function root(expr, t_layer) {
  const current = skip_layers(expr, t_layer);
  return current[current.length - 1][current[current.length - 1].length - 1].value;
}

export function root_layer(expr, r) {
  let current = expr;
  let current_left = 0;
  let current_layer = 0;
  while (true) {
    if (r < current_left + current.length) {
      return [current_layer, r - current_left];
    }
    current_left += current.length;
    current = next_layer(current);
    current_layer++;
  }
}

function ascend_replace(expr, r, diff, t_layer, new_tail) {
  let result = [];

  for (let i = 0; i < expr.length; i++) {
    if (t_layer === 0 && i === expr.length - 1) {
      result.push(...new_tail);
    } else {
      const col = expr[i];
      let result_col = [];
      for (let j = 0; j < col.length; j++) {
        const entry = col[j];
        const new_t_layer =
          t_layer !== undefined && i === expr.length - 1 && j === col.length - 1 ? t_layer - 1 : undefined;
        result_col.push({
          value: entry.value >= r ? entry.value + diff : entry.value,
          height: ascend_replace(entry.height, r, diff, new_t_layer, new_tail),
        });
      }
      result.push(result_col);
    }
  }

  return result;
}

export function is_special(expr, t_layer) {
  if (t_layer < 0) return false;
  const current = skip_layers(expr, t_layer);
  if (!has_next_layer(current)) return false;
  const next = next_layer(current);
  return next[next.length - 1]?.length === 0;
}

export function expand_special(expr, t_layer, index) {
  let result = expr.slice(0, -1);
  let col = expr[expr.length - 1];
  let result_col = col.slice(0, -1);
  let entry = col[col.length - 1];
  if (t_layer > 0) {
    let new_entry = {
      value: entry.value,
      height: expand_special(entry.height, t_layer - 1, index),
    };
    result_col.push(new_entry);
  } else {
    let new_entry = {
      value: entry.value,
      height: entry.height.slice(0, -1),
    };
    if (result_col.length === 0) result_col.push(new_entry);
    result_col.push(...Array(index).fill(new_entry));
  }
  result.push(result_col);
  return result;
}

export function root_appending_start(col_root, r, col_tail, t) {
  let heights_root = col_root.map(({ height }) => to_height(height, r));
  let heights_tail = col_tail.slice(0, -1).map(({ height }) => to_height(height, t));
  let ir = 0,
    it = 0;
  while (ir !== heights_root.length && it !== heights_tail.length) {
    const cmp = height_compare(heights_root[ir], heights_tail[it]);
    if (cmp >= 0) it++;
    if (cmp <= 0) ir++;
  }
  return ir;
}

export function is_limit(expr) {
  return is_infinity(expr) || (expr.length > 0 && expr[expr.length - 1].length > 0);
}

function FS(expr, index) {
  if (is_infinity(expr)) return infinity_FS(index);
  if (expr.length === 0) return expr;
  const t_layer = tail_layer(expr);
  if (t_layer < 0) return expr.slice(0, -1);

  if (is_special(expr, t_layer)) {
    return expand_special(expr, t_layer, index);
  }

  const t = tail(expr, t_layer);
  const r = root(expr, t_layer);
  const [r_layer, ri] = root_layer(expr, r);

  const expr_root = skip_layers(expr, r_layer);
  const col_root = expr_root[ri];
  const expr_tail = skip_layers(expr_root, t_layer - r_layer);
  const col_tail = expr_tail[expr_tail.length - 1];

  const appending = root_appending_start(col_root, r, col_tail, t);

  let new_tail = [];

  for (let j = index; j >= 1; j--) {
    if (ri !== expr_root.length - 1) {
      let new_tail_1 = ascend_replace(expr_root.slice(ri + 1), r, j * (t - r), t_layer - r_layer, new_tail);
      let new_col = ascend_replace([col_tail.slice(0, -1)], r, (j - 1) * (t - r), undefined, [])[0];
      for (let k = appending; k < col_root.length; k++) {
        new_col.push({
          value: col_root[k].value,
          height: ascend_replace(col_root[k].height, r, j * (t - r), undefined, []),
        });
      }
      new_tail = [new_col, ...new_tail_1];
    } else {
      if (appending === col_root.length) throw new Error('Illegal state');
      let new_col = ascend_replace([col_tail.slice(0, -1)], r, (j - 1) * (t - r), undefined, [])[0];
      for (let k = appending; k < col_root.length; k++) {
        new_col.push({
          value: col_root[k].value,
          height: ascend_replace(
            col_root[k].height,
            r,
            j * (t - r),
            k === col_root.length - 1 ? t_layer - r_layer - 1 : undefined,
            new_tail,
          ),
        });
      }
      new_tail = [new_col];
    }
  }

  return ascend_replace(expr, 0, 0, t_layer, new_tail);
}

export function display(expr, type) {
  if (is_infinity(expr)) return type === 'latex' ? '\\mathrm{Limit}' : 'Limit';

  return expr.map(bind2(display_column, type)).join('');
}

function data_key(expr) {
  return display(expr, 'plain');
}

function display_column(col, type) {
  if (col.length === 0) return '(0)';
  return '(' + col.map(bind2(display_entry, type)).join(',') + ')';
}

function display_entry(entry, type) {
  const v_display = '' + (entry.value + 1);
  if (entry.height.length === 0) return v_display;
  const h_display = display(entry.height, type);
  switch (type) {
    case 'plain':
      return v_display + '^' + h_display;
    case 'html':
      return v_display + '<sup>' + h_display + '</sup>';
    case 'latex':
      return v_display + '^{' + h_display + '}';
  }
}

export function display_marked(expr, type, start_index = 1) {
  if (is_infinity(expr)) return type === 'latex' ? '\\mathrm{Limit}' : 'Limit';

  let idx = start_index;
  const parts = [];
  for (const col of expr) {
    parts.push(display_column_marked(col, type, idx));
    idx++;
  }
  return parts.join('');
}

function display_column_marked(col, type, index) {
  if (col.length === 0) {
    if (type === 'plain') return '(:' + index + ')';
    if (type === 'html') return "(0)<sub><span style='color:#888'>" + index + '</span></sub>';
    return '(0)_{\\color{gray}' + index + '}';
  }
  const content = col.map((e) => display_entry_marked(e, type, index)).join(',');
  if (type === 'plain') return '(' + content + ':' + index + ')';
  if (type === 'html') return '(' + content + ")<sub><span style='color:#888'>" + index + '</span></sub>';
  return '(' + content + ')_{\\color{gray}' + index + '}';
}

function display_entry_marked(entry, type, col_index) {
  const v_display = '' + (entry.value + 1);
  if (entry.height.length === 0) return v_display;
  const h_display = display_marked(entry.height, type, col_index + 1);
  if (type === 'html') return v_display + '<sup>' + h_display + '</sup>';
  if (type === 'latex') return v_display + '^{' + h_display + '}';
  return v_display + '^' + h_display;
}

export function from_display(s) {
  let i = 0;

  function error() {
    throw new Error('Illegal input string: ' + s);
  }

  function skip_spaces() {
    while (i < s.length && s[i] === ' ') i++;
  }

  function skip_index() {
    if (i < s.length && s[i] === ':') {
      i++;
      skip_spaces();
      while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
    }
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
    if (i < s.length && s[i] !== ')' && s[i] !== ':') {
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
    skip_index();
    skip_spaces();
    if (i >= s.length || s[i] !== ')') error();
    i++;
    // 删去列尾的 0 项（显示值 0 = 内部值 -1）
    while (entries.length > 0 && entries[entries.length - 1].value === -1) entries.pop();
    return entries;
  }

  function parse_entry() {
    const v = parse_number() - 1; // display 为 1-based，内部为 0-based
    skip_spaces();
    if (i < s.length && s[i] === '^') {
      i++;
      return { value: v, height: parse_expr() };
    }
    return { value: v, height: [] };
  }

  skip_spaces();
  if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
    i += 5;
    skip_spaces();
    if (i !== s.length) error();
    return INFINITY;
  }

  const result = parse_expr();
  skip_spaces();
  if (i !== s.length) error();
  return result;
}

export function compare(a, b) {
  return lex_compare(a, b, lex_compare_by(entry_comparator));
}

const entry_comparator = object_lex_compare_by(
  {
    value: number_compare,
    height: compare,
  },
  ['value', 'height'],
);

export function vertical_increase(vert, h_diff) {
  const result = [...vert];
  while (result.length > 0 && height_compare(result[result.length - 1], h_diff) < 0) {
    result.pop();
  }
  result.push(h_diff);
  return result;
}

export function vertical_diff(v1, v2) {
  let i = 0;
  while (i < v1.length && i < v2.length && height_compare(v1[i], v2[i]) === 0) i++;
  return v1.slice(i);
}

export function convert_to_layer(e, parsed_stack = []) {
  if (is_infinity(e)) return e;

  const lS = parsed_stack.length;
  const result = [];

  for (let i = 0; i < e.length; i++) {
    const iS = parsed_stack.length;

    const col = e[i];
    const parsed_col = [];

    let current_vertical = [];

    for (let j = 0; j < col.length; j++) {
      const entry = col[j];
      const parent = entry.value;
      const height = to_height(entry.height, iS);

      let kp = 0,
        ki = 0;
      while (kp !== parsed_stack[parent].length && ki !== current_vertical.length) {
        const cmp = height_compare(parsed_stack[parent][kp].height, current_vertical[ki]);
        if (cmp <= 0) kp++;
        if (cmp >= 0) ki++;
      }
      if (kp === parsed_stack[parent].length) {
        parsed_col.push({ value: 0, parent, height });
      } else {
        while (kp <= parsed_stack[parent].length) {
          if (kp === parsed_stack[parent].length) {
            parsed_col.push({ value: 0, parent, height });
            break;
          }
          const cmp = height_compare(parsed_stack[parent][kp].height, height);
          if (cmp < 0) {
            parsed_col.push({
              value: parsed_stack[parent][kp].value + 1,
              parent,
              height: parsed_stack[parent][kp].height,
            });
          } else {
            parsed_col.push({ value: parsed_stack[parent][kp].value + 1, parent, height });
            break;
          }
          kp++;
        }
      }
      current_vertical = vertical_increase(current_vertical, height);
    }
    parsed_stack.push(parsed_col);

    const result_col = [];
    for (let parsed_entry of parsed_col) {
      const height_expr = from_height(parsed_entry.height, iS);
      result_col.push({
        value: parsed_entry.value,
        height: convert_to_layer(height_expr, parsed_stack),
      });
    }

    result.push(result_col);
  }

  parsed_stack.splice(lS);
  return result;
}

// computes parent of lower, and value of upper
function parent_info(parsed, vertical) {
  let ip = 0,
    iv = 0;
  let lower_parent = undefined;
  while (ip !== parsed.length && iv !== vertical.length) {
    const cmp = height_compare(parsed[ip].height, vertical[iv]);
    if (cmp >= 0) {
      lower_parent = parsed[ip].parent;
      iv++;
    }
    if (cmp <= 0) ip++;
  }
  return { lower_parent, higher_value: parsed[ip]?.value ?? -1 };
}

export function convert_from_layer(e, parsed_stack = []) {
  if (is_infinity(e)) return e;

  const lS = parsed_stack.length;
  const result = [];

  for (let i = 0; i < e.length; i++) {
    const iS = parsed_stack.length;

    const col = e[i];
    const parsed_col = [];
    parsed_stack.push(parsed_col);

    const result_col = [];
    let current_vertical = [];

    for (let j = 0; j < col.length; j++) {
      const entry = col[j];

      let parent = j === 0 ? iS - 1 : parsed_col[j - 1].parent;
      while (parent >= 0) {
        let { lower_parent, higher_value } = parent_info(parsed_stack[parent], current_vertical);
        if (higher_value < entry.value) break;
        parent = lower_parent ?? parent - 1;
      }

      parsed_col.push({
        value: entry.value,
        parent,
        height: INFINITY_height,
      });

      const height_expr = convert_from_layer(entry.height, parsed_stack);
      const height = to_height(height_expr, iS);
      parsed_col[j].height = height;

      while (result_col.length > 0) {
        const top = result_col[result_col.length - 1];
        if (top.value === parent && compare(top.height, height_expr) < 0) {
          result_col.pop();
        } else {
          break;
        }
      }

      result_col.push({ value: parent, height: height_expr });
      current_vertical = vertical_increase(current_vertical, height);
    }

    result.push(result_col);
  }

  parsed_stack.splice(lS);
  return result;
}

export const BBM = {
  id: 'bbm',
  name: 'Branching BMS',
  simple_name: 'BBMS',
  description: [
    { id: 'description.bbm.1' },
    { id: 'description.bbm.2' },
    { id: 'description.bbm.3' },
    { id: 'description.bbm.4' },
    { id: 'description.bbm.5' },
    { id: 'description.bbm.6' },
    { id: 'description.bbm.7' },
  ],
  category_id: 'category-bm-like',
  display: {
    plain: bind2(display, 'plain'),
    html: bind2(display, 'html'),
    latex: bind2(display, 'latex'),
    from_display,
    name: { id: 'display.index' },
  },
  display_equiv: {
    layer: {
      plain: (e) => display(convert_to_layer(e), 'plain'),
      html: (e) => display(convert_to_layer(e), 'html'),
      latex: (e) => display(convert_to_layer(e), 'latex'),
      from_display: (str) => convert_from_layer(from_display(str)),
      name: { id: 'display.layer' },
    },
    marked: {
      plain: (e) => display_marked(e, 'plain'),
      html: (e) => display_marked(e, 'html'),
      latex: (e) => display_marked(e, 'latex'),
      from_display,
      name: { id: 'display.index-marked' },
    },
  },
  is_limit,
  compare,
  ...FS_default_LNZ_variant(FS, compare, is_infinity, infinity_FS, is_limit, data_key),
  init: () => [INFINITY, []],

  credit_text_id: 'credit.btbm',
};

register_notation(BBM);
