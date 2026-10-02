// ============================================================================
//  notation/ne/Aw2MN3.js — Aω2MN3（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/Aw2MN3.ts（快照 d2d79cd）
//  注册 id: a-omega2-mn-3 / weak-a-omega2-mn-3（与旧条目
//  notation/legacy/Aomega2MN3.js 的 ids 完全一致，各 1 档，无 generator 家族）
//
//  与 Aw2MN2 同族但展开算法不同：本文件的 subtract1 是「先补 alpha 行、再按
//  top_right_separator 是否为极限分支」的版本（Aw2MN2 的 subtract1 把两支合在一起），
//  故本文件自带一份 subtract1 / extend / expand / expand_weak，其余共用 Aw2MN2 的导出。
//
//  与 ne 原版的差异（仅依赖/语法层面，算法本体逐行照搬）：
//
//   1) import { deepcopy } from '@/utils.ts' → '../../core/ne/utils.js'。
//   2) import { ... } from '@/notations/MN/Aw2MN2.ts' → './Aw2MN2.js'
//      （该文件已按同规范搬到本目录；导入名去掉了 Expr / Sep / Vertical 三个纯类型）。
//   3) import { sequence_FS_variants } from '@/notations/notation_utils.ts'
//      → '../../core/ne/notationUtils.js'。
//   4) NotationDefinition 类型与全部类型注解、默认参数上的类型均只作语法层去除，
//      函数体一行未改；未挂 debug 字段（ne 原版就没有）。
//   5) 不在 generator 分类下 → 用 register_notation（见文末）。
// ============================================================================
import { deepcopy } from '../../core/ne/utils.js';
import {
    column_verticals,
    convert_to_layer,
    find_index_below_row,
    from_display,
    get_references,
    INFINITY,
    infinity_FS,
    is_infinity,
    mountain_compare,
    mountain_display,
    mountain_display_marked,
    mountain_is_limit,
    mountain_is_one,
    Parent,
    S,
    vertical_compare,
    vertical_increase,
} from './Aw2MN2.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

function subtract1(A0, V0) {
    let rightmost = A0.length - 1;
    let topmost = A0[rightmost].length - 1;
    let A = deepcopy(A0);
    let top_right_value = A[rightmost][topmost][0];
    let top_right_separator = A[rightmost][topmost][1];
    let BR_ij = Parent(A, V0, [rightmost, topmost]);

    A[rightmost].pop();

    if (mountain_is_one(top_right_separator)) return A;

    let alpha = V0[BR_ij[0]][BR_ij[1] - 1] ?? [],
        working_vertical = V0[rightmost][topmost - 1] ?? [];
    if (vertical_compare(alpha, working_vertical) > 0) {
        let i = working_vertical.length ? find_index_below_row(V0[BR_ij[0]], working_vertical) : -1;
        while (++i < BR_ij[1]) {
            A[rightmost].push([top_right_value, A[BR_ij[0]][i][1], A[BR_ij[0]][i][2]]);
            working_vertical = vertical_increase(working_vertical, A[BR_ij[0]][i][1]);
        }
    }

    if (mountain_is_limit(top_right_separator)) {
        let BR_separator = S(A, BR_ij[0], BR_ij[1] - 1),
            J = mountain_compare(BR_separator, top_right_separator) >= 0 ? [[]] : BR_separator.concat([[]]);
        while (vertical_compare(vertical_increase(alpha, J), vertical_increase(working_vertical, J)))
            J = J.concat([[]]);
        A[rightmost].push([top_right_value, J, true]);
    } else {
        top_right_separator = top_right_separator.slice(0, -1);

        if (vertical_compare(vertical_increase(alpha, top_right_separator), working_vertical) > 0) {
            A[rightmost].push([top_right_value, top_right_separator]);
        }
    }
    return A;
}

