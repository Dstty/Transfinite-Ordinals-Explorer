// ============================================================================
//  notation/ne/partial-UPMS.js — (>n)-UPMS（partial UPMS）家族（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/UPMS.ts 的 partial_UPMS 家族
//  （即 category_partial_UPMS 与其工厂 partial_UPMS；同一文件里的 UPMS 本体
//    已由 notation/ne/UPMS.js 搬运，BM4、TriangularBM4、seq_0Y、draw 控制等
//    不在搬运范围）。
//  注册 id: upms-partial-2 .. upms-partial-9
//  （generator: start = 2，create = partial_UPMS，id = 'upms-partial-' + n）
//
//  ⚠ 与 ne 的一处差异：ne 的 generator 写的是 { start: 2, initial: 3 }，即只水合
//    upms-partial-2 / upms-partial-3，更高档位由 UI 的「+」按需生成。本项目原先
//    静态注册到 upms-partial-9（见 core/notation-manifest.js 旧条目
//    notation/rewritten/partial-UPMS.js 的 ids），这里把 initial 调到 9 以保持
//    档位不缩水（产出 2..9 共 8 档）；generator 本身的行为与 ne 一致。
//
//  ⚠ 外部依赖：
//    display / from_display / display_as_0Y / from_display_as_0Y / display_simple /
//    from_display_simple / is_limit / compare / INFINITY / infinity_FS /
//    is_infinity 均来自 ne 的 BM 本体 src/notations/BM-like/BM.ts
//    （对应 notation/ne/BM.js）。partial_UPMS 自身只用到这些公开工具，
//    未在下面复制一份（遵循「不造未搬文件」的规范）。
//    expand 及其 8 个内部工具（make_context / is_ancestor / last_column_is_zero /
//    find_LNZ_index / find_bad_root / compute_delta / compare_marked_matrix /
//    compute_UPMS_verification_roots）原先在本文件内联一份；补搬 UPMS 本体时
//    按 PORTING-GUIDE「共享函数抽公共模块」抽到 notation/ne/UPMS_utils.js，
//    本文件改为 import（唯一定义处，UPMS.js 用同一份）。**函数体零改动。**
//
//  分类注册用 ensure_category（分类骨架由 notation/ne/categories.js 提供，带 generator
//  的分类由记号文件负责）：不存在则注册，已存在但缺 generator 则补上并立即水合成员。
//
//  算法逐行照搬（仅去类型注解）：表达式 = number[][]（列 = 行数组）。
// ============================================================================
import {
  compare,
  display,
  display_as_0Y,
  display_simple,
  INFINITY,
  from_display,
  from_display_as_0Y,
  from_display_simple,
  infinity_FS,
  is_infinity,
  is_limit,
} from './BM.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { ensure_category } from '../../core/ne/registry.js';
import { bind3 } from '../../core/ne/utils.js';
import { expand } from './UPMS_utils.js';

export function partial_UPMS(n) {
  return {
    id: 'upms-partial-' + n,
    name: 'BMS(' + n + ' rows) + UPMS',
    simple_name: '(>' + n + ')-UPMS',
    category_id: 'category-upms-partial',
    display: { plain: display, from_display },
    display_equiv: {
      ['(>' + n + ')-UP0Y']: {
        plain: display_as_0Y,
        from_display: from_display_as_0Y,
      },
      simple: {
        plain: display_simple,
        from_display: from_display_simple,
        name: { id: 'display.simple' },
      },
    },
    is_limit,
    compare,
    ...sequence_FS_variants(bind3(expand, n), is_infinity, infinity_FS, is_limit, display),
    credit_text_id: 'credit.test-alpha0',

    init: () => [INFINITY(), [[], Array(n + 3).fill(1)], []],

    debug: { expandUPMS: expand },
  };
}

export const category_partial_UPMS = {
  id: 'category-upms-partial',
  name: 'BMS(n rows) + UPMS',
  simple_name: '(>n)-UPMS',
  parent_id: 'category-bm-like',
  generator: { start: 2, initial: 9, create: partial_UPMS },
};

// 分类注册后立即水合其下属成员（ensure_category 内部完成；幂等，可安全重跑）
ensure_category(category_partial_UPMS);
