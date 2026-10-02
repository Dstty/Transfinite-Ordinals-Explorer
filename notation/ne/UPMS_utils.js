// ============================================================================
//  notation/ne/UPMS_utils.js — UPMS 本体与 (>n)-UPMS 家族的共用算法层
// ============================================================================
//  来源：ne-rewritten 快照 d2d79cd
//    src/notations/BM-like/UPMS.ts（同一文件里既有 UPMS 本体，也有 partial_UPMS 家族）
//
//  为什么抽出本模块
//  ----------------
//  UPMS.ts 的 `expand` 与它依赖的 8 个内部工具（make_context / is_ancestor /
//  last_column_is_zero / find_LNZ_index / find_bad_root / compute_delta /
//  compare_marked_matrix / compute_UPMS_verification_roots）在源文件里被**两个**
//  记号共用：UPMS 本体用 `bind3(expand, 1)`，partial_UPMS(n) 用 `bind3(expand, n)`。
//  本项目的 notation/ne/partial-UPMS.js 先搬家族时把这 9 个函数内联了一份；
//  补搬 UPMS 本体时若再抄一份就是两份实现（PORTING-GUIDE「共享函数抽公共模块、
//  不要多份拷贝」）。故按 notation/ne/SDBMS_utils.js / UPMN_utils.js 的既有先例
//  抽出本模块：**唯一定义处**，两个记号文件都从它 import。
//
//  函数体与 UPMS.ts 逐行一致（仅去类型注解：Context / Expr / MarkedMatrix 接口与
//  标注、`Array<number>(...)` 的类型实参、`let x: number | undefined` 的联合类型）。
//  运算顺序、常量、默认参数（bm_threshold = 1 / shorter = true）零改动。
//
//  导出面说明：在源文件里这 9 个函数都是模块私有；拆成独立模块后必须跨模块引用，
//  故一并 export（不改函数体）。当前使用方：
//    UPMS.js        → expand
//    partial-UPMS.js → expand
//  其余 8 个是 expand 的内部依赖，一并导出以便同族记号（如将来 GMS / TUPMS 侧）
//  复用，避免再次内联。
//
//  表达式表示：Expr = number[][]（列 = 行数组，列高可不等，standardize 后等）。
// ============================================================================
import { normalize, parents, standardize } from './BM.js';
import {
  boolean_compare,
  lex_compare,
  lex_compare_by,
  number_compare,
  tuple_lex_compare_by,
} from '../../core/ne/utils.js';

function make_context(matrix) {
  const m = standardize(matrix);
  const colCount = m.length;
  const rowCount = colCount === 0 ? 0 : m[0].length;
  const P = parents(m);
  return { m, colCount, rowCount, P };
}

function is_ancestor(ctx, jCol, target, b) {
  let current = jCol;
  while (current >= target) {
    if (current === target) return true;
    current = ctx.P[current][b];
    if (current === undefined) break;
  }
  return false;
}

function last_column_is_zero(matrix) {
  if (matrix.length === 0) return true;
  const last = matrix[matrix.length - 1];
  for (let r = 0; r < last.length; r++) {
    if (last[r] !== 0) return false;
  }
  return true;
}

function find_LNZ_index(matrix) {
  if (matrix.length === 0) return -1;
  const last_col = matrix[matrix.length - 1];
  for (let r = last_col.length - 1; r >= 0; r--) {
    if (last_col[r] !== 0) return r;
  }
  return -1;
}

function find_bad_root(ctx) {
  const lastCol = ctx.colCount - 1;
  const t = find_LNZ_index(ctx.m);
  if (t === -1) return null;
  const rootCol = ctx.P[lastCol][t];
  if (rootCol === undefined) return null;
  return { r: rootCol, t };
}

function compute_delta(ctx, rootCol, t) {
  const lastCol = ctx.colCount - 1;
  const delta = new Array(ctx.rowCount);
  for (let r = 0; r < ctx.rowCount; r++) delta[r] = r >= t ? 0 : ctx.m[lastCol][r] - ctx.m[rootCol][r];
  return delta;
}

function compare_marked_matrix(a, b) {
  return lex_compare(a, b, lex_compare_by(tuple_lex_compare_by([boolean_compare, number_compare])));
}

