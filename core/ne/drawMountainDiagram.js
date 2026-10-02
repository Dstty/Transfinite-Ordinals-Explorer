// ============================================================================
//  core/ne/drawMountainDiagram.js — 山脉图布局与绘制
//  （移植自 ne-rewritten src/notations/draw_mountain_diagram.ts）
// ============================================================================
//  纯数据模块：只依赖 ./utils.js 的 DisplaySet / DisplayMap；不注册记号、不碰
//  registry，供 notation/ne/ 的 e0MN / strong_e0MN / SDBMS / SMN / UPMN /
//  Omega_Y 等记号移植 import。
//
//  运行时导出：
//    - compute_mountain_layout(shape, layout)  → 稠密格子数据
//    - draw_mountain_diagram(shape, layout, draw?) → Diagram（cols=0 时 undefined）
//
//  与 ne 原版的差异（逐行照搬，仅语法层面）：
//    - 纯类型 MountainNode / MountainShape / MountainDiagramOptions /
//      MountainLayoutOptions / MountainLayoutData 以及 Diagram / ColorSpec
//      的类型依赖，JS 无运行时载体，按规范整体删除；字段语义见 ne 快照同文件。
//    - import 路径 '@/utils.ts' → './utils.js'。
//    - 算法、常量（DEFAULT_ROW_HEIGHT=40 / DEFAULT_ROW_GAP=5）、运算顺序零改动。
// ============================================================================

import { DisplayMap, DisplaySet } from './utils.js';

const DEFAULT_ROW_HEIGHT = 40;
const DEFAULT_ROW_GAP = 5;

/** 由形状与布局选项算出稠密格子数据。 */
export function compute_mountain_layout(
    shape,
    layout,
) {
    const { vertical_display, vertical_compare, separator_count, row_label } = layout;
    const row_height = layout.row_height ?? DEFAULT_ROW_HEIGHT;
    const row_gap = layout.row_gap ?? DEFAULT_ROW_GAP;

    // 收集全部行高向量并按记号给定的次序排序,行下标即排序结果的下标。
    const vertical_set = new DisplaySet(vertical_display);
    for (const v of layout.extra_verticals ?? []) vertical_set.add(v);
    for (const column of shape) for (const node of column) vertical_set.add(node.vertical);
    const sorted = vertical_set.values().sort(vertical_compare);

    const row_index = new DisplayMap(vertical_display);
    for (let k = 0; k < sorted.length; k++) row_index.set(sorted[k], k);

    // 行标与像素行高。相邻两行之间画 separator_count 条分割线:
    // 第一条分割线由 row_height 自带,其余每条再撑开 row_gap,
    // 故两行中心相距 row_height + row_gap * (分割线数 - 1)。
    const sorted_verticals = sorted.map((v, k) =>
        row_label ? row_label(v, k) : vertical_display(v),
    );
    const heights = [0];
    const line_heights = [];
    for (let k = 1; k < sorted.length; k++) {
        const separators = separator_count(sorted[k], sorted[k - 1]);
        heights.push(heights[k - 1] + row_height + row_gap * Math.max(separators - 1, 0));
        for (let j = 0; j < separators; j++) line_heights.push(heights[k - 1] + row_height / 2 + row_gap * j);
    }

    // 节点落位与左腿。同一列内两个节点不允许落在同一行。
    const entries = shape.map(() =>
        new Array(sorted.length).fill(undefined),
    );
    const left_legs = shape.map(() =>
        new Array(sorted.length).fill(undefined),
    );

    for (let i = 0; i < shape.length; i++) {
        for (const node of shape[i]) {
            const vj = row_index.get(node.vertical);
            if (vj === undefined) continue;
            if (entries[i][vj] !== undefined) throw new Error(`Duplicate row in column ${i}: row ${vj}`);
            entries[i][vj] = node.text;
        }
    }

    for (let i = 0; i < shape.length; i++) {
        for (const node of shape[i]) {
            const target = node.leg_target;
            if (target === undefined) continue;
            const target_node = shape[target[0]]?.[target[1]];
            if (target_node === undefined) continue; // 落点越界 = 无左腿
            const vj = row_index.get(node.vertical);
            const pvj = row_index.get(target_node.vertical);
            if (vj === undefined || pvj === undefined) continue;
            left_legs[i][vj] = [target[0], pvj];
        }
    }

    return { sorted_verticals, heights, line_heights, entries, left_legs };
}

