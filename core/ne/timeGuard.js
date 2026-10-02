// ============================================================================
//  core/ne/timeGuard.js — 给「不归我们管的引擎」加毫秒上限
// ============================================================================
//  背景：core/engine.js（远古引擎）文件头写着「严禁任何修改，需用户明确确认」。
//  但它和 ne 引擎一样有「不递减的沿链递归」（expandTier 用同一 depth 递归），
//  基本列不收敛时会把页面冻死。用户要求「卡死是不允许的，要有 5000ms 上限」。
//
//  解法：不改引擎，改**记号**。引擎每走一步都会调用
//  `able / semiable / compare / FS / FSalter`，所以把这些函数包装一层、
//  每次被调用时查一次时钟，就能兜住引擎内部的搜索循环与递归链。
//
//  代价：每次调用多一次 Date.now()（几十 ns，可忽略）。
//
//  ⚠ 覆盖范围：记号自己的函数内部若死循环，同一线程无法抢占 ——
//    那需要把展开放进 Worker 才能真正隔离。
// ============================================================================
import { TimeLimitError } from './errors.js';

/**
 * 包装记号，使引擎的每一步都检查期限。
 * @param {object} notation 远古接口的记号对象
 * @param {number} ms 毫秒上限（<=0 表示不限制，原样返回）
 * @returns {object} 包装后的记号（属性浅拷贝，仅替换那几个函数）
 */
export function with_deadline(notation, ms) {
  const limit = Number(ms);
  if (!(limit > 0) || !notation) return notation;

  const until = Date.now() + limit;
  const check = () => {
    if (Date.now() > until) throw new TimeLimitError(limit);
  };
  const wrap = (fn) => (typeof fn === 'function' ? (...args) => { check(); return fn(...args); } : fn);

  return {
    ...notation,
    able: wrap(notation.able),
    semiable: wrap(notation.semiable),
    compare: wrap(notation.compare),
    FS: wrap(notation.FS),
    FSalter: wrap(notation.FSalter),
  };
}
