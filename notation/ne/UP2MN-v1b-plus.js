// ============================================================================
//  notation/ne/UP2MN-v1b-plus.js — UP2MN v1B+（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/UPMN/UP2MN-v1b-plus.ts（快照 d2d79cd）
//  注册 id: up2mn-v1b+
//  分类: category-upmn（源文件原文，未改；骨架 notation/ne/categories.js 已预置）
//  表达式 = Column[]，Column = Entry[]，Entry = [number, Sep]（Sep = number）；
//  另有哨兵值 Inf（= 数字 Infinity，见下），故 Expr 可能是 number。
//
//  依赖映射：
//    '@/notations/notation_utils.ts' 的 sequence_FS_variants
//        → ../../core/ne/notationUtils.js（已搬，语义一致）
//    '@/notations/MN/SMN/n_MN.ts' → ./UPMN_utils.js（UPMN 家族共用的 n_MN 基础层）
//    '@/utils.ts' → ../../core/ne/utils.js
//    NotationDefinition / DiagramControl / DiagramData / Diagram / MarkSpec /
//    Mountain / Expr / Column / Entry / Vertical / Position / RelColumn / RelEntry
//        → 纯类型，删除
//
//  与 ne 原版的差异：无（算法、常量、字段逐行照搬）。
//  与 UP2MN-v1b.js 的差异（源文件本身如此，非搬运差异）：
//    - infinity_FS：本文件每列是 [[i-1, 1]]；v1b 是「[i-1,0]×(i-1) 个 + [0,1]」
//    - compute_up_2mn：本文件 p !== Ri 时取 result[p]；v1b 取 false
//    - category_id / id / name / description
//  ⚠ 本文件的 Inf 是**裸数字** `Infinity`，不是 n_MN 的 `[[[Infinity]]]`；
//    两侧靠 to_nMN / from_nMN 做「条目值 +1」换算。
//  ⚠ `settings: draw_diagram_control_nMN.settings` 原样保留：ne 的 n_MN 侧
//    draw_diagram_control 运行时并无 settings（DiagramControl.settings 是可选），
//    故该键值同为 undefined —— 与 TS 编译产物一致。
//  文件末尾自注册（manifest 以 module: true 注入）。
// ============================================================================
import {
    draw_diagram_control as draw_diagram_control_nMN,
    from_display as from_display_nMN,
    from_display_simple as from_display_simple_nMN,
    INFINITY as INFINITY_nMN,
    is_infinity as is_infinity_nMN,
    mountain_display as display_nMN,
    mountain_display_marked as display_marked_nMN,
} from './UPMN_utils.js';
import {
    anti_lex_compare,
    boolean_compare,
    deepcopy,
    lex_compare,
    number_compare,
    tuple_lex_compare,
} from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    const result = [[]];
    for (let i = 1; i <= index; ++i) {
        result[i] = [[i - 1, 1]];
    }
    return result;
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function entry_compare(entry1, entry2) {
    return tuple_lex_compare(entry1, entry2, [number_compare, number_compare]);
}

export function column_compare(col1, col2) {
    return lex_compare(col1, col2, entry_compare);
}

function compare(expr1, expr2) {
    if (is_infinity(expr1) || is_infinity(expr2)) {
        return boolean_compare(is_infinity(expr1), is_infinity(expr2));
    }
    return lex_compare(expr1, expr2, column_compare);
}

function to_nMN(expr) {
    if (is_infinity(expr)) return INFINITY_nMN();
    return expr.map((col) => col.map((entry) => [entry[0] + 1, entry[1]]));
}

function from_nMN(m) {
    if (is_infinity_nMN(m)) return INFINITY;
    return m.map((col) => col.map((entry) => [entry[0] - 1, entry[1]]));
}

function display(expr, simple = false) {
    return display_nMN(to_nMN(expr), simple);
}

function display_marked(expr, mark) {
    return display_marked_nMN(to_nMN(expr), mark);
}

function from_display(str) {
    const m = from_display_nMN(str);
    try {
        return from_nMN(m);
    } catch (_) {
        throw new Error('Illegal input string: ' + str);
    }
}

function from_display_simple(str) {
    const m = from_display_simple_nMN(str);
    try {
        return from_nMN(m);
    } catch (_) {
        throw new Error('Illegal input string: ' + str);
    }
}

function vertical_increase(v, sep) {
    if (v.length <= sep) {
        const result = Array(sep).fill(0);
        result.push(1);
        return result;
    }
    const result = v.slice();
    result[sep]++;
    result.fill(0, 0, sep);
    return result;
}

function column_verticals(col) {
    let current = [];
    const result = [];
    for (let entry of col) {
        current = vertical_increase(current, entry[1]);
        result.push(current);
    }
    return result;
}

function expr_verticals(expr) {
    return expr.map(column_verticals);
}

