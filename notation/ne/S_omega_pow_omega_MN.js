// ============================================================================
//  notation/ne/S_omega_pow_omega_MN.js — Smile's ω^ω MN（单体记号，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SMN/S_omega_pow_omega_MN.ts（快照 d2d79cd）
//
//  id 与 ne 原 id 的对应：
//    ne 原 id 是 'S-omega^omega-MN'（大写、带连字符），
//    本项目沿用旧 id 's-omega-pow-omega-mn'（notation/rewritten/SMN.js 与
//    ui/notationList.js 都在用，存档、别名同样依赖它）以保持兼容。
//
//  分类处理：category_id = 'category-smile-mn'。该分类已由 notation/ne/categories.js
//  的分类骨架以**纯容器**形式注册（无 generator），故本文件用 register_notation
//  直接注册，不需要 ensure_category。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [number, Sep]；
//  Sep = number[]（长度 > 2 时显示成 [..] 形式）；Vertical = Sep[]；
//  极限哨兵 = Limit_expr()。
//
//  与 ne 原版的差异（全部是接线/语法层面，算法本体逐行照搬）：
//   1) 代数层（极限判定 / 比较 / Sep 运算 / 列垂直向量 / parent / magma_indices /
//      compute_stretch / 层转换）与另外两个 Smile 记号在源文件里逐字相同，按搬运规范
//      抽到共用模块 ./SMN_common.js；源文件 export 出去的那些函数在此按原样再导出，
//      导出面不变。真正分叉的函数（sep_display 的 [..] 形式 / from_display 的括号解析 /
//      S_default+S / entry_display / copy_column / stretch_data_* / subtract_1 /
//      infinity_FS / display 链 / extend / expand）逐个逐行留在本文件。
//   2) MN_FS_variants 来自 core/ne/notationUtils.js —— 本项目对 ne
//      src/notations/notation_utils.ts 的移植（同输入同输出比对过），不是拷贝。
//   3) draw_diagram 按原文完整接上：ne 的 '@/notations/draw_mountain_diagram.ts'
//      图元层已由本项目搬成 core/ne/drawMountainDiagram.js（导出同名同签名的
//      draw_mountain_diagram(shape, layout, draw)），直接 import 使用；
//      原文的 display_html_row_label: source.display_html_row_label 一并照搬。
//   4) 语法层：去掉类型注解 / type / interface；`SD_top!` 的非空断言（TS 专有）去掉。
// ============================================================================
import { deepcopy } from '../../core/ne/utils.js';
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';
import { draw_mountain_diagram } from '../../core/ne/drawMountainDiagram.js';
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
//  S_omega_pow_omega_MN.ts 正文（逐行照搬，仅去掉类型注解）
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

function entry_display([v, sep]) {
    return sep_display(sep) + v;
}

function sep_display(sep) {
    if (sep.length <= 2) return ';'.repeat(sep[1]) + ','.repeat(sep[0]);
    return '[' + sep.toReversed().join(',') + ']';
}

