// ============================================================================
//  core/mountainDiagram.js — ω-Y 山脉图数据层（移植自 ne-rewritten）
// ============================================================================
//  ⚠ 暂未启用（2026-09-01 用户要求暂时移除 UI 接入；代码保留待后续启用）：
//    启用时在 NOTATION_META views 加 { kind: 'mountain' } 条目、
//    converters.js 恢复 VIEW_DISPLAY_MAKERS['mountain'] 与 isMountain 标记、
//    app.js 恢复 ui/MountainView.js 渲染。
// ============================================================================
//  移植自 SmileLee-lyx/ne-rewritten：
//    src/notations/Y/Omega_Y.ts（compute_y_mountain_diagram / vertical_display_html）
//    src/notations/draw_mountain_util.ts（draw_mountain_diagram）
//    src/core/diagram_types.ts（Diagram 结构）
//  纯数据层，不依赖 DOM：输出通用 Diagram（line/circle/text + extra_text），
//  渲染由 ui/MountainView.js（Canvas + HTML 叠文本）负责。
//  依赖 core/omegaYdbms.js（from_sequence / draw_mountain / draw_dbms_mountain /
//  vertical_compare / dimension_difference）。
// ============================================================================
import {
  from_sequence,
  draw_mountain,
  draw_dbms_mountain,
  vertical_compare,
  dimension_difference,
} from './omegaYdbms.js';

// --------------------------------------------------------------------------
//  以 display 字符串为键的 Set / Map（utils.ts 移植）
// --------------------------------------------------------------------------
function makeDisplaySet(display) {
  const map = new Map();
  return {
    add(value) { map.set(display(value), value); return this; },
    has(value) { return map.has(display(value)); },
    values() { return Array.from(map.values()); },
    get size() { return map.size; },
  };
}
function makeDisplayMap(display) {
  const map = new Map();
  return {
    set(key, value) { map.set(display(key), [key, value]); return this; },
    get(key) { const e = map.get(display(key)); return e ? e[1] : undefined; },
    has(key) { return map.has(display(key)); },
  };
}

// --------------------------------------------------------------------------
//  行标显示（Omega_Y.ts）
// --------------------------------------------------------------------------
function vertical_display(v) {
  return v.slice().reverse().join(',');
}

/** 行标 HTML 显示：ω 进制序数。例如 [0,0,1] → ω², [1,3,0,4] → ω³4+ω3+1。 */
function vertical_display_html(v) {
  if (v.length === 0) return '0';
  const parts = [];
  for (let i = v.length - 1; i >= 0; i--) {
    const c = v[i];
    if (c === 0) continue;
    if (i === 0) {
      parts.push('' + c);
    } else if (i === 1) {
      parts.push(c === 1 ? 'ω' : 'ω' + c);
    } else {
      parts.push(c === 1 ? `ω<sup>${i}</sup>` : `ω<sup>${i}</sup>${c}`);
    }
  }
  return parts.join('+');
}

// --------------------------------------------------------------------------
//  compute_y_mountain_diagram（Omega_Y.ts）
// --------------------------------------------------------------------------
/**
 * ω-Y 序列 → 山脉图中间数据。
 * @param {number[]} seq Y 序列
 * @param {string|undefined} current_equiv 显示模式：undefined（序列值）/
 *   'DBMS' / "DBMS'" / 'ADBMS'（山脉节点的 DBMS 标注）
 * @returns {object|undefined} MountainDiagramData
 */
export function compute_y_mountain_diagram(seq, current_equiv) {
  if ('' + seq === 'Infinity' || seq.length === 0) return undefined;
  const mountain = draw_dbms_mountain(draw_mountain(from_sequence(seq)), current_equiv === 'ADBMS');

  const vertical_set = makeDisplaySet(vertical_display);
  for (const col of mountain) for (const entry of col) vertical_set.add(entry.y);
  const sorted = vertical_set.values().sort(vertical_compare);
  const vertical_index = makeDisplayMap(vertical_display);
  for (let i = 0; i < sorted.length; i++) vertical_index.set(sorted[i], i);

  const entries = Array.from({ length: mountain.length }, () =>
    Array.from({ length: sorted.length }, () => undefined),
  );
  const left_legs = Array.from({ length: mountain.length }, () =>
    Array.from({ length: sorted.length }, () => undefined),
  );

  for (let i = 0; i < mountain.length; i++) {
    for (let j = 0; j < mountain[i].length - 1; j++) {
      const entry = mountain[i][j];
      const vj = vertical_index.get(entry.y);
      if (current_equiv === 'DBMS') {
        entries[i][vj - 1] =
          entry.right_up !== undefined
            ? '' + entry.right_up.depth + ','.repeat(entry.right_up.sep + 1)
            : '0';
      } else if (current_equiv === 'ADBMS' || current_equiv === "DBMS'") {
        entries[i][vj - 1] = entry.sep !== undefined ? ','.repeat(entry.sep + 1) + entry.depth : '*';
      } else {
        entries[i][vj - 1] = '' + entry.value;
      }
      if (entry.left_down) {
        const pvj = vertical_index.get(entry.left_down.y);
        if (pvj !== 0) left_legs[i][vj - 1] = [entry.left_down.x, pvj - 1];
      }
    }
  }

  const H = 40;
  const HS = 5;
  const heights = [0];
  const line_heights = [];
  for (let i = 2; i < sorted.length; i++) {
    const sep = dimension_difference(sorted[i], sorted[i - 1]);
    const d_height = H + HS * sep;
    heights.push(heights[i - 2] + d_height);
    for (let k = 0; k <= sep; k++) line_heights.push(heights[i - 2] + H / 2 + HS * k);
  }

  const vertical_names = sorted
    .slice(1)
    .map((v) => vertical_display_html(v.length === 1 ? (v[0] === 1 ? [] : [v[0] - 1]) : v));

  return { sorted_verticals: vertical_names, heights, line_heights, entries, left_legs };
}

