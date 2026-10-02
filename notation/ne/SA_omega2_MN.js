// ============================================================================
//  notation/ne/SA_omega2_MN.js — Smile's Astral ω2 MN（单体记号，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SMN/SA_omega2_MN.ts（快照 d2d79cd）
//
//  id 与 ne 原 id 的对应：
//    ne 原 id 是 'SA-omega2-MN'（大写、带连字符），
//    本项目沿用旧 id 'sa-omega2-mn'（notation/rewritten/SMN.js 与 ui/notationList.js
//    都在用，存档、别名同样依赖它）以保持兼容。
//
//  分类处理：category_id = 'category-smile-mn'。该分类已由 notation/ne/categories.js
//  的分类骨架以**纯容器**形式注册（无 generator），故本文件用 register_notation
//  直接注册，不需要 ensure_category。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [number, Sep, boolean]（第三位是 * 标记）；
//  Sep = number[]；Vertical = Sep[]；极限哨兵 = Limit_expr()。
//
//  与 ne 原版的差异（全部是接线/语法层面，算法本体逐行照搬）：
//   1) 代数层（极限判定 / 比较 / Sep 运算 / 列垂直向量 / parent / magma_indices /
//      compute_stretch / 层转换）与另外两个 Smile 记号在源文件里逐字相同，按搬运规范
//      抽到共用模块 ./SMN_common.js；源文件 export 出去的那些函数在此按原样再导出，
//      导出面不变。真正分叉的函数（entry_display / copy_column / S / stretch_data_* /
//      subtract_1 / from_display / infinity_FS / display 链 / extend / expand）
//      逐个逐行留在本文件。
//   2) MN_FS_variants 来自 core/ne/notationUtils.js —— 本项目对 ne
//      src/notations/notation_utils.ts 的移植（同输入同输出比对过），不是拷贝。
//   3) 源文件本来就没有 draw_diagram / mountain_view（SAω²MN 原文无绘图），故本文件
//      也没有这两个字段。
//   4) 语法层：去掉类型注解 / type / interface；`SD_top!` 的非空断言（TS 专有）去掉。
// ============================================================================
import { deepcopy } from '../../core/ne/utils.js';
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';
import {
    Limit_expr,
    column_verticals,
    compare,
    compute_stretch,
    convert_from_layer,
    convert_to_layer,
    find_index_below,
    find_index_below_equal,
    is_infinity,
    is_limit,
    magma_indices,
    parent,
    sep_add,
    sep_compare,
    sep_dimension,
    sep_increase,
    sep_is_one,
    sep_sub,
    vertical_compare,
    vertical_increase,
} from './SMN_common.js';

// 源文件把这些 export 出去（ne 侧同族记号与测试会 import），抽到共用模块后按原样再导出。
export {
    Limit_expr,
    column_verticals,
    compare,
    compute_stretch,
    find_index_below,
    find_index_below_equal,
    is_infinity,
    is_limit,
    magma_indices,
    parent,
    sep_add,
    sep_dimension,
    sep_increase,
    sep_is_one,
    sep_sub,
    vertical_increase,
};

// ---------------------------------------------------------------------------
//  SA_omega2_MN.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

export function display(m) {
    return is_infinity(m) ? 'Limit' : mountain_display(m);
}

function mountain_display(m) {
    return m.map(column_display).join('');
}

function column_display(c) {
    return '(' + c.map(entry_display).join('') + ')';
}

function entry_display([v, sep, mark]) {
    return sep_display(sep) + (mark ? '*' : '') + v;
}

function sep_display(sep) {
    return ';'.repeat(sep[1]) + ','.repeat(sep[0]);
}