function vertical_compare(v1, v2) {
    return anti_lex_compare(v1, v2, number_compare);
}

function find_index_below_row(V, v) {
    const working = [[], ...V];
    let l = 0,
        r = V.length;
    if (vertical_compare(v, working[r]) > 0) return r;
    while (l < r) {
        const mid = (l + r + 1) >> 1;
        const cmp = vertical_compare(v, working[mid]);
        if (cmp > 0) l = mid;
        else r = mid - 1;
    }
    return l;
}

function find_index_below_equal_row(V, v) {
    const working = [[], ...V];
    let l = 0,
        r = V.length;
    if (vertical_compare(v, working[r]) >= 0) return r;
    while (l < r) {
        const mid = (l + r + 1) >> 1;
        const cmp = vertical_compare(v, working[mid]);
        if (cmp >= 0) l = mid;
        else r = mid - 1;
    }
    return l;
}

function compute_parent(expr, V, [i, j]) {
    const entry = expr[i][j];
    const pi = entry[0];
    const v = V[i][j];
    const pj = find_index_below_row(V[pi], v);
    return [pi, pj];
}

function parents(expr, V) {
    const result = [];
    for (let i = 0; i < expr.length; i++) {
        result[i] = [];

        for (let j = 0; j < expr[i].length; j++) {
            result[i][j] = compute_parent(expr, V, [i, j]);
        }
    }

    return result;
}

function to_rel_column(col, r) {
    return col.map(([v, s]) => (v >= r ? [true, v - r, s] : [false, v, s]));
}

function compare_rel_column(a, b) {
    return lex_compare(a, b, compare_rel_entry);
}

function compare_rel_entry(a, b) {
    return tuple_lex_compare(a, b, [boolean_compare, number_compare, number_compare]);
}

function compute_up_1mn(expr, P, [Ri, Rj]) {
    const right = expr.length - 1;

    const result = Array(expr.length);
    result.fill(false, 0, Ri);
    result[Ri] = true;

    if (Rj === 0) {
        result.fill(true, Ri);
        return result;
    }

    for (let i = Ri + 1; i < expr.length; i++) {
        const col = expr[i];

        if (col.length <= Rj) {
            result[i] = false;
            continue;
        }

        if (P[i][Rj][0] !== Ri) {
            result[i] = result[P[i][Rj][0]];
            continue;
        }

        const j = col.findIndex((entry) => entry[0] === Ri);
        if (j > 0) {
            let p = i;
            while (P[p][j - 1][0] !== Ri) p = P[p][j - 1][0];

            if (!result[p]) {
                result[i] = false;
                continue;
            }
        }

        // perform UP check
        const X_start = i;
        let Y_start = right;
        while (P[Y_start][j][0] !== Ri) {
            Y_start = P[Y_start][j][0];
        }

        if (Y_start <= X_start) {
            result[i] = X_start === Y_start;
            continue;
        }

        const X0 = expr[X_start].slice(j);
        const Y0 = expr[Y_start].slice(j);
        const cmp_0 = column_compare(X0, Y0);
        if (cmp_0 !== 0) {
            result[i] = cmp_0 > 0;
            continue;
        }

        for (let k = 1; Y_start + k < expr.length; k++) {
            const Xk = to_rel_column(expr[X_start + k], X_start);
            const Yk = to_rel_column(expr[Y_start + k], Y_start);
            const cmp = compare_rel_column(Xk, Yk);
            if (cmp !== 0) {
                result[i] = cmp > 0;
                break;
            }
        }

        if (result[i] === undefined) {
            result[i] = true;
        }
    }

    return result;
}

function compute_up_2mn(expr, P, [Ri, Rj]) {
    const right = expr.length - 1;

    const result = Array(expr.length);
    result.fill(false, 0, Ri);
    result[Ri] = true;

    for (let i = Ri + 1; i < expr.length; i++) {
        const col = expr[i];

        if (col.length <= Rj) {
            result[i] = false;
            continue;
        }

        if (col.length >= Rj + 2) {
            result[i] = result[P[i][Rj][0]];
            continue;
        }

        const is_finite = col[col.length - 1][1] === 0;
        if (is_finite) {
            result[i] = false;
            continue;
        }

        const p = P[i][Rj][0];
        if (p !== Ri) {
            result[i] = result[p];
            continue;
        }

        // perform UP check
        do {
            const X_start = i;
            let Y_start = right;
            while (expr[Y_start].length !== Rj + 1) {
                Y_start = P[Y_start][Rj][0];
            }

            if (Y_start <= X_start) {
                result[i] = X_start === Y_start;
                break;
            }

            for (let k = 1; Y_start + k < expr.length; k++) {
                const Xk = to_rel_column(expr[X_start + k], X_start);
                const Yk = to_rel_column(expr[Y_start + k], Y_start);
                const cmp = compare_rel_column(Xk, Yk);
                if (cmp !== 0) {
                    result[i] = cmp > 0;
                    break;
                }
            }

            if (result[i] === undefined) {
                result[i] = true;
                break;
            }
        } while (false);
    }

    return result;
}

