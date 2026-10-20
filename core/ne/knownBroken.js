// ============================================================================
//  core/ne/knownBroken.js — ne 引擎里本身就会抛错的记号 id
// ============================================================================
//  这些记号在 ne 引擎下展开会抛错（与 ne-rewritten 原版逐字同错），界面自动
//  回落到远古实现。清单只有这一份：core/ne/uiBridge.js 用它决定回落，
//  scripts/verify-ne-integration.mjs 用它区分「已知回落」与「新增回归」。
//
//  ⚠ 两个口径，别混：
//    - 只展开一步（tier=1）：抛错的是 6 个（ton-dr/drc/drp/drpc + upms-partial-8/9）；
//    - 按 UI 真实做法连展两步：抛错的是 11 个（TON 家族 9 个 + upms-partial-8/9）。
//  差在 ton-i/ibp/m/mc/mpc —— 它们第一步能过、第二步才崩。
//  所以判定要跑两个脚本：scripts/verify-ne-integration.mjs（单步）与
//  .tmp-ne/verify-uiengine-all.mjs（连展两步）。
// ============================================================================

export const NE_ENGINE_BROKEN_IDS = [
  // TON 家族：9 个全中（按 id 排序）
  'ton-dr',
  'ton-drc',
  'ton-drp',
  'ton-drpc',
  'ton-i',
  'ton-ibp',
  'ton-m',
  'ton-mc',
  'ton-mpc',
  // UPMS partial 高段
  'upms-partial-8',
  'upms-partial-9',
];