function from_display(str) {
    if (str === 'Limit') return Limit_expr();

    function normalizeSep(s) {
        while (s.length > 0 && s[s.length - 1] === 0) s.pop();
        return s;
    }

    function parseSimpleSep(start) {
        let c0 = 0,
            c1 = 0;
        while (start + c1 < str.length && str[start + c1] === ';') c1++;
        while (start + c1 + c0 < str.length && str[start + c1 + c0] === ',') c0++;
        return [normalizeSep([c0, c1]), start + c1 + c0];
    }

    function parseExprPrefix(start) {
        const Mountain = [];
        let i = start;
        while (i < str.length && str[i] === '(') {
            i++;
            const col = [];
            while (i < str.length && str[i] !== ')') {
                const [sep, nextI] = parseSimpleSep(i);
                i = nextI;
                let mark = i < str.length && str[i] === '*';
                if (mark) i++;
                let valueStart = i;
                while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
                const valueStr = str.substring(valueStart, i);
                if (valueStr === '') throw new Error('illegal input string: ' + str);
                col.push([parseInt(valueStr), sep, mark]);
            }
            Mountain.push(col);
            if (i === str.length || str[i] !== ')') throw new Error('illegal input string: ' + str);
            i++;
        }
        return [Mountain, i];
    }

    const [result, end] = parseExprPrefix(0);
    if (end !== str.length) throw new Error('illegal input string: ' + str);
    return result;
}

function S(c, j) {
    if (j > c.length) return S(c, j - 1);
    if (j < 0) return [];
    if (c[j][1][1]) return [];
    if (c[j][2]) return c[j][1];
    return S(c, j - 1);
}

export function stretch_data_top(m, V) {
    const right = m.length - 1;
    const top = m[right].length - 1;
    const [Ri, Rj] = parent(m, V, [right, top]);

    if (m[right][top][1][0] === 0) {
        const threshold = S(m[Ri], Rj - 1);
        let stretch_to = S(m[right], top - 1);
        let force = false;
        if (sep_compare(stretch_to, threshold) <= 0) {
            stretch_to = sep_increase(stretch_to, 0);
            force = true;
        }
        return { threshold, stretch_to, force };
    } else {
        return undefined;
    }
}

export function stretch_data_list(m, V, MI) {
    const right = m.length - 1;
    const top = m[right].length - 1;
    const [Ri, Rj] = parent(m, V, [right, top]);
    const result = [];

    let ref_j = -1;
    for (let j = 0; j < Rj; j++) {
        while (ref_j + 1 <= top && MI[right][ref_j + 1] <= j) ref_j++;
        if (m[Ri][j][1][0] !== 0) {
            result[j] = undefined;
        } else {
            const threshold = S(m[Ri], j - 1);
            const stretch_to = S(m[right], ref_j - 1);
            result[j] = { threshold, stretch_to, force: false };
        }
    }

    result[Rj] = stretch_data_top(m, V);

    return result;
}

export function subtract_1(m, V, SD_top) {
    V = V ?? m.map(column_verticals);
    SD_top = SD_top ?? stretch_data_top(m, V);
    const right = m.length - 1;
    const top = m[right].length - 1;
    const top_right_sep = m[right][top][1];
    const [Ri, Rj] = parent(m, V, [right, top]);

    const result = deepcopy(m);
    result[right].pop();

    const top_right_sep_dimension = sep_dimension(top_right_sep);
    if (sep_is_one(top_right_sep)) {
        // do nothing
    } else if (top_right_sep_dimension === 0) {
        const new_sep = [top_right_sep[0] - 1, ...top_right_sep.slice(1)];

        const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
        const v_bottom = top === 0 ? [] : V[right][top - 1];
        if (vertical_compare(vertical_increase(v_parent, new_sep), v_bottom) > 0) {
            result[right].push([Ri + 1, new_sep, top_right_sep[0] === 0]);
        }
    } else if (SD_top.force) {
        const new_sep = SD_top.stretch_to;
        result[right].push([Ri + 1, new_sep, true]);
    }

    for (let j = Rj; j < m[Ri].length; j++) {
        result[right].push(deepcopy(m[Ri][j]));
    }

    return result;
}

