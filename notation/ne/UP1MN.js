// ============================================================================
//  notation/ne/UP1MN.js — UP1MN（Unupgrading Projection 1MN，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/UPMN/UP1MN.ts（快照 d2d79cd）
//  注册 id: up1mn
//  分类: category-upmn（源文件原文，未改；骨架 notation/ne/categories.js 已预置）
//  表达式 = Column[]，Column = Entry[]，Entry = number（1-based 的列标）
//
//  依赖映射：
//    '@/utils.ts'                → ../../core/ne/utils.js
//    '@/notations/notation_utils.ts' 的 sequence_FS_variants
//                                → ../../core/ne/notationUtils.js（已搬，语义一致）
//    '@/notations/MN/SMN/n_MN.ts' → ./UPMN_utils.js（UPMN 家族共用的 n_MN 基础层，
//       取其中 UP1MN 用到的 7 个成员；详见该文件头「为什么在 UPMN 名下搬 n_MN 基础层」）
//    NotationDefinition / DiagramControl / DiagramData / MarkSpec / Mountain /
//    Diagram / Expr / Column / Entry / RelEntry / RelColumn → 纯类型，删除
//
//  ⚠ 缺一个导出，故少一个（源码内**无任何调用点**的死代码）自检函数：
//    - 依赖：`UP1MN.ts` 从 '@/notations/BM-like/UPMS.ts' 取 `UPMS`，用于
//      `verify_with_upms()`（该函数在 ne 全仓只被定义、从不被调用，也不导出）。
//      本项目尚未搬 notation/ne/UPMS.js（MIGRATION-NOTES 未开始清单：BM 系其余）。
//      若强行 import './UPMS.js' 会让本文件装载失败，故未搬入该函数与那条 import；
//      除此之外 UP1MN.ts 第 1–315 行逐行照搬（含同样无人调用的
//      verify_layer_reversible —— 它只依赖本文件内函数，已原样保留）。
//      待 notation/ne/UPMS.js 落地后，把 [MISSING-DEP] 处的 import 与函数补回即可。
//
//  算法本体零改动；文件末尾自注册（manifest 以 module: true 注入）。
// ============================================================================
import { boolean_compare, deepcopy, lex_compare, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import {
    draw_diagram_control as draw_diagram_control_nMN,
    from_display as from_display_nMN,
    from_display_simple as from_display_simple_nMN,
    INFINITY as INFINITY_nMN,
    is_infinity as is_infinity_nMN,
    mountain_display as display_nMN,
    mountain_display_marked as display_marked_nMN,
} from './UPMN_utils.js';
// [MISSING-DEP] import { UPMS } from './UPMS.js';  // 未搬：src/notations/BM-like/UPMS.ts
import { register_notation } from '../../core/ne/registry.js';

const INFINITY = Infinity;

function is_infinity(e) {
    return e === INFINITY;
}

function infinity_FS(index) {
    return [[], Array.from({ length: index + 1 }, () => 0)];
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare(a, b) {
    return lex_compare(a, b, compare_column);
}

function compare_column(a, b) {
    return lex_compare(a, b, number_compare);
}

function compare_rel_column(a, b) {
    return lex_compare(a, b, compare_rel_entry);
}

function compare_rel_entry(a, b) {
    return tuple_lex_compare(a, b, [boolean_compare, number_compare]);
}

function to_rel_column(col, r) {
    return col.map((v) => (v >= r ? [true, v - r] : [false, v]));
}

function compute_up(expr, r, b) {
    const right = expr.length - 1;

    const result = Array(expr.length);
    result.fill(false, 0, r);
    result[r] = true;

    for (let i = r + 1; i < expr.length; i++) {
        const col = expr[i];

        if (col.length <= b) {
            result[i] = false;
            continue;
        }

        if (col[b] !== r) {
            result[i] = result[col[b]];
            continue;
        }

        const j = col.findIndex((v) => v === r);
        if (j > 0) {
            let p = i;
            while (expr[p][j - 1] !== r) p = expr[p][j - 1];

            if (!result[p]) {
                result[i] = false;
                continue;
            }
        }

        // perform UP check
        const X_start = i;
        let Y_start = right;
        while (expr[Y_start][j] !== r) Y_start = expr[Y_start][j];

        if (Y_start <= X_start) {
            result[i] = X_start === Y_start;
            continue;
        }

        const X0 = expr[X_start].slice(j);
        const Y0 = expr[Y_start].slice(j);
        const cmp_0 = lex_compare(X0, Y0, number_compare);
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

function copy_column(col, r, offset, up) {
    return col.map((v) => (v > r ? v + offset : v < r ? v : up ? v + offset : v));
}

function expand(expr, index, shorter) {
    if (expr.length === 0) return expr;
    const right = expr.length - 1;
    if (expr[right].length === 0) return expr.slice(0, -1);
    const top = expr[right].length - 1;
    const r = expr[right][top];

    const up_list = compute_up(expr, r, top);

    const result = expr.slice(0, -1);
    result.push([...expr[right].slice(0, -1), ...expr[r].slice(top)]);

    for (let w = 1; w <= index; w++) {
        for (let i = r + 1; i <= right; i++) {
            result.push(copy_column(result[i], r, (right - r) * w, up_list[i]));
        }
    }
    if (shorter) result.pop();
    return result;
}

function to_nMN(expr) {
    if (is_infinity(expr)) return INFINITY_nMN();
    return expr.map((col) => col.map((v) => [v + 1, 0]));
}

function from_nMN(m) {
    if (is_infinity_nMN(m)) return INFINITY;
    if (!m.every((col) => col.every((entry) => entry[1] === 0))) {
        throw new Error();
    }
    return m.map((col) => col.map((entry) => entry[0] - 1));
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

export function convert_to_layer(om) {
    if (is_infinity(om)) return om;

    const depthMap = [];

    for (let i = 0; i < om.length; i++) {
        depthMap[i] = [];
        for (let j = 0; j < om[i].length; j++) {
            const pi = om[i][j];
            depthMap[i][j] = j >= om[pi].length ? 0 : 1 + depthMap[pi][j];
        }
    }

    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
        const column = dm[i];
        for (let j = 0; j < column.length; j++) {
            column[j] = depthMap[i][j];
        }
    }
    return dm;
}

export function convert_from_layer(dm) {
    if (is_infinity(dm)) return dm;

    const om = deepcopy(dm);

    for (let i = 0; i < om.length; i++) {
        const column = om[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];

            let i1 = i;
            while (true) {
                if (i1 === 0) {
                    column[j] = 0;
                    break;
                }
                if (j > 0) {
                    i1 = om[i1][j - 1];
                } else {
                    i1 = i1 - 1;
                }
                if (j >= dm[i1].length || dm[i1][j] < entry) {
                    column[j] = i1;
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

function to_upms(expr) {
    return convert_to_layer(expr).map((col) => col.map((v) => v + 1));
}

function verify_layer_reversible(e) {
    if (is_infinity(e)) return true;
    return compare(e, convert_from_layer(convert_to_layer(e))) === 0;
}

// [MISSING-DEP] 源码此处还有 verify_with_upms(e)（依赖未搬的 UPMS，且全仓无调用点）。
// 补回时取消上面那条 import，并逐字恢复：
//
// function verify_with_upms(e) {
//     if (is_infinity(e)) return true;
//
//     const e_upms = to_upms(e);
//     const e2 = UP1MN.FS(e, 2);
//     const e_upms2 = UPMS.FS(e_upms, 2);
//
//     return UPMS.compare(to_upms(e2), e_upms2) === 0;
// }

export const UP1MN = {
    id: 'up1mn',
    name: 'UP1MN',
    description: [{ id: 'description.up1mn' }],
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
    credit_text_id: 'credit.up1mn',

    init: () => [INFINITY, []],
};

register_notation(UP1MN);
