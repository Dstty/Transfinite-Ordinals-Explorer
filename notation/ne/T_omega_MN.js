// ============================================================================
//  notation/ne/T_omega_MN.js — Transfinite ω mountain notation（TωMN，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/T_omega_MN.ts（快照 d2d79cd）
//  注册 id: t-omega-mn（与旧条目 notation/legacy/TomegaMN.js 保持同一 id）
//  表达式 = Column[]，Column = Entry[]，Entry = [number, Sep]，Sep = Expr（递归山形）
//  极限哨兵 INFINITY() = [[[Infinity]]]（'' + m === 'Infinity'）
//
//  分类处理：category_id = 'category-mn'。该分类已由 notation/ne/categories.js
//  骨架以「纯容器、无 generator」形式注册，故本文件直接 register_notation，
//  不需要 ensure_category。
//
//  与 ne 原版的差异：仅类型注解去除 + import 路径（见下），算法本体逐行照搬。
//    1) deepcopy / lex_compare 来自 '../../core/ne/utils.js'（ne 的 @/utils.ts 的
//       本项目移植版），语义与 ne 一致。
//    2) 源文件本身**没有** draw_diagram / mountain_view / debug 字段（TωMN 原文无绘图层），
//       故本文件也不提供；不存在"省略未搬模块"的差异。
//    3) 无 generator / 无 initial 调整（单体记号，源文件 init 返回两个表达式）。
//
//  ⚠ 模块级 data / data_short 两个展开缓存（以 mountain_display(m, true) 为键）
//    按原文保留 —— 它们是该记号 FS 语义的一部分，不能去掉。
// ============================================================================
import { deepcopy, lex_compare } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';

// ---------------------------------------------------------------------------
//  T_omega_MN.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

const data = new Map();
const data_short = new Map();

function is_infinity(m) {
    return '' + m === 'Infinity';
}

function INFINITY() {
    return [[[Infinity]]];
}

function entry_compare(a, b) {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return mountain_compare(a[1], b[1]);
}

function column_compare(a, b) {
    return lex_compare(a, b, entry_compare);
}

function mountain_compare(a, b) {
    return lex_compare(a, b, column_compare);
}

function mountain_is_limit(m) {
    return m.length > 0 && m[m.length - 1].length > 0;
}

function mountain_is_one(m) {
    return m.length === 1 && m[0].length === 0;
}

function sep_display(sep, simple) {
    if (sep.every((col) => !col.length)) {
        let sep_len = sep.length;
        if (sep_len === 1 && simple) return '';
        return ','.repeat(sep_len);
    }
    let d_m = mountain_display(sep, simple);
    return simple ? '[' + d_m + ']' : d_m;
}

function entry_display([v, sep], simple) {
    let d_sep = sep_display(sep, simple);
    let d_v = '' + v;
    if (simple && d_v.length >= 2) d_v = '(' + d_v + ')';
    return d_sep + d_v;
}

function column_display(col, simple) {
    if (simple && col.length === 0) return '0';
    let result = col.map((e) => entry_display(e, simple)).join('');
    return simple ? result : '(' + result + ')';
}

function mountain_display(m, simple) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col) => column_display(col, simple)).join(simple ? ' ' : '');
}

