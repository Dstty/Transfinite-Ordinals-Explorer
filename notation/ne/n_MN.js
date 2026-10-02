// ============================================================================
//  notation/ne/n_MN.js — non triangular nMN 家族（generator 家族，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SMN/n_MN.ts（快照 d2d79cd）
//
//  id 与 ne 原 id 的对应：
//    ne 原 id 是 n + '-MN'（大写、形如 '1-MN'），
//    本项目沿用旧 id n + '-mn'（'1-mn'..'8-mn'，notation/rewritten/n-MN.js 与
//    ui/notationList.js 的 n-mn 家族都用它，存档、别名同样依赖它）以保持兼容。
//
//  注册 id 列表：1-mn, 2-mn, 3-mn, 4-mn, 5-mn, 6-mn, 7-mn, 8-mn
//  （generator start = 1；**initial 由 ne 的 3 调到 8** —— 旧条目
//   notation/rewritten/n-MN.js 静态注册了 1..8，本项目尚未接 generator UI 的「+」，
//   调到 8 才能覆盖同样多的档位、不缩水。这是本文件相对 ne 唯一改动的常量。）
//
//  分类处理：category_id = 'category-n-mn'（父分类 'category-mn'，已由
//  notation/ne/categories.js 骨架注册）。该分类**在骨架里没有**（骨架注释明确说
//  带 generator 的分类不预注册），故本文件用 ensure_category() 注册分类并水合成员：
//  不存在则注册，已存在但缺 generator 则补上并立即水合，幂等。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [number, Sep]；
//  Sep = number（注意：与 Smile 系不同，这里的 Sep 是标量 number）；
//  Vertical = Sep[]；极限哨兵 = INFINITY()。
//
//  与 ne 原版的差异（全部是接线/语法层面，算法本体逐行照搬）：
//   1) is_infinity / is_limit 在 n_MN.ts 里与同目录 Smile 系三个文件逐字相同，按搬运
//      规范抽到共用模块 ./SMN_common.js；源文件 export 了它们（UPMN 系记号会
//      import），故此处按原样再导出。其余函数之所以不外抽：本记号的 Sep 是标量、
//      Smile 系是数组，vertical_compare / sep_compare 等分叉会沿调用链一路传下去
//      （parent / magma_indices / column_verticals / convert_* 都绑在这条链上），
//      外抽会绑到错误的比较器，故逐个逐行留在本文件。
//   2) MN_FS_variants 来自 core/ne/notationUtils.js —— 本项目对 ne
//      src/notations/notation_utils.ts 的移植（同输入同输出比对过），不是拷贝。
//   3) draw_diagram 按原文完整接上：ne 的 '@/notations/draw_mountain_diagram.ts'
//      图元层已由本项目搬成 core/ne/drawMountainDiagram.js（导出同名同签名的
//      draw_mountain_diagram(shape, layout, draw)），直接 import 使用；
//      mountain_view 的纯数据部分（build_n_mn_mountain_source）照原文保留。
//   4) 语法层：去掉类型注解 / type / interface。
// ============================================================================
import { boolean_compare, deepcopy, lex_compare, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { ensure_category } from '../../core/ne/registry.js';
import { draw_mountain_diagram } from '../../core/ne/drawMountainDiagram.js';
import { is_infinity, is_limit } from './SMN_common.js';

// 源文件 export 了这两个判定（notation/ne 侧 UPMN 系移植时会 import），按原样再导出。
export { is_infinity, is_limit };

// ---------------------------------------------------------------------------
//  n_MN.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

export function INFINITY() {
    return [[[Infinity]]];
}

export function to_data_key(m) {
    return mountain_display(m, true);
}

export function mountain_display(m, simple) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col) => column_display(col, simple)).join(simple ? ' ' : '');
}

function column_display(c, simple) {
    if (simple && c.length === 0) return '0';
    let result = c.map((e) => entry_display(e, simple)).join('');
    return simple ? result : '(' + result + ')';
}

export function entry_display([v, sep], simple) {
    let d_sep = sep_display(sep, simple);
    let d_v = '' + v;
    if (simple && d_v.length >= 2) d_v = '(' + d_v + ')';
    return d_sep + d_v;
}

function sep_display(sep, simple) {
    if (simple && sep === 0) return '';
    return ','.repeat(sep + 1);
}