function copy_column(col, [Ri, Rj], offset, y_offset, up) {
    let result = col.map(([v, s]) => [v > Ri ? v + offset : v < Ri ? v : up ? v + offset : v, s]);
    if (up && y_offset > 0) {
        result = [...result.slice(0, Rj), ...Array(y_offset).fill([result[Rj][0], 0]), ...result.slice(Rj)];
    }
    return result;
}

function expand(expr, index, shorter) {
    if (expr.length === 0) return expr;
    const right = expr.length - 1;
    if (expr[right].length === 0) return expr.slice(0, -1);
    const top = expr[right].length - 1;

    const V = expr_verticals(expr);
    const P = parents(expr, V);

    const [Ri, Rj] = P[right][top];

    const is_finite = expr[right][top][1] === 0;

    const up_list = is_finite ? compute_up_1mn(expr, P, [Ri, Rj]) : compute_up_2mn(expr, P, [Ri, Rj]);

    const result = expr.slice(0, -1);
    result.push(expr[right].slice(0, -1));
    if (!is_finite && top === Rj) {
        result[right].push([Ri, 0]);
    }
    result[right].push(...expr[Ri].slice(Rj));

    let y_offset = is_finite ? 0 : Math.max(top - Rj, 1);

    for (let w = 1; w <= index; w++) {
        for (let i = Ri + 1; i <= right; i++) {
            result.push(copy_column(result[i], [Ri, Rj], (right - Ri) * w, y_offset * w, up_list[i]));
        }
    }
    if (shorter) result.pop();
    return result;
}

export function convert_to_layer(om) {
    if (is_infinity(om)) return om;

    const V = om.map(column_verticals);
    const depthMap = [];

    for (let i = 0; i < om.length; i++) {
        depthMap[i] = [];
        for (let j = 0; j < om[i].length; j++) {
            const [pi, pj] = compute_parent(om, V, [i, j]);
            depthMap[i][j] = pj === om[pi].length ? 0 : 1 + depthMap[pi][pj];
        }
    }

    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
        const column = dm[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];
            entry[0] = depthMap[i][j];
        }
    }
    return dm;
}

export function convert_from_layer(dm) {
    if (is_infinity(dm)) return dm;

    const om = deepcopy(dm);

    const V = om.map(column_verticals);

    for (let i = 0; i < om.length; i++) {
        const column = om[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];

            let i1 = i,
                j1 = j - 1;
            while (true) {
                if (i1 === 0) {
                    entry[0] = 0;
                    break;
                }
                if (j1 >= 0) {
                    [i1, j1] = compute_parent(om, V, [i1, j1]);
                } else {
                    i1 = i1 - 1;
                }
                let j0 = find_index_below_equal_row(V[i1], j === 0 ? [] : V[i][j - 1]);
                if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
                    entry[0] = i1;
                    break;
                }
            }
        }
    }

    return om;
}

const draw_diagram_control = {
    default_data: draw_diagram_control_nMN.default_data,
    settings: draw_diagram_control_nMN.settings,
    draw_diagram(expr, data) {
        return draw_diagram_control_nMN.draw_diagram(to_nMN(expr), data);
    },
    handle_action: draw_diagram_control_nMN.handle_action,
};

export const UP2MN_v1b_plus = {
    id: 'up2mn-v1b+',
    name: 'UP2MN v1B+',
    description: [{ id: 'description.up2mn-v1b-plus.1' }, { id: 'description.up2mn-v1b-plus.2' }],
    category_id: 'category-upmn',
    display: {
        plain: (m) => display(m),
        from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        layer: {
            plain: (m) => display(convert_to_layer(m)),
            from_display: (str) => convert_from_layer(from_display(str)),
            name: { id: 'display.layer' },
        },
        marked: {
            plain: (m) => display_marked(m, 'label'),
            html: (m) => display_marked(m, 'sub'),
            from_display: from_display,
            name: { id: 'display.index-marked' },
        },
        simple: {
            plain: (m) => display(m, true),
            from_display: from_display_simple,
            name: { id: 'display.index-simple' },
        },
        'layer simple': {
            plain: (m) => display(convert_to_layer(m), true),
            from_display: (s) => convert_from_layer(from_display_simple(s)),
            name: { id: 'display.layer-simple' },
        },
    },
    draw_diagram: draw_diagram_control,
    ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),
    is_limit,
    compare,
    credit_text_id: 'credit.upmn',

    init: () => [INFINITY, []],
};

register_notation(UP2MN_v1b_plus);
