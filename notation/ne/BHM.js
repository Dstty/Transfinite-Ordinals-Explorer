// ============================================================================
//  notation/ne/BHM.js — Bashicu hyper matrix（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BHM.ts 的 **BHM 本体部分**
//  （同文件里的 nBM-BHM 家族已由 notation/ne/nBM-BHM.js 搬运）。
//  注册 id: bhm，分类 category-bm-like
//
//  本文件把 BHM.ts 文件内的工具函数（ascension_thresholds / ascension_vector /
//  ascend_vector / compute_expansion / extend / BHM_expand）**导出**，
//  供 nBM-BHM.js 复用，避免同一份算法出现两份拷贝。
//  算法逐行照搬，只去掉类型注解。
// ============================================================================
import {
  compare,
  display,
  display_simple,
  from_display,
  from_display_simple,
  INFINITY,
  infinity_FS,
  is_infinity,
  is_limit,
  parents,
} from './BM.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

export function ascension_thresholds(P, r, roots, b) {
  const result = Array(P.length).fill(0);

  result[r] = b;
  for (let i = r + 1; i < P.length; i++) {
    if (roots.includes(i)) {
      result[i] = b;
    } else {
      let threshold = 0;
      while (threshold < P[i].length && threshold < b && threshold < result[P[i][threshold]]) threshold++;
      result[i] = threshold;
    }
  }

  return result;
}

export function ascension_vector(m, r, b) {
  const right = m.length - 1;
  return Array.from({ length: b }, (_, i) => m[right][i] - (m[r][i] ?? 0));
}

export function ascend_vector(col, V, A, w) {
  return Array.from(
    { length: Math.max(col.length, A) },
    (_, j) => (col[j] ?? 0) + w * (V[j] ?? 0) * (j < A ? 1 : 0),
  );
}

export function compute_expansion(m, r, V, A, index, shorter) {
  const right = m.length - 1;

  const result = m.slice(0, right);
  for (let w = 1; w <= index + 1; ++w) {
    if (shorter && w > index) break;
    for (let i = r; i < right; ++i) {
      result.push(ascend_vector(m[i], V, A[i], w));
      if (w > index) break;
    }
  }
  return result;
}

export function extend(m, r, V, A) {
  const right = m.length - 1;

  const res = compute_expansion(m, r, V, A, 1, true);
  res.push(ascend_vector(m[right], V, A[right], 1));
  return res;
}

export function BHM_expand(m, index, shorter) {
  const right = m.length - 1;
  if (right < 0) return [];
  const top = m[right].length - 1;
  if (top < 0) return m.slice(0, -1);

  const P = parents(m);

  const special_root = P[P[right][top]][top] ?? -1;
  const roots = [];
  for (let i = right; (i = top > 0 ? P[i][top - 1] : i - 1) > special_root;) {
    if ((P[i][top] ?? -1) === special_root) roots.push(i);
  }

  const A = [];
  for (let r of roots) {
    A[r] = ascension_thresholds(P, r, roots, top);
  }

  const V = [];
  for (let r of roots) {
    V[r] = ascension_vector(m, r, top);
  }

  const threshold = extend(m, roots[0], V[roots[0]], A[roots[0]]);
  let ri = roots.findIndex((r) => compare(extend(m, r, V[r], A[r]), threshold) < 0);
  if (ri === -1) ri = roots.length;
  let r_actual = roots[ri - 1];
  return compute_expansion(m, r_actual, V[r_actual], A[r_actual], index, shorter);
}

export const BHM = {
  id: 'bhm',
  name: 'Bashicu hyper matrix',
  simple_name: 'BHM',
  category_id: 'category-bm-like',
  display: {
    plain: display,
    from_display,
  },
  display_equiv: {
    simple: {
      plain: display_simple,
      from_display: from_display_simple,
      name: { id: 'display.simple' },
    },
  },
  is_limit: is_limit,
  compare: compare,
  ...sequence_FS_variants(BHM_expand, is_infinity, infinity_FS, is_limit, display),
  credit_text_id: 'credit.bashicu',

  init: () => [INFINITY(), []],
};

register_notation(BHM);
