// ============================================================================
//  core/ne/errors.js — 运行时错误类型（移植自 ne-rewritten src/core/errors.ts）
// ============================================================================

/** 单次展开里「连续产出 ≤ 上界」的试展开次数超出阈值时抛出（基本列疑似有误）。 */
export class FsTrialExpansionError extends Error {
  constructor(message) {
    super(message ?? '试展开次数过多');
    this.name = 'FsTrialExpansionError';
  }
}

/**
 * 展开超时：引擎的搜索循环 / 递归链超过用户设定的毫秒上限时抛出。
 *
 * 为什么需要它：JS 是单线程，一个跑不完的循环会把整个页面冻住（用户实测踩到过 ——
 * 模板里 `FS` 的结果不随 i 变化，`generate_fs` 就在原地打转）。
 * 上限只是**兜底**：正常情况下这些循环都很短；见 expander.js 里的说明。
 *
 * ⚠ 覆盖范围是**引擎内部**的循环与递归。记号自己的函数（如 `FS`/`compare`）
 *   内部若死循环，同线程无法抢占 —— 那种情况需要把展开放进 Worker 才能真正隔离。
 */
export class TimeLimitError extends Error {
  constructor(ms) {
    super(`展开超过 ${ms} ms 仍未完成，已中止（可在设置里调整 time_limit）`);
    this.name = 'TimeLimitError';
    this.limit_ms = ms;
  }
}
