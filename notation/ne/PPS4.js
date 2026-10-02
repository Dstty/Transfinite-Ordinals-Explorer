// ============================================================================
//  notation/ne/PPS4.js — PPS4 系列（ne 原生风格 / 硬切改写）
// ============================================================================
//  来源：本项目自己的 notation/rewritten/PPS4.js（远古接口形态）。
//  ne-rewritten 的 src/notations/ 下**没有**对应文件，所以这是硬切改写：
//  算法逐行保留，只改接口层。
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push(create_pps_notation(...))  register_notation(create_pps_notation(...))
//    display: sequence_display                display: { plain, from_display }
//    able: is_limit                           is_limit
//    semiable: is_successor                   ——（被 ne 非 limit 分支吸收）
//    FS / FSalter                             ...Y_FS_variants(...)（FS / FS_alter / FS_short）
//    init() → [{expr, low, subitems}]         init() → [INFINITY(), []]
//    parse 作为外挂字段                        from_display: sequence_from_display
//
//  semiable 为什么可以丢：旧语义是「末元素为 0（后继）时可半展开」，展开结果就是
//  「删掉末元素」（expand 在 FSterm=0 时循环不执行，直接 `seq.slice(0,-1)`）。
//  ne 的 expand_single 对非 limit 节点一律算 `FS(expr, 0)` 并要求结果严格小于自身，
//  对末元素为 0 的序列恰好得到同样的「删末元素」，因此语义等价、无需该字段。
//
//  low 边界退役：旧 init 给 `{expr, low:[[]]}`，ne 的上界改由 core/ne/tree.js 的
//  get_bound 决定；树形会与旧引擎不同（旧版把展开项作为兄弟插根列表，ne 挂在子节点下），
//  这是 ne 架构的既定语义。
// ============================================================================
import { lex_compare, number_compare } from '../../core/ne/utils.js';
import { Y_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

function INFINITY() {
  return [Infinity];
}
function is_infinity(a) {
  return '' + a === 'Infinity';
}
function is_limit(seq) {
  return seq.length > 0 && seq[seq.length - 1] > 0;
}
function is_successor(seq) {
  return seq.length > 0 && seq[seq.length - 1] === 0;
}
function compare(a, b) {
  return lex_compare(a, b, number_compare);
}
function sequence_display(expr) {
  if (is_infinity(expr)) return 'Limit';
  return '' + expr;
}
function sequence_from_display(str) {
  if (str === 'Limit') return INFINITY();
  const result = str.split(',').map((s) => parseInt(s.trim(), 10));
  if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal PPS sequence');
  return result;
}
function limit_FS(n) {
  const result = [];
  for (let i = 0; i <= n; i++) result.push(i);
  return result;
}

function make_expand(expand_strong) {
  return (seq, FSterm) => {
    const len = seq.length;
    const x = seq[len - 1];
    const b = seq[x - 1];
    const badpart = seq.slice(x, len - 1);
    const L = len - x;
    const flag = badpart.some((val) => val === b);
    const result = seq.slice(0, -1);

    for (let i = 1; i <= FSterm; i++) {
      result.push(flag ? b : expand_strong(seq, x, b, i, L));
      result.push(...badpart.map((v) => (v < x ? v : v + L * i)));
    }
    return result;
  };
}

const expand_pps4_fn = (seq, x, b) => {
  const idx = seq.slice(b, x - 1).findLastIndex((val) => val <= b);
  return idx !== -1 ? b + 1 + idx : b;
};
const expand_weak_fn = (seq, x, b) => {
  const idx = seq.slice(b, x - 1).findLastIndex((val) => val === b);
  return idx !== -1 ? b + 1 + idx : b;
};
const expand_extremely_weak_fn = (seq, x, b) => {
  for (let idx = x - 2; idx >= b; idx--) {
    if (seq[idx] === b) return b + 1 + idx;
    if (seq[idx] < b) break;
  }
  return b;
};
const expand_second_fn = (seq, x, b, i, L) => {
  for (let idx = x - 2; idx >= b; idx--) {
    if (seq[idx] === b) return b + 1 + idx + L * i - L;
    if (seq[idx] < b) break;
  }
  return b;
};
const expand_third_fn = (seq, x, b, i, L) => {
  const idx = seq.slice(b, x - 1).findLastIndex((val) => val === b);
  return idx !== -1 ? b + 1 + idx + L * i - L : b;
};

const expand_pps4 = make_expand(expand_pps4_fn);
const expand_weak = make_expand(expand_weak_fn);
const expand_extremely_weak = make_expand(expand_extremely_weak_fn);
const expand_second = make_expand(expand_second_fn);
const expand_third = make_expand(expand_third_fn);

function create_pps_notation(id, name, expand_fn) {
  const variants = Y_FS_variants(expand_fn, is_infinity, limit_FS, is_limit, sequence_display);
  return {
    id,
    name,
    category_id: 'category-bss',
    display: { plain: sequence_display, from_display: sequence_from_display },
    is_limit,
    compare,
    FS: variants.FS,
    FS_alter: variants.FS_alter,
    FS_short: variants.FS_short,
    init: () => [INFINITY(), []],
  };
}

register_notation(create_pps_notation('pps4', 'Parented predecessor sequence 4', expand_pps4));
register_notation(create_pps_notation('wpps4', 'Weak PPS4', expand_weak));
register_notation(create_pps_notation('ewpps4', 'Extremely weak PPS4', expand_extremely_weak));
register_notation(create_pps_notation('spps4', 'Second PPS4', expand_second));
register_notation(create_pps_notation('tpps4', 'Third PPS4', expand_third));
