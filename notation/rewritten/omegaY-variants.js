// ============================================================================
//  notation/rewritten/omegaY-variants.js — Weak ω-Y 与 ω-Y limit variants
// ============================================================================
//  移植自 ne-rewritten（SmileLee-lyx/ne-rewritten）：
//    src/notations/Y/weak-omega-Y.ts（weak-omega-y）
//    src/notations/Y/variants.ts（omega-y-12omega / omega-y-1257omega / omega-y-skew）
//  依赖 Omega_Y.ts 的 magma 展开（expand_weak_magma 及其辅助，算法逐行保留）。
//  表达式 = number[]（Y 序列）；依赖 shared.js 的 window.NEUTILS
//  （Y_FS_variants / deepcopy / lex_compare / number_compare）。
//  注册 4 个记号：weak-omega-y、omega-y-12omega、omega-y-1257omega、omega-y-skew。
// ============================================================================
;(() => {
  const U = window.NEUTILS;
  const { Y_FS_variants, deepcopy, lex_compare, number_compare } = U;

  // --------------------------------------------------------------------------
  //  Omega_Y.ts 基础（Expr = number[]，Vertical = number[]）
  // --------------------------------------------------------------------------
  function INFINITY() {
    return [Infinity];
  }
  function is_infinity(expr) {
    return '' + expr === 'Infinity';
  }
  function sequence_display(expr) {
    return is_infinity(expr) ? 'Limit' : '' + expr;
  }
  const sequence_from_display = (str) => {
    if (str === 'Limit') return INFINITY();
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal omega-Y sequence');
    return result;
  };
  function seq_compare(a, b) {
    return lex_compare(a, b, number_compare);
  }
  function is_limit(seq) {
    return seq[seq.length - 1] > 1;
  }

  function from_sequence(seq) {
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
  function to_sequence(mountain) {
    return mountain.map((col) => col[col.length - 2].value);
  }
  function vertical_compare(a, b) {
    if (a.length > b.length) return 1;
    if (a.length < b.length) return -1;
    for (let i = a.length; i >= 0; i--) {
      if (a[i] > b[i]) return 1;
      if (a[i] < b[i]) return -1;
    }
    return 0;
  }
  function same_row(entry1, entry2) {
    return !vertical_compare(entry1.y, entry2.y);
  }
  function vertical_increase(y, d) {
    const c = y.slice();
    c[d] = (c[d] ?? 0) + 1;
    c.fill(0, 0, d);
    return c;
  }
  function dimension_difference(c1, c2) {
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
  function draw_mountain(mountain) {
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
  function find_lower(column, y) {
    let i1 = 0;
    let i2 = column.length - 1;
    while (i1 < i2) {
      const i = Math.floor((i1 + i2) / 2);
      if (vertical_compare(column[i].y, y) < 0) i2 = i;
      else i1 = i + 1;
    }
    return column[i2];
  }
  function find_higher_equal(column, y) {
    let i1 = 0;
    let i2 = column.length - 1;
    while (i1 < i2) {
      const i = Math.ceil((i1 + i2) / 2);
      if (vertical_compare(column[i].y, y) >= 0) i1 = i;
      else i2 = i - 1;
    }
    return column[i1];
  }
  function y_slice(column, low_equal, high) {
    let i1 = 0;
    let i2 = column.length - 1;
    while (i1 < i2) {
      const i = Math.floor((i1 + i2) / 2);
      if (vertical_compare(column[i].y, high) < 0) i2 = i;
      else i1 = i + 1;
    }
    const start = i2;
    i1 = start;
    i2 = column.length - 1;
    while (i1 < i2) {
      const i = Math.floor((i1 + i2) / 2);
      if (vertical_compare(column[i].y, low_equal) < 0) i2 = i;
      else i1 = i + 1;
    }
    return column.slice(start, i2);
  }
  function collect_usual(working_entry, collection = []) {
    for (const e of working_entry.left_up) {
      const child = e.right_down;
      if (collection.includes(child)) continue;
      if (same_row(working_entry, child)) {
        collection.push(child);
        collect_usual(child, collection);
      }
    }
    return collection;
  }
  function fill_magma_edge(mountain, source_entry, left_leg_entry) {
    const target_x = source_entry.x - source_entry.left_down.x + left_leg_entry.x;
    for (let d = dimension_difference(left_leg_entry.y, left_leg_entry.right_up.y); d >= 0; --d) {
      const new_entry = {
        x: target_x,
        y: vertical_increase(left_leg_entry.y, d),
        left_up: [],
        value: undefined,
      };
      new_entry.left_down = left_leg_entry;
      left_leg_entry.left_up.push(new_entry);
      mountain[target_x].push(new_entry);
    }
  }
  function copy_single_edge(mountain, source_entry, x_offset, BR_x, target_y) {
    if (target_y === undefined) target_y = source_entry.y;
    const new_entry = {
      x: source_entry.x + x_offset,
      y: target_y.slice(),
      left_up: [],
      value: undefined,
    };
    if (source_entry.y.length > 0) {
      let left_leg_entry;
      if (source_entry.left_down.x >= BR_x) {
        left_leg_entry = find_lower(mountain[source_entry.left_down.x + x_offset], new_entry.y);
      } else {
        left_leg_entry = source_entry.left_down;
      }
      new_entry.left_down = left_leg_entry;
      left_leg_entry.left_up.push(new_entry);
    }
    mountain[source_entry.x + x_offset].push(new_entry);
  }

  // --------------------------------------------------------------------------
  //  Omega_Y.ts: expand_weak_magma
  // --------------------------------------------------------------------------
  function expand_weak_magma(seq, index) {
    const mountain = draw_mountain(from_sequence(seq));
    const child = mountain[mountain.length - 1];
    let BR = child[0].left_down;
    const width = mountain.length - 1 - BR.x;
    let top = mountain[BR.x];
    top = top.slice(
      top.findIndex((entry) => entry === BR),
      top.length - 1,
    );
    top.unshift(child[0]);
    const s = seq.slice();
    s[s.length - 1]--;
    const newMountain = draw_mountain(from_sequence(s));
    BR = newMountain[BR.x].find((entry) => same_row(entry, BR));
    const magma_entries = [];
    for (let BR1 = BR; true; BR1 = BR1.right_down) {
      collect_usual(BR1).forEach((entry) => {
        const dx = entry.x - BR.x;
        if (magma_entries[dx] === undefined) magma_entries[dx] = [];
        magma_entries[dx].push(entry);
      });
      if (!BR1.y.length) break;
    }
    for (let n = 1; n <= index; n++) {
      const ref = top.map((top_entry) => find_lower(newMountain[newMountain.length - 1], top_entry.y));
      for (let dx = 1; dx <= width; dx++) {
        const column = [];
        newMountain[BR.x + n * width + dx] = column;
        for (const magma_entry of magma_entries[dx]) {
          copy_single_edge(newMountain, magma_entry, n * width, BR.x);
          let source_entry = magma_entry;
          let target_y = find_higher_equal(ref, magma_entry.y).y;
          const target_y0 = target_y;
          while (!(source_entry.value <= 1 || magma_entries[dx].includes(source_entry.right_up))) {
            target_y = vertical_increase(
              target_y,
              dimension_difference(source_entry.y, source_entry.right_up.y),
            );
            source_entry = source_entry.right_up;
            copy_single_edge(newMountain, source_entry, n * width, BR.x, target_y);
          }
          const left_leg_x = magma_entry.right_up.left_down.x + n * width;
          y_slice(newMountain[left_leg_x], magma_entry.y, target_y0).forEach((left_leg_entry) =>
            fill_magma_edge(newMountain, magma_entry.right_up, left_leg_entry),
          );
        }
        column.sort((entry1, entry2) => -vertical_compare(entry1.y, entry2.y));
        for (let i = 0; i < column.length - 1; i++) {
          column[i].right_down = column[i + 1];
          column[i + 1].right_up = column[i];
        }
        column[0].value = 1;
        column.slice(1, column.length - 1).forEach((entry) => {
          entry.value = entry.right_up.value + entry.right_up.left_down.value;
        });
      }
    }
    return to_sequence(newMountain);
  }

  // --------------------------------------------------------------------------
  //  weak-omega-Y.ts
  // --------------------------------------------------------------------------
  function weak_is_limit(a) {
    if (is_infinity(a)) return true;
    if (a.length < 2) return false;
    return a[a.length - 1] - a[a.length - 2] > 1;
  }
  function weak_expand(a, index) {
    if (is_infinity(a)) return [1, index + 1];
    if (!weak_is_limit(a)) return a.slice(0, -1);
    return expand_weak_magma(a, index);
  }

  // --------------------------------------------------------------------------
  //  variants.ts
  // --------------------------------------------------------------------------
  function compute_skew_omega_y(index) {
    const result = [1];

    let verticals = [[]];
    let values = [1];

    for (let i = 0; i < index; i++) {
      let current = [...Array(i).fill(0), 1];

      const new_verticals = [current];
      const new_values = [1];

      for (let j = 0; j < verticals.length; j++) {
        const v = verticals[j];
        const value = values[j];
        const d = dimension_difference(current, v);
        for (let k = d; k >= 0; k--) {
          new_verticals.push(k === 0 ? v : vertical_increase(v, k - 1));
          new_values.push(new_values[new_values.length - 1] + value);
        }
        current = v;
      }

      verticals = new_verticals;
      values = new_values;

      result.push(values[values.length - 1]);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  //  注册（本项目远古版接口：init 返回 [{expr, low, subitems}, ...]）
  // --------------------------------------------------------------------------
  function toRoots(exprs) {
    return exprs.map((expr) => ({ expr, low: [[]], subitems: [] }));
  }
  function makeVariant(id, name, infinity_FS, init) {
    const variants = Y_FS_variants(expand_weak_magma, is_infinity, infinity_FS, is_limit, sequence_display);
    register.push({
      id,
      name,
      display: sequence_display,
      able: is_limit,
      compare: seq_compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: sequence_from_display,
      init: () => toRoots(deepcopy(init)),
    });
  }

  // weak-omega-y
  {
    const variants = Y_FS_variants(weak_expand, is_infinity, (index) => [1, index + 1], weak_is_limit, sequence_display);
    register.push({
      id: 'weak-omega-y',
      name: 'Weak ω-Y (weak magma)',
      display: sequence_display,
      able: weak_is_limit,
      compare: seq_compare,
      FS: variants.FS,
      FSalter: variants.FS_alter,
      parse: sequence_from_display,
      init: () => toRoots([INFINITY(), [1], []]),
    });
  }

  makeVariant('omega-y-12omega', 'ω-Y (1,2,ω)', (index) => [1, 2, index + 4], [INFINITY(), [1, 2], [1], []]);
  makeVariant('omega-y-1257omega', 'ω-Y (1,2,5,7,ω)', (index) => [1, 2, 5, 7, index + 12], [INFINITY(), [1, 2, 5, 7], [1], []]);
  makeVariant('omega-y-skew', 'Skew ω-Y', compute_skew_omega_y, [INFINITY(), [1], []]);
})();
