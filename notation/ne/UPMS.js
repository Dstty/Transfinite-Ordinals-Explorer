// ============================================================================
//  notation/ne/UPMS.js — Unupgrading projection matrix system（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/UPMS.ts 的 **UPMS 本体**
//  （同一文件里的 partial_UPMS 家族已由 notation/ne/partial-UPMS.js 搬运；
//    两者共用的 expand 及 8 个内部工具抽在 notation/ne/UPMS_utils.js，
//    本文件不重复实现——见该文件头「为什么抽出本模块」）。
//
//  注册 id: upms（单体记号，无 generator）
//  分类：category-bm-like（骨架由 notation/ne/categories.js 提供）
//
//  与 ne 的差异：算法/字段/常量零差异。单体记号不涉及 generator 的 initial
//  档位调整，故本文件没有 PORTING-GUIDE 里那处唯一允许的常量改动。
//
//  依赖对应关系：
//    '@/notations/BM-like/BM.ts'      → ./BM.js（compare / display /
//        display_as_0Y / display_simple / from_display / from_display_as_0Y /
//        from_display_simple / INFINITY / infinity_FS / is_infinity / is_limit）
//    '@/notations/notation_utils.ts'  → ../../core/ne/notationUtils.js
//    '@/utils.ts'                     → ../../core/ne/utils.js（bind3）
//    '@/notation-definition.ts'       → 纯类型，删除
//    UPMS.ts 模块私有的 expand 及工具 → ./UPMS_utils.js
//
//  表达式 = Expr = number[][]（列 = 行数组）。
//  记号定义逐行照搬，仅去类型注解。文件末尾自注册。
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
import { bind3 } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';
import { expand } from './UPMS_utils.js';

export const UPMS = {
  id: 'upms',
  name: 'Unupgrading projection matrix system',
  simple_name: 'UPMS',
  category_id: 'category-bm-like',
  display: { plain: display, from_display },
  display_equiv: {
    UP0Y: {
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
  ...sequence_FS_variants(bind3(expand, 1), is_infinity, infinity_FS, is_limit, display),
  credit_text_id: 'credit.test-alpha0',

  init: () => [INFINITY(), []],

  debug: { expandUPMS: expand },
};

register_notation(UPMS);
