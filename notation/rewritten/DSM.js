// ============================================================================
//  notation/DSM.js — Diagonal Sudden Matrix
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/DSM.ts
//  表达式 = BMS 矩阵（number[][]），显示同 BM：(0,0)(1,1)…
//  id: dsm
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { BM_INFINITY, BM_is_infinity, BM_normalize, BM_normalize_col, boolean_compare, lex_compare, number_compare, Y_FS_variants } = U;

  // ---------- BM 工具（来自 BM.ts） ----------
  function compare(a, b) {
    if (BM_is_infinity(a) || BM_is_infinity(b)) {
      return boolean_compare(BM_is_infinity(a), BM_is_infinity(b));
    }
    return lex_compare(a, b, (x, y) => lex_compare(BM_normalize_col(x), BM_normalize_col(y), number_compare));
  }
  function is_limit(a) {
    return BM_is_infinity(a) || (a.length > 0 && a[a.length - 1].length > 0 && a[a.length - 1][0] > 0);
  }
  function display(m) {
    if (BM_is_infinity(m)) return 'Limit';
    return m.map((col) => '(' + BM_normalize_col(col) + ')').join('');
  }
  function parse(str) {
    if (str.trim() === 'Limit') return BM_INFINITY();
    const re = /\(([^)]*)\)/g;
    const result = [];
    let match;
    while ((match = re.exec(str)) !== null) {
      const inner = match[1].trim();
      if (inner === '') {
        result.push([]);
      } else {
        result.push(inner.split(',').map((s) => parseInt(s.trim(), 10)));
      }
    }
    if (result.length === 0) throw new Error('Illegal BM expression: ' + str);
    for (const col of result) {
      for (const v of col) {
        if (Number.isNaN(v) || v < 0) throw new Error('Illegal BM entry: ' + v);
      }
    }
    return result;
  }

  // ---------- DSM 核心（来自 DSM.ts） ----------
  function generate_limit_matrix(k) {
    const matrix = [[]];
    for (let i = 1; i <= k; i++) {
      const col = [];
      for (let j = i; j >= 1; j--) {
        col.push(j);
      }
      matrix.push(col);
    }
    return matrix;
  }

  function get_predecessor(parentsRM, r, c) {
    if (parentsRM[r][c] !== -1 || r === 0) return null;
    const upRow = r - 1;
    const chainCols = [];
    let currCol = parentsRM[upRow][c];
    while (currCol !== -1) {
      chainCols.push(currCol);
      currCol = parentsRM[upRow][currCol];
    }

    currCol = parentsRM[upRow][c];
    while (currCol !== -1) {
      if (parentsRM[upRow][currCol] !== -1 && parentsRM[r][currCol] === -1) {
        return { r, c: currCol };
      }
      const nextCol = parentsRM[upRow][currCol];
      if (nextCol === -1) {
        return { r: upRow, c: currCol };
      }
      currCol = nextCol;
    }
    return { r: upRow, c };
  }

  function construct_matrix_values(parentsColMajor) {
    const cols = parentsColMajor.length;
    const rows = parentsColMajor[0].length;
    const matrix = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const p = parentsColMajor[c][r];
        if (p === -1) {
          matrix[c][r] = 0;
        } else {
          matrix[c][r] = matrix[p][r] + 1;
        }
      }
    }
    return matrix;
  }

  function generate_expansion(parentsColMajor, badRow, badCol, times, strong) {
    const rows = parentsColMajor[0].length;
    const cols = parentsColMajor.length;
    const lastCol = cols - 1;

    let targetRow = -1;
    for (let r = rows - 1; r >= 0; r--) {
      if (parentsColMajor[lastCol][r] !== -1) {
        targetRow = r;
        break;
      }
    }

    const S = badCol;
    const E = lastCol;
    const segmentDist = E - S;
    let finalParentsMatrix = null;

    const parentsRM = Array.from({ length: rows }, () => Array(cols).fill(-1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        parentsRM[r][c] = parentsColMajor[c][r];
      }
    }

    if (targetRow === badRow) {
      // Small Expansion
      const expandedParents_RM = Array.from({ length: rows }, () => []);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          expandedParents_RM[r].push(parentsRM[r][c]);
        }
      }

      for (let i = 1; i <= times; i++) {
        const shiftAmount = i * segmentDist;
        for (let c = S; c <= E; c++) {
          const newC = c + shiftAmount;
          for (let r = 0; r < rows; r++) {
            const originalParent = parentsRM[r][c];
            let newParent = originalParent;

            if (c === S && r < targetRow) {
              newParent = parentsRM[r][E] + shiftAmount - segmentDist;
            } else if (originalParent >= badCol) {
              newParent = originalParent + shiftAmount;
            }

            while (expandedParents_RM[r].length <= newC) expandedParents_RM[r].push(-1);
            expandedParents_RM[r][newC] = newParent;
          }
        }
      }

      finalParentsMatrix = Array.from({ length: expandedParents_RM[0].length }, () => Array(rows).fill(-1));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < expandedParents_RM[r].length; c++) {
          finalParentsMatrix[c][r] = expandedParents_RM[r][c];
        }
      }
    } else {
      // Full Expansion
      let resultRM = Array.from({ length: rows }, () => Array(cols).fill(-1));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          resultRM[r][c] = parentsRM[r][c];
        }
      }

      // Step 1: Upper part (Rows < targetRow)
      for (let i = 1; i <= times; i++) {
        const shiftAmount = i * segmentDist;
        for (let c = S + 1; c <= E; c++) {
          for (let r = 0; r < rows; r++) {
            const originalParent = parentsRM[r][c];
            let newParentVal = -1;

            if (!(r === targetRow && c === E)) {
              newParentVal = originalParent >= badCol ? originalParent + shiftAmount : originalParent;
            }
            resultRM[r].push(newParentVal);
          }
        }
      }
      const currentCols = resultRM[0].length;

      // Calculate Valid Candidates
      const parentCol = parentsRM[targetRow][lastCol];
      const validCandidates = [];
      let scanNode = { r: targetRow, c: parentCol };
      while (scanNode) {
        if (scanNode.r === badRow && scanNode.c > badCol) {
          validCandidates.push(scanNode);
        }
        const pred = get_predecessor(parentsRM, scanNode.r, scanNode.c);
        if (pred === null) break;
        scanNode = pred;
      }

      // Step 2: Identify Rising and Base Items
      const isRising = Array.from({ length: rows }, () => Array(cols).fill(false));
      const isBase = Array.from({ length: rows }, () => Array(cols).fill(false));

      isRising[badRow][badCol] = true;
      let changed = true;
      while (changed) {
        changed = false;
        for (let r = badRow; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (isRising[r][c]) continue;
            let becomeRising = false;
            if (r === badRow && strong) {
              const lowerParent = badRow > 0 ? parentsRM[badRow - 1][c] : c - 1;
              if (lowerParent !== -1 && isRising[r][lowerParent]) becomeRising = true;
            }
            const p = parentsRM[r][c];
            if (p !== -1 && isRising[r][p]) becomeRising = true;
            if (!becomeRising && r > badRow) {
              const upP = parentsRM[r - 1][c];
              if (upP !== -1 && isRising[r - 1][upP]) becomeRising = true;
            }
            if (!becomeRising && r < rows - 1) {
              if (isRising[r + 1][c]) becomeRising = true;
            }
            if (becomeRising) {
              isRising[r][c] = true;
              changed = true;
            }
          }
        }
      }

      const queueBase = [];
      for (let c = 0; c < cols; c++) {
        if (strong) {
          const lowerParent = badRow > 0 ? parentsRM[badRow - 1][c] : c - 1;
          if (lowerParent === badCol) {
            isBase[badRow][c] = true;
          }
        } else {
          if (parentsRM[badRow][c] === badCol) {
            isBase[badRow][c] = true;
          }
        }
        if (isBase[badRow][c]) {
          queueBase.push(c);
        }
      }
      while (queueBase.length > 0) {
        const currParentCol = queueBase.shift();
        for (let c = 0; c < cols; c++) {
          if (strong) {
            const lowerParent = badRow > 0 ? parentsRM[badRow - 1][c] : c - 1;
            if (lowerParent === currParentCol && !isBase[badRow][c]) {
              isBase[badRow][c] = true;
              queueBase.push(c);
            }
          } else {
            if (parentsRM[badRow][c] === currParentCol && !isBase[badRow][c]) {
              isBase[badRow][c] = true;
              queueBase.push(c);
            }
          }
        }
      }

      // Step 3: Rising Expansion
      const R = targetRow - badRow;
      const C = lastCol - badCol;
      const finalRows = rows + R * times;
      const finalCols = currentCols;

      for (let r = rows; r < finalRows; r++) {
        resultRM.push(Array(finalCols).fill(-1));
      }

      for (let i = 1; i <= times; i++) {
        const rowShift = R * i;
        const colShift = C * i;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (isRising[r][c]) {
              const newR = r + rowShift;
              const newC = c + colShift;
              let val = parentsRM[r][c];
              if (val !== -1) val = val + colShift;
              resultRM[newR][newC] = val;
            }
          }
        }

        for (let c = 0; c < cols; c++) {
          if (isBase[badRow][c]) {
            const newC = c + colShift;

            let baseParent;
            if (strong) {
              baseParent = badRow > 0 ? parentsRM[badRow - 1][c] : c - 1;
            } else {
              baseParent = parentsRM[badRow][c];
            }

            const newBaseParent = baseParent !== -1 ? baseParent + colShift : -1;

            for (let k = 0; k < rowShift; k++) {
              const newR = badRow + k;
              resultRM[newR][newC] = newBaseParent;
            }
          }
        }
      }

      finalParentsMatrix = Array.from({ length: resultRM[0].length }, () => Array(resultRM.length).fill(-1));
      for (let r = 0; r < resultRM.length; r++) {
        for (let c = 0; c < resultRM[0].length; c++) {
          finalParentsMatrix[c][r] = resultRM[r][c];
        }
      }
    }

    return construct_matrix_values(finalParentsMatrix);
  }

  function get_bad_item_info(matrix) {
    if (!matrix || matrix.length === 0) return null;
    const cols = matrix.length;
    const rows = Math.max(...matrix.map((c) => c.length));

    const matrixRM = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        matrixRM[r][c] = r < matrix[c].length ? matrix[c][r] : 0;
      }
    }

    const parentsRM = Array.from({ length: rows }, () => Array(cols).fill(-1));
    for (let c = 1; c < cols; c++) {
      const val = matrixRM[0][c];
      for (let k = c - 1; k >= 0; k--) {
        if (matrixRM[0][k] < val) {
          parentsRM[0][c] = k;
          break;
        }
      }
    }
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = matrixRM[r][c];
        let chainIndex = c;
        while (chainIndex !== null) {
          if (chainIndex !== c && matrixRM[r][chainIndex] < val) {
            parentsRM[r][c] = chainIndex;
            break;
          }
          chainIndex = chainIndex !== -1 ? parentsRM[r - 1][chainIndex] : null;
        }
      }
    }

    let targetRow = -1;
    const targetCol = cols - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (parentsRM[r][targetCol] !== -1) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return null;

    const parentCol = parentsRM[targetRow][targetCol];
    if (parentCol === -1) return null;

    const candidatesPool = [];
    const options = [];
    let currItem = { r: targetRow, c: parentCol };
    candidatesPool.push(currItem);
    options.push(currItem);

    let pred = get_predecessor(parentsRM, currItem.r, currItem.c);
    while (pred !== null) {
      candidatesPool.push(pred);
      currItem = pred;
      pred = get_predecessor(parentsRM, currItem.r, currItem.c);
    }

    candidatesPool.sort((a, b) => b.c - a.c);

    let prevItemForOptions = { r: targetRow, c: targetCol };
    for (const item of candidatesPool) {
      if (item.r < prevItemForOptions.r) {
        options.push(item);
        prevItemForOptions = item;
      }
    }

    const parentsColMajor = Array.from({ length: cols }, () => Array(rows).fill(-1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        parentsColMajor[c][r] = parentsRM[r][c];
      }
    }

    const standardSeg = generate_expansion(parentsColMajor, targetRow, parentCol, 1, true);

    let badItem = null;
    let foundBadItem = false;
    for (const cand of candidatesPool) {
      const candSeg = generate_expansion(parentsColMajor, cand.r, cand.c, 1, true);
      const cmp = compare(candSeg, standardSeg);

      if (cmp < 0) {
        const rightOptions = options.filter((opt) => opt.c > cand.c);
        if (rightOptions.length > 0) {
          rightOptions.sort((a, b) => a.c - b.c);
          badItem = rightOptions[0];
        } else {
          badItem = options[options.length - 1];
        }
        foundBadItem = true;
        break;
      }
    }

    if (!foundBadItem) {
      badItem = options[options.length - 1];
    }

    return { targetRow, parentCol, badItem, parentsColMajor };
  }

  function expand_normal(matrix, times) {
    if (!matrix || matrix.length === 0) return [];

    const cols = matrix.length;
    const isLastColZero = matrix[cols - 1].every((val) => val === 0);
    if (isLastColZero) return matrix.slice(0, cols - 1);

    const info = get_bad_item_info(matrix);
    if (!info) return [];

    const { badItem, parentsColMajor } = info;
    const fullExpandedMatrix = generate_expansion(parentsColMajor, badItem.r, badItem.c, times, false);
    fullExpandedMatrix.pop();
    return BM_normalize(fullExpandedMatrix);
  }

  const variants = Y_FS_variants(expand_normal, BM_is_infinity, generate_limit_matrix, is_limit, display);

  register.push({
    id: 'dsm',
    name: 'Diagonal Sudden Matrix',
    display,
    able: is_limit,
    compare,
    FS: variants.FS,
    FSalter: variants.FS_alter,
    parse,
    init: () => [
      { expr: BM_INFINITY(), low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
    debug: { get_bad_item_info, generate_expansion },
  });
})();
