// ============================================================================
//  notation/ne/Omega_Y.js — ω-Y（Y 系共享基础模块，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/Omega_Y.ts（712 行）
//
//  注册 id（四个记号，均属分类 category-y-omega；源文件无 generator 家族）:
//    omega-y-weak / omega-y-actual / omega-y-medium / omega-y-strong
//    （与旧条目 notation/legacy/omega-Y-magma.js 的 ids 一一对应）
//
//  分类 category-y-omega：源文件里是纯容器
//    { id: 'category-y-omega', name: 'ωY', parent_id: 'category-y' }，**没有 generator**。
//    notation/ne/categories.js 的骨架已注册同名分类，故此处 ensure_category 是幂等空操作
//    （不会重复注册、也不涉及水合成员）。
//
//  导出（Y/variants.ts、Y/minus1_Y.ts、Y/weak-omega-Y.ts、Y/Y.ts 会 import）：
//    INFINITY / is_infinity / sequence_display / is_limit / sequence_from_display /
//    seq_compare / vertical_increase / dimension_difference / expand_weak_magma /
//    to_dbms_display / category_y_omega / omega_Y_weak / omega_Y_actual /
//    omega_Y_medium / omega_Y_strong
//
//  ⚠ 与 ne 的差异（唯一一处，遵循 notation/ne/BM.js 的先例）：
//    ne 的 Omega_Y.ts 还 import '@/notations/draw_mountain_diagram.ts'
//    （draw_mountain_diagram / MountainShape）与 '@/core/diagram_types.ts'（Diagram）
//    这层图元，并导出 y_diagram_control（DiagramControl）。本项目 ne 侧尚无该图元层，
//    故不搬 y_diagram_control、图元绘制辅助函数 draw_y_mountain_diagram，以及四个记号里的
//    draw_diagram 字段（连同它们需要的 type Diagram）。
//    mountain_view 的纯数据部分（build_y_mountain_source，零外部依赖）按原文保留。
//    其余字段（id / name / simple_name / category_id / display / display_equiv /
//    is_limit / compare / FS 变体 / credit_text_id / init）全部保留，
//    算法逐行照搬，只去类型注解。
//
//    ⇒ 连带影响：后续搬 Y/variants.ts、Y/weak-omega-Y.ts 时，它们的 import 列表里
//      同样要去掉 y_diagram_control（以及各自定义里的 draw_diagram 字段）。
//
//  表达式 = number[]（ω-Y 序列）。init() 返回表达式数组 [Limit, [1], []]。
// ============================================================================
import { lex_compare, number_compare } from '../../core/ne/utils.js';
import { Y_FS_variants } from '../../core/ne/notationUtils.js';
import { ensure_category, register_notation } from '../../core/ne/registry.js';

export function INFINITY() {
    return [Infinity];
}

export function is_infinity(expr) {
    return '' + expr === 'Infinity';
}

export function sequence_display(expr) {
    return is_infinity(expr) ? 'Limit' : '' + expr;
}

export function is_limit(seq) {
    return seq[seq.length - 1] > 1;
}

export const sequence_from_display = (str) => {
    if (str === 'Limit') return INFINITY();
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal omega-Y sequence');
    return result;
};

export function seq_compare(a, b) {
    return lex_compare(a, b, number_compare);
}

const from_sequence = (seq) => {
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
};

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

export function vertical_increase(y, d) {
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
    let i1 = 0,
        i2 = column.length - 1;
    while (i1 < i2) {
        const i = Math.floor((i1 + i2) / 2);
        if (vertical_compare(column[i].y, y) < 0) i2 = i;
        else i1 = i + 1;
    }
    return column[i2];
}

function find_higher_equal(column, y) {
    let i1 = 0,
        i2 = column.length - 1;
    while (i1 < i2) {
        const i = Math.ceil((i1 + i2) / 2);
        if (vertical_compare(column[i].y, y) >= 0) i1 = i;
        else i2 = i - 1;
    }
    return column[i1];
}

