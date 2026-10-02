// ============================================================================
//  notation/ne/nBM-BHM.js — BMS(n rows) + BHM 家族（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BHM.ts
//  只搬 nBM-BHM 家族：category_BM_BHM + BM_BHM(n) 工厂 + BM_BHM_expand。
//  同文件里的 BHM 本体（id: 'bhm'）由 notation/ne/BHM.js 搬运。
//
//  注册 id: 1-bm-bhm .. 8-bm-bhm（generator: start = 1，id 用 n）
//
//  ⚠ 与 ne 的一处差异：ne 的 initial = 3（默认只水合 1-bm-bhm..3-bm-bhm，更高档位
//    由 UI 的「+」按需生成）。本项目原先静态注册 1..8，这里把 initial 设为 8
//    以保持档位不缩水；generator 本身的行为与 ne 一致。
//
//  依赖：
//    - notation/ne/BM.js  —— BM_expand / compare / display / display_simple /
//      from_display / from_display_simple / INFINITY / infinity_FS / is_infinity / is_limit
//    - notation/ne/BHM.js —— BHM_expand（及其依赖的 ascension_thresholds /
//      ascension_vector / ascend_vector / compute_expansion / extend）。
//      两个记号同源于 BHM.ts，那批工具函数只在 BHM.js 里保留一份，本文件不再内联复制。
//
//  注册写法：ensure_category（不存在则注册；已存在但缺 generator 则补齐并水合，幂等）。
//
//  算法逐行照搬，未做改写。表达式 = number[][]（列 = number[]）。
// ============================================================================
import {
  compare,
  display,
  display_simple,
  expand as BM_expand,
  from_display,
  from_display_simple,
  INFINITY,
  infinity_FS,
  is_infinity,
  is_limit,
} from './BM.js';
import { BHM_expand } from './BHM.js';
import { bind3 } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { ensure_category } from '../../core/ne/registry.js';

// ---------------------------------------------------------------------------
//  nBM-BHM 家族
// ---------------------------------------------------------------------------

function BM_BHM_expand(m, index, n, shorter) {
  const right = m.length - 1;
  if (right < 0) return [];
  const top = m[right].length - 1;
  if (top < 0) return m.slice(0, -1);

  if (top < n) return BM_expand(m, index, shorter);
  return BHM_expand(m, index, shorter);
}

export function BM_BHM(n) {
  return {
    id: n + '-bm-bhm',
    name: 'BMS(' + n + ' rows) + BHM',
    simple_name: n + 'BM-BHM',
    category_id: 'category-bm-bhm',
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
    ...sequence_FS_variants(bind3(BM_BHM_expand, n), is_infinity, infinity_FS, is_limit, display),
    credit_text_id: 'credit.bashicu',

    init: () => [INFINITY(), [[], Array(n + 2).fill(1)], []],
  };
}

export const category_BM_BHM = {
  id: 'category-bm-bhm',
  name: 'BMS(n rows) + BHM',
  simple_name: 'nBM-BHM',
  parent_id: 'category-bm-like',
  generator: { start: 1, initial: 8, create: BM_BHM },
};

// 分类注册后立即水合其下属成员（ensure_category 内部完成；幂等，可安全重跑）
ensure_category(category_BM_BHM);
