// ============================================================================
//  ui/scrollFollow.js — 焦点移动时「屏幕跟不跟、跟到哪」的纯计算
// ============================================================================
//  用户要求（原话）：按上下键时屏幕是否跟着动 —— 只有到边界才跟着动，还是始终跟着动
//  （一直把被编辑行放到中上位置 / 中间 / 顶部）。
//
//  这里只做几何计算（给定滚动容器与目标元素的矩形 → 该滚多少），不碰 DOM，
//  所以可以独立测试（.tmp-ne/verify-scroll-follow.mjs）。
//
//  模式：
//    'off'     不跟随（屏幕不动，节点可能跑出视野）
//    'edge'    仅当目标不在可视区内时才滚，滚到"刚好看得见"（留一点边距）
//    'center'  始终把目标放到容器竖直中间
//    'upper'   始终放到偏上（约 1/3 处）——「中上位置」
//    'top'     始终放到顶部（留一点边距）
// ============================================================================

export const SCROLL_MODES = ['edge', 'center', 'upper', 'top', 'off'];

export const SCROLL_MODE_LABELS = {
  edge: '仅到边界才跟随',
  center: '始终跟随 · 放到中间',
  upper: '始终跟随 · 放到中上',
  top: '始终跟随 · 放到顶部',
  off: '不跟随（屏幕不动）',
};

const EDGE_PAD = 12; // 「看得见」的边距

/**
 * 计算滚动增量。
 * @param {{top:number, height:number}} box 滚动容器相对视口的矩形（top + clientHeight）
 * @param {{top:number, height:number}} el 目标元素相对视口的矩形
 * @param {string} mode SCROLL_MODES 之一
 * @returns {number} 需要加到 scrollTop 上的增量（0 = 不动）
 */
export function compute_scroll_delta(box, el, mode) {
  if (mode === 'off' || !mode) return 0;
  const boxH = box.height;
  const elTop = el.top - box.top; // 目标相对容器可视区顶部的偏移
  const elH = el.height;

  if (mode === 'edge') {
    if (elTop >= EDGE_PAD && elTop + elH <= boxH - EDGE_PAD) return 0; // 已可见
    if (elTop < EDGE_PAD) return elTop - EDGE_PAD; // 上方被遮 → 上滚
    return elTop + elH - (boxH - EDGE_PAD); // 下方被遮 → 下滚
  }

  // 三种「始终跟随」：把元素顶端挪到目标比例处
  const ratio = mode === 'top' ? 0 : mode === 'upper' ? 1 / 3 : 1 / 2;
  const wantTop = mode === 'top' ? EDGE_PAD : boxH * ratio - elH / 2;
  const delta = elTop - wantTop;
  // 已经基本到位就不动，避免每次按键都微调、画面抖动
  return Math.abs(delta) < 1 ? 0 : delta;
}

/** 便于 UI 显示：模式的下拉/按钮文案。 */
export function scroll_mode_label(mode) {
  return SCROLL_MODE_LABELS[mode] || SCROLL_MODE_LABELS.edge;
}
