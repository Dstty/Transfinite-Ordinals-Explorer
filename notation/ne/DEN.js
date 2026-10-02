// ============================================================================
//  notation/ne/DEN.js — DEN（Defective embedding notation，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/DEN/DEN.ts
//  注册 id: den（沿用本项目旧条目 notation/legacy/DEN.js 的 id）
//
//  ⚠ 与 ne 的差异：无。DEN 是单体记号（非 generator 家族），不涉及 initial 调整；
//    draw_diagram 复用 ./DEN2.js 的 draw_diagram_control（该控制层零外部运行时依赖），
//    按原文保留。id / name / simple_name / category_id / display / is_limit / compare /
//    FS / FS_alter / credit_text_id / init 全部与 ne 一致。
//
//  注册方式：源文件不含分类定义，category-den 由 notation/ne/categories.js 提供
//  （纯容器、无 generator），故本文件只做记号注册（register_notation），
//  不涉及 ensure_category。
//
//  算法逐行照搬，只去类型注解。表达式 = Row[]，Row = number[]（row[0] 为 step）；
//  记号极限特殊值为 [[Infinity]]。
// ============================================================================
import { boolean_compare, lex_compare, number_compare } from '../../core/ne/utils.js';
import { draw_diagram_control as den2_diagram_control } from './DEN2.js';
import { register_notation } from '../../core/ne/registry.js';

const data = {};
const data_alter = {};

function toShort(expr) {
  return expr.slice(1).map((row) => row.slice(1, -row[0]).concat(row[row.length - 1]));
}

function seqseq_compare(m1, m2) {
  if (m1.length === 0) return m2.length === 0 ? 0 : -1;
  if (m2.length === 0) return 1;
  const cmp = lex_compare(m1[0], m2[0], number_compare);
  if (cmp) return cmp;
  return seqseq_compare(m1.slice(1), m2.slice(1));
}

/** 记号极限特殊值 (display 为 'Limit'): 形如 [[Infinity]]。 */
function INFINITY() {
  return [[Infinity]];
}

function is_infinity(e) {
  return '' + e === 'Infinity';
}

function compare(expr1, expr2) {
  if (is_infinity(expr1) || is_infinity(expr2)) return boolean_compare(is_infinity(expr1), is_infinity(expr2));
  return seqseq_compare(toShort(expr1), toShort(expr2));
}

function display(expr) {
  return is_infinity(expr)
    ? 'Limit'
    : expr
        .slice(1)
        .map((row) => '(' + row.slice(1).join(',') + ')' + row[0])
        .join('') +
        ';' +
        expr[0].join(',');
}

function from_display(str) {
  const result = [[]];
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

  // 主体一行: '(' 值列表 ')' step (对应 display 中 expr.slice(1) 的一行)
  function parse_row() {
    skip_spaces();
    if (i >= s.length || s[i] !== '(') error();
    i++;
    skip_spaces();
    const values = [];
    if (i < s.length && s[i] !== ')') {
      while (true) {
        values.push(parse_digits());
        skip_spaces();
        if (i < s.length && s[i] === ',') {
          i++;
          skip_spaces();
          continue;
        }
        break;
      }
    }
    if (i >= s.length || s[i] !== ')') error();
    i++;
    skip_spaces();
    return [parse_digits()].concat(values);
  }

  // 'Limit' 只允许作为整串输入 (带或不带前后空格)
  skip_spaces();
  if (s.slice(i, i + 5) === 'Limit') {
    i += 5;
    skip_spaces();
    if (i !== s.length) error();
    return INFINITY();
  }
  // ';' 之前的为主体行, 之后的为 expr[0] (父标号列表, 可为空)
  while (i < s.length) {
    skip_spaces();
    if (i >= s.length || s[i] === ';') break;
    if (s[i] !== '(') error();
    result.push(parse_row());
  }
  skip_spaces();
  if (i >= s.length || s[i] !== ';') error();
  i++;
  skip_spaces();
  // expr[0]: 父标号列表, 可为空; 不允许尾逗号
  if (i < s.length) {
    while (true) {
      result[0].push(parse_digits());
      skip_spaces();
      if (i < s.length && s[i] === ',') {
        i++;
        skip_spaces();
        continue;
      }
      break;
    }
  }
  if (i !== s.length) error();
  return result;
}

