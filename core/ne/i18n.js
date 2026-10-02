// ============================================================================
//  core/ne/i18n.js — 运行时文案（中文，取自 ne-rewritten 的中文语言包）
// ============================================================================
//  只收录运行时核心会自己产生的文案（展开变体标签、等价显示视图名）。
//  记号的 name / simple_name 在记号定义里给字面量或 { id }，
//  { id } 形式走本表翻译，未命中时原样返回 id。
// ============================================================================

const ZH = {
  // 基本列变体（FS variant）
  'fs-variant.label': '基本列变体:',
  'fs-variant.normal': '短展开',
  'fs-variant.alternative': '长展开',
  'fs-variant.short': 'lnz-1',

  // 等价显示视图名（记号 display_equiv 条目用 { id: 'display.xxx' } 引用）
  'display.index': '标记列标',
  'display.layer': '标记层级',
  'display.index-marked': '显示列标',
  'display.index-simple': '简化标记列标',
  'display.simple': '简化形式',
  'display.btl-m1y-nss-combined': '合并形式',
  'display.veblen-separate': '分离末项',

  // 展开对话框
  'expand.fs-variant': '基本列变体',
};

/** 取文案；未命中返回 key 本身（便于发现漏译）。 */
export function t(key) {
  return ZH[key] ?? key;
}