function vertical_display(v) {
    return v.map((s) => sep_display(s, false)).join('/');
}

export function mountain_display_marked(m, type) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col, i) => column_display_marked(col, type, i + 1)).join('');
}

function column_display_marked(c, type, index) {
    let result = c.map((e) => entry_display(e, false)).join('');
    if (type === 'label') result += ':' + index;
    result = '(' + result + ')';
    if (type === 'sub') result += '<sub>' + index + '</sub>';
    return result;
}

export function from_display(str) {
    if (str === 'Limit') return INFINITY();

    let i = 0;

    function error() {
        throw new Error('Illegal input string: ' + str);
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

    function parse_sep() {
        let count = 0;
        while (i < str.length && str[i] === ',') {
            count++;
            i++;
        }
        return count === 0 ? 0 : count - 1;
    }

    function parse_number() {
        const start = i;
        while (i < str.length && str[i] >= '0' && str[i] <= '9') i++;
        if (start === i) error();
        return parseInt(str.substring(start, i), 10);
    }

    function parse_parenthesized_column() {
        i++;
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
        i++;
        return col;
    }

    function parse_unparenthesized_column() {
        skip_spaces();
        if (i >= str.length) error();
        if (
            str[i] === '0' &&
            (i + 1 >= str.length ||
                str[i + 1] === ':' ||
                str[i + 1] === ' ' ||
                str[i + 1] === '(' ||
                str[i + 1] === ',')
        ) {
            i++;
            skip_index();
            return [];
        }
        const col = [];
        while (i < str.length && str[i] !== ' ' && str[i] !== '(' && str[i] !== ':') {
            if (str[i] === ',') {
                const sep = parse_sep();
                skip_spaces();
                const v = parse_number();
                col.push([v, sep]);
            } else {
                error();
            }
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

export function from_display_simple(s) {
    let i = 0;

    function error() {
        throw new Error('Illegal input string: ' + s);
    }

    function skip_spaces() {
        while (i < s.length && s[i] === ' ') i++;
    }

    function parse_sep() {
        let count = 0;
        while (i < s.length && s[i] === ',') {
            count++;
            i++;
        }
        return count === 0 ? 0 : count - 1;
    }

    function parse_entry() {
        const sep = parse_sep();
        let v;
        if (i < s.length && s[i] === '(') {
            i++;
            const start = i;
            while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
            if (start === i) error();
            if (i >= s.length || s[i] !== ')') error();
            v = parseInt(s.substring(start, i), 10);
            i++;
        } else if (i < s.length && s[i] >= '0' && s[i] <= '9') {
            v = s.charCodeAt(i) - 48;
            i++;
        } else {
            error();
        }
        return [v, sep];
    }

    function parse_column() {
        const col = [];
        while (i < s.length && s[i] !== ' ') {
            col.push(parse_entry());
        }
        return col;
    }

    function parse_expr() {
        const result = [];
        while (true) {
            skip_spaces();
            if (i >= s.length) break;
            if (s[i] === '0' && (i + 1 >= s.length || s[i + 1] === ' ')) {
                result.push([]);
                i++;
                continue;
            }
            result.push(parse_column());
        }
        return result;
    }

    skip_spaces();
    if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
        i += 5;
        skip_spaces();
        if (i !== s.length) error();
        return INFINITY();
    }

    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return result;
}

function sep_compare(s1, s2) {
    return number_compare(s1, s2);
}

function vertical_compare(v1, v2) {
    return lex_compare(v1, v2, sep_compare);
}

function entry_compare(e1, e2) {
    return tuple_lex_compare(e1, e2, [number_compare, number_compare]);
}

export function column_compare(c1, c2) {
    return lex_compare(c1, c2, entry_compare);
}

function mountain_compare(m1, m2) {
    return lex_compare(m1, m2, column_compare);
}

export function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
        return boolean_compare(is_infinity(a), is_infinity(b));
    }
    return mountain_compare(a, b);
}

export function vertical_diff(v1, v2) {
    let i = 0;
    while (i < v2.length && v1[i] === v2[i]) i++;
    return v1[i];
}

export function vertical_increase(v, s) {
    let i = v.length;
    while (i - 1 >= 0 && sep_compare(v[i - 1], s) < 0) i--;
    return [...v.slice(0, i), s];
}

export function column_verticals(c) {
    const result = [];
    let current = [];
    for (let e of c) {
        result.push((current = vertical_increase(current, e[1])));
    }
    return result;
}

export function find_index_below(Vi, v) {
    let l = 0,
        r = Vi.length;
    while (l < r) {
        const j = Math.ceil((l + r) / 2);
        const Vij = j === 0 ? [] : Vi[j - 1];
        if (vertical_compare(Vij, v) < 0) l = j;
        else r = j - 1;
    }
    return l;
}

export function find_index_below_equal(Vi, v) {
    let l = 0,
        r = Vi.length;
    while (l < r) {
        const j = Math.ceil((l + r) / 2);
        const Vij = j === 0 ? [] : Vi[j - 1];
        if (vertical_compare(Vij, v) <= 0) l = j;
        else r = j - 1;
    }
    return l;
}

export function parent(m, V, [i, j]) {
    const [value, _] = m[i][j];
    const pi = value - 1;
    const pj = pi === -1 ? 0 : find_index_below(V[pi], V[i][j]);
    return [pi, pj];
}

export function magma_indices(m, V, [Ri, Rj], MI_partial) {
    const result = MI_partial ?? [];
    for (let i = result.length; i < m.length; i++) {
        result.push([]);
        if (i <= Ri) {
            // do nothing
        } else {
            for (let j = 0; j < m[i].length; j++) {
                let [pi, pj] = parent(m, V, [i, j]);
                if (pi < Ri) {
                    break;
                } else if (pi === Ri) {
                    result[i][j] = Math.min(pj, Rj);
                } else {
                    if (pj === m[pi].length) pj--;
                    if (pj >= result[pi].length) break;
                    result[i][j] = result[pi][pj];
                }
            }
        }
    }

    return result;
}

export function fill_ghost(m0) {
    const m = deepcopy(m0);
    const V = m.map(column_verticals);

    for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < m[i].length; j++) {
            const [pi, pj] = parent(m, V, [i, j]);
            if (pj !== m[pi].length) continue;
            const v_parent = pj === 0 ? [] : V[pi][pj - 1];
            const v = V[i][j];
            const [_, sep] = m[i][j];
            if (vertical_compare(vertical_increase(v_parent, sep), v) < 0) {
                m[pi].push([0, v[v.length - 2]]);
                V[pi].push(v.slice(0, v.length - 1));
            }
        }
    }

    return m;
}