function mountain_from_display(s) {
    let i = 0;

    function error() {
        throw new Error('Illegal input string: ' + s);
    }

    function skip_spaces() {
        while (i < s.length && s[i] === ' ') i++;
    }

    function parse_number() {
        skip_spaces();
        const start = i;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        if (start === i) error();
        return parseInt(s.substring(start, i), 10);
    }

    function parse_sep() {
        skip_spaces();
        if (i < s.length && s[i] === ',') {
            let count = 0;
            while (i < s.length && s[i] === ',') {
                count++;
                i++;
            }
            return Array.from({ length: count }, () => []);
        }
        if (i < s.length && s[i] === '(') {
            return parse_expr();
        }
        error();
    }

    function parse_entry() {
        const sep = parse_sep();
        const v = parse_number();
        return [v, sep];
    }

    function skip_index() {
        if (i < s.length && s[i] === ':') {
            i++;
            skip_spaces();
            while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        }
    }

    function parse_column() {
        skip_spaces();
        if (i >= s.length || s[i] !== '(') error();
        i++;

        const col = [];
        skip_spaces();
        while (i < s.length && s[i] !== ')' && s[i] !== ':') {
            col.push(parse_entry());
            skip_spaces();
        }

        skip_index();
        skip_spaces();
        if (i >= s.length) error();
        i++;
        return col;
    }

    function parse_expr() {
        const result = [];
        skip_spaces();
        while (i < s.length && s[i] === '(') {
            result.push(parse_column());
            skip_spaces();
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

function from_display_simple(s) {
    let i = 0;

    function error() {
        throw new Error('Illegal input string: ' + s);
    }

    function skip_spaces() {
        while (i < s.length && s[i] === ' ') i++;
    }

    function parse_value() {
        if (i < s.length && s[i] === '(') {
            i++;
            const start = i;
            while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
            if (start === i) error();
            if (i >= s.length || s[i] !== ')') error();
            const v = parseInt(s.substring(start, i), 10);
            i++;
            return v;
        }
        if (i < s.length && s[i] >= '0' && s[i] <= '9') {
            const v = s.charCodeAt(i) - 48;
            i++;
            return v;
        }
        error();
    }

    function parse_sep() {
        let comma_count = 0;
        while (i < s.length && s[i] === ',') {
            comma_count++;
            i++;
        }
        if (comma_count > 0) {
            return Array.from({ length: comma_count }, () => []);
        }

        if (i < s.length && s[i] === '[') {
            i++;
            const sep = parse_expr(']');
            if (i >= s.length || s[i] !== ']') error();
            i++;
            return sep;
        }

        return [[]];
    }

    function parse_entry() {
        const sep = parse_sep();
        const v = parse_value();
        return [v, sep];
    }

    function parse_column(stop_char) {
        const col = [];
        while (i < s.length && s[i] !== ' ' && (stop_char === undefined || s[i] !== stop_char)) {
            col.push(parse_entry());
        }
        return col;
    }

    function parse_expr(stop_char) {
        const result = [];
        while (true) {
            skip_spaces();
            if (i >= s.length) break;
            if (stop_char !== undefined && s[i] === stop_char) break;
            if (s[i] === '0' && (i + 1 >= s.length || s[i + 1] === ' ' || s[i + 1] === stop_char)) {
                result.push([]);
                i++;
                continue;
            }
            result.push(parse_column(stop_char));
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

function vertical_compare(a, b) {
    let i = 0;
    while (true) {
        if (i >= a.length) return i >= b.length ? 0 : -1;
        if (i >= b.length) return 1;
        const c = mountain_compare(a[i], b[i]);
        if (c) return c;
        ++i;
    }
}

function vertical_increase(v, m) {
    let i = v.length - 1;
    while (i >= 0 && mountain_compare(v[i], m) < 0) --i;
    return v.slice(0, i + 1).concat([m]);
}

function find_index_below_row(verticals, y) {
    const working = [[]].concat(verticals);
    let i1 = 0,
        i2 = working.length - 1;
    while (i1 < i2) {
        const i = Math.ceil((i1 + i2) / 2);
        if (vertical_compare(working[i], y) < 0) i1 = i;
        else i2 = i - 1;
    }
    return i1;
}

function parent(A, V, [i, j]) {
    const target_column = A[i][j][0] - 1;
    const target_i = find_index_below_row(V[target_column], V[i][j]);
    return [target_column, target_i];
}

function column_verticals(column) {
    const v = [[]];
    for (let j = 0; j < column.length; ++j) v.push(vertical_increase(v[j], column[j][1]));
    return v.slice(1);
}

function get_references(A, r_tops) {
    const verticals = column_verticals(A[A.length - 1]);
    verticals.unshift([]);
    const ref = [];
    let i = 0,
        j = 0;
    while (i < verticals.length && j < r_tops.length) {
        if (vertical_compare(verticals[i], r_tops[j]) < 0) {
            ref[j] = i;
            ++i;
        } else {
            ++j;
        }
    }
    return ref;
}

function threshold(A, shorter, low, high) {
    let n = 0;
    while (true) {
        const res = expand(A, n, shorter);
        if (vertical_compare(vertical_increase(low, res), vertical_increase(high, res)) >= 0) return n;
        n++;
    }
}

function expand(A0, index, shorter = false) {
    const data_key = mountain_display(A0, true);
    if (shorter) {
        const v = data_short.get(data_key + '"' + index);
        if (v) return v;
    } else {
        const v = data.get(data_key + '"' + index);
        if (v) return v;
    }

    const rightmost = A0.length - 1;
    const topmost = A0[rightmost].length - 1;
    const A = deepcopy(A0);

    if (topmost === -1) {
        A.pop();
        return A;
    }

    const top_right_entry = A[rightmost][topmost];
    let top_right_separator = top_right_entry[1];
    const V0 = A.map(column_verticals);
    const BRij = parent(A, V0, [rightmost, topmost]);
    const width = rightmost - BRij[0];

    if (mountain_is_limit(top_right_separator)) {
        A[rightmost][topmost][1] = expand(
            top_right_separator,
            threshold(top_right_separator, shorter, V0[BRij[0]][BRij[1] - 1] ?? [], V0[rightmost][topmost - 1] ?? []) +
                index,
            shorter,
        );
        return A;
    }

    const top_verticals = V0[BRij[0]].slice(0, BRij[1]);
    top_verticals.push(V0[rightmost][topmost]);

    if (mountain_is_one(top_right_separator)) A[rightmost].pop();
    else {
        top_right_separator = top_right_separator.slice(0, -1);
        if (
            vertical_compare(
                vertical_increase(V0[BRij[0]][BRij[1] - 1] ?? [], top_right_separator),
                V0[rightmost][topmost - 1] ?? [],
            ) <= 0
        )
            A[rightmost].pop();
        else A[rightmost][topmost][1] = top_right_separator;
    }
    A[rightmost] = A[rightmost].concat(A[BRij[0]].slice(BRij[1]));
    const V = A.map(column_verticals);
    const magma_checks_list = [];
    for (let i = BRij[0] + 1; i <= rightmost; ++i) {
        magma_checks_list[i] = [];
        for (let j = 0; j < A[i].length; ++j) {
            let working = [i, j];
            while (working[0] > BRij[0]) {
                if (A[working[0]].length <= working[1]) --working[1];
                working = parent(A, V, working);
            }
            magma_checks_list[i][j] =
                working[0] === BRij[0] &&
                working[1] <= BRij[1] &&
                !vertical_compare(V[working[0]][working[1] - 1] ?? [], V[i][j - 1] ?? [])
                    ? working[1]
                    : -1;
        }
    }
    for (let n = 1; n <= index; ++n) {
        const refs = get_references(A, top_verticals);
        refs[-1] = -1;
        for (let dx = 1; dx <= width; ++dx) {
            const x = BRij[0] + dx;
            const source_magmas = magma_checks_list[x];
            const target_column = [];
            A[x].forEach((entry, y) => {
                const value = entry[0];
                if (~source_magmas[y]) {
                    const BR_index = source_magmas[y];
                    for (let j = refs[BR_index - 1] + 1; j <= refs[BR_index]; ++j) {
                        if (j === refs[BR_index]) target_column.push([value + width * n, entry[1]]);
                        else target_column.push([value + width * n, A[BRij[0] + width * n][j][1]]);
                    }
                } else {
                    target_column.push([value + (value > BRij[0] ? width * n : 0), entry[1]]);
                }
            });
            A[x + width * n] = target_column;
        }
    }
    if (shorter) A.pop();
    if (shorter) data_short.set(data_key + '"' + index, A);
    else data.set(data_key + '"' + index, A);
    return A;
}

function infinity_FS(n) {
    return n > 0 ? [[], [[1, infinity_FS(n - 1)]]] : [[]];
}

function calc_ancestor_depths(m) {
    if (!Array.isArray(m) || m.length === 0) return [];
    const V = m.map(column_verticals);
    const depthMap = Array.from({ length: m.length }, () => []);
    const visited = new Set();

    function getDepth(i, j) {
        const key = `${i},${j}`;
        if (visited.has(key)) return 0;
        visited.add(key);
        const [pCol, pRow] = parent(m, V, [i, j]);
        if (pCol < 0 || pCol >= m.length || pRow < 0 || pRow >= m[pCol].length) {
            visited.delete(key);
            return 0;
        }
        const depth = 1 + getDepth(pCol, pRow);
        visited.delete(key);
        return depth;
    }

    for (let i = 0; i < m.length; i++) {
        const column = m[i];
        for (let j = 0; j < column.length; j++) {
            depthMap[i][j] = getDepth(i, j);
        }
    }
    return depthMap;
}

function convert_to_layer(om) {
    if (is_infinity(om)) return om;

    const depthMap = calc_ancestor_depths(om);
    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
        const column = dm[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];
            entry[0] = depthMap[i][j] + 1;
            if (Array.isArray(entry[1]) && entry[1].length > 0) {
                entry[1] = convert_to_layer(entry[1]);
            }
        }
    }
    return dm;
}

function convert_from_layer(dm) {
    if (is_infinity(dm)) return dm;

    const om = deepcopy(dm);
    for (let i = 0; i < om.length; i++) {
        const column = om[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];
            if (Array.isArray(entry[1]) && entry[1].length > 0) {
                entry[1] = convert_from_layer(entry[1]);
            }
        }
    }

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
                let j0 = find_index_below_row(V[i1], j === 0 ? [[[]]] : V[i][j - 1].concat([[[]]]));
                if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
                    entry[0] = i1 + 1;
                    break;
                }
            }
        }
    }

    return om;
}

