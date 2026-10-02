// ============================================================================
//  notation/ne/UP2MN-v1a.js — UP2MN v1A（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/UPMN/UP2MN-v1a.ts（快照 d2d79cd）
//  注册 id: up2mn-v1a
//  分类: category-upmn-test（源文件原文，未改；ne 里定义在 UPMN/categories.ts，
//        本项目骨架 notation/ne/categories.js 未预置，由 ./UPMN_utils.js 补注册）
//  表达式 = Mountain = Column[]，Column = Entry[]，Entry = [number, Sep]（Sep = number）
//
//  依赖映射：
//    '@/notations/notation_utils.ts' 的 MN_FS_variants
//        → ../../core/ne/notationUtils.js（已搬；含 FS_equiv.fast，即原 lnz-1 变体）
//    '@/notations/MN/SMN/n_MN.ts' → ./UPMN_utils.js（UPMN 家族共用的 n_MN 基础层）
//    NotationDefinition / Column / Mountain → 纯类型，删除
//
//  与 ne 原版的差异：无（算法、常量、字段逐行照搬；源文件的 display_equiv 是
//  layer / marked / simple / layer simple 四视图，没有 UP1Y 视图 —— UP1Y 在
//  UP2DBMS-v1/v1b-plus/v1c 里，不在本文件）。
//  文件末尾自注册（manifest 以 module: true 注入）。
// ============================================================================
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import {
    column_compare,
    column_verticals,
    compare,
    convert_from_layer,
    convert_to_layer,
    draw_diagram_control,
    expand as MN_expand,
    from_display,
    from_display_simple,
    is_limit,
    mountain_display,
    mountain_display_marked,
    parent,
    subtract_1,
    to_data_key,
} from './UPMN_utils.js';
import { register_notation } from '../../core/ne/registry.js';

function INFINITY() {
    return [[], [[1, 1]], [[2, 1]]];
}

function is_infinity(expr) {
    return compare(expr, INFINITY()) === 0;
}

function infinity_FS(index) {
    return MN_expand(INFINITY(), index);
}

function has_infinite(col) {
    return col.length > 0 && col[col.length - 1][1] > 0;
}

function finite_height(col) {
    return has_infinite(col) ? col.length - 1 : col.length;
}

function copy_column(col, [Ri, Rj], offset, up, y_offset) {
    const result = [];
    if (col.length === 0 && Rj === 0 && up) {
        for (let k = 0; k < y_offset; k++) {
            result.push([Ri + 1 + offset, 0]);
        }
    }
    for (let j = 0; j < col.length; j++) {
        const [v, s] = col[j];
        if (j === Rj && up) {
            for (let k = 0; k < y_offset; k++) {
                result.push([v + offset, 0]);
            }
        }
        if (v > Ri + 1 || (v === Ri + 1 && (up || j < Rj))) {
            result.push([v + offset, s]);
        } else {
            result.push([v, s]);
        }
    }
    return result;
}

function expand(m, index, shorter = false) {
    if (is_infinity(m)) return infinity_FS(index);
    if (m.length === 0) return m;
    const right = m.length - 1;
    if (m[right].length === 0) return m.slice(0, -1);
    const top = m[right].length - 1;

    if (!has_infinite(m[right])) {
        return MN_expand(m, index, shorter);
    }

    const V = m.map(column_verticals);
    const [Ri, Rj] = parent(m, V, [right, top]);
    const offset = right - Ri;
    const y_offset = top === Rj ? 1 : top - Rj;

    const up = Array(m.length).fill(false);
    for (let i = Ri + 1; i < right; i++) {
        const col = m[i];
        if (!has_infinite(col)) {
            if (finite_height(col) <= Rj + 1) continue;
            const [p] = parent(m, V, [i, Rj]);
            up[i] = up[p];
            continue;
        }

        if (finite_height(col) < Rj) continue;
        if (finite_height(col) > Rj) {
            const [p] = parent(m, V, [i, Rj]);
            up[i] = up[p];
            continue;
        }

        const threshold_col = [];
        for (let j = 0; j <= Rj; j++) threshold_col.push([i, 0]);
        threshold_col.push([Ri, 1]);

        const X_start = i;
        let X_end = i + 1;
        while (X_end < m.length && column_compare(m[X_end], threshold_col) >= 0) X_end++;
        if (X_end === m.length) {
            up[i] = true;
            continue;
        }

        const Y_end = m.length;
        let Y_start = right;
        while (finite_height(m[Y_start]) > Rj) {
            const [p] = parent(m, V, [Y_start, Rj]);
            Y_start = p;
        }

        let up_i = undefined;
        for (let k = 1; k + X_start < X_end && k + Y_start < Y_end; k++) {
            const X_col = m[X_start + k].map(([v, s]) => [v >= X_start ? v + Y_start - X_start : v, s]);
            const Y_col = m[Y_start + k];
            const cmp = column_compare(X_col, Y_col);
            if (cmp !== 0) {
                up_i = cmp > 0;
                break;
            }
        }
        up[i] = up_i ?? X_end - X_start >= Y_end - Y_start;
    }

    up[right] = true;

    const result = subtract_1(m);
    for (let w = 1; w <= index; w++) {
        for (let i = Ri + 1; i <= right; i++) {
            result.push(copy_column(result[i], [Ri, Rj], offset * w, up[i], y_offset * w));
        }
    }

    if (shorter) result.pop();
    return result;
}

export const UP2MN_v1a = {
    id: 'up2mn-v1a',
    name: 'UP2MN v1A',
    category_id: 'category-upmn-test',
    description: [
        { id: 'description.UP2MN-v1a.1' },
        { id: 'description.UP2MN-v1a.2' },
        { id: 'description.UP2MN-v1a.3' },
        { id: 'description.UP2MN-v1a.4' },
        { id: 'description.UP2MN-v1a.5' },
    ],
    display: {
        plain: (m) => mountain_display(m, false),
        from_display: from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        layer: {
            plain: (m) => mountain_display(convert_to_layer(m), false),
            from_display: (str) => convert_from_layer(from_display(str)),
            name: { id: 'display.layer' },
        },
        marked: {
            plain: (m) => mountain_display_marked(m, 'label'),
            html: (m) => mountain_display_marked(m, 'sub'),
            from_display: from_display,
            name: { id: 'display.index-marked' },
        },
        simple: {
            plain: (m) => mountain_display(m, true),
            from_display: from_display_simple,
            name: { id: 'display.index-simple' },
        },
        'layer simple': {
            plain: (m) => mountain_display(convert_to_layer(m), true),
            from_display: (s) => convert_from_layer(from_display_simple(s)),
            name: { id: 'display.layer-simple' },
        },
    },
    draw_diagram: draw_diagram_control,
    ...MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, to_data_key),
    is_limit,
    compare,
    credit_text_id: 'credit.upmn',

    init: () => [INFINITY(), []],
};

register_notation(UP2MN_v1a);