// --------------------------------------------------------------------------
//  draw_mountain_diagram（draw_mountain_util.ts）
// --------------------------------------------------------------------------
/**
 * 山脉图中间数据 → 通用 Diagram（Canvas 可画）。
 * @param {object} data compute_y_mountain_diagram 的返回
 * @param {object} opts { W, WV, H_off, padding, text_size, invert_vertical, display_html_vertical }
 * @returns {object|undefined} Diagram { width, height, elements, extra_text }
 */
export function draw_mountain_diagram(data, opts) {
  const {
    W = 30,
    WV = 50,
    H_off = 10,
    padding = 10,
    text_size = 14,
    invert_vertical = false,
    display_html_vertical = false,
  } = opts || {};

  const { sorted_verticals, heights, line_heights, entries, left_legs } = data;
  const cols = entries.length;
  if (cols === 0) return undefined;

  const height_last = heights[heights.length - 1] + padding;
  const total_height = height_last + padding;
  const width = WV + cols * W;
  const calc_cy = (vj) => (invert_vertical ? padding + heights[vj] : height_last - heights[vj]);
  const h_off_vec = invert_vertical ? -H_off : H_off;

  const elements = [];
  const lines = [];
  const extra_text = [];
  const black = { type: 'text' };
  const gray = { type: 'gray' };

  // 水平网格线
  for (const h of line_heights) {
    const y = invert_vertical ? h + padding : height_last - h;
    lines.push({
      type: 'line',
      x1: 0, y1: y, x2: width, y2: y,
      stroke: true, stroke_color: gray, width: 1,
    });
  }

  // 行标（左侧）
  for (let vj = 0; vj < sorted_verticals.length; vj++) {
    const label = sorted_verticals[vj];
    if (label === undefined) continue;
    const t = {
      text: label,
      x: WV / 2,
      y: calc_cy(vj),
      size: text_size,
      color: black,
      align: 'center',
    };
    if (display_html_vertical) t.display_html = true;
    extra_text.push(t);
  }

  // 节点及连线
  for (let i = 0; i < cols; i++) {
    for (let vj = 0; vj < sorted_verticals.length; vj++) {
      const text = entries[i][vj];
      if (text === undefined) continue;

      const cx = WV + W * i + W / 2;
      const cy = calc_cy(vj);

      // 右腿：连接到同列下方首个存在的节点
      if (vj > 0) {
        let kv = vj - 1;
        while (kv > 0 && entries[i][kv] === undefined) kv--;
        if (entries[i][kv] !== undefined) {
          const cy_below = calc_cy(kv);
          lines.push({
            type: 'line',
            x1: cx, y1: cy + h_off_vec,
            x2: cx, y2: cy_below - h_off_vec,
            stroke: true, stroke_color: black, width: 1,
          });
        }
      }

      // 左腿折线
      const leg = left_legs[i][vj];
      if (leg !== undefined && vj > 0) {
        const [pi, pvj] = leg;
        const p_cx = WV + W * pi + W / 2;
        const cy_mid = calc_cy(vj - 1);
        const cy_target = calc_cy(pvj);

        lines.push({
          type: 'line',
          x1: cx, y1: cy + h_off_vec,
          x2: p_cx, y2: cy_mid - h_off_vec,
          stroke: true, stroke_color: black, width: 1,
        });
        lines.push({
          type: 'line',
          x1: p_cx, y1: cy_mid - h_off_vec,
          x2: p_cx, y2: cy_target - h_off_vec,
          stroke: true, stroke_color: black, width: 1,
        });
      }

      // 节点值
      extra_text.push({
        text,
        x: cx,
        y: cy,
        size: text_size,
        color: black,
        align: 'center',
      });
    }
  }

  elements.unshift(...lines);
  return { width, height: total_height, elements, extra_text };
}

/**
 * 便捷入口：ω-Y 序列 → Diagram（一步到位）。
 * @param {number[]} seq Y 序列
 * @param {{equiv?: string|undefined, invert_vertical?: boolean}} opts
 * @returns {object|undefined}
 */
export function omegaY_diagram(seq, opts) {
  const { equiv = undefined, invert_vertical = false } = opts || {};
  const data = compute_y_mountain_diagram(seq, equiv);
  if (!data) return undefined;
  return draw_mountain_diagram(data, {
    invert_vertical,
    display_html_vertical: true,
  });
}