export function clear_ghost(m) {
    return m.map((c) => c.filter((e) => e[0] !== 0));
}

export function subtract_1(m, V) {
    V = V ?? m.map(column_verticals);
    const right = m.length - 1;
    const top = m[right].length - 1;
    const top_right_sep = m[right][top][1];
    const [Ri, Rj] = parent(m, V, [right, top]);

    const result = deepcopy(m);
    result[right].pop();

    if (top_right_sep > 0) {
        const new_sep = top_right_sep - 1;
        const v_parent = Rj === 0 ? [] : V[Ri][Rj - 1];
        const v_bottom = top === 0 ? [] : V[right][top - 1];
        if (vertical_compare(vertical_increase(v_parent, new_sep), v_bottom) > 0) {
            result[right].push([Ri + 1, new_sep]);
        }
    }

    for (let j = Rj; j < m[Ri].length; j++) {
        result[right].push(deepcopy(m[Ri][j]));
    }

    return result;
}

export function copy_column(m0i, MI0i, mr, MIr, [Ri, Rj], offset) {
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
            result.push([new_value, sep]);
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

    const m = subtract_1(m0, V0);
    const V = [...V0.slice(0, right), column_verticals(m[right])];
    const MI = magma_indices(m, V, [Ri, Rj], MI0.slice(0, right));

    const offset = right - Ri;
    for (let i = Ri + 1; i < m0.length; i++) {
        m.push(copy_column(m0[i], MI0[i], m[right], MI[right], [Ri, Rj], offset));
    }
    return m;
}

export function NT_infinity_FS(n) {
    return (index) => [[], Array.from({ length: index }, () => [1, n - 1])];
}

export function expand(m, index, shorter = false) {
    if (is_infinity(m)) throw new Error('Illegal state');
    if (m.length === 0) return m;
    if (m[m.length - 1].length === 0) return m.slice(0, m.length - 1);
    let current = fill_ghost(m);
    for (let i = 0; i < index; ++i) current = extend(current);
    current = shorter ? current.slice(0, current.length - 1) : subtract_1(current);
    current = clear_ghost(current);
    return current;
}

