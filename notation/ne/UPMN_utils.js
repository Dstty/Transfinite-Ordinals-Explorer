// ============================================================================
//  notation/ne/UPMN_utils.js — UPMN 家族的共用底座（n_MN 基础层门面 + UPMN 分类）
// ============================================================================
//  来源与职责
//  ----------
//  UPMN 九个源文件里有八个从 '@/notations/MN/SMN/n_MN.ts' 取 n_MN 的基础层
//  （UP1MN / UP2MN-v1a / v1b / v1b+ / UP2DBMS-v1 / v1b+ / v1c 等）。
//  本模块即该基础层在 UPMN 侧的**统一入口**，供下列文件 import：
//    UP1MN.js / UP1DBMS.js / UP2MN-v1a.js（本批）
//    UP2MN-v1b.js / UP2DBMS-v1b-plus.js（同批其他任务，已 import 本模块）
//
//  为什么是门面而不是自带一份实现
//  ------------------------------
//  本模块最初是 n_MN 基础层的一份逐行照搬（当时 notation/ne/n_MN.js 尚未落地，
//  见 .tmp-ne/MIGRATION-NOTES.md「未开始：SMN 系列（n_MN / …）」）。
//  随后 n_MN.js 由同批任务搬好并自带完整基础层 + SMN_common.js 的共享部分。
//  按 PORTING-GUIDE「共享函数抽公共模块、不要多份拷贝」与 MIGRATION-NOTES 第五节
//  「到位后已改回 import」的做法，这里改为**纯 re-export 门面**：唯一定义处是
//  ./n_MN.js，本模块只负责给出稳定的导入名与 UPMN 分类，不再持有第二份实现。
//  等价性由 .tmp-ne/verify-upmn-a.mjs 逐项对比 ne 原版验证（本模块改写后全套用例
//  仍然全绿）。
//
//  导出清单（与 n_MN.ts 的运行时导出逐名对应；UP1DBMS 等文件按此 import）：
//    INFINITY / is_infinity / is_limit / to_data_key / mountain_display /
//    entry_display / mountain_display_marked / from_display / from_display_simple /
//    column_compare / compare / vertical_diff / vertical_increase / column_verticals /
//    find_index_below / find_index_below_equal / parent / magma_indices / fill_ghost /
//    clear_ghost / subtract_1 / copy_column / extend / NT_infinity_FS / expand /
//    convert_to_layer / convert_from_layer / draw_diagram_control
//
//  ⚠ 副作用：import 本模块会连带 import ./n_MN.js，而 n_MN.js 末尾自注册
//    category-n-mn 与其成员 1-mn..8-mn（与 notation/ne/BM.js 同理，无害；manifest
//    迟早也会加载 n_MN.js）。
//
//  UPMN 分类：ne 里 category_upmn / category_upmn_test 定义在
//  src/notations/MN/UPMN/categories.ts，由 main.ts 注册。本项目 categories.js 骨架
//  只预置了顶层 category-upmn（parent_id: category-mn），故这里补 category-upmn-test。
//  ensure_category 幂等：若骨架将来补上同名分类也不会冲突（分类名沿用 ne 原文的
//  i18n 对象 { id: 'category-name.upmn-test' }，未擅改）。
// ============================================================================

import { ensure_category } from '../../core/ne/registry.js';

export {
    INFINITY,
    is_infinity,
    is_limit,
    to_data_key,
    mountain_display,
    entry_display,
    mountain_display_marked,
    from_display,
    from_display_simple,
    column_compare,
    compare,
    vertical_diff,
    vertical_increase,
    column_verticals,
    find_index_below,
    find_index_below_equal,
    parent,
    magma_indices,
    fill_ghost,
    clear_ghost,
    subtract_1,
    copy_column,
    extend,
    NT_infinity_FS,
    expand,
    convert_to_layer,
    convert_from_layer,
    draw_diagram_control,
} from './n_MN.js';

// ---------------------------------------------------------------------------
//  UPMN 的子分类（ne: src/notations/MN/UPMN/categories.ts，由 main.ts 注册）
// ---------------------------------------------------------------------------
export const category_upmn_test = {
    id: 'category-upmn-test',
    // 同 SDBMS_utils.js：ne 原文是 i18n 键对象，这里换成 use_i18n.ts 里的中文值
    name: '试作记号',
    parent_id: 'category-upmn',
};

ensure_category(category_upmn_test);