function compute_UPMS_verification_roots(ctx, rootCol, t, bm_threshold = 1) {
  const m = ctx.m;
  const alpha = ctx.colCount - 1;
  const y = rootCol;
  const height = ctx.rowCount;
  const P = ctx.P;

  const vr = Array(alpha).fill(0);

  function get_VR(c, row) {
    return row < vr[c];
  }

  function get_base(c, k) {
    return Array.from({ length: k + 2 }, (_, r) => m[c][r] + (r <= k ? 1 : 0));
  }

  const transformed_X_value = (source, row, iCol, k) => {
    let value = m[source][row];
    let mark = row < k && get_VR(source, row);
    if (mark) value -= m[iCol][row];
    return [mark, value];
  };

  const transformed_Y_value = (source, row, jCol, k) => {
    let value = m[source][row];
    let mark = false;
    if (row < k) {
      const colIsJ = source === jCol;
      const containsJ = is_ancestor(ctx, source, jCol, row);
      if (colIsJ || containsJ) {
        mark = true;
        value -= m[jCol][row];
      }
    }
    return [mark, value];
  };

  function compute_transformed_X(c, k) {
    let u = undefined;
    const base = get_base(c, k);
    for (let candidate = c + 1; candidate <= alpha; candidate++) {
      if (lex_compare(m[candidate], base, number_compare) < 0) {
        u = candidate;
        break;
      }
    }
    if (u === undefined) return null;
    const result = [];
    for (let l = c; l < u; l++) {
      result.push(Array.from({ length: height }, (_, row) => transformed_X_value(l, row, c, k)));
    }
    return result;
  }

  function compute_transformed_Y(k) {
    let a = alpha;
    while (a !== undefined && m[a][k] !== m[y][k] + 1) a = P[a][k];
    if (a === undefined) a = alpha;
    const result = [];
    for (let l = a; l <= alpha; l++) {
      result.push(Array.from({ length: height }, (_, row) => transformed_Y_value(l, row, a, k)));
    }
    return result;
  }

  for (let row = 0; row < t; row++) {
    for (let col = y; col < alpha; col++) {
      if (col === y || row === 0) {
        vr[col]++;
        continue;
      }
      if (vr[col] !== row) {
        // vr[col] += 0;
        continue;
      }
      const parent = P[col][row];
      if (parent === undefined || parent < y || !get_VR(parent, row)) {
        // vr[col] += 0;
        continue;
      }
      if (parent !== y || row < bm_threshold) {
        vr[col]++;
        continue;
      }
      let higher_parent_escapes_bad_root = false;
      for (let vRow = row + 1; vRow <= t; vRow++) {
        if (P[col][vRow] !== y) {
          higher_parent_escapes_bad_root = true;
          break;
        }
      }
      if (higher_parent_escapes_bad_root) {
        // vr[col] += 0;
        continue;
      }
      const transformed_X = compute_transformed_X(col, row);
      if (transformed_X === null) {
        vr[col]++;
        continue;
      }
      const transformed_Y = compute_transformed_Y(row);
      const cmp = compare_marked_matrix(transformed_X, transformed_Y);
      if (cmp >= 0) vr[col]++;
    }
  }
  return vr;
}

function expand(matrix, index, bm_threshold = 1, shorter = true) {
  const ctx = make_context(matrix);
  const m = ctx.m;
  const n = Math.max(0, Math.floor(index));
  if (m.length === 0) return [];
  if (last_column_is_zero(m)) return m.slice(0, -1);
  const badRoot = find_bad_root(ctx);
  if (badRoot === null) return [];
  const { r, t } = badRoot;
  const alpha = ctx.colCount - 1;
  const delta = compute_delta(ctx, r, t);
  const vr = compute_UPMS_verification_roots(ctx, r, t, bm_threshold);
  const result = [...m.slice(0, alpha)];
  for (let w = 1; w <= n + 1; w++) {
    if (shorter && w > n) break;
    for (let j = r; j < alpha; j++) {
      let result_col = [...m[j]];
      for (let k = 0; k < vr[j]; k++) result_col[k] += delta[k] * w;
      result.push(result_col);
      if (w > n) break;
    }
  }
  return normalize(result);
}

// ---------------------------------------------------------------------------
//  跨记号文件引用（拆模块后必需的导出面；函数体与原文件完全一致）
// ---------------------------------------------------------------------------
export {
  compare_marked_matrix,
  compute_UPMS_verification_roots,
  compute_delta,
  expand,
  find_LNZ_index,
  find_bad_root,
  is_ancestor,
  last_column_is_zero,
  make_context,
};