function calc_ancestor_depths(m) {
    const V = m.map(column_verticals);
    const depthMap = [];

    for (let i = 0; i < m.length; i++) {
        depthMap[i] = [];
        for (let j = 0; j < m[i].length; j++) {
            const [pi, pj] = parent(m, V, [i, j]);
            depthMap[i][j] = pj === m[pi].length ? 1 : 1 + depthMap[pi][pj];
        }
    }
    return depthMap;
}

export function convert_to_layer(om) {
    if (is_infinity(om)) return om;

    const depthMap = calc_ancestor_depths(om);
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

    let V = om.map(column_verticals);
    for (let i = 0; i < om.length; i++) {
        const column = om[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];

            let i1 = i,
                j1 = j - 1;
            while (true) {
                if (i1 === 0) {
                    entry[0] = 1;
                    break;
                }
                if (j1 >= 0) {
                    [i1, j1] = parent(om, V, [i1, j1]);
                } else {
                    i1 = i1 - 1;
                }
                let j0 = find_index_below_equal(V[i1], j === 0 ? [] : V[i][j - 1]);
                if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
                    entry[0] = i1 + 1;
                    break;
                }
            }
        }
    }

    return om;
}

/** 计算层：把 n-MN 的山脉化为"形状 + 布局"，画布版与 HTML 版共用这一份数据。 */
function build_n_mn_mountain_source(expr, current_equiv) {
    if (is_infinity(expr) || expr.length === 0) return undefined;

    const m = fill_ghost(expr);
    const m_display = current_equiv?.includes('layer') ? convert_to_layer(expr) : expr;
    const V = m.map(column_verticals);

    // 每列第 0 个节点是底行哨兵（vertical 为 []、文字 '*'）：空行因此参与排序，也是左腿的落点。
    const shape = m.map((col, i) => {
        const nodes = [{ vertical: [], text: '*' }];
        for (let j = 0; j < col.length; j++) {
            const [pi, pj] = parent(m, V, [i, j]);
            const node = {
                vertical: V[i][j],
                text: j < m_display[i].length ? entry_display(m_display[i][j], false) : '*',
            };
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
            // vertical_diff 给出的是相邻两行的间隔数，分割线数量为其 + 1。
            separator_count: (higher, lower) => vertical_diff(higher, lower) + 1,
        },
    };
}

function draw_n_mn_mountain_diagram(expr, current_equiv, invert_vertical) {
    const source = build_n_mn_mountain_source(expr, current_equiv);
    if (!source) return undefined;
    return draw_mountain_diagram(source.shape, source.layout, { invert_vertical });
}

export const draw_diagram_control = {
    default_data: { current_equiv: undefined, invert_vertical: undefined },
    draw_diagram: (_expr, _data) =>
        draw_n_mn_mountain_diagram(_expr, _data.current_equiv, _data.invert_vertical ?? false),
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

export const category_n_mn = {
    id: 'category-n-mn',
    name: 'n-MN',
    parent_id: 'category-mn',
    // initial: ne 原版是 3（只水合 1-MN..3-MN，更高档位靠 UI 的「+」生成）；
    // 旧条目 notation/rewritten/n-MN.js 静态注册了 1-mn..8-mn，本项目尚未接
    // generator UI，故调到 8 覆盖同样档位（详见文件头）。
    generator: { start: 1, initial: 8, create: (n) => n_MN(n) },
};

export function n_MN(n) {
    return {
        id: n + '-mn', // ne 原 id 是 n + '-MN'
        name: 'non triangular ' + n + 'MN',
        simple_name: n + 'MN',
        category_id: 'category-n-mn',
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
        mountain_view: (expr, data) => build_n_mn_mountain_source(expr, data?.current_equiv),
        ...MN_FS_variants(expand, is_infinity, NT_infinity_FS(n), is_limit, to_data_key),
        is_limit,
        compare,
        credit_text_id: 'credit.n_mn',

        init: () => [INFINITY(), []],
    };
}

// 分类注册后立即水合其下属成员（ensure_category 内部完成；幂等，可安全重跑）
ensure_category(category_n_mn);
