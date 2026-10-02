// ============================================================================
//  notation/ne/categories.js — ne 架构的分类骨架
// ============================================================================
//  ne 的记号自带 category_id，导航树由注册表生成（取代远古版把分类旁挂在
//  ui/notationList.js 的做法）。本文件集中注册 ne 侧的顶层分类与父分类，
//  必须排在所有 notation/ne/*.js 之前加载（manifest 里靠前）。
//
//  与 ne-rewritten 的对应：src/notations/*/categories.ts
// ============================================================================
import { get_category, register_category } from '../../core/ne/registry.js';

const CATEGORY_DEFS = [
  // ---- 顶层（顺序即 /list 里文件夹的显示顺序，沿用重构前的习惯次序）----
  { id: 'category-y', name: 'Y 序列', simple_name: 'Y' },
  { id: 'category-bm-like', name: 'Bashicu 矩阵系', simple_name: 'BM-like' },
  { id: 'category-ocf', name: 'OCF 序数折叠函数', simple_name: 'OCF' },
  { id: 'category-asan', name: 'aSAN 数列', simple_name: 'aSAN' },
  { id: 'category-ton', name: 'TON' },
  { id: 'category-den', name: 'DEN' },
  { id: 'category-mn', name: 'ω 山记号 (MN)', simple_name: 'MN' },
  // 自有记号（ne 没有对应物）的落点：硬切改写后的 PrSS / PPS / SPS / DFSS / CNF 等
  { id: 'category-bss', name: '基础序列系统', simple_name: 'BSS' },

  // ---- 子分类 ----
  { id: 'category-ocn', name: 'OCN', parent_id: 'category-ocf' },
  { id: 'category-y-omega', name: 'ω-Y', simple_name: 'ωY', parent_id: 'category-y' },
  { id: 'category-y-variants', name: 'ω-Y 变体', parent_id: 'category-y' },
  { id: 'category-minus1-y-nss-series', name: '(-1)Y-nSS 系列', parent_id: 'category-bm-like' },
  // 注意：带 generator 的分类（category-upms-partial / category-bm-bhm / category-n-mn 等）
  // 不在这里预注册 —— 它们由各自的记号文件用 ensure_category() 注册并水合成员。
  // 若在这里注册成「无 generator 的空壳」，记号文件再注册同名分类会抛 RegisterError。
  { id: 'category-smile-mn', name: 'Smile MN', parent_id: 'category-mn' },
  { id: 'category-sdbms', name: 'SDBMS', parent_id: 'category-mn' },
  { id: 'category-upmn', name: 'Unupgrading Projection MN', simple_name: 'UPMN', parent_id: 'category-mn' },
  { id: 'category-ta0-mn', name: 'e0 MN', simple_name: 'e0MN', parent_id: 'category-mn' },
  { id: 'category-hypcos-w2mn', name: 'hypcos ω2 MN', parent_id: 'category-mn' },
  { id: 'category-translators', name: '转换器', parent_id: 'category-ocf' },

  // ---- 从参考版（自助版 NE-4.8.1）移植的用户记号：分类按参考版的子类名建 ----
  // 这些分类在 ne 树里是顶层；/list 的「类 / 子类」两级归组由 ui/notationList.js
  // 的 DISPLAY_GROUP 表负责（参考版的「序列类/矩阵类/山脉类/函数类/转换器」是显示
  // 概念，不是注册表概念，故不塞进 registry）。
  { id: 'category-seq-primitive', name: 'Primitive 序列', simple_name: 'HPrSS/LPrSS' },
  { id: 'category-seq-ancestral', name: '祖先/基本列序列', simple_name: 'RCSS/FSS' },
  { id: 'category-seq-worm', name: '虫/三角序列', simple_name: 'TrSS/worm' },
  { id: 'category-seq-sss', name: 'SSS 系', simple_name: 'SSS' },
  { id: 'category-seq-diff', name: '差序列', simple_name: 'DiffSeq' },
  { id: 'category-mx-l0y', name: 'L0-Y 矩阵', simple_name: 'L0Y' },
  { id: 'category-mx-descending', name: '降下矩阵', simple_name: 'Descending' },
  { id: 'category-mx-sudden', name: 'sudden 矩阵', simple_name: 'Sudden' },
  { id: 'category-mt-general', name: '山脉系', simple_name: 'Mountain' },
  { id: 'category-converter', name: '转换器', simple_name: 'Converter' },

  // 用户自定义记号（/notation 命令注册进来的）全部落这里。
  // 这是一个**空分类**：成员由 core/ne/userNotations.js 在运行期补，故此处不能预注册
  // 成带 generator 的形式，也不需要 —— ensure_category 是幂等的。
  { id: 'category-user', name: '自定义记号', simple_name: 'User' },
];

let registered = 0;
for (const def of CATEGORY_DEFS) {
  if (get_category(def.id)) continue;
  register_category(def);
  registered++;
}

if (typeof console !== 'undefined') {
  console.info(`[ne/categories] 已注册分类 ${registered} 个（其余已存在）`);
}
