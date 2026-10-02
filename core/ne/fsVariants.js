// ============================================================================
//  core/ne/fsVariants.js — 基本列变体（移植自 ne-rewritten src/core/fs_variants.ts）
// ============================================================================
//  一个记号可以有多套基本列：
//    FS        — 普通展开（ne 中文包称「短展开」）
//    FS_alter  — 替代展开（「长展开」）
//    FS_short  — lnz-1
//    FS_equiv  — 自定义变体表 { 任意 id: fn }
//
//  保留键与记号上的裸字段同名：只有裸字段的记号（老写法）也能出现在下拉里。
//  默认变体：有 FS_short 就用 FS_short，否则 FS。
// ============================================================================

import { t } from './i18n.js';

/** 保留键：与记号上的裸字段同名，缺省时由裸字段充当该变体。 */
const RESERVED_KEYS = ['FS', 'FS_alter', 'FS_short'];

/** 取记号上的裸字段（只有保留键有裸字段形式）。 */
function bare_FS(notation, key) {
  if (key === 'FS') return notation.FS;
  if (key === 'FS_alter') return notation.FS_alter;
  if (key === 'FS_short') return notation.FS_short;
  return undefined;
}

/**
 * 该记号实际存在的变体 id：保留键（有裸字段或表项）在前，FS_equiv 的自定义键随后。
 * 不存在的变体不出现在列表里（下拉中直接不显示）。
 */
export function list_FS_variants(notation) {
  const ids = [];
  for (const key of RESERVED_KEYS) {
    if (notation.FS_equiv?.[key] ?? bare_FS(notation, key)) ids.push(key);
  }
  for (const key of Object.keys(notation.FS_equiv ?? {})) {
    if (!ids.includes(key)) ids.push(key);
  }
  return ids;
}

/** 默认变体：lnz-1（FS_short）优先，不存在时回退 FS。 */
export function default_FS_variant(notation) {
  return list_FS_variants(notation).includes('FS_short') ? 'FS_short' : 'FS';
}

/** 当前变体：取该记号记住的选择；无记录或记录已失效时用默认。 */
export function active_FS_variant(settings, notation) {
  const chosen = settings?.FS_active?.[notation.id];
  return chosen && list_FS_variants(notation).includes(chosen) ? chosen : default_FS_variant(notation);
}

/**
 * 取基本列函数：变体表 → 同名裸字段 → 默认变体。
 * 显式给出却不存在的 id（老存档、脚本改过）一律回退默认并打印一次警告。
 */
export function resolve_FS(notation, id) {
  if (id) {
    const found = notation.FS_equiv?.[id] ?? bare_FS(notation, id);
    if (found) return found;
    console.warn(`展开变体 '${id}' 在记号 '${notation.id}' 上不存在，已回退默认变体。`);
  }
  const key = default_FS_variant(notation);
  return notation.FS_equiv?.[key] ?? bare_FS(notation, key) ?? notation.FS;
}

/** 变体在下拉中的显示名：三个保留键走文案表，自定义变体直接显示字段名。 */
export function FS_variant_label(id) {
  if (id === 'FS') return t('fs-variant.normal');
  if (id === 'FS_alter') return t('fs-variant.alternative');
  if (id === 'FS_short') return t('fs-variant.short');
  return id;
}
