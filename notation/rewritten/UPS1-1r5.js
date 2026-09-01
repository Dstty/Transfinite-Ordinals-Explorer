// ============================================================================
//  notation/UPS1-1r5.js — Upward Projection Sequence 1.1r5
// ============================================================================
//  移植自 ne-rewritten: src/notations/OCN/UPS1_1r5.ts
//  表达式 = Entry[]，Entry = { value: number; starred: boolean }
//  显示 = 逗号分隔序列，星号项带 * 后缀
//  id: ups1.1r5
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { boolean_compare, compare_by, deepcopy, lex_compare, number_compare, object_lex_compare_by, sequence_FS_variants } = U;

  const INFINITY = Infinity;
  function is_infinity(e) {
    return e === INFINITY;
  }
  function infinity_FS(index) {
    return Array.from({ length: index }, (_, i) => ({ value: i, starred: i >= 2 }));
  }

  // ---------- 解析 / 格式化 ----------
  function parseSequence(str) {
    if (!str.trim()) return [];
    const parts = str.split(',').map((s) => s.trim());
    return parts.map((part) => {
      let starred = false;
      if (part.endsWith('*')) {
        starred = true;
        part = part.slice(0, -1);
      }
      const value = parseInt(part, 10);
      if (isNaN(value)) throw new Error(`无效数字: ${part}`);
      return { value, starred };
    });
  }
  function formatSequence(seq) {
    if (is_infinity(seq)) return 'Limit';
    return seq.map((item) => (item.starred ? item.value + '*' : '' + item.value)).join(', ');
  }
  function extractValues(seq) {
    return seq.map((item) => item.value);
  }

  // ---------- 基础算法 ----------
  function computeLeftLess(values) {
    const n = values.length;
    const leftLess = new Array(n).fill(-1);
    const stack = [];
    for (let i = 0; i < n; i++) {
      while (stack.length && values[stack[stack.length - 1]] >= values[i]) stack.pop();
      leftLess[i] = stack.length ? stack[stack.length - 1] : -1;
      stack.push(i);
    }
    return leftLess;
  }
  function getAncestorChain(seq, leftLess) {
    const chain = [];
    let idx = seq.length - 1;
    while (idx !== -1) {
      chain.push(idx);
      if (idx === 0) break;
      idx = leftLess[idx];
    }
    chain.reverse();
    return chain;
  }
  function getDirectItemSet(seq, leftLess, startIdx) {
    const n = seq.length;
    const directSet = new Set();
    directSet.add(startIdx);
    for (let j = startIdx + 1; j < n; j++) {
      const parent = leftLess[j];
      if (parent === -1) continue;
      if (seq[j].starred && directSet.has(parent)) {
        directSet.add(j);
      }
    }
    return directSet;
  }
  function getDirectSegmentIndices(seq, leftLess, startIdx) {
    const directSet = getDirectItemSet(seq, leftLess, startIdx);
    if (directSet.size === 0) return [startIdx];
    const maxDirectIdx = Math.max(...directSet);
    let candidateIdx = -1;
    let candidateValue = Infinity;
    for (let i = maxDirectIdx + 1; i < seq.length; i++) {
      if (!directSet.has(i)) {
        const parent = leftLess[i];
        if (parent !== -1 && directSet.has(parent)) {
          const val = seq[i].value;
          if (val < candidateValue) {
            candidateValue = val;
            candidateIdx = i;
          }
        }
      }
    }
    if (candidateIdx !== -1) {
      const stopIdx = candidateIdx > maxDirectIdx ? candidateIdx : maxDirectIdx;
      const segment = [];
      for (let i = startIdx; i <= stopIdx; i++) segment.push(i);
      return segment;
    } else {
      const segment = [];
      for (let i = startIdx; i <= maxDirectIdx; i++) segment.push(i);
      return segment;
    }
  }
  function getDirectSegmentAsSeq(seq, leftLess, startIdx) {
    return getDirectSegmentIndices(seq, leftLess, startIdx).map((i) => deepcopy(seq[i]));
  }
  function getDirectSegmentRange(seq, leftLess, startIdx) {
    const indices = getDirectSegmentIndices(seq, leftLess, startIdx);
    if (indices.length === 0) return { start: startIdx, end: startIdx };
    return { start: indices[0], end: indices[indices.length - 1] };
  }
  function ensureLastStarred(seq) {
    const newSeq = deepcopy(seq);
    if (newSeq.length && !newSeq[newSeq.length - 1].starred) newSeq[newSeq.length - 1].starred = true;
    return newSeq;
  }
  function sequenceOffset(seq, offset) {
    return seq.map((item) => ({ value: item.value + offset, starred: item.starred }));
  }
  function normalize(seq) {
    if (!seq.length) return [];
    const base = seq[0].value;
    return sequenceOffset(seq, -base);
  }
  function getSubsequence(seq, chain, k) {
    const start = chain[k];
    const sub = deepcopy(seq.slice(start));
    if (sub.length) sub[0].starred = false;
    return sub;
  }

  // ---------- 投影比较 ----------
  function compareProjectionRaw(a, b) {
    const a2 = ensureLastStarred(a),
      b2 = ensureLastStarred(b);
    const vA = extractValues(a2),
      vB = extractValues(b2);
    const llA = computeLeftLess(vA),
      llB = computeLeftLess(vB);
    const chainA = getAncestorChain(a2, llA),
      chainB = getAncestorChain(b2, llB);
    const sA = chainA.length - 1,
      sB = chainB.length - 1;
    if (sA !== sB) return sA - sB;
    if (sA === 0) return 0;

    const subA = getSubsequence(a2, chainA, sA - 1),
      subB = getSubsequence(b2, chainB, sB - 1);
    const normA = normalize(subA),
      normB = normalize(subB);
    return compare(normA, normB);
  }
  function isDirectSegmentLess(a, b) {
    const a2 = normalize(ensureLastStarred(a));
    const b2 = normalize(ensureLastStarred(b));
    return compare(a2, b2) < 0;
  }

  // ---------- 父段映射 ----------
  function buildParentSegmentMap(seq, leftLess) {
    const n = seq.length;
    const parentSegment = new Map();
    for (let i = 0; i < n; i++) {
      if (seq[i].starred) continue;
      let p = leftLess[i];
      while (p !== -1 && seq[p].starred) {
        p = leftLess[p];
      }
      if (p !== -1) {
        parentSegment.set(i, p);
      } else {
        parentSegment.set(i, -1);
      }
    }
    return parentSegment;
  }

  // ---------- Dropping 祖先 ----------
  function getDroppingAncestor(startIdx, seq, leftLess, parentSegmentMap) {
    const directSeg = getDirectSegmentAsSeq(seq, leftLess, startIdx);
    if (directSeg.length === 1) {
      return startIdx;
    }
    let current = startIdx;
    let best = current;
    let refIdx = current;
    while (true) {
      const parent = parentSegmentMap.get(current);
      if (parent === -1 || parent === undefined) break;
      const parentSeg = getDirectSegmentAsSeq(seq, leftLess, parent);
      const refSeg = getDirectSegmentAsSeq(seq, leftLess, refIdx);
      if (isDirectSegmentLess(refSeg, parentSeg)) {
        current = parent;
        continue;
      }
      const cmp = compareProjectionRaw(parentSeg, refSeg);
      if (cmp > 0) {
        best = parent;
        refIdx = parent;
        current = parent;
      } else {
        break;
      }
    }
    return best;
  }
  function getRealBadRoot(seq, leftLess, candidateIdx) {
    const seg = getDirectSegmentIndices(seq, leftLess, candidateIdx);
    return seg.length ? seg[seg.length - 1] : candidateIdx;
  }

  // ---------- 坏根查找 ----------
  function findBadRoot(seq, leftLess) {
    const chain = getAncestorChain(seq, leftLess);
    const directAncestors = chain.filter((idx) => !seq[idx].starred);
    if (directAncestors.length === 0) return 0;
    const directParent = directAncestors[directAncestors.length - 1];
    const lastSegmentSeq = getDirectSegmentAsSeq(seq, leftLess, directParent);
    const parentSegmentMap = buildParentSegmentMap(seq, leftLess);

    const dropOfLast = getDroppingAncestor(directParent, seq, leftLess, parentSegmentMap);
    const dropRangeLast = getDirectSegmentRange(seq, leftLess, dropOfLast);
    const subSeqLast = deepcopy(seq.slice(dropRangeLast.start, seq.length));

    const skipped = new Set();
    let mark = directParent;
    while (true) {
      skipped.add(mark);
      if (mark === dropOfLast) break;
      const p = parentSegmentMap.get(mark);
      if (p === -1 || p === undefined) break;
      mark = p;
    }

    for (let i = directAncestors.length - 2; i >= 0; i--) {
      const currIdx = directAncestors[i];
      if (skipped.has(currIdx)) continue;

      const dropIdx = getDroppingAncestor(currIdx, seq, leftLess, parentSegmentMap);
      const dropRange = getDirectSegmentRange(seq, leftLess, dropIdx);
      const currRange = getDirectSegmentRange(seq, leftLess, currIdx);
      const subSeq = deepcopy(seq.slice(dropRange.start, currRange.end + 1));

      const isSubLessOrEqual = !isDirectSegmentLess(subSeqLast, subSeq);

      let mark2 = currIdx;
      while (true) {
        skipped.add(mark2);
        if (mark2 === dropIdx) break;
        const p = parentSegmentMap.get(mark2);
        if (p === -1 || p === undefined) break;
        mark2 = p;
      }

      if (isSubLessOrEqual) {
        const chainIndices = [];
        let cur = currIdx;
        while (true) {
          chainIndices.unshift(cur);
          if (cur === dropIdx) break;
          const p = parentSegmentMap.get(cur);
          if (p === -1 || p === undefined) break;
          cur = p;
        }
        let selectedSegStart = null;
        for (let k = chainIndices.length - 1; k >= 0; k--) {
          const startIdx = chainIndices[k];
          const seg = getDirectSegmentAsSeq(seq, leftLess, startIdx);
          const isLE = !isDirectSegmentLess(lastSegmentSeq, seg);
          if (isLE) {
            selectedSegStart = startIdx;
            break;
          }
        }
        if (selectedSegStart === null) {
          selectedSegStart = chainIndices[chainIndices.length - 1];
        }
        const selectedRange = getDirectSegmentRange(seq, leftLess, selectedSegStart);
        return selectedRange.end;
      }
    }

    const fallback = directAncestors[0];
    return getRealBadRoot(seq, leftLess, fallback);
  }

  // ---------- 展开 ----------
  function expandOnOriginal(seq, m) {
    if (seq.length === 0) return { expanded: [], applied: false, reason: '空序列' };
    const last = seq[seq.length - 1];
    if (last.value === 0) {
      return { expanded: seq.slice(0, -1), applied: true, reason: '末项为0，直接删除末项' };
    }
    if (!last.starred) {
      const values = extractValues(seq);
      const leftLess = computeLeftLess(values);
      const L = seq.length,
        p = leftLess[L - 1];
      const blockStart = p === -1 ? 0 : p;
      if (blockStart > L - 2) return { expanded: seq.slice(0, L - 1), applied: true, reason: '末项无星非0，无复制块' };
      const block = seq.slice(blockStart, L - 1);
      const newSeq = seq.slice(0, L - 1);
      for (let i = 0; i < m; i++) newSeq.push(...deepcopy(block));
      return { expanded: newSeq, applied: true, reason: '末项无星非0，复制父块' };
    }
    const values = extractValues(seq);
    const leftLess = computeLeftLess(values);
    const realBadRoot = findBadRoot(seq, leftLess);
    const lastValue = last.value;
    const d = lastValue - seq[realBadRoot].value;
    let newSeq = seq.slice(0, -1);
    const block = seq.slice(realBadRoot, seq.length - 1);
    for (let i = 0; i < m; i++) {
      const offset = d * (i + 1);
      newSeq.push(...sequenceOffset(block, offset));
    }
    return { expanded: newSeq, applied: true, reason: `末项有星，坏根=${realBadRoot}` };
  }

  // ---------- Expr 层面 ----------
  function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
      if (is_infinity(a) && is_infinity(b)) return 0;
      return is_infinity(a) ? 1 : -1;
    }
    return lex_compare(
      a,
      b,
      object_lex_compare_by(
        {
          value: number_compare,
          starred: boolean_compare,
        },
        ['value', 'starred'],
      ),
    );
  }
  function is_limit(e) {
    if (is_infinity(e)) return true;
    if (e.length === 0) return false;
    return e[e.length - 1].value !== 0;
  }
  function FS(e, index) {
    if (is_infinity(e)) return infinity_FS(index);
    return expandOnOriginal(e, index).expanded;
  }

  const variants = sequence_FS_variants(FS, is_infinity, infinity_FS, is_limit, formatSequence);

  register.push({
    id: 'ups1.1r5',
    name: 'Upward Projection Sequence 1.1r5',
    display: formatSequence,
    able: is_limit,
    compare,
    FS: variants.FS,
    FSalter: variants.FS_alter,
    parse: parseSequence,
    init: () => [
      { expr: INFINITY, low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] },
    ],
    debug: { findBadRoot, expandOnOriginal },
  });
})();