function y_slice(column, low_equal, high) {
    let i1 = 0,
        i2 = column.length - 1;
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

function collect1D(working_entry, collection = []) {
    for (const child of working_entry.right_down.left_up) {
        if (collection.includes(child)) continue;
        if (same_row(working_entry, child)) {
            collection.push(child);
            collect1D(child, collection);
        }
    }
    return collection;
}

function collect(working_entry) {
    if (
        vertical_compare(working_entry.y, [1]) > 0 &&
        dimension_difference(working_entry.y, working_entry.right_down.y) === 0
    ) {
        return collect1D(working_entry);
    } else {
        return collect_usual(working_entry);
    }
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

function copy_single_edge(
    mountain,
    source_entry,
    x_offset,
    BR_x,
    target_y,
) {
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

export function expand_weak_magma(seq, index) {
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

function expand_actual_magma(seq, index) {
    const mountain = draw_mountain(from_sequence(seq));
    const child = mountain[mountain.length - 1];
    const BR = child[0].left_down;
    const width = mountain.length - 1 - BR.x;
    let top = mountain[BR.x];
    top = top.slice(
        top.findIndex((entry) => entry === BR),
        top.length - 1,
    );
    top.unshift(child[0]);
    const s = seq.slice();
    s[s.length - 1]--;
    const sMountain = draw_mountain(from_sequence(s));
    const newBR = sMountain[BR.x].find((entry) => same_row(entry, BR));
    const magma_entries = [];
    for (let BR1 = newBR; true; BR1 = BR1.right_down) {
        collect(BR1).forEach((entry) => {
            const dx = entry.x - BR1.x;
            if (magma_entries[dx] === undefined) magma_entries[dx] = [];
            magma_entries[dx].push(entry);
        });
        if (!BR1.y.length) break;
    }
    for (let n = 1; n <= index; n++) {
        const ref = top.map((top_entry) => find_lower(sMountain[sMountain.length - 1], top_entry.y));
        for (let dx = 1; dx <= width; dx++) {
            const column = [];
            sMountain[BR.x + n * width + dx] = column;
            for (const magma_entry of magma_entries[dx]) {
                copy_single_edge(sMountain, magma_entry, n * width, BR.x);
                let source_entry = magma_entry;
                let target_y = find_higher_equal(ref, magma_entry.y).y;
                const target_y0 = target_y;
                while (!(source_entry.value <= 1 || magma_entries[dx].includes(source_entry.right_up))) {
                    target_y = vertical_increase(
                        target_y,
                        dimension_difference(source_entry.y, source_entry.right_up.y),
                    );
                    source_entry = source_entry.right_up;
                    copy_single_edge(sMountain, source_entry, n * width, BR.x, target_y);
                }
                if (!magma_entry.y.length) continue;
                const left_leg_x = magma_entry.left_down.x + n * width;
                y_slice(sMountain[left_leg_x], magma_entry.y, target_y0).forEach((left_leg_entry) =>
                    fill_magma_edge(sMountain, magma_entry, left_leg_entry),
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
    return to_sequence(sMountain);
}

function expand_medium_magma(seq, index) {
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
                if (!magma_entry.y.length) continue;
                const left_leg_x = magma_entry.left_down.x + n * width;
                y_slice(newMountain[left_leg_x], magma_entry.y, target_y0).forEach((left_leg_entry) =>
                    fill_magma_edge(newMountain, magma_entry, left_leg_entry),
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

function expand_strong_magma(seq, index) {
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
        if (BR1.y.length) {
            collect1D(BR1).forEach((entry) => {
                const dx = entry.x - BR.x;
                if (magma_entries[dx] === undefined) magma_entries[dx] = [];
                magma_entries[dx].push(entry);
            });
        } else {
            newMountain
                .slice(BR.x + 1)
                .forEach((column, dx1) => magma_entries[dx1 + 1].push(column[column.length - 1]));
            break;
        }
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
                if (!magma_entry.y.length) continue;
                const left_leg_x = magma_entry.left_down.x + n * width;
                y_slice(newMountain[left_leg_x], magma_entry.y, target_y0).forEach((left_leg_entry) =>
                    fill_magma_edge(newMountain, magma_entry, left_leg_entry),
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

function draw_dbms_mountain(m, Asheep) {
    let mountain = m;

    // 记录各元素的位置,供左腿落点使用。列末元素是内部行标为 0 的虚拟项,不参与绘制。
    for (let i = 0; i < mountain.length; i++) {
        const col = mountain[i];
        let position = 0;
        for (let j = 0; j < col.length - 1; j++) {
            const entry = col[j];
            if (entry.y.length === 0) continue;
            entry.position = [i, position++];
        }
    }

    for (let col of mountain) {
        for (let j = col.length - 3; j >= 0; j--) {
            let entry = col[j];
            if (entry.y.length === 0) continue;
            entry.sep = dimension_difference(entry.y, entry.left_down.y);
            let left_entry = entry.left_down.right_up;
            if (Asheep && left_entry !== undefined && vertical_compare(left_entry.y, entry.y) !== 0)
                left_entry = undefined;
            entry.depth = 1 + (left_entry?.depth ?? 0);
        }
    }
    return mountain;
}

export function to_dbms_display(seq, type) {
    if ('' + seq === 'Infinity') return 'Limit';
    let mountain = draw_dbms_mountain(draw_mountain(from_sequence(seq)), type === 'ADBMS');

    let result = '';

    for (let col of mountain) {
        result += '(';
        for (let j = col.length - 3; j >= 0; j--) {
            let entry = col[j];
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

function vertical_display(v) {
    return v.toReversed().join(',');
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

/** 单个元素的显示文字;DBMS 类等价记号按其自身含义显示。 */
function y_entry_display(entry, current_equiv) {
    if (current_equiv === 'DBMS') {
        return entry.right_up !== undefined ? '' + entry.right_up.depth + ','.repeat(entry.right_up.sep + 1) : '0';
    }
    if (current_equiv === 'ADBMS' || current_equiv === "DBMS'") {
        return entry.sep !== undefined ? ','.repeat(entry.sep + 1) + entry.depth : '*';
    }
    return '' + entry.value;
}

/** 行标显示:ω 进制 Cantor 典范形;自然数行标(单项向量)统一减 1,如 [1] → 0、[2] → 1。 */
function y_row_label(v) {
    return vertical_display_html(v.length === 1 ? (v[0] === 1 ? [] : [v[0] - 1]) : v);
}

/** 计算层:把 ω-Y 序列化为"形状 + 布局",画布版与 HTML 版共用这一份数据。 */
function build_y_mountain_source(seq, current_equiv) {
    if (is_infinity(seq) || seq.length === 0) return undefined;
    const mountain = draw_dbms_mountain(draw_mountain(from_sequence(seq)), current_equiv === 'ADBMS');

    // 每列末尾的元素是内部行标为 0 的虚拟项,没有 position,故不进 shape。
    const shape = mountain.map((col) =>
        col
            .filter((entry) => entry.position !== undefined)
            .map((entry) => ({ vertical: entry.y, text: y_entry_display(entry, current_equiv) })),
    );

    for (const col of mountain) {
        for (const entry of col) {
            const target = entry.left_down?.position;
            if (entry.position === undefined || target === undefined) continue; // 落点是虚拟项 → 无左腿
            shape[entry.position[0]][entry.position[1]].leg_target = target;
        }
    }

    return {
        shape,
        layout: {
            vertical_display,
            vertical_compare,
            // dimension_difference 给出的是相邻两行的间隔数,分割线数量为其 + 1。
            separator_count: (higher, lower) => dimension_difference(higher, lower) + 1,
            row_label: y_row_label,
        },
        display_html_row_label: true,
    };
}

export const category_y_omega = {
    id: 'category-y-omega',
    name: 'ωY',
    parent_id: 'category-y',
};

function create_magma_notation(type, magma) {
    return {
        id: 'omega-y-' + type,
        name: 'ω-Y (' + type + ' magma)',
        simple_name: 'ωY ' + type,
        category_id: 'category-y-omega',
        display: {
            plain: sequence_display,
            from_display: sequence_from_display,
        },
        display_equiv: {
            DBMS: (s) => to_dbms_display(s, 'DBMS'),
            DBMS_MN: (s) => to_dbms_display(s, "DBMS'"),
            ADBMS: (s) => to_dbms_display(s, 'ADBMS'),
        },
        is_limit,
        compare: seq_compare,
        mountain_view: (expr, data) => build_y_mountain_source(expr, data?.current_equiv),
        ...Y_FS_variants(magma, is_infinity, (index) => [1, index + 1], is_limit, sequence_display),
        credit_text_id: 'credit.yukito',

        init: () => [INFINITY(), [1], []],
    };
}

export const omega_Y_weak = create_magma_notation('weak', expand_weak_magma);

export const omega_Y_actual = create_magma_notation('actual', expand_actual_magma);

export const omega_Y_medium = create_magma_notation('medium', expand_medium_magma);

export const omega_Y_strong = create_magma_notation('strong', expand_strong_magma);

// category-y-omega 的分类骨架已在 notation/ne/categories.js 注册（无 generator），
// 此处 ensure_category 幂等：已存在则保持原样，不存在则注册。
ensure_category(category_y_omega);

register_notation(omega_Y_weak);
register_notation(omega_Y_actual);
register_notation(omega_Y_medium);
register_notation(omega_Y_strong);