function from_display(str) {
    if (str === 'Limit') return Limit_expr();

    let i = 0;

    function error() {
        throw new Error('Illegal input string: ' + str);
    }

    function normalize_sep(s) {
        while (s.length > 0 && s[s.length - 1] === 0) s.pop();
        return s;
    }

    function skip_spaces() {
        while (i < str.length && str[i] === ' ') i++;
    }

    function skip_index() {
        if (i < str.length && str[i] === ':') {
            i++;
            skip_spaces();
            while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
        }
    }

    function is_sep_start(ch) {
        return ch === ',' || ch === ';' || ch === '[';
    }

    function parse_sep() {
        if (i < str.length && str[i] === '[') {
            i++; // skip '['
            const parts = [];
            skip_spaces();
            while (i < str.length && str[i] !== ']') {
                const start = i;
                while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
                if (start === i) error();
                parts.push(parseInt(str.substring(start, i), 10));
                skip_spaces();
                if (i < str.length && str[i] === ',') {
                    i++;
                    skip_spaces();
                }
            }
            if (i >= str.length || str[i] !== ']') error();
            i++; // skip ']'
            // display order is reversed from internal order
            return normalize_sep(parts.toReversed());
        }
        // ; and , notation
        let c0 = 0,
            c1 = 0;
        while (i < str.length && str[i] === ';') {
            c1++;
            i++;
        }
        while (i < str.length && str[i] === ',') {
            c0++;
            i++;
        }
        if (c0 === 0 && c1 === 0) error();
        return normalize_sep([c0, c1]);
    }

    function parse_number() {
        const start = i;
        while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
        if (start === i) error();
        return parseInt(str.substring(start, i), 10);
    }

    function parse_parenthesized_column() {
        i++; // skip '('
        const col = [];
        skip_spaces();
        while (i < str.length && str[i] !== ')' && str[i] !== ':') {
            skip_spaces();
            const sep = parse_sep();
            skip_spaces();
            const v = parse_number();
            col.push([v, sep]);
            skip_spaces();
        }
        skip_index();
        skip_spaces();
        if (i >= str.length || str[i] !== ')') error();
        i++; // skip ')'
        return col;
    }

    function parse_unparenthesized_column() {
        skip_spaces();
        if (i >= str.length) error();

        // bare '0' followed by terminator → empty column
        if (
            str[i] === '0' &&
            (i + 1 >= str.length ||
                str[i + 1] === ':' ||
                str[i + 1] === ' ' ||
                str[i + 1] === '(' ||
                is_sep_start(str[i + 1]))
        ) {
            i++;
            skip_index();
            return [];
        }

        const col = [];

        // ':' at start → empty column with column index
        if (str[i] === ':') {
            skip_index();
            return [];
        }

        // entries: separator + value
        while (i < str.length && str[i] !== ' ' && str[i] !== '(' && str[i] !== ':') {
            const sep = parse_sep();
            skip_spaces();
            col.push([parse_number(), sep]);
        }

        skip_index();
        return col;
    }

    const result = [];
    skip_spaces();
    while (i < str.length) {
        if (str[i] === '(') {
            result.push(parse_parenthesized_column());
        } else {
            result.push(parse_unparenthesized_column());
        }
        skip_spaces();
    }
    return result;
}

function S_default(bound) {
    let d = sep_dimension(bound);
    if (d === bound.length - 1 && bound[d] === 1) return [];
    let result = deepcopy(bound);
    result[d]--;
    return result;
}

function S(c, j, bound) {
    if (j > c.length) return S(c, j - 1, bound);
    if (j < 0) return S_default(bound);
    if (sep_compare(c[j][1], bound) >= 0) return S_default(bound);
    let current = c[j][1];
    let previous = S(c, j - 1, bound);
    return sep_compare(current, previous) < 0 ? previous : current;
}

export function stretch_data_top(m, V) {
    const right = m.length - 1;
    const top = m[right].length - 1;
    const [Ri, Rj] = parent(m, V, [right, top]);

    let top_right_sep = m[right][top][1];

    const threshold = S(m[Ri], Rj - 1, top_right_sep);
    let stretch_to = S(m[right], top - 1, top_right_sep);
    let force = false;
    if (sep_is_one(top_right_sep)) {
        // do nothing
    } else if (sep_dimension(top_right_sep) > 0) {
        if (sep_compare(stretch_to, sep_increase(threshold, sep_dimension(top_right_sep) - 1)) < 0) {
            stretch_to = sep_increase(stretch_to, sep_dimension(top_right_sep) - 1);
            force = true;
        }
    } else {
        const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
        const v_bottom = top === 0 ? [] : V[right][top - 1];
        if (vertical_compare(vertical_increase(v_parent, stretch_to), v_bottom) > 0) {
            force = true;
        }
    }
    return { threshold, stretch_to, force };
}

export function stretch_data_list(m, V, MI) {
    const right = m.length - 1;
    const top = m[right].length - 1;
    const [Ri, Rj] = parent(m, V, [right, top]);
    const result = [];

    let ref_j = -1;
    for (let j = 0; j < Rj; j++) {
        while (ref_j + 1 <= top && MI[right][ref_j + 1] <= j) ref_j++;
        let current_top_sep = m[Ri][j][1];
        const threshold = S(m[Ri], j - 1, current_top_sep);
        const stretch_to = S(m[right], ref_j - 1, current_top_sep);
        result[j] = { threshold, stretch_to, force: false };
    }

    result[Rj] = stretch_data_top(m, V);

    return result;
}

