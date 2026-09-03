// ============================================================================
//  notation/rewritten/GMS.js — Generalized Matrix System（GMS 家族）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/GMS.ts（算法逐行移植，仅去 TS 类型）
//
//  内容：BMS 脚本版本 × 系统（GBMS / UPMS / LPMS2）× 投影名
//    系统投影记号（每系统 5 个）：
//      ω-P / pQSS / QSS / Full / Weirdly Full
//    n-P 投影族（每系统 n=2..generator.initial=3）：
//      n-P（n-P 记号是 generator 分类生成的族，id 形如
//      BMS-<version>-<system>-n-<n>-P；本移植按 ne-rewritten 默认状态
//      init_generator 语义固定生成 n = start(2) .. initial(3)，不做无限生成）
//
//  表达式 = BMS 矩阵（number[][]），[[Infinity]] = Limit
//  显示 = 矩阵列显示（LPMS2 的 n-P 附 OCN 等价显示仅经 debug 暴露，
//         因为本 GUI 的 register.push 单 display 无法表达 display_equiv）
//
//  依赖（均在 shared.js / window.NEUTILS 中）：
//    U.bind1            —— 对应 utils.ts 的 bind1
//    U.BM_column_display —— 对应 BM.ts 的 column_display
//    U.BM_from_display   —— 对应 BM.ts 的 from_display
//    U.BM_normalize_col  —— 对应 BM.ts 的 normalize_col
// ============================================================================
(() => {
  const U = window.NEUTILS;
  const bind1 = U.bind1;
  const column_display = U.BM_column_display;
  const from_display = U.BM_from_display;
  const normalize_col = U.BM_normalize_col;

  // ---------------------------------------------------------------------------
  // 通用矩阵辅助（GMS.ts 原样）
  // ---------------------------------------------------------------------------
  function bmsIsInfinity(a) {
    return String(a) === String(Infinity);
  }

  function bmsValue(col, row) {
    const value = col && col[row];
    return value === undefined ? 0 : value;
  }

  function bmsRowCount(a) {
    let n = 1;
    for (const col of a) n = Math.max(n, col.length);
    return n;
  }

  function bmsCloneMatrix(a, rows) {
    const n = rows === undefined ? bmsRowCount(a) : rows;
    return a.map((col) => {
      const out = new Array(n);
      for (let r = 0; r < n; r++) out[r] = bmsValue(col, r);
      return out;
    });
  }

  function bmsZeroColumn(n) {
    return new Array(n).fill(0);
  }

  function bmsIsZeroColumn(col, n) {
    const rows = n === undefined ? Math.max(1, col.length) : n;
    for (let r = 0; r < rows; r++) {
      if (bmsValue(col, r) !== 0) return false;
    }
    return true;
  }

  function bmsAddColumns(a, b, n) {
    const out = new Array(n);
    for (let r = 0; r < n; r++) out[r] = bmsValue(a, r) + bmsValue(b, r);
    return out;
  }

  function bmsAddMatrices(a, b, n) {
    if (a.length !== b.length) {
      throw new Error('BMS: 只能对同形矩阵做加法');
    }
    const out = new Array(a.length);
    for (let c = 0; c < a.length; c++) out[c] = bmsAddColumns(a[c], b[c], n);
    return out;
  }

  function bmsScaleMatrix(a, scalar, n) {
    return a.map((col) => {
      const out = new Array(n);
      for (let r = 0; r < n; r++) out[r] = bmsValue(col, r) * scalar;
      return out;
    });
  }

  function bmsColumnCompare(a, b, rows) {
    const n = rows === undefined ? Math.max(a.length, b.length, 1) : rows;
    for (let r = 0; r < n; r++) {
      const av = bmsValue(a, r);
      const bv = bmsValue(b, r);
      if (av !== bv) return av < bv ? -1 : 1;
    }
    return 0;
  }

  function bmsMatrixCompare(a, b) {
    const rows = Math.max(bmsRowCount(a), bmsRowCount(b));
    const common = Math.min(a.length, b.length);
    for (let c = 0; c < common; c++) {
      const cmp = bmsColumnCompare(a[c], b[c], rows);
      if (cmp !== 0) return cmp;
    }
    if (a.length === b.length) return 0;
    return a.length < b.length ? -1 : 1;
  }

  function bmsSuffixCompare(a, b, startRow, rows) {
    for (let r = startRow; r < rows; r++) {
      const av = bmsValue(a, r);
      const bv = bmsValue(b, r);
      if (av !== bv) return av < bv ? -1 : 1;
    }
    return 0;
  }

  /*
   * parents[level][c] is the (level+1)-parent of column c.
   *
   * The 1-parent scans directly left.  For level i+1, traverse the i-parent
   * chain and choose the first ancestor whose suffix beginning at row i+1 is
   * lexicographically smaller.
   */
  function bmsComputeParents(a, rows) {
    const parents = [];
    const p1 = new Array(a.length).fill(-1);
    for (let c = 0; c < a.length; c++) {
      for (let q = c - 1; q >= 0; q--) {
        if (bmsValue(a[q], 0) < bmsValue(a[c], 0)) {
          p1[c] = q;
          break;
        }
      }
    }
    parents.push(p1);

    for (let level = 2; level <= rows; level++) {
      const previous = parents[level - 2];
      const current = new Array(a.length).fill(-1);
      const suffixStart = level - 1;
      for (let c = 0; c < a.length; c++) {
        let p = previous[c];
        while (p !== -1) {
          if (bmsSuffixCompare(a[p], a[c], suffixStart, rows) < 0) {
            current[c] = p;
            break;
          }
          p = previous[p];
        }
      }
      parents.push(current);
    }
    return parents;
  }

  function bmsParent(parents, level, colIndex) {
    if (level < 1 || level > parents.length || colIndex < 0) return -1;
    return parents[level - 1][colIndex];
  }

  function bmsIsAncestor(parents, level, ancestorIndex, colIndex) {
    let p = bmsParent(parents, level, colIndex);
    while (p !== -1) {
      if (p === ancestorIndex) return true;
      p = bmsParent(parents, level, p);
    }
    return false;
  }

  // The unique member of descendant's level-parent chain whose level-parent is
  // ancestor.  If descendant is an immediate child, descendant itself is used.
  function bmsChildAboveAncestor(parents, level, descendant, ancestor) {
    let current = descendant;
    while (current !== -1) {
      const p = bmsParent(parents, level, current);
      if (p === ancestor) return current;
      if (p === -1) return -1;
      current = p;
    }
    return -1;
  }

  function bmsHighestNonzeroRow(col, rows) {
    for (let r = rows - 1; r >= 0; r--) {
      if (bmsValue(col, r) !== 0) return r + 1;
    }
    return 0;
  }

  function bmsMaxEntry(a, rows) {
    let result = 0;
    for (const col of a) {
      for (let r = 0; r < rows; r++) result = Math.max(result, bmsValue(col, r));
    }
    return result;
  }

  function bmsTrimZeroRows(a) {
    if (a.length === 0) return [];
    const rows = bmsRowCount(a);
    const keptRows = [];

    // Remove every row that is identically zero, including zero rows between
    // nonzero rows.  If the whole matrix is zero, retain the first row so a
    // nonempty matrix always remains at least one-row-dimensional.
    for (let r = 0; r < rows; r++) {
      let nonzero = false;
      for (const col of a) {
        if (bmsValue(col, r) !== 0) {
          nonzero = true;
          break;
        }
      }
      if (nonzero) keptRows.push(r);
    }
    if (keptRows.length === 0) keptRows.push(0);

    return a.map((col) => keptRows.map((r) => bmsValue(col, r)));
  }

  function bmsPrepareLimitContext(a) {
    if (a.length === 0) throw new Error('BMS: 空矩阵不是极限表达式');
    const rows = bmsRowCount(a);
    const last = a.length - 1;
    const x = a[last];
    const m = bmsHighestNonzeroRow(x, rows);
    if (m === 0) throw new Error('BMS: 全0末列是后继，不进入极限展开');

    const parents = bmsComputeParents(a, rows);
    const yIndex = bmsParent(parents, m, last);
    if (yIndex === -1) {
      throw new Error('BMS: 末列不存在第' + m + '-父列');
    }
    const y = a[yIndex];
    const d = bmsZeroColumn(rows);
    for (let r = 0; r < m - 1; r++) d[r] = bmsValue(x, r) - bmsValue(y, r);
    const k = bmsHighestNonzeroRow(d, rows);
    const B = bmsCloneMatrix(a.slice(0, yIndex), rows);
    const C = bmsCloneMatrix(a.slice(yIndex + 1, last), rows);
    const APrime = bmsCloneMatrix(a.slice(0, last), rows);
    const yPlusC = bmsCloneMatrix(a.slice(yIndex, last), rows);
    const fs1 = bmsCloneMatrix(APrime, rows).concat([bmsAddColumns(y, d, rows)]);

    return {
      a: bmsCloneMatrix(a, rows),
      rows,
      last,
      x: bmsCloneMatrix([x], rows)[0],
      m,
      parents,
      yIndex,
      y: bmsCloneMatrix([y], rows)[0],
      d,
      k,
      B,
      C,
      APrime,
      yPlusC,
      fs1,
    };
  }

  function bmsBuildGBMSD(ctx) {
    const D = ctx.yPlusC.map(() => bmsZeroColumn(ctx.rows));
    for (let local = 0; local < ctx.yPlusC.length; local++) {
      const global = ctx.yIndex + local;
      for (let row = 1; row <= ctx.k; row++) {
        if (global === ctx.yIndex || bmsIsAncestor(ctx.parents, row, ctx.yIndex, global)) {
          D[local][row - 1] = ctx.d[row - 1];
        }
      }
    }
    return D;
  }

  function bmsBuildProjectionRecurrence(ctx, D, index) {
    if (index === 0) return bmsCloneMatrix(ctx.APrime, ctx.rows);
    if (index === 1) return bmsCloneMatrix(ctx.fs1, ctx.rows);

    const result = bmsCloneMatrix(ctx.APrime, ctx.rows);
    for (let factor = 1; factor <= index - 1; factor++) {
      const shifted = bmsAddMatrices(ctx.yPlusC, bmsScaleMatrix(D, factor, ctx.rows), ctx.rows);
      result.push(...shifted);
    }
    return result;
  }

  /* Build all UPMS objects Y_i, v_i, X_(z',i), and the final D. */
  function bmsBuildUPMSContext(ctx) {
    const h = 2 * bmsMaxEntry(ctx.a, ctx.rows);
    const span = bmsCloneMatrix(ctx.a.slice(ctx.yIndex, ctx.last + 1), ctx.rows); // y++C++x
    const spanLength = span.length;
    const Y = new Array(ctx.k + 1);
    const v = new Array(ctx.k + 1);
    const xCache = new Map();

    function buildAdjustedSuffix(zIndex, level) {
      const key = zIndex + ':' + level;
      if (xCache.has(key)) return bmsCloneMatrix(xCache.get(key), ctx.rows);
      const suffix = bmsCloneMatrix(ctx.a.slice(zIndex, ctx.last + 1), ctx.rows);
      const adjustment = suffix.map(() => bmsZeroColumn(ctx.rows));
      for (let local = 0; local < suffix.length; local++) {
        const spanPosition = zIndex + local - ctx.yIndex;
        for (let row = 1; row < level; row++) {
          if (v[row] && v[row][spanPosition] === 1) {
            adjustment[local][row - 1] = h - bmsValue(ctx.a[zIndex], row - 1);
          }
        }
      }
      const result = bmsAddMatrices(suffix, adjustment, ctx.rows);
      xCache.set(key, result);
      return bmsCloneMatrix(result, ctx.rows);
    }

    // Y_2,...,Y_k.
    for (let level = 2; level <= ctx.k; level++) {
      const zIndex = bmsChildAboveAncestor(ctx.parents, level, ctx.last, ctx.yIndex);
      if (zIndex === -1) throw new Error('UPMS: 无法构造Y_' + level + '中的z');
      const suffix = bmsCloneMatrix(ctx.a.slice(zIndex, ctx.last + 1), ctx.rows);
      const adjustment = suffix.map(() => bmsZeroColumn(ctx.rows));
      for (let local = 0; local < suffix.length; local++) {
        const global = zIndex + local;
        for (let row = 1; row < level; row++) {
          if (global === zIndex || bmsIsAncestor(ctx.parents, row, zIndex, global)) {
            adjustment[local][row - 1] = h - bmsValue(ctx.a[zIndex], row - 1);
          }
        }
      }
      Y[level] = bmsAddMatrices(suffix, adjustment, ctx.rows);
    }

    v[1] = new Array(spanLength).fill(1);
    for (let level = 2; level <= ctx.k; level++) {
      const current = new Array(spanLength).fill(0);
      current[0] = 1;
      current[spanLength - 1] = 1;
      for (let pos = 1; pos < spanLength - 1; pos++) {
        const zIndex = ctx.yIndex + pos;
        if (!bmsIsAncestor(ctx.parents, level, ctx.yIndex, zIndex)) continue;
        if (v[level - 1][pos] === 0) continue;
        const zPrime = bmsChildAboveAncestor(ctx.parents, level, zIndex, ctx.yIndex);
        if (zPrime === -1) continue;
        const X = buildAdjustedSuffix(zPrime, level);
        current[pos] = bmsMatrixCompare(X, Y[level]) < 0 ? 0 : 1;
      }
      v[level] = current;
    }

    const D = ctx.yPlusC.map(() => bmsZeroColumn(ctx.rows));
    for (let row = 1; row <= ctx.k; row++) {
      for (let pos = 0; pos < ctx.yPlusC.length; pos++) {
        D[pos][row - 1] = ctx.d[row - 1] * v[row][pos];
      }
    }

    return { h, span, Y, v, D, buildAdjustedSuffix };
  }

  function bmsFirstDifferentColumn(a, b) {
    const common = Math.min(a.length, b.length);
    const rows = Math.max(bmsRowCount(a), bmsRowCount(b));
    for (let i = 0; i < common; i++) {
      if (bmsColumnCompare(a[i], b[i], rows) !== 0) return i;
    }
    if (a.length !== b.length) return common;
    return common; // equal: the first difference is the external empty column
  }

  function bmsBuildLPMS2X(ctx, upms) {
    const cLength = ctx.C.length;
    const s = new Array(cLength + 1).fill(0); // positions of C++x
    const X = [];

    for (let round = 0; round < cLength; round++) {
      if (s[round] === 1) continue;
      const zIndex = ctx.yIndex + 1 + round;
      const z = ctx.a[zIndex];
      const spanPosition = round + 1; // y is position 0 in y++C++x

      const passesK = bmsParent(ctx.parents, ctx.k, zIndex) === ctx.yIndex && upms.v[ctx.k][spanPosition] === 1;

      if (passesK) {
        let level = -1;
        for (let candidate = 2; candidate <= ctx.k; candidate++) {
          if (bmsParent(ctx.parents, candidate, zIndex) === ctx.yIndex) {
            level = candidate;
            break;
          }
        }

        if (level !== -1) {
          const adjusted = upms.buildAdjustedSuffix(zIndex, level);
          const target = upms.Y[level];
          const difference = bmsFirstDifferentColumn(adjusted, target);
          const wIndex = difference < adjusted.length ? zIndex + difference : ctx.last + 1;

          if (wIndex !== zIndex) {
            let jPrime = -1;

            if (wIndex === ctx.last + 1) {
              // The first differing column is the external empty column.
              // Its first-row value is -1, so it itself is necessarily w'.
              // The column immediately to its left is x, whose 1-based
              // position in C++x is len(C)+1.
              jPrime = cLength + 1;
            } else {
              let search = wIndex;
              for (; search >= ctx.yIndex + 2; search--) {
                if (bmsValue(ctx.a[search], 0) <= bmsValue(z, 0) + 1) {
                  // The column immediately left of w' has 1-based
                  // position j' in C++x.
                  jPrime = search - ctx.yIndex - 1;
                  break;
                }
              }
            }

            if (jPrime !== -1) {
              // Convert s_(i+1),...,s_j' to zero-based indices
              // round+1,...,j'-1.
              for (let q = round + 1; q <= jPrime - 1 && q < s.length; q++) {
                s[q] = 1;
              }
            }
          }
        }
      }

      // D's local position 0 is y, hence C_i uses position round+1.
      X.push(bmsAddColumns(z, upms.D[round + 1], ctx.rows));
    }
    return X;
  }

  function bmsOldFiniteFS(a, index, system) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(system + ': 基本序列下标必须是非负整数');
    }
    if (a.length === 0) return [];

    const rows = bmsRowCount(a);
    const last = a.length - 1;
    if (bmsIsZeroColumn(a[last], rows)) {
      return bmsCloneMatrix(a.slice(0, last), rows);
    }

    const ctx = bmsPrepareLimitContext(a);
    if (index === 0) return bmsCloneMatrix(ctx.APrime, ctx.rows);
    if (index === 1) return bmsCloneMatrix(ctx.fs1, ctx.rows);

    const gbmsD = bmsBuildGBMSD(ctx);
    if (system === 'GBMS' || ctx.k <= 1) {
      return bmsBuildProjectionRecurrence(ctx, gbmsD, index);
    }

    const upms = bmsBuildUPMSContext(ctx);
    if (system === 'UPMS') {
      return bmsBuildProjectionRecurrence(ctx, upms.D, index);
    }

    if (system === 'LPMS2') {
      const X = bmsBuildLPMS2X(ctx, upms);
      const next = bmsCloneMatrix(ctx.fs1, ctx.rows).concat(X);
      return bmsOldFiniteFS(next, index - 1, 'LPMS2');
    }

    throw new Error('BMS: 未知系统 ' + system);
  }

  /* Final common FS adjustment.  Zero-row deletion is enabled only
   * for Full and Weirdly Full, whose row counts are intentionally variable. */
  function bmsMakeFS(system, limitBuilder, trimZeroRows, compareFn) {
    function rawAdjustedFS(a, index) {
      if (bmsIsInfinity(a)) return limitBuilder(index);

      let oldIndex = index;
      if (index >= 2) {
        const old1 = bmsOldFiniteFS(a, 1, system);
        const old2 = bmsOldFiniteFS(a, 2, system);
        if (old2.length <= old1.length) oldIndex = index + 1;
      }
      const result = bmsOldFiniteFS(a, oldIndex, system);
      return trimZeroRows ? bmsTrimZeroRows(result) : result;
    }

    return function FS(a, index) {
      if (!Number.isInteger(index) || index < 0) {
        throw new Error(system + ': 基本序列下标必须是非负整数');
      }

      let result = rawAdjustedFS(a, 0);
      if (index === 0) return result;

      let logicalIndex = 0;
      let rawIndex = 1;
      while (logicalIndex < index) {
        const candidate = rawAdjustedFS(a, rawIndex++);
        if (compareFn(candidate, result) === 0) {
          if (rawIndex > index + 10000) {
            throw new Error(system + ': 基本序列含有过长的重复段');
          }
          continue;
        }
        result = candidate;
        logicalIndex++;
      }
      return result;
    };
  }

  // ---------------------------------------------------------------------------
  // Seven Limit builders
  // ---------------------------------------------------------------------------
  function bmsLimit2P(index) {
    const out = [[0, 0, 0]];
    for (let n = 1; n <= index; n++) out.push([n, n - 1, 1]);
    return out;
  }

  function bmsLimit3P(index) {
    const out = [[0, 0, 0]];
    for (let n = 1; n <= index; n++) {
      const third = Math.min(n, 2);
      out.push([n, n - third, third]);
    }
    return out;
  }

  function bmsLimitNP(n) {
    const out = [[0, 0, 0]];
    return (index) => {
      for (let j = out.length; j <= index; j++) {
        const third = Math.min(j, n - 1);
        out.push([j, j - third, third]);
      }
      return out.slice(0, index + 1);
    };
  }

  function bmsLimitOmegaP(index) {
    const out = [[0, 0, 0]];
    for (let n = 1; n <= index; n++) out.push([n, Math.floor(n / 2), Math.ceil(n / 2)]);
    return out;
  }

  function bmsLimitPQSS(index) {
    const out = [[0, 0, 0, 0]];
    for (let n = 1; n <= index; n++) {
      out.push([n, Math.floor(n / 2), Math.floor((n - 1) / 2), 1]);
    }
    return out;
  }

  function bmsLimitQSS(index) {
    const out = [[0, 0, 0, 0]];
    for (let n = 1; n <= index; n++) {
      out.push([n, Math.floor((n + 1) / 3), Math.floor(n / 3), Math.ceil(n / 3)]);
    }
    return out;
  }

  /*
   * Full columns are generated stage by stage.  Stage r contributes r-1 new
   * columns, so Limit[n] has 1+1+2+...+(n-1)=n(n-1)/2+1 columns.
   * The generated prefix is:
   *   0, 11, 211, 321, 4211, 5311, 6321, 73211, ...
   */
  function bmsLimitFull(index) {
    if (index === 0) return [];
    const out = [new Array(index).fill(0)];
    for (let stage = 2; stage <= index; stage++) {
      const triangular = ((stage - 2) * (stage - 1)) / 2;
      for (let j = 1; j <= stage - 1; j++) {
        const col = [triangular + j];
        for (let r = 1; r <= stage - 1; r++) {
          const value = Math.max(1, stage - r - (r >= j ? 1 : 0));
          col.push(value);
        }
        while (col.length < index) col.push(0);
        out.push(col);
      }
    }
    return out;
  }

  /*
   * Weirdly Full is a sequence of square matrices of increasing dimension:
   *   index 0: 0, 11
   *   index 1: 0, 101, 211
   *   index 2: 0, 1001, 2101, 3111
   *   index 3: 0, 10001, 21001, 31101, 41111
   * and so on.  At index n the matrix has n+2 rows and n+2 columns.
   */
  function bmsLimitWeirdlyFull(index) {
    const rows = index + 2;
    const out = [new Array(rows).fill(0)];
    for (let j = 1; j < rows; j++) {
      const col = [j];
      for (let r = 1; r < rows - 1; r++) {
        col.push(r < j ? 1 : 0);
      }
      col.push(1);
      out.push(col);
    }
    return out;
  }

  const bmsLimitBuilders = {
    '2-P': bmsLimit2P,
    '3-P': bmsLimit3P,
    'ω-P': bmsLimitOmegaP,
    pQSS: bmsLimitPQSS,
    QSS: bmsLimitQSS,
    Full: bmsLimitFull,
    'Weirdly Full': bmsLimitWeirdlyFull,
  };

  function bmsDisplay(a) {
    if (bmsIsInfinity(a)) return 'Limit';
    return a.map(column_display).join('');
  }

  /*
   * Weirdly Full has a display-only abbreviation for the final row:
   *   - final 0: omit the trailing ",0";
   *   - final 1: write the separator as ",," instead of ",".
   * The underlying matrix, comparison and fundamental sequences are unchanged.
   */
  function bmsDisplayWeirdlyFull(a) {
    if (bmsIsInfinity(a)) return 'Limit';

    return a
      .map((col) => {
        if (col.length === 0) return '()';
        const last = col[col.length - 1];
        if (last === 0) {
          return '(' + normalize_col(col.slice(0, -1)) + ')';
        }
        if (last === 1) {
          return '(' + normalize_col(col.slice(0, -1)) + ',,1' + ')';
        }
        return '(' + normalize_col(col) + ')';
      })
      .join('');
  }

  function bmsCompare(a, b) {
    if (bmsIsInfinity(a)) return bmsIsInfinity(b) ? 0 : 1;
    if (bmsIsInfinity(b)) return -1;
    return bmsMatrixCompare(a, b);
  }

  /*
   * Weirdly Full changes dimension at every top-level fundamental-sequence
   * term.  Under zero-padding lexicographic comparison, its listed sequence
   *   0 11, 0 101 211, 0 1001 2101 3111, ...
   * runs in the wrong direction, so ne-rewritten's bounded FS search never
   * terminates on the second click.  For this notation only, matrices of
   * different dimensions are ordered by row count first; matrices with the
   * same row count retain the ordinary matrix lexicographic order.
   */
  function bmsCompareWeirdlyFull(a, b) {
    if (bmsIsInfinity(a)) return bmsIsInfinity(b) ? 0 : 1;
    if (bmsIsInfinity(b)) return -1;
    if (a.length === 0 || b.length === 0) return bmsMatrixCompare(a, b);
    const rowsA = bmsRowCount(a);
    const rowsB = bmsRowCount(b);
    if (rowsA !== rowsB) return rowsA < rowsB ? -1 : 1;
    return bmsMatrixCompare(a, b);
  }

  function bmsIsLimit(a) {
    if (bmsIsInfinity(a)) return true;
    if (a.length === 0) return false;
    return !bmsIsZeroColumn(a[a.length - 1], bmsRowCount(a));
  }

  // ---------------------------------------------------------------------------
  // Compatibility helpers used by the retained LPMS2 OCN display code below.
  // ---------------------------------------------------------------------------
  function lpms2IsInfinity(a) {
    return bmsIsInfinity(a);
  }

  function lpms2CloneMatrix(a) {
    return a.map((col) => [bmsValue(col, 0), bmsValue(col, 1), bmsValue(col, 2)]);
  }

  function lpms2ColumnCompare(a, b) {
    return bmsColumnCompare(a, b, 3);
  }

  function lpms2MatrixCompare(a, b) {
    return bmsMatrixCompare(lpms2CloneMatrix(a), lpms2CloneMatrix(b));
  }

  // 2-P OCN display
  // ---------------------------------------------------------------------------

  function lpms2OcnMatrixEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (lpms2ColumnCompare(a[i], b[i]) !== 0) return false;
    }
    return true;
  }

  // Split A at every column whose first-row entry is 0.  In a standard term,
  // each returned component has first-row value 0 only in its first column.
  function lpms2OcnSplitComponents(a) {
    if (a.length === 0) return [];
    const starts = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i][0] === 0) starts.push(i);
    }

    // A nonstandard matrix should still remain inspectable rather than making
    // the whole notation fail to render.
    if (starts.length === 0 || starts[0] !== 0) {
      return [lpms2CloneMatrix(a)];
    }

    const result = [];
    for (let i = 0; i < starts.length; i++) {
      const end = i + 1 < starts.length ? starts[i + 1] : a.length;
      result.push(lpms2CloneMatrix(a.slice(starts[i], end)));
    }
    return result;
  }

  function lpms2OcnRawMatrix(a) {
    const text = a.map((col) => '(' + col.join(',') + ')').join('');
    return { plain: text, html: text, latex: '\\text{' + text + '}' };
  }

  function lpms2OcnSubscript(basePlain, baseHtml, baseLatex, sub) {
    if (sub === '' || sub === null || sub === undefined) {
      return { plain: basePlain, html: baseHtml, latex: baseLatex };
    }
    return {
      plain: basePlain + '_' + sub,
      html: baseHtml + '<sub>' + sub + '</sub>',
      latex: baseLatex + '_{' + sub + '}',
    };
  }

  function lpms2OcnOneColumn(col) {
    const a = col[1];
    const b = col[2];

    if (a === 0 && b === 0) {
      return { plain: '1', html: '1', latex: '1' };
    }
    if (a === 0 && b === 1) {
      return { plain: 'Ω', html: 'Ω', latex: '\\Omega' };
    }
    if (b === 0 && a > 0) {
      if (a === 1) return { plain: 'α', html: 'α', latex: '\\alpha' };
      return lpms2OcnSubscript('α', 'α', '\\alpha', String(a));
    }
    if (b === 1 && a > 0) {
      if (a === 1) return { plain: 'D', html: 'D', latex: 'D' };
      return lpms2OcnSubscript('D', 'D', 'D', String(a));
    }

    // The supplied OCN rules specify the standard one-column cases b=0,1.
    // Keep any out-of-domain input visible instead of throwing during display.
    return lpms2OcnRawMatrix([col]);
  }

  function lpms2OcnPsiSubscript(firstCol) {
    const a = firstCol[1];
    const b = firstCol[2];

    if (a === 0 && b === 0) return { plain: '', html: '', latex: '' };
    if (a === 0 && b === 1) return { plain: 'α', html: 'α', latex: '\\alpha' };
    if (a === 1 && b === 0) return { plain: 'D', html: 'D', latex: 'D' };

    if (b === 0) {
      return lpms2OcnSubscript('D', 'D', 'D', String(a));
    }
    if (b === 1) {
      const sub = String(a + 1);
      if (a + 1 === 1) return { plain: 'α', html: 'α', latex: '\\alpha' };
      return lpms2OcnSubscript('α', 'α', '\\alpha', sub);
    }

    // Standard 2-P OCN terms are expected to use b=0 or b=1 at a component
    // root.  This fallback is deliberately explicit for malformed input.
    const raw = '(' + a + ',' + b + ')';
    return { plain: raw, html: raw, latex: '\\text{' + raw + '}' };
  }

  // ---------------------------------------------------------------------------
  // N-P OCN symbol mappings.  These are the only symbolic differences from 2-P.
  // ---------------------------------------------------------------------------

  function lpms2OcnNPSymbol(n, index) {
    const base_list = [
      { plain: '', html: '', latex: '' },
      { plain: 'Ω', html: 'Ω', latex: '\\Omega' },
      { plain: 'α', html: 'α', latex: '\\alpha' },
      { plain: 'β', html: 'β', latex: '\\beta' },
      { plain: 'γ', html: 'γ', latex: '\\gamma' },
    ];

    const base =
      n < base_list.length
        ? base_list[n]
        : {
            plain: n + 'P',
            html: n + 'P',
            latex: n + 'P',
          };

    if (index === 1) return base;
    return lpms2OcnSubscript(base.plain, base.html, base.latex, String(index));
  }

  function lpms2OcnMinus(left, right) {
    return {
      plain: left.plain + '-' + right.plain,
      html: left.html + '-' + right.html,
      latex: left.latex + '-' + right.latex,
    };
  }

  function lpms2OcnNPOneColumn(n, col) {
    const a = col[1];
    const b = col[2];

    if (a === 0 && b === 0) {
      return { plain: '1', html: '1', latex: '1' };
    }
    if (a === 0 && b < n) {
      return lpms2OcnNPSymbol(b, 1);
    }
    if (a > 0 && b === 0) {
      return lpms2OcnNPSymbol(n, a);
    }
    if (a > 0 && b < n) {
      return lpms2OcnMinus(lpms2OcnNPSymbol(n, a), lpms2OcnNPSymbol(b, 1));
    }

    return lpms2OcnRawMatrix([col]);
  }

  function lpms2OcnNPPsiSubscript(n, firstCol) {
    const a = firstCol[1];
    const b = firstCol[2];

    if (a === 0 && b === 0) return { plain: '', html: '', latex: '' };
    if (a === 0 && b < n) return lpms2OcnNPSymbol(b + 1, 1);

    if (b < n - 1) {
      return lpms2OcnMinus(lpms2OcnNPSymbol(n, a), lpms2OcnNPSymbol(b + 1, 1));
    }
    if (b === n - 1) {
      return lpms2OcnNPSymbol(n, a + 1);
    }

    const raw = '(' + a + ',' + b + ')';
    return { plain: raw, html: raw, latex: '\\text{' + raw + '}' };
  }

  const lpms2Ocn2PProfile = {
    oneColumn: lpms2OcnOneColumn,
    psiSubscript: lpms2OcnPsiSubscript,
  };

  function lpms2OcnNPProfile(n) {
    return {
      oneColumn: bind1(lpms2OcnNPOneColumn, n),
      psiSubscript: bind1(lpms2OcnNPPsiSubscript, n),
    };
  }

  function lpms2OcnMultiply(term, count) {
    if (term.plain === '1' && term.html === '1') {
      const text = String(count);
      return { plain: text, html: text, latex: text };
    }
    if (count === 1) return term;
    const n = String(count);
    return {
      plain: term.plain + '·' + n,
      html: term.html + '·' + n,
      latex: term.latex + '\\cdot ' + n,
    };
  }

  function lpms2OcnJoinSum(terms) {
    return {
      plain: terms.map((x) => x.plain).join('+'),
      html: terms.map((x) => x.html).join('+'),
      latex: terms.map((x) => x.latex).join('+'),
    };
  }

  function lpms2OcnToStrings(a, profile) {
    if (a.length === 0) {
      return { plain: '0', html: '0', latex: '0' };
    }

    const components = lpms2OcnSplitComponents(a);

    // More than one primitive component means ordinal addition.  Compress only
    // consecutive identical components, exactly as A1·a1 ++ ... ++ An·an.
    if (components.length > 1) {
      const grouped = [];
      for (const component of components) {
        const last = grouped[grouped.length - 1];
        if (last && lpms2OcnMatrixEqual(last.matrix, component)) {
          last.count++;
        } else {
          grouped.push({ matrix: component, count: 1 });
        }
      }
      return lpms2OcnJoinSum(
        grouped.map((group) => lpms2OcnMultiply(lpms2OcnToStrings(group.matrix, profile), group.count)),
      );
    }

    // Exactly one primitive component.
    if (a.length === 1) return profile.oneColumn(a[0]);

    const first = a[0];
    const inner = a.slice(1).map(([x1, x2, x3]) => [x1 - 1, x2, x3]);
    const arg = lpms2OcnToStrings(inner, profile);
    const sub = profile.psiSubscript(first);

    const psiPlain = sub.plain === '' ? 'ψ' : 'ψ_' + sub.plain;
    const psiHtml = sub.html === '' ? 'ψ' : 'ψ<sub>' + sub.html + '</sub>';
    const psiLatex = sub.latex === '' ? '\\psi' : '\\psi_{' + sub.latex + '}';

    return {
      plain: psiPlain + '(' + arg.plain + ')',
      html: psiHtml + '(' + arg.html + ')',
      latex: psiLatex + '\\left(' + arg.latex + '\\right)',
    };
  }

  function makeOcnDisplay(profile) {
    return {
      plain: function (a) {
        if (lpms2IsInfinity(a)) return 'Limit';
        return lpms2OcnToStrings(a, profile).plain;
      },
      html: function (a) {
        if (lpms2IsInfinity(a)) return 'Limit';
        return lpms2OcnToStrings(a, profile).html;
      },
      latex: function (a) {
        if (lpms2IsInfinity(a)) return '\\text{Limit}';
        return lpms2OcnToStrings(a, profile).latex;
      },
    };
  }

  const lpms2OcnDisplay = makeOcnDisplay(lpms2Ocn2PProfile);
  const lpms2Ocn3PDisplay = makeOcnDisplay(lpms2OcnNPProfile(3));

  // ---------------------------------------------------------------------------
  // 2-P OCN deluxe display: mutually recursive t(A) and w(A)
  // ---------------------------------------------------------------------------

  function lpms2DeluxeText(plain, html, latex) {
    return {
      plain: plain,
      html: html === undefined ? plain : html,
      latex: latex === undefined ? plain : latex,
    };
  }

  function lpms2DeluxeRawMatrix(a) {
    return lpms2OcnRawMatrix(a);
  }

  function lpms2DeluxeMatrixKey(a) {
    return JSON.stringify(a);
  }

  function lpms2DeluxeConcatMatrices(parts) {
    const result = [];
    for (const part of parts) {
      for (const col of part) result.push([col[0], col[1], col[2]]);
    }
    return result;
  }

  // Decompose A=A1·a1++...++An·an.  Each Ai is an additive component (its
  // first row is 0 only at its first column), and consecutive equal components
  // are run-length compressed into the natural-number coefficient ai.
  function lpms2DeluxeTerms(a) {
    const components = lpms2OcnSplitComponents(a);
    const terms = [];
    for (const component of components) {
      const previous = terms[terms.length - 1];
      if (previous && lpms2OcnMatrixEqual(previous.matrix, component)) {
        previous.count++;
      } else {
        terms.push({ matrix: lpms2CloneMatrix(component), count: 1 });
      }
    }
    return terms;
  }

  function lpms2DeluxeExpandTerms(terms, start, end) {
    const pieces = [];
    const from = start === undefined ? 0 : start;
    const to = end === undefined ? terms.length : end;
    for (let i = from; i < to; i++) {
      for (let n = 0; n < terms[i].count; n++) {
        pieces.push(terms[i].matrix);
      }
    }
    return lpms2DeluxeConcatMatrices(pieces);
  }

  function lpms2DeluxeIsZeroRoot(a) {
    return a.length === 1 && a[0][0] === 0 && a[0][1] === 0 && a[0][2] === 0;
  }

  function lpms2DeluxeAPrime(a) {
    return a.slice(1).map(([x1, x2, x3]) => [x1 - 1, x2, x3]);
  }

  const lpms2DeluxeEpsilonThreshold = [
    [0, 0, 0],
    [1, 0, 1],
  ];

  // Structural data used by epart(A), rest(A), and logw(A).  The definition is
  // intended for one un-repeated additive component.  For an epsilon point we
  // use epart(A)=A and rest(A)=empty, which is the natural extension needed when
  // such a component occurs inside a larger sum.  For a below-threshold term
  // with no crossing index m, we use the root column as epart and A' as rest so
  // that display remains total on nonstandard/custom input.
  function lpms2DeluxeAnalyzePrimitive(a) {
    const aPrime = lpms2DeluxeAPrime(a);
    const primeTerms = lpms2DeluxeTerms(aPrime);

    let m = -1;
    for (let i = 0; i < primeTerms.length; i++) {
      const currentIsLower = lpms2MatrixCompare(primeTerms[i].matrix, a) < 0;
      const previousIsNotLower = i === 0 || lpms2MatrixCompare(primeTerms[i - 1].matrix, a) >= 0;
      if (currentIsLower && previousIsNotLower) {
        m = i;
        break;
      }
    }

    const epsilon = (primeTerms.length === 0 || m === -1) && lpms2MatrixCompare(a, lpms2DeluxeEpsilonThreshold) >= 0;

    if (epsilon) {
      return {
        epsilon: true,
        aPrime,
        primeTerms,
        m: -1,
        epart: lpms2CloneMatrix(a),
        rest: [],
        logw: lpms2CloneMatrix(a),
      };
    }

    if (m === -1) {
      const epart = a.length === 0 ? [] : [[a[0][0], a[0][1], a[0][2]]];
      const rest = lpms2CloneMatrix(aPrime);
      return {
        epsilon: false,
        aPrime,
        primeTerms,
        m: -1,
        epart,
        rest,
        logw: rest,
      };
    }

    let prefixLength = 0;
    for (let i = 0; i < m; i++) {
      prefixLength += primeTerms[i].matrix.length * primeTerms[i].count;
    }

    const epart = lpms2CloneMatrix(a.slice(0, 1 + prefixLength));
    const rest = lpms2DeluxeExpandTerms(primeTerms, m);
    const pivot = primeTerms[m].matrix;
    const cmp = lpms2MatrixCompare(epart, pivot);
    let logw;

    if (cmp > 0) {
      logw = lpms2DeluxeConcatMatrices([epart, rest]);
    } else if (cmp === 0) {
      const adjusted = primeTerms.map((term, i) => ({
        matrix: lpms2CloneMatrix(term.matrix),
        count: term.count + (i === m ? 1 : 0),
      }));
      logw = lpms2DeluxeExpandTerms(adjusted, m);
    } else {
      logw = lpms2CloneMatrix(rest);
    }

    return {
      epsilon: false,
      aPrime,
      primeTerms,
      m,
      epart,
      rest,
      logw,
    };
  }

  function lpms2DeluxeContext(profile) {
    return {
      profile,
      tCache: new Map(),
      wCache: new Map(),
      tActive: new Set(),
      wActive: new Set(),
    };
  }

  function lpms2DeluxeSingleT(col, ctx) {
    return ctx.profile.oneColumn(col);
  }

  function lpms2DeluxeSingleW(col, ctx) {
    if (col[0] === 0 && col[1] === 0 && col[2] === 0) {
      return lpms2DeluxeText('ω', 'ω', '\\omega');
    }
    return lpms2DeluxeSingleT(col, ctx);
  }

  function lpms2DeluxePsiSubscript(firstCol, ctx) {
    return ctx.profile.psiSubscript(firstCol);
  }

  function lpms2DeluxePsi(firstCol, arg, ctx) {
    const sub = lpms2DeluxePsiSubscript(firstCol, ctx);
    const psiPlain = sub.plain === '' ? 'ψ' : 'ψ_' + sub.plain;
    const psiHtml = sub.html === '' ? 'ψ' : 'ψ<sub>' + sub.html + '</sub>';
    const psiLatex = sub.latex === '' ? '\\psi' : '\\psi_{' + sub.latex + '}';
    return {
      plain: psiPlain + '(' + arg.plain + ')',
      html: psiHtml + '(' + arg.html + ')',
      latex: psiLatex + '\\left(' + arg.latex + '\\right)',
    };
  }

  function lpms2DeluxeSup(base, exponent) {
    return {
      plain: base.plain + '^(' + exponent.plain + ')',
      html: base.html + '<sup>' + exponent.html + '</sup>',
      latex: '{' + base.latex + '}^{' + exponent.latex + '}',
    };
  }

  function lpms2DeluxeProduct(parts) {
    return {
      plain: parts.map((x) => x.plain).join('·'),
      html: parts.map((x) => x.html).join('·'),
      latex: parts.map((x) => x.latex).join('\\cdot '),
    };
  }

  function lpms2DeluxeSum(parts) {
    return lpms2OcnJoinSum(parts);
  }

  function lpms2DeluxeMultiplyString(term, count) {
    return lpms2OcnMultiply(term, count);
  }

  function lpms2DeluxeTImpl(a, ctx) {
    const key = lpms2DeluxeMatrixKey(a);
    if (ctx.tCache.has(key)) return ctx.tCache.get(key);
    if (ctx.tActive.has(key)) return lpms2DeluxeRawMatrix(a);
    ctx.tActive.add(key);

    let result;
    if (a.length === 0) {
      result = lpms2DeluxeText('', '', '');
    } else {
      const terms = lpms2DeluxeTerms(a);
      const oneUnrepeatedTerm = terms.length === 1 && terms[0].count === 1;

      if (!oneUnrepeatedTerm) {
        result = lpms2DeluxeSum(
          terms.map((term) => lpms2DeluxeMultiplyString(lpms2DeluxeTImpl(term.matrix, ctx), term.count)),
        );
      } else if (a.length === 1) {
        result = lpms2DeluxeSingleT(a[0], ctx);
      } else {
        const info = lpms2DeluxeAnalyzePrimitive(a);
        if (info.epsilon) {
          result = lpms2DeluxePsi(a[0], lpms2DeluxeTImpl(info.aPrime, ctx), ctx);
        } else if (!lpms2DeluxeIsZeroRoot(info.epart)) {
          result = lpms2DeluxeWImpl(info.logw, ctx);
        } else {
          result = lpms2DeluxeWImpl(info.rest, ctx);
        }
      }
    }

    ctx.tActive.delete(key);
    ctx.tCache.set(key, result);
    return result;
  }

  function lpms2DeluxeWImpl(a, ctx) {
    const key = lpms2DeluxeMatrixKey(a);
    if (ctx.wCache.has(key)) return ctx.wCache.get(key);
    if (ctx.wActive.has(key)) return lpms2DeluxeRawMatrix(a);
    ctx.wActive.add(key);

    let result;
    if (a.length === 0) {
      result = lpms2DeluxeText('1', '1', '1');
    } else {
      const terms = lpms2DeluxeTerms(a);
      const oneUnrepeatedTerm = terms.length === 1 && terms[0].count === 1;

      if (oneUnrepeatedTerm && a.length === 1) {
        result = lpms2DeluxeSingleW(a[0], ctx);
      } else if (oneUnrepeatedTerm) {
        const info = lpms2DeluxeAnalyzePrimitive(a);
        if (info.epsilon) {
          result = lpms2DeluxePsi(a[0], lpms2DeluxeTImpl(info.aPrime, ctx), ctx);
        } else {
          result = lpms2DeluxeWNonEpsilon(a, terms, ctx);
        }
      } else {
        result = lpms2DeluxeWNonEpsilon(a, terms, ctx);
      }
    }

    ctx.wActive.delete(key);
    ctx.wCache.set(key, result);
    return result;
  }

  function lpms2DeluxeWNonEpsilon(a, terms, ctx) {
    const enriched = terms.map((term) => ({
      matrix: term.matrix,
      count: term.count,
      info: lpms2DeluxeAnalyzePrimitive(term.matrix),
    }));

    // Split into maximal consecutive blocks with equal epart(Ai).
    const blocks = [];
    for (const term of enriched) {
      const previous = blocks[blocks.length - 1];
      if (previous && lpms2OcnMatrixEqual(previous.epart, term.info.epart)) {
        previous.terms.push(term);
      } else {
        blocks.push({
          epart: lpms2CloneMatrix(term.info.epart),
          terms: [term],
        });
      }
    }

    if (blocks.length > 1) {
      const factors = blocks.map((block) => {
        const blockTerms = block.terms.map((term) => ({
          matrix: term.matrix,
          count: term.count,
        }));
        return lpms2DeluxeWImpl(lpms2DeluxeExpandTerms(blockTerms), ctx);
      });
      return lpms2DeluxeProduct(factors);
    }

    const epart = enriched[0].info.epart;
    if (lpms2DeluxeIsZeroRoot(epart)) {
      return lpms2DeluxeSup(lpms2DeluxeText('ω', 'ω', '\\omega'), lpms2DeluxeTImpl(a, ctx));
    }

    const exponentTerms = enriched.map((term) =>
      lpms2DeluxeMultiplyString(lpms2DeluxeWImpl(term.info.rest, ctx), term.count),
    );
    return lpms2DeluxeSup(lpms2DeluxeTImpl(epart, ctx), lpms2DeluxeSum(exponentTerms));
  }

  function lpms2DeluxeT(a, profile) {
    return lpms2DeluxeTImpl(a, lpms2DeluxeContext(profile));
  }

  function lpms2DeluxeW(a, profile) {
    return lpms2DeluxeWImpl(a, lpms2DeluxeContext(profile));
  }

  function makeOcnDeluxeDisplay(profile) {
    return {
      plain: function (a) {
        if (lpms2IsInfinity(a)) return 'Limit';
        if (a.length === 0) return '0';
        return lpms2DeluxeT(a, profile).plain;
      },
      html: function (a) {
        if (lpms2IsInfinity(a)) return 'Limit';
        if (a.length === 0) return '0';
        return lpms2DeluxeT(a, profile).html;
      },
      latex: function (a) {
        if (lpms2IsInfinity(a)) return '\\text{Limit}';
        if (a.length === 0) return '0';
        return lpms2DeluxeT(a, profile).latex;
      },
    };
  }

  const lpms2OcnDeluxeDisplay = makeOcnDeluxeDisplay(lpms2Ocn2PProfile);
  const lpms2Ocn3PDeluxeDisplay = makeOcnDeluxeDisplay(lpms2OcnNPProfile(3));

  function bmsNormalize3ForOcn(a) {
    if (bmsIsInfinity(a)) return a;
    return a.map((col) => [bmsValue(col, 0), bmsValue(col, 1), bmsValue(col, 2)]);
  }

  function bmsWrapOcnDisplay(spec) {
    return {
      plain: (a) => spec.plain(bmsNormalize3ForOcn(a)),
      html: (a) => spec.html(bmsNormalize3ForOcn(a)),
      latex: (a) => spec.latex(bmsNormalize3ForOcn(a)),
    };
  }

  const bms2POcnDisplay = bmsWrapOcnDisplay(lpms2OcnDisplay);
  const bms2POcnDeluxeDisplay = bmsWrapOcnDisplay(lpms2OcnDeluxeDisplay);
  const bms3POcnDisplay = bmsWrapOcnDisplay(lpms2Ocn3PDisplay);
  const bms3POcnDeluxeDisplay = bmsWrapOcnDisplay(lpms2Ocn3PDeluxeDisplay);

  // ---------------------------------------------------------------------------
  // Registration: 三个系统 ×（5 个直接记号 + n-P generator 生成的 n=2..initial）
  // ne-rewritten main.ts 里:
  //   for (const cat of GMS_categories) { register_category(cat); if (cat.generator) init_generator(cat); }
  //   for (const n of GMS_notations) register_notation(n);
  // GMS_categories 的 n-P 分类 generator: { start: 2, initial: 3, create: (n) => makeNPNotation(system, n) }
  // init_generator 语义 = 生成 n = start..gen_state(=initial)。本移植固定 n = 2..3，
  // 不做无限生成（本 GUI 没有 generator 的增量/减量运行时机制）。
  // ---------------------------------------------------------------------------

  const bmsScriptVersion = '20260721-v10-weirdfull-display';

  const systems = ['GBMS', 'UPMS', 'LPMS2'];
  const projectionNames = ['ω-P', 'pQSS', 'QSS', 'Full', 'Weirdly Full'];

  function makeNPNotation(system, n) {
    const limitBuilder = bmsLimitNP(n);
    const ocnProfile = n === 2 ? lpms2Ocn2PProfile : lpms2OcnNPProfile(n);
    const definition = {
      id: 'BMS-' + bmsScriptVersion + '-' + system + '-n-' + n + '-P',
      name: system + ' ' + n + '-P',
      simple_name: n + '-P',
      display: {
        plain: bmsDisplay,
        from_display,
      },
      is_limit: bmsIsLimit,
      compare: bmsCompare,
      FS: bmsMakeFS(system, limitBuilder, false, bmsCompare),
      init: () => [[[Infinity]], []],
      debug: {
        oldFS: (a, index) => bmsOldFiniteFS(a, index, system),
        parents: (a) => bmsComputeParents(a, bmsRowCount(a)),
        context: (a) => bmsPrepareLimitContext(a),
        upmsContext: (a) => {
          const ctx = bmsPrepareLimitContext(a);
          return bmsBuildUPMSContext(ctx);
        },
        lpms2X: (a) => {
          const ctx = bmsPrepareLimitContext(a);
          const upms = bmsBuildUPMSContext(ctx);
          return bmsBuildLPMS2X(ctx, upms);
        },
      },
    };

    // LPMS2 的 n-P 附 OCN / OCN deluxe 等价显示。本 GUI 的 register.push
    // 单 display 无法表达 display_equiv，故挂在 debug 上保留移植代码可达。
    if (system === 'LPMS2') {
      const ocnDisplay = bmsWrapOcnDisplay(makeOcnDisplay(ocnProfile));
      const ocnDeluxeDisplay = bmsWrapOcnDisplay(makeOcnDeluxeDisplay(ocnProfile));
      definition.display_equiv = {
        [n + '-P OCN']: ocnDisplay,
        [n + '-P OCN deluxe']: ocnDeluxeDisplay,
      };
      definition.debug.ocnDisplay = ocnDisplay;
      definition.debug.ocnDeluxeDisplay = ocnDeluxeDisplay;
    }

    return definition;
  }

  // 本文件自有的 21 个注册目标：先全部构造，再统一 register.push，
  // 与 ne-rewritten「先 categories/generator、后 notations」的集合等价。
  const definitions = [];

  // —— generator 分类（n-P）：n = generator.start(2) .. generator.initial(3) ——
  for (const system of systems) {
    for (let n = 2; n <= 3; n++) {
      definitions.push(makeNPNotation(system, n));
    }
  }

  // —— GMS_notations：每系统 5 个投影记号 ——
  for (const system of systems) {
    for (const projectionName of projectionNames) {
      const limitBuilder = bmsLimitBuilders[projectionName];
      const compareFn = projectionName === 'Weirdly Full' ? bmsCompareWeirdlyFull : bmsCompare;
      definitions.push({
        id: 'BMS-' + bmsScriptVersion + '-' + system + '-' + projectionName.replace('ω', 'omega'),
        name: system + ' ' + projectionName,
        simple_name: projectionName,
        display: {
          plain: projectionName === 'Weirdly Full' ? bmsDisplayWeirdlyFull : bmsDisplay,
          from_display,
        },
        is_limit: bmsIsLimit,
        compare: compareFn,
        FS: bmsMakeFS(
          system,
          limitBuilder,
          projectionName === 'Full' || projectionName === 'Weirdly Full',
          compareFn,
        ),
        init: () => [[[Infinity]], []],
        debug: {
          oldFS: (a, index) => bmsOldFiniteFS(a, index, system),
          parents: (a) => bmsComputeParents(a, bmsRowCount(a)),
          context: (a) => bmsPrepareLimitContext(a),
          upmsContext: (a) => {
            const ctx = bmsPrepareLimitContext(a);
            return bmsBuildUPMSContext(ctx);
          },
          lpms2X: (a) => {
            const ctx = bmsPrepareLimitContext(a);
            const upms = bmsBuildUPMSContext(ctx);
            return bmsBuildLPMS2X(ctx, upms);
          },
        },
      });
    }
  }

  // 适配本 GUI 的 register 条目（单 display 函数 + parse + init 根结构）
  function register_def(def) {
    const display = def.display.plain;
    const parse = def.display.from_display;
    const debug = Object.assign({}, def.debug);
    if (def.display_equiv) debug.display_equiv = def.display_equiv;
    register.push({
      id: def.id,
      name: def.name,
      display,
      able: def.is_limit,
      compare: def.compare,
      FS: def.FS,
      parse,
      init: () => [
        { expr: [[Infinity]], low: [[]], subitems: [] },
        { expr: [], low: [[]], subitems: [] },
      ],
      debug,
    });
  }
  for (const def of definitions) register_def(def);

  // —— 家族注册表：GMS 的 n-P 族（每系统 n 支持 2..100；>100 报错）——
  // 输入形式：GBMS 30-P / gbms30-p / LPMS2 n-30-P 等（归一化小写无空格）
  window.NOTATION_FAMILIES = window.NOTATION_FAMILIES || [];
  for (const system of systems) {
    const sysLower = system.toLowerCase();
    const sysAliases = { gbms: ['gbms'], upms: ['upms'], lpms2: ['lpms2', 'lpms'] }[sysLower] || [sysLower];
    window.NOTATION_FAMILIES.push({
      family: 'gms-np-' + sysLower,
      label: system + ' n-P',
      start: 2,
      max: 100,
      match(lower) {
        const prefix = sysAliases.join('|');
        const m = new RegExp('^(' + prefix + ')(?:n-)?(\\d{1,3})-?p').exec(lower);
        return m ? { n: parseInt(m[2], 10), len: m[0].length } : null;
      },
      idFor: (n) => 'BMS-' + bmsScriptVersion + '-' + system + '-n-' + n + '-P',
      ensure(n) {
        const id = this.idFor(n);
        if (!window.register.some((x) => x.id === id)) {
          const def = makeNPNotation(system, n);
          // 把 def 的 display 适配成 register（与上方 register_def 相同逻辑）
          register_def(def);
        }
        return id;
      },
    });
  }
})();