function pleasantUntil(rows, t) {
  const tcheck = t.slice(1 + t[0]),
    tmax = tcheck[0],
    tmin = tcheck[tcheck.length - 1];
  for (let n = 0; n < rows.length; n++) {
    const scheck = rows[n].slice(1);
    const i1 = scheck.findIndex((x) => x < tmax);
    const i2 = (function (arr, pred) {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (pred(arr[i])) return i;
      }
      return -1;
    })(scheck, (x) => x > tmin);
    if (~i1 && ~i2 && i1 <= i2 && scheck.slice(i1, i2 + 1).some((x) => !tcheck.includes(x))) return n;
  }
  return -1;
}

function isLimit(expr) {
  if (is_infinity(expr)) return true;
  const active = expr[expr.length - 1];
  if (!active[1 + active[0]]) return false;
  return pleasantUntil(expr.slice(active[1 + active[0]], -1), active) === -1;
}

function cut(expr0) {
  const expr = expr0.slice(0, -1).map((row) => row.slice());
  expr[0].pop();
  return expr;
}

function compute_parent_for_mapped_row(r_old, row_idx, start, end, old_height, tmin) {
  let parent = 0;
  if (row_idx <= r_old.length && row_idx >= 1) parent = r_old[row_idx - 1];
  if (parent && start <= parent && parent <= end) return parent - start + old_height;
  let ancestor = parent;
  while (ancestor) {
    if (ancestor < tmin) return ancestor;
    ancestor = r_old[ancestor - 1];
  }
  return 0;
}

function ap(s, t) {
  return [s[0]].concat(
    s
      .slice(1)
      .map((x) =>
        x < t[t.length - 1] ? x : x >= t[1 + t[0]] ? x - t[1 + t[0]] + t[1] : t[t.lastIndexOf(x) - t[0]],
      ),
  );
}

function copy(raw, flag) {
  const active = raw[raw.length - 1];
  const expr = cut(raw);
  expr.push(...raw.slice(active[1 + active[0]], active[1 + active[0]] + flag).map((row) => ap(row, active)));
  for (let row_idx = active[1 + active[0]]; row_idx < active[1 + active[0]] + flag; ++row_idx) {
    expr[0].push(
      compute_parent_for_mapped_row(
        raw[0],
        row_idx,
        active[1 + active[0]],
        active[1 + active[0]] + flag - 1,
        raw.length - 1,
        active[active.length - 1],
      ),
    );
  }
  return expr;
}

function extend(raw) {
  const active = raw[raw.length - 1];
  const expr = cut(raw);
  expr.push(...raw.slice(active[1 + active[0]]).map((row) => ap(row, active)));
  for (let row_idx = active[1 + active[0]]; row_idx < raw.length; ++row_idx) {
    expr[0].push(
      compute_parent_for_mapped_row(
        raw[0],
        row_idx,
        active[1 + active[0]],
        raw.length - 1,
        raw.length - 1,
        active[active.length - 1],
      ),
    );
  }
  return expr;
}

function isAncestor(R, i, j) {
  return i === j || (i < j && isAncestor(R, i, R[j - 1]));
}

function comp(raw, i, T) {
  const expr = raw.slice(0, i).map((row) => row.slice());
  const u = T.length;
  const li = raw[i].length < raw[i][0] * 2 + 1 ? raw[i][0] : raw[i][0] + 1;
  const ci =
    raw[i].length < raw[i][0] * 2 + 1
      ? raw[i].slice(1, -raw[i][0]).concat(raw[i].slice(1 + raw[i][0]))
      : raw[i].slice(1);
  for (let r = 0; r < u; ++r) {
    let values = ci.concat(T.slice(0, 1 + r)).concat(
      Array(r)
        .fill(0)
        .map((x, rr) => raw[i][1] + 1 + rr),
    );
    values.sort((x, y) => y - x);
    expr[i + r] = [li + r].concat(values);
  }
  for (let ii = i; ii < raw.length; ++ii) {
    let values = raw[ii].slice(1).map((x) => (x <= i ? x : x + u));
    const flag = isAncestor(raw[0], i, ii) && values.findIndex((x) => x <= i) <= raw[ii][0];
    if (flag) {
      values = values.concat(T).concat(
        Array(u)
          .fill(0)
          .map((x, uu) => i + 1 + uu),
      );
      values.sort((x, y) => y - x);
    }
    expr[ii + u] = [raw[ii][0] + (flag ? u : 0)].concat(values);
  }
  const m = (x) => (x < i ? x : x + u);
  expr[0] = raw[0].slice(0, i);
  for (let r = 0; r < u; ++r) expr[0][i + r] = i + r;
  for (let ii = i + 1; ii < raw.length; ++ii) expr[0][m(ii) - 1] = m(raw[0][ii - 1]);
  return expr;
}