function sep_display_marked(sep, type) {
    if (sep.every((col) => !col.length)) {
        let sep_len = sep.length;
        return ','.repeat(sep_len);
    }
    return mountain_display_marked(sep, type);
}

function entry_display_marked([v, sep], type) {
    return sep_display_marked(sep, type) + v;
}

function column_display_marked(c, type, index) {
    let result = c.map((e) => entry_display_marked(e, type)).join('');
    if (type === 'label') result += ':' + index;
    result = '(' + result + ')';
    if (type === 'sub') result += '<sub>' + index + '</sub>';
    return result;
}

function mountain_display_marked(m, type) {
    if (is_infinity(m)) return 'Limit';
    return m.map((col, i) => column_display_marked(col, type, i + 1)).join('');
}

export const T_omega_MN = {
    id: 't-omega-mn',
    name: 'Transfinite ωMN',
    simple_name: 'TωMN',
    category_id: 'category-mn',
    display: {
        plain: (m) => mountain_display(m, false),
        from_display: mountain_from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        layer: {
            plain: (m) => mountain_display(convert_to_layer(m), false),
            from_display: (s) => convert_from_layer(mountain_from_display(s)),
            name: { id: 'display.layer' },
        },
        marked: {
            plain: (m) => mountain_display_marked(m, 'label'),
            html: (m) => mountain_display_marked(m, 'sub'),
            from_display: mountain_from_display,
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
    is_limit: mountain_is_limit,
    compare: mountain_compare,
    FS: (m, index) => {
        if (is_infinity(m)) return infinity_FS(index);
        if (m.length === 0) return [];
        return expand(m, index, true);
    },
    FS_alter: (m, index) => {
        if (is_infinity(m)) return infinity_FS(index);
        if (m.length === 0) return [];
        return expand(m, index);
    },
    FS_short: (m, index) => {
        if (is_infinity(m)) return infinity_FS(index);
        if (m.length === 0) return [];
        if (index === 0) return expand(m, 0, true);
        if (index === 1) {
            if (mountain_compare(expand(m, 0, true), expand(m, 0, false)) === 0) return expand(m, 1, true);
            else return expand(m, 0, false);
        }
        if (
            mountain_compare(expand(m, 0, true), expand(m, 0, false)) === 0 ||
            mountain_compare(expand(m, 1, true), expand(m, 0, false)) === 0
        )
            return expand(m, index, true);
        return expand(m, index - 1, true);
    },
    credit_text_id: 'credit.hypcos_mn',

    init: () => [INFINITY(), []],
};

register_notation(T_omega_MN);
