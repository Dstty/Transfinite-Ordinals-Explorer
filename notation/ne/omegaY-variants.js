// ============================================================================
//  notation/ne/omegaY-variants.js — ω-Y 的 limit 变体（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/variants.ts
//  注册 id: omega-y-12omega / omega-y-1257omega / omega-y-skew
//  分类 category-y-variants
//
//  与 ne 的差异：源文件 import 的 `y_diagram_control` 属图元层（依赖
//  draw_mountain_diagram），本项目未搬该层，故去掉 import 与工厂里的
//  `draw_diagram` 字段；其余逐行照搬。
// ============================================================================
import {
  dimension_difference,
  expand_weak_magma,
  INFINITY,
  is_infinity,
  is_limit,
  seq_compare,
  sequence_display,
  sequence_from_display,
  to_dbms_display,
  vertical_increase,
} from './Omega_Y.js';
import { Y_FS_variants } from '../../core/ne/notationUtils.js';
import { deepcopy } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';

function create_variant_omega_y(id, name, simple_name, infinity_FS, init) {
  return {
    id,
    name,
    simple_name,
    category_id: 'category-y-variants',
    display: {
      plain: sequence_display,
      from_display: sequence_from_display,
    },
    display_equiv: {
      DBMS: (s) => to_dbms_display(s, 'DBMS'),
      DBMS_MN: (s) => to_dbms_display(s, "DBMS'"),
      ADBMS: (s) => to_dbms_display(s, 'ADBMS'),
    },
    is_limit,
    compare: seq_compare,
    ...Y_FS_variants(expand_weak_magma, is_infinity, infinity_FS, is_limit, sequence_display),
    credit_text_id: 'credit.yukito',

    init: () => deepcopy(init),
  };
}

export const omega_Y_12omega = create_variant_omega_y(
  'omega-y-12omega',
  'ω-Y (1,2,ω)',
  '12ωY',
  (index) => [1, 2, index + 4],
  [INFINITY(), [1, 2], [1], []],
);

export const omega_Y_1257omega = create_variant_omega_y(
  'omega-y-1257omega',
  'ω-Y (1,2,5,7,ω)',
  '1257ωY',
  (index) => [1, 2, 5, 7, index + 12],
  [INFINITY(), [1, 2, 5, 7], [1], []],
);

function compute_skew_omega_y(index) {
  const result = [1];

  let verticals = [[]];
  let values = [1];

  for (let i = 0; i < index; i++) {
    let current = [...Array(i).fill(0), 1];

    const new_verticals = [current];
    const new_values = [1];

    for (let j = 0; j < verticals.length; j++) {
      const v = verticals[j];
      const value = values[j];
      const d = dimension_difference(current, v);
      for (let k = d; k >= 0; k--) {
        new_verticals.push(k === 0 ? v : vertical_increase(v, k - 1));
        new_values.push(new_values[new_values.length - 1] + value);
      }
      current = v;
    }

    verticals = new_verticals;
    values = new_values;
    result.push(values[values.length - 1]);
  }

  return result;
}

export const omega_Y_skew = create_variant_omega_y(
  'omega-y-skew',
  'Skew ω-Y',
  'Skew ωY',
  compute_skew_omega_y,
  [INFINITY(), [1], []],
);

register_notation(omega_Y_12omega);
register_notation(omega_Y_1257omega);
register_notation(omega_Y_skew);
