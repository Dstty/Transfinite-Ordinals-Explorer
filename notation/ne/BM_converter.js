// ============================================================================
//  notation/ne/BM_converter.js — BMS ↔ 三角 BMS(DBM) 双向转换器（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/BM_converter.ts
//  被 notation/ne/BM.js 以相对路径 import（BM4 / TriangularBM4 / seq_0Y 的
//  'tri BMS' / '1Y' / 'nt BMS' / '0Y' 等价显示都走这里）。
//
//  与 ne 的差异：仅去掉类型注解；算法逐行照搬，未做任何改写。
//  循环 import 说明：BM.ts ↔ BM_converter.ts 互相引用。两边顶层只做函数声明
//  （声明提升），实际调用都发生在运行期，故 ESM 循环下安全。
// ============================================================================
import { is_infinity, normalize, standardize } from './BM.js';

/**
 * 基于祖先列关系的任意 n 行 BMS / 三角 BMS (DBM) 双向转换器。
 *
 * 行号约定：
 * - 矩阵的实际行按 1,2,...,n 编号。另有一个不存储数值的"第 0 行"：
 *   第 0 行中某列元素的祖先列，是它左边的所有列。
 * - 对实际第 r 行（1 <= r <= n）的元素 a：
 *   - 候选父项位于同一行、a 的左边；
 *   - 候选父项所在列，必须是 a 上方（第 r-1 行）元素的某个祖先列；
 *   - 候选父项的值严格小于 a；
 *   - 在满足条件的候选中取最靠右者。
 * a 的祖先链由父项、父项的父项……组成。
 */

class NonStandardExpressionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NonStandardExpressionError';
  }
}

/** 返回最大的实际行号 k（1 起始），满足 column[k] > 0。全零列返回 0。 */
function lastPositiveRow(column) {
  for (let i = column.length - 1; i >= 0; i--) {
    if (column[i] > 0) return i + 1;
  }
  return 0;
}

function incrementPrefix(column, count) {
  if (count < 0 || count > column.length) {
    throw new NonStandardExpressionError(`非法前缀长度：${count}`);
  }
  return column.map((value, index) => (index < count ? value + 1 : value));
}

function decrementPrefix(column, count) {
  if (count < 0 || count > column.length) {
    throw new NonStandardExpressionError(`非法前缀长度：${count}`);
  }
  const result = [...column];
  for (let i = 0; i < count; i++) {
    if (result[i] === 0) {
      throw new NonStandardExpressionError(`列的前 ${count} 项不能全部减一`);
    }
    result[i]--;
  }
  return result;
}

/** 增加实际第 row 行；row 按 1 起始计数。 */
function incrementRow(column, row) {
  if (row < 1 || row > column.length) {
    throw new NonStandardExpressionError(`非法实际行号：${row}`);
  }
  const result = [...column];
  result[row - 1]++;
  return result;
}

/** 将实际第 row 行到第 n 行全部置零。 */
function zeroFromRow(column, row) {
  if (row < 1 || row > column.length + 1) {
    throw new NonStandardExpressionError(`非法清零起始行：${row}`);
  }
  const result = [...column];
  for (let i = row - 1; i < result.length; i++) {
    result[i] = 0;
  }
  return result;
}

function firstRowColumn(value, n) {
  return [value, ...new Array(n - 1).fill(0)];
}

/**
 * 缓存矩阵中每个元素的父项和祖先列集合。
 *
 * 层 0 是人工第 0 行；层 1..n 对应矩阵实际第 1..n 行。
 */
class AncestorIndex {
  constructor(columns) {
    if (columns.length === 0) {
      throw new Error('不能为空矩阵建立祖先关系');
    }
    this.columns = columns;
    this.n = columns[0].length;
    this.columnCount = columns.length;

    this.parents = Array.from({ length: this.n + 1 }, () => new Array(this.columnCount).fill(null));
    this.ancestors = Array.from({ length: this.n + 1 }, () =>
      new Array(this.columnCount).fill(new Set()),
    );

    // 人工第 0 行：祖先是左边所有列；紧邻左列视为第 0 行的直接父项。
    for (let ci = 0; ci < this.columnCount; ci++) {
      this.parents[0][ci] = ci > 0 ? ci - 1 : null;
      this.ancestors[0][ci] = new Set();
      for (let a = 0; a < ci; a++) {
        this.ancestors[0][ci].add(a);
      }
    }

    // 实际第 1..n 行。
    for (let row = 1; row <= this.n; row++) {
      const valueIndex = row - 1;

      for (let ci = 0; ci < this.columnCount; ci++) {
        let parent = null;

        // 上方元素的祖先列都在左边；倒序寻找最靠右的合法父项。
        const candidates = Array.from(this.ancestors[row - 1][ci]).sort((a, b) => b - a);

        for (const candidate of candidates) {
          if (columns[candidate][valueIndex] < columns[ci][valueIndex]) {
            parent = candidate;
            break;
          }
        }

        this.parents[row][ci] = parent;

        if (parent !== null) {
          this.ancestors[row][ci] = new Set([parent, ...this.ancestors[row][parent]]);
        } else {
          this.ancestors[row][ci] = new Set();
        }
      }
    }
  }