export function copy_column(m0i, MI0i, V0i, mr, MIr, [Ri, Rj], SD, offset, stretch_v_max) {
    const result = [];
    let last_mi = -1;
    let ref_j = 0;
    for (let j = 0; j < m0i.length; j++) {
        if (j >= MI0i.length) {
            let entry = deepcopy(m0i[j]);
            if (entry[0] >= Ri + 1) entry[0] += offset;
            result.push(entry);
        } else {
            const [value, sep, mark] = m0i[j];
            const new_value = value + offset;
            let current_mi = MI0i[j];
            if (current_mi !== last_mi) {
                last_mi = current_mi;
                while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
                    const is_row_lifting =
                        current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
                    if (is_row_lifting) {
                        let [_, ref_sep, ref_mark] = mr[ref_j];
                        result.push([new_value, ref_sep, ref_mark]);
                    }
                    ref_j++;
                }
            }
            const new_sep = vertical_compare(V0i[j], stretch_v_max) > 0 ? sep : compute_stretch(sep, SD[current_mi]);
            result.push([new_value, new_sep, mark]);
        }
    }
    return result;
}

export function extend(m0) {
    const right = m0.length - 1;
    const top = m0[right].length - 1;

    const V0 = m0.map(column_verticals);
    const [Ri, Rj] = parent(m0, V0, [right, top]);
    const MI0 = magma_indices(m0, V0, [Ri, Rj]);
    const SD0 = stretch_data_list(m0, V0, MI0);

    const m = subtract_1(m0, V0, SD0[Rj]);
    const V = [...V0.slice(0, right), column_verticals(m[right])];
    const MI = magma_indices(m, V, [Ri, Rj], MI0.slice(0, right));

    const offset = right - Ri;
    for (let i = Ri + 1; i < m0.length; i++) {
        m.push(copy_column(m0[i], MI0[i], V0[i], m[right], MI[right], [Ri, Rj], SD0, offset, V0[right][top]));
    }
    return m;
}

export function infinity_FS(index) {
    return [[], [[1, [index, 1], false]]];
}

export function expand(m, index, shorter = false) {
    if (is_infinity(m)) return infinity_FS(index);
    if (m.length === 0) return m;
    if (m[m.length - 1].length === 0) return m.slice(0, m.length - 1);
    let current = m;
    for (let i = 0; i < index; ++i) current = extend(current);
    current = shorter ? current.slice(0, current.length - 1) : subtract_1(current);
    return current;
}

function column_display_marked(c, type, index) {
    let result = c.map(entry_display).join('');
    if (type === 'label') result += ':' + index;
    result = '(' + result + ')';
    if (type === 'sub') result += '<sub>' + index + '</sub>';
    return result;
}

function mountain_display_marked(m, type) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col, i) => column_display_marked(col, type, i + 1)).join('');
}

export const SA_omega2_MN = {
    id: 'sa-omega2-mn',
    aliases: ["SA-omega2-MN","SA-omega2-mn"],   // ner-rewritten 里的拼法
    name: "Smile's Astral ω2 MN",
    simple_name: 'SAω2MN',
    category_id: 'category-smile-mn',
    display: { plain: display, from_display: from_display, name: { id: 'display.index' } },
    display_equiv: {
        layer: {
            plain: (m) => display(convert_to_layer(m)),
            from_display: (str) => convert_from_layer(from_display(str)),
            name: { id: 'display.layer' },
        },
        marked: {
            plain: (m) => mountain_display_marked(m, 'label'),
            html: (m) => mountain_display_marked(m, 'sub'),
            name: { id: 'display.index-marked' },
        },
    },
    ...MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),
    is_limit,
    compare,
    credit_text_id: 'credit.n_mn',

    init: () => [Limit_expr(), []],

    debug: { extend, expand, subtract_1, copy_column, stretch_data_list, column_verticals, magma_indices },
};

register_notation(SA_omega2_MN);