function fullcomp(expr, i) {
  let T = [expr[i][expr[i][0]]];
  do {
    T.unshift(expr[T[0]][2]);
  } while (T[0] > expr[i][expr[i][0] + 1]);
  T = T.slice(1, -1);
  return T.length ? comp(expr, i, T) : expr;
}

function expand(raw, FSterm, longer) {
  const active = raw[raw.length - 1];
  if (!active[1 + active[0]]) return cut(raw);
  const flag = pleasantUntil(raw.slice(active[1 + active[0]], -1), active);
  let expr = raw;
  if (~flag) {
    expr = copy(expr, flag);
  } else {
    for (let n = 1; n <= FSterm; ++n) expr = extend(expr);
    expr = longer ? copy(expr, 1) : cut(expr);
  }
  for (let i = raw.length - 1; i < expr.length; ++i) {
    if (expr[i].length <= expr[i][0] * 2 + 1) expr = fullcomp(expr, i);
  }
  return expr;
}

function LimitR(n) {
  return n
    ? [0, 0, 0].concat(
        Array(n - 1)
          .fill(0)
          .map((x, nn) => 3 + nn),
      )
    : [0, 0];
}

function Limit_row(n) {
  return Array(3 + n)
    .fill(0)
    .map((x, nn) => nn)
    .concat(2)
    .reverse();
}

function Limit(n) {
  return [LimitR(n), [1, 1, 0], [1, 2, 1, 0]].concat(
    Array(n)
      .fill(0)
      .map((x, nn) => Limit_row(1 + nn)),
  );
}

/** 将 DEN1 的 Expr 转换为 DEN2 的 Expr。mark_list[ri] 为 0 时该行无标记，否则标记值相等的 entry。 */
function den1_to_den2(expr) {
  const marks = expr[0];
  return expr.slice(1).map((row, ri) => {
    const step = row[0];
    const mark_val = marks[ri];
    const entries = [];
    if (mark_val === 0) {
      // 该行无标记
      for (let j = 1; j < row.length; j++) {
        entries.push([row[j]]);
      }
    } else {
      for (let j = 1; j < row.length; j++) {
        const val = row[j];
        entries.push(val === mark_val ? [val, true] : [val]);
      }
    }
    return [step, entries];
  });
}

const diagram_control = {
  default_data: den2_diagram_control.default_data,
  settings: den2_diagram_control.settings,
  draw_diagram: (expr, data) => den2_diagram_control.draw_diagram(den1_to_den2(expr), data),
  handle_action: (data, action) => den2_diagram_control.handle_action(data, action),
};

export const DEN = {
  id: 'den',
  name: 'Defective embedding notation',
  simple_name: 'DEN',
  category_id: 'category-den',
  display: { plain: display, from_display },
  is_limit: isLimit,
  compare,
  draw_diagram: diagram_control,
  FS: (m, FSterm) => {
    if (is_infinity(m)) return Limit(FSterm);
    if (m.length <= 1) return [[]];
    return expand(m, FSterm, false);
  },
  FS_alter: (m, FSterm) => {
    if (is_infinity(m)) return Limit(FSterm);
    if (m.length <= 1) return [[]];
    return expand(m, FSterm, true);
  },
  credit_text_id: 'credit.den',

  init: () => [[[Infinity]], [[]]],
};

register_notation(DEN);