/**
 * 绘制山脉图。
 *
 * 调用方只需描述每列有哪些节点、每格的文字、腿的落点,以及行高向量的显示/次序/分割线数量;
 * 其余(行标、像素行高与网格线、节点摆位、右腿与左腿折线)全部由本函数完成。
 */
export function draw_mountain_diagram(
    shape,
    layout,
    draw,
) {
    const {
        column_width = 30,
        row_label_width = 50,
        connector_offset = 10,
        outer_padding = 10,
        font_size = 14,
        invert_vertical = false,
        display_html_row_label = false,
        display_html_entry = false,
    } = draw ?? {};

    const { sorted_verticals, heights, line_heights, entries, left_legs } = compute_mountain_layout(shape, layout);
    const cols = entries.length;
    if (cols === 0) return undefined;

    const height_last = heights[heights.length - 1] + outer_padding;
    const total_height = height_last + outer_padding;
    const width = row_label_width + cols * column_width;
    const calc_cy = (vj) => (invert_vertical ? outer_padding + heights[vj] : height_last - heights[vj]);
    const h_off_vec = invert_vertical ? -connector_offset : connector_offset;

    const elements = [];
    const lines = [];
    const extra_text = [];
    const black = { type: 'text' };
    const gray = { type: 'gray' };

    // 水平网格线
    for (const h of line_heights) {
        const y = invert_vertical ? h + outer_padding : height_last - h;
        lines.push({
            type: 'line',
            x1: 0,
            y1: y,
            x2: width,
            y2: y,
            stroke: true,
            stroke_color: gray,
            width: 1,
        });
    }

    // 行标(左侧)
    for (let vj = 0; vj < sorted_verticals.length; vj++) {
        const label = sorted_verticals[vj];
        if (label === undefined) continue;
        extra_text.push({
            text: label,
            x: row_label_width / 2,
            y: calc_cy(vj),
            size: font_size,
            color: black,
            align: 'center',
            ...(display_html_row_label ? { display_html: true } : {}),
        });
    }

    // 节点及连线
    for (let i = 0; i < cols; i++) {
        for (let vj = 0; vj < sorted_verticals.length; vj++) {
            const text = entries[i][vj];
            if (text === undefined) continue;

            const cx = row_label_width + column_width * i + column_width / 2;
            const cy = calc_cy(vj);

            // 右腿:连接到同列下方首个存在的节点
            if (vj > 0) {
                let kv = vj - 1;
                while (kv > 0 && entries[i][kv] === undefined) kv--;
                if (entries[i][kv] !== undefined) {
                    const cy_below = calc_cy(kv);
                    lines.push({
                        type: 'line',
                        x1: cx,
                        y1: cy + h_off_vec,
                        x2: cx,
                        y2: cy_below - h_off_vec,
                        stroke: true,
                        stroke_color: black,
                        width: 1,
                    });
                }
            }

            // 左腿折线
            const leg = left_legs[i][vj];
            if (leg !== undefined && vj > 0) {
                const [pi, pvj] = leg;
                const p_cx = row_label_width + column_width * pi + column_width / 2;
                const cy_mid = calc_cy(vj - 1);
                const cy_target = calc_cy(pvj);

                // segment 1: (i, vj) → (pi, vj-1)
                lines.push({
                    type: 'line',
                    x1: cx,
                    y1: cy + h_off_vec,
                    x2: p_cx,
                    y2: cy_mid - h_off_vec,
                    stroke: true,
                    stroke_color: black,
                    width: 1,
                });
                // segment 2: (pi, vj-1) → (pi, pvj)
                lines.push({
                    type: 'line',
                    x1: p_cx,
                    y1: cy_mid - h_off_vec,
                    x2: p_cx,
                    y2: cy_target - h_off_vec,
                    stroke: true,
                    stroke_color: black,
                    width: 1,
                });
            }

            // 节点值
            extra_text.push({
                text,
                x: cx,
                y: cy,
                size: font_size,
                color: black,
                align: 'center',
                ...(display_html_entry ? { display_html: true } : {}),
            });
        }
    }

    elements.unshift(...lines);
    return { width, height: total_height, elements, extra_text };
}