function extend(A0, small = false, weak = false) {
    let rightmost = A0.length - 1;
    let topmost = A0[rightmost].length - 1;
    let V0 = A0.map(column_verticals);
    let BR_ij = Parent(A0, V0, [rightmost, topmost]);
    let top_separators = A0[BR_ij[0]].slice(0, BR_ij[1]).map((entry) => entry[1]);
    top_separators.push(A0[rightmost][topmost][1]);
    let top_verticals = V0[BR_ij[0]].slice(0, BR_ij[1]);
    top_verticals.push(V0[rightmost][topmost]);
    let width = rightmost - BR_ij[0];
    let magma_checks_list = [];
    for (let i = BR_ij[0] + 1; i <= rightmost; ++i) {
        magma_checks_list[i] = [];
        for (let j = 0; j < A0[i].length; ++j) {
            let working = [i, j];
            while (working[0] > BR_ij[0]) {
                if (A0[working[0]].length <= working[1]) --working[1];
                working = Parent(A0, V0, working);
            }
            magma_checks_list[i][j] =
                working[0] === BR_ij[0] &&
                working[1] <= BR_ij[1] &&
                !vertical_compare(V0[working[0]][working[1] - 1] ?? [], V0[i][j - 1] ?? [])
                    ? working[1]
                    : -1;
        }
    }
    let Br_i = BR_ij[0];
    magma_checks_list[Br_i] = [];
    for (let j = 0; j < A0[Br_i].length; ++j) {
        magma_checks_list[Br_i][j] = -1;
    }

    const A = subtract1(A0, V0);
    let refs = get_references(A, top_verticals);
    refs[-1] = -1;

    let stretch_threshold = [],
        stretch_value = [];
    for (let i = 0; i < top_separators.length; ++i) {
        if (!mountain_is_limit(top_separators[i])) {
            stretch_value[i] = 0;
            continue;
        }
        if (mountain_compare(S(A0, BR_ij[0], i - 1), top_separators[i]) >= 0) {
            stretch_threshold[i] = [[]];
        } else {
            stretch_threshold[i] = S(A0, BR_ij[0], i - 1).concat([[]]);
        }

        stretch_value[i] = 0;
        for (let j = refs[i]; j - 1 > refs[i - 1]; --j) {
            let M = A[rightmost][j - 1]?.[1] ?? [];
            if (mountain_compare(M, top_separators[i]) < 0 && mountain_compare(M, stretch_threshold[i]) >= 0) {
                stretch_value[i] = M.length - stretch_threshold[i].length + 1;
                break;
            }
        }
    }

    for (let dx = 0; dx <= (small ? 0 : width); ++dx) {
        let x = BR_ij[0] + dx;
        let source_magmas = magma_checks_list[x];
        if (dx) A[x + width] = [];
        let target_column = A[x + width];
        let BR_index = dx ? -1 : refs.length - 1;
        A0[x].forEach((entry, y) => {
            if (!dx && y < BR_ij[1]) return;
            let value = entry[0];
            if (~source_magmas[y]) {
                BR_index = source_magmas[y];
                for (var j = refs[BR_index - 1] + 1; j <= refs[BR_index]; ++j) {
                    if (j === refs[BR_index])
                        target_column.push([
                            value + width,
                            !stretch_value[BR_index] ||
                            (weak && vertical_compare(V0[x][y], top_verticals[BR_index] ?? []) >= 0) ||
                            mountain_compare(entry[1], top_separators[BR_index]) >= 0 ||
                            mountain_compare(entry[1], stretch_threshold[BR_index]) < 0
                                ? entry[1]
                                : entry[1].concat(Array(stretch_value[BR_index]).fill([])),
                            entry[2],
                        ]);
                    else target_column.push([value + width, A[BR_ij[0] + width][j][1], A[BR_ij[0] + width][j][2]]);
                }
            } else {
                target_column.push([
                    value + (value > BR_ij[0] ? width : 0),
                    !stretch_value[BR_index] ||
                    (weak && vertical_compare(V0[x][y], top_verticals[BR_index] ?? []) >= 0) ||
                    mountain_compare(entry[1], top_separators[BR_index]) >= 0 ||
                    mountain_compare(entry[1], stretch_threshold[BR_index]) < 0
                        ? entry[1]
                        : entry[1].concat(Array(stretch_value[BR_index]).fill([])),
                    entry[2],
                ]);
            }
        });
    }
    return A;
}

function expand(A0, index, shorter = false) {
    let A = A0;
    for (let n = 1; n <= index; ++n) A = extend(A);
    return shorter ? A.slice(0, -1) : extend(A, true);
}

function expand_weak(A0, index, shorter = false) {
    let A = A0;
    for (let n = 1; n <= index; ++n) A = extend(A, false, true);
    return shorter ? A.slice(0, -1) : extend(A, true, true);
}

export const A_omega2_MN3 = {
    id: 'a-omega2-mn-3',
    name: 'Aω2MN3',
    display: { plain: mountain_display, from_display, name: { id: 'display.index' } },
    display_equiv: {
        marked: {
            plain: (m) => mountain_display_marked(m, 'label'),
            html: (m) => mountain_display_marked(m, 'sub'),
            name: { id: 'display.index-marked' },
        },
    },
    simple_name: 'Aω2MN3',
    category_id: 'category-hypcos-w2mn',
    is_limit: mountain_is_limit,
    compare: mountain_compare,
    ...sequence_FS_variants(expand, is_infinity, infinity_FS, mountain_is_limit, mountain_display),
    credit_text_id: 'credit.hypcos_mn',

    init: () => [INFINITY(), []],
};

export const wA_omega2_MN3 = {
    id: 'weak-a-omega2-mn-3',
    name: 'weak Aω2MN3',
    category_id: 'category-hypcos-w2mn',
    display: { plain: mountain_display, from_display, name: { id: 'display.index' } },
    display_equiv: {
        layer: {
            plain: (m) => mountain_display(convert_to_layer(m)),
            name: { id: 'display.layer' },
        },
        marked: {
            plain: (m) => mountain_display_marked(m, 'label'),
            html: (m) => mountain_display_marked(m, 'sub'),
            name: { id: 'display.index-marked' },
        },
    },
    simple_name: 'wAω2MN3',
    is_limit: mountain_is_limit,
    compare: mountain_compare,
    ...sequence_FS_variants(expand_weak, is_infinity, infinity_FS, mountain_is_limit, mountain_display),
    credit_text_id: 'credit.hypcos_mn',
    init: () => [INFINITY(), []],
};

// 分类 'category-hypcos-w2mn' 由 notation/ne/categories.js 提供骨架且无 generator，
// 本文件也无 generator 家族 → register_notation（不用 ensure_category）。
register_notation(A_omega2_MN3);
register_notation(wA_omega2_MN3);
