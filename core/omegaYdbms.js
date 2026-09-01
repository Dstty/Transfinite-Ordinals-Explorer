// ============================================================================
//  core/omegaYdbms.js — ω-Y 的 DBMS 系列显示（移植自 ne-rewritten）
// ============================================================================
//  移植自 SmileLee-lyx/ne-rewritten 的 src/notations/Y/Omega_Y.ts
//  （to_dbms_display / draw_dbms_mountain / draw_mountain / from_sequence 等，
//  去 TypeScript 类型，算法逐行保留）。
//
//  用途：给 ω-Y 记号提供 DBMS / DBMS' / ADBMS 三种等价显示形式
//  （由 NOTATION_META views 声明、core/converters.js 的 'oy-dbms' kind 调用）。
//  输入是 Y 序列（number[]），输出如：
//    [0,1,2,3,4]  →  DBMS:  (0)(1,0)(1,1,0)(1,1,1,0)(1,1,1,1,0)
// ============================================================================

// Entry: { value, x, y: Vertical, left_up: [], right_up?, left_down?, right_down? }

export function from_sequence(seq) {
  const mountain = [];
  for (let i = 0; i < seq.length; i++) {
    const bottom = { value: seq[i], x: i, y: [1], left_up: [] };
    const phantom = { x: i, y: [], left_up: [], value: undefined };
    bottom.right_down = phantom;
    phantom.right_up = bottom;
    if (i > 0) {
      bottom.left_down = mountain[i - 1][1];
      mountain[i - 1][1].left_up.push(bottom);
    }
    mountain[i] = [bottom, phantom];
  }
  return mountain;
}

export function vertical_compare(a, b) {
  if (a.length > b.length) return 1;
  if (a.length < b.length) return -1;
  for (let i = a.length; i >= 0; i--) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function vertical_increase(y, d) {
  const c = y.slice();
  c[d] = (c[d] ?? 0) + 1;
  c.fill(0, 0, d);
  return c;
}

export function dimension_difference(c1, c2) {
  let d = Math.max(c1.length, c2.length);
  while (d--) {
    if (c1[d] !== c2[d]) return d;
  }
  return d;
}

function create_entry(parent, entry) {
  const new_entry = {
    value: entry.value - parent.value,
    x: entry.x,
    y: vertical_increase(entry.y, dimension_difference(parent.y, entry.y) + 1),
    left_up: [],
  };
  new_entry.right_down = entry;
  entry.right_up = new_entry;
  new_entry.left_down = parent;
  parent.left_up.push(new_entry);
  return new_entry;
}

export function draw_mountain(mountain) {
  for (const column of mountain) {
    while (true) {
      const entry = column[0];
      if (entry.value === 1) break;
      let parent = entry;
      while (true) {
        let up = parent.left_down;
        while (up.right_up && vertical_compare(up.right_up.y, parent.y) <= 0) up = up.right_up;
        parent = up;
        if (parent.value < entry.value) break;
      }
      column.unshift(create_entry(parent, entry));
    }
  }
  return mountain;
}

export function draw_dbms_mountain(m, Asheep) {
  const mountain = m;
  for (const col of mountain) {
    for (let j = col.length - 3; j >= 0; j--) {
      const entry = col[j];
      if (entry.y.length === 0) continue;
      entry.sep = dimension_difference(entry.y, entry.left_down.y);
      let left_entry = entry.left_down.right_up;
      if (Asheep && left_entry !== undefined && vertical_compare(left_entry.y, entry.y) !== 0) {
        left_entry = undefined;
      }
      entry.depth = 1 + (left_entry?.depth ?? 0);
    }
  }
  return mountain;
}

/**
 * ω-Y 序列 → DBMS 系列显示。
 * @param {number[]} seq Y 序列（Infinity 表示 Limit）
 * @param {'DBMS'|"DBMS'"|'ADBMS'} type
 * @returns {string}
 */
export function to_dbms_display(seq, type) {
  if ('' + seq === 'Infinity') return 'Limit';
  const mountain = draw_dbms_mountain(draw_mountain(from_sequence(seq)), type === 'ADBMS');

  let result = '';
  for (const col of mountain) {
    result += '(';
    for (let j = col.length - 3; j >= 0; j--) {
      const entry = col[j];
      switch (type) {
        case 'DBMS':
          result += entry.depth + ','.repeat(entry.sep + 1);
          break;
        case "DBMS'":
        case 'ADBMS':
          result += ','.repeat(entry.sep + 1) + entry.depth;
          break;
      }
    }
    if (type === 'DBMS') result += '0';
    result += ')';
  }
  return result;
}