  hasAncestorColumn(elementColumn, row, ancestorColumn) {
    return this.ancestors[row][elementColumn].has(ancestorColumn);
  }

  parentIsColumn(elementColumn, row, parentColumn) {
    return this.parents[row][elementColumn] === parentColumn;
  }

  /**
   * 返回从父项开始、由近到远的祖先列号（0 起始列下标）。
   */
  ancestorChain(elementColumn, row) {
    if (row === 0) {
      const chain = [];
      for (let i = elementColumn - 1; i >= 0; i--) chain.push(i);
      return chain;
    }

    const chain = [];
    let current = this.parents[row][elementColumn];
    while (current !== null) {
      chain.push(current);
      current = this.parents[row][current];
    }
    return chain;
  }
}

/** DBM → BMS */
export function triangular_to_BM(matrix) {
  if (is_infinity(matrix)) return matrix;
  if (matrix.length === 0) return matrix;

  const columns = standardize(matrix, 2);
  const n = columns[0].length;
  let index = columns.length - 1;

  while (index >= 0) {
    const x = columns[index];

    // 实际第 n-1 行（Python 下标 n-2）
    if (x[n - 2] > 0) {
      index--;
      continue;
    }

    const k = lastPositiveRow(x);

    if (k + 2 > n) {
      throw new NonStandardExpressionError(`列无法构造前 k+2 行；k=${k}, n=${n}`);
    }

    const y = incrementPrefix(x, k + 1);
    const z = incrementPrefix(y, k + 2);

    const yIndex = index + 1;
    const machineStart = index + 2;

    if (
      yIndex >= columns.length ||
      !columnsEqual(columns[yIndex], y) ||
      machineStart >= columns.length ||
      columnLessThan(columns[machineStart], z)
    ) {
      index--;
      continue;
    }

    const ancestors = new AncestorIndex(columns);
    const xPrime = [];
    let cursor = machineStart;
    let lastStep = null;
    let xEnd;

    while (true) {
      if (cursor >= columns.length || columnLessThan(columns[cursor], z)) {
        xEnd = cursor;
        break;
      }

      const t = columns[cursor];

      // l 可以取 0，但按规则必须满足 l <= k+1。
      const matchingRows = [];
      for (let row = 0; row <= k + 1; row++) {
        if (ancestors.hasAncestorColumn(cursor, row, yIndex)) {
          matchingRows.push(row);
        }
      }

      if (matchingRows.length === 0) {
        throw new NonStandardExpressionError(
          `找不到最大的 l≤k+1，使 t[l] 有祖先在 y：` +
            `x@${index + 1}, y@${yIndex + 1}, ` +
            `t@${cursor + 1}, t=${JSON.stringify(t)}`,
        );
      }

      const l = Math.max(...matchingRows);

      // l=k+1 时直接走继续分支。
      // l<=k 时，只有 t[l+1] 的直接父项位于 x 列，才进入停止分支。
      const stoppedByXParent = l <= k && ancestors.parentIsColumn(cursor, l + 1, index);

      let tPrime = decrementPrefix(t, l);

      if (stoppedByXParent) {
        // 保留第 l+1 行，只把第 l+2 至第 n 行清零。
        tPrime = zeroFromRow(tPrime, l + 2);
      }

      xPrime.push(tPrime);
      cursor++;

      lastStep = {
        column: t,
        l,
        stoppedByXParent,
      };

      if (stoppedByXParent) {
        xEnd = cursor;
        break;
      }
    }

    const nextAfterX = xEnd < columns.length ? columns[xEnd] : null;

    const keepCase1 = nextAfterX !== null && !columnLessThan(nextAfterX, firstRowColumn(z[0], n));

    // 情况 2：机器最后处理的列 t 满足 t[l+1]=0，
    // 并且 t[l] 的直接父项位于 y 列。
    const keepCase2 =
      lastStep !== null &&
      lastStep.column[lastStep.l] === 0 &&
      ancestors.parentIsColumn(xEnd - 1, lastStep.l, yIndex);

    const keepCase3 =
      lastStep !== null && lastStep.stoppedByXParent && lastStep.l + 1 < n && lastStep.column[lastStep.l + 1] > 0;

    const keepOriginalYx = keepCase1 || keepCase2 || keepCase3;

    if (keepOriginalYx) {
      // x, X', y, X, ...
      columns.splice(index + 1, 0, ...xPrime);
    } else {
      // x, X', ...
      columns.splice(index + 1, xEnd - (index + 1), ...xPrime);
    }

    index--;
  }

  return normalize(columns);
}

