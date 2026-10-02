// ============================================================================
//  notation/ne/weak-omega-Y.js — Weak ω-Y (weak magma)（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/weak-omega-Y.ts
//  注册 id: weak-omega-y，分类 category-y
//
//  与 ne 的差异（与 Omega_Y.js / BM.js 同处理）：
//  源文件 import 的 `y_diagram_control` 属图元层（依赖 draw_mountain_diagram），
//  本项目未搬该层，故去掉 import 与 `draw_diagram` 字段；其余逐行照搬。
// ============================================================================
import {
  expand_weak_magma,
  INFINITY,
  is_infinity,
  seq_compare,
  sequence_display,
  sequence_from_display,
  to_dbms_display,
} from './Omega_Y.js';
import { Y_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

function weak_is_limit(a) {
  if (is_infinity(a)) return true;
  if (a.length < 2) return false;
  return a[a.length - 1] - a[a.length - 2] > 1;
}

function weak_expand(a, index) {
  if (is_infinity(a)) return [1, index + 1];
  if (!weak_is_limit(a)) return a.slice(0, -1);
  return expand_weak_magma(a, index);
}

export const weak_omega_Y = {
  id: 'weak-omega-y',
  name: 'Weak ω-Y (weak magma)',
  simple_name: 'weak ωY',
  category_id: 'category-y',
  display: {
    plain: sequence_display,
    from_display: sequence_from_display,
  },
  display_equiv: {
    DBMS: (s) => to_dbms_display(s, 'DBMS'),
    DBMS_MN: (s) => to_dbms_display(s, "DBMS'"),
    ADBMS: (s) => to_dbms_display(s, 'ADBMS'),
  },
  is_limit: weak_is_limit,
  compare: seq_compare,
  ...Y_FS_variants(weak_expand, is_infinity, (index) => [1, index + 1], weak_is_limit, sequence_display),
  credit_text_id: 'credit.yukito',

  init: () => [INFINITY(), [1], []],
};

register_notation(weak_omega_Y);