export function subtract_1(m, V, SD_top) {
    V = V ?? m.map(column_verticals);
    SD_top = SD_top ?? stretch_data_top(m, V);
    const right = m.length - 1;
    const top = m[right].length - 1;
    const [Ri, Rj] = parent(m, V, [right, top]);

    const result = deepcopy(m);
    result[right].pop();

    if (SD_top.force) {
        const new_sep = SD_top.stretch_to;
        result[right].push([Ri + 1, new_sep]);
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
            const [value, sep] = m0i[j];
            const new_value = value + offset;
            let current_mi = MI0i[j];
            if (current_mi !== last_mi) {
                last_mi = current_mi;
                while (ref_j < MIr.length && MIr[ref_j] === current_mi) {
                    const is_row_lifting =
                        current_mi === Rj || (ref_j + 1 < MIr.length && MIr[ref_j + 1] === current_mi);
                    if (is_row_lifting) {
                        let [_, ref_sep] = mr[ref_j];
                        result.push([new_value, ref_sep]);
                    }
                    ref_j++;
                }
            }
            const new_sep = vertical_compare(V0i[j], stretch_v_max) > 0 ? sep : compute_stretch(sep, SD[current_mi]);
            result.push([new_value, new_sep]);
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
    return [[], [[1, [...Array.from({ length: index }, () => 0), 1]]]];
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

function vertical_display(v) {
    return v.map(sep_display).join('/');
}

function sep_cantor_display(s) {
    const result = [];
    for (let j = s.length - 1; j >= 0; j--) {
        const v = s[j];
        if (v > 0) {
            if (j === 0) result.push('' + v);
            else {
                const prim = j > 1 ? 'ω<sup>' + j + '</sup>' : 'ω';
                result.push(v > 1 ? prim + v : prim);
            }
        }
    }
    if (result.length === 0) return '0';
    return result.join('+');
}

function vertical_cantor_display(v) {
    const result = v.map(sep_cantor_display).map((x) => (x === '0' ? '1' : x === '1' ? 'ω' : 'ω<sup>' + x + '</sup>'));
    return result.length === 0 ? '0' : result.join('+');
}

/** 由表达式与等价表示算出"形状 + 布局选项"：画布版与 HTML 版共用这一份数据。 */
function build_s_omega_pow_omega_mn_mountain_source(expr, current_equiv) {
    if (is_infinity(expr) || expr.length === 0) return undefined;

    const m = expr;
    const m_display = current_equiv?.includes('layer') ? convert_to_layer(expr) : expr;
    const V = m.map(column_verticals);

    // 每列第 0 个节点是底行哨兵（vertical 为 []、文字 '*'）：空行因此参与排序，也是左腿的落点。
    const shape = m.map((col, i) => {
        const nodes = [{ vertical: [], text: '*' }];
        for (let j = 0; j < col.length; j++) {
            const [pi, pj] = parent(m, V, [i, j]);
            const node = { vertical: V[i][j], text: '' + m_display[i][j][0] };
            // 哨兵占列内位置 0，故“父项下方一格”的落点正是位置 pj。
            if (pi !== -1) node.leg_target = [pi, pj];
            nodes.push(node);
        }
        return nodes;
    });

    return {
        shape,
        layout: {
            vertical_display,
            vertical_compare,
            // 本记号行距一律相同：每个间隙一条分割线，行距 40px。
            separator_count: () => 1,
            row_label: vertical_cantor_display,
        },
        display_html_row_label: true,
    };
}

/** 计算层：把 Sω↑ωMN 的山脉化为形状，交给通用绘制函数。 */
function draw_s_omega_pow_omega_mn_mountain_diagram(expr, current_equiv, invert_vertical) {
    const source = build_s_omega_pow_omega_mn_mountain_source(expr, current_equiv);
    if (!source) return undefined;
    return draw_mountain_diagram(source.shape, source.layout, {
        invert_vertical,
        display_html_row_label: source.display_html_row_label,
    });
}

const draw_diagram_control = {
    default_data: { current_equiv: undefined, invert_vertical: undefined },
    draw_diagram: (_expr, _data) =>
        draw_s_omega_pow_omega_mn_mountain_diagram(_expr, _data.current_equiv, _data.invert_vertical ?? false),
    handle_action: (data, action) => {
        if (action.type === 'scroll') {
            if (action.direction === 'down') {
                return { ...data, invert_vertical: true };
            } else if (action.direction === 'up') {
                return { ...data, invert_vertical: false };
            }
        }
        return null;
    },
};

export const S_omega_pow_omega_MN = {
    id: 's-omega-pow-omega-mn',
    name: "Smile's ω^ω MN",
    simple_name: 'Sω^ωMN',
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
    draw_diagram: draw_diagram_control,
    mountain_view: (expr, data) => build_s_omega_pow_omega_mn_mountain_source(expr, data?.current_equiv),
    credit_text_id: 'credit.n_mn',

    init: () => [Limit_expr(), []],

    debug: { extend, expand, subtract_1, copy_column, stretch_data_list, column_verticals, magma_indices },
};

register_notation(S_omega_pow_omega_MN);