/** BMS → DBM */
export function BM_to_triangular(matrix, stepLimit = 100_000) {
  if (is_infinity(matrix)) return matrix;
  if (matrix.length === 0) return matrix;

  const columns = standardize(matrix);
  const n = columns[0].length;
  let index = 0;
  let steps = 0;

  while (index < columns.length) {
    steps++;

    if (steps > stepLimit) {
      throw new NonStandardExpressionError('超过转换步数限制；输入可能不是标准表达式，或规则导致了非终止插入');
    }

    const x = columns[index];
    const k = lastPositiveRow(x);

    if (k >= n - 1) {
      index++;
      continue;
    }

    const y = incrementPrefix(x, k + 1);
    const z = incrementRow(y, k + 2);

    const xStart = index + 1;

    if (xStart >= columns.length || columnLessThan(columns[xStart], z)) {
      index++;
      continue;
    }

    let xEnd = xStart;
    while (xEnd < columns.length && !columnLessThan(columns[xEnd], z)) {
      xEnd++;
    }

    const ancestors = new AncestorIndex(columns);
    const xPrime = [];

    for (let cursor = xStart; cursor < xEnd; cursor++) {
      const t = columns[cursor];

      const matchingRows = [];
      for (let row = 0; row <= k + 1; row++) {
        if (ancestors.hasAncestorColumn(cursor, row, index)) {
          matchingRows.push(row);
        }
      }

      if (matchingRows.length === 0) {
        throw new NonStandardExpressionError(
          `找不到最大的 l≤k+1，使 t[l] 有祖先在 x：` +
            `x@${index + 1}, x'@${xStart + 1}, ` +
            `t@${cursor + 1}, t=${JSON.stringify(t)}`,
        );
      }

      let l = Math.max(...matchingRows);
      const isLast = cursor === xEnd - 1;

      if (isLast) {
        // t[l] 位于层 l（允许 l=0）；t[l+1] 是实际第 l+1 行。
        if (l < 0 || l >= n) {
          throw new NonStandardExpressionError(`无法读取 t[l+1]：l=${l}, n=${n}`);
        }

        if (ancestors.parentIsColumn(cursor, l, index) && t[l] === 0) {
          l--;
        }
      }

      if (l < 0) {
        throw new NonStandardExpressionError('最后一列修正使 l 变成负数');
      }

      const tPrime = incrementPrefix(t, l);
      xPrime.push(tPrime);
    }

    const remainder = columns.slice(xEnd);

    const comparisonMatrix = [y, ...xPrime, firstRowColumn(y[0] + 1, n)];

    const insertion = [y, ...xPrime];

    // 总是删除 X。
    columns.splice(xStart, xEnd - xStart);

    if (arraysGreaterThan(comparisonMatrix, remainder)) {
      columns.splice(xStart, 0, ...insertion);
    }

    // 若插入，下一轮正好读取 y。
    index++;
  }

  return normalize(columns);
}

// ---------------------------------------------------------------------------
//  比较辅助
// ---------------------------------------------------------------------------

/** 按 BMS 字典序比较两列：严格小于则为 true */
function columnLessThan(a, b) {
  const maxLen = Math.max(a.length, b.length);
  for (let r = 0; r < maxLen; r++) {
    const av = r < a.length ? a[r] : 0;
    const bv = r < b.length ? b[r] : 0;
    if (av !== bv) return av < bv;
  }
  return false;
}

/** 按 BMS 字典序比较两列是否相等 */
function columnsEqual(a, b) {
  const maxLen = Math.max(a.length, b.length);
  for (let r = 0; r < maxLen; r++) {
    const av = r < a.length ? a[r] : 0;
    const bv = r < b.length ? b[r] : 0;
    if (av !== bv) return false;
  }
  return true;
}

/** 按 BMS 字典序比较两个矩阵：a > b 则为 true（比较矩阵列表中各列） */
function arraysGreaterThan(a, b) {
  const common = Math.min(a.length, b.length);
  for (let i = 0; i < common; i++) {
    const cmp = compareColumnsBM(a[i], b[i]);
    if (cmp !== 0) return cmp > 0;
  }
  return a.length > b.length;
}

/** BMS 列字典序比较：返回负数、0、正数 */
function compareColumnsBM(a, b) {
  const maxLen = Math.max(a.length, b.length);
  for (let r = 0; r < maxLen; r++) {
    const av = r < a.length ? a[r] : 0;
    const bv = r < b.length ? b[r] : 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
