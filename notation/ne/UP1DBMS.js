// ============================================================================
//  notation/ne/UP1DBMS.js — UP1DBMS（UP1MN 的 DBMS 侧，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/UPMN/UP1DBMS.ts（快照 d2d79cd）
//  注册 id: up1dbms
//  分类: category-upmn-test（源文件原文，未改；ne 里定义在 UPMN/categories.ts，
//        本项目骨架 notation/ne/categories.js 未预置，由 ./UPMN_utils.js 补注册）
//  表达式 = Column[]，Column = Entry[]，Entry = [number, number]（列标 + 层高，均 0-based）
//
//  依赖映射：
//    '@/utils.ts'                     → ../../core/ne/utils.js
//    '@/notations/notation_utils.ts'  的 sequence_FS_variants
//                                     → ../../core/ne/notationUtils.js
//    '@/notations/MN/UPMN/UP1MN.ts'   → ./UP1MN.js（同批搬运）
//    NotationDefinition / Entry / Column / Expr / Expr_DBMS / DisplayType /
//    RelColumn / RelEntry → 纯类型，删除
//
//  与 ne 原版的差异：无（算法、常量、字段逐行照搬；源文件本身没有 draw_diagram
//  字段，故本文件也不挂）。
//  文件末尾自注册（manifest 以 module: true 注入）。
// ============================================================================
import { boolean_compare, lex_compare, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { UP1MN } from './UP1MN.js';
import { register_notation } from '../../core/ne/registry.js';

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    const result = [[]];
    for (let i = 0; i < index; i++) {
        result.push([[i, i]]);
    }
    return result;
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare_entry(entry1, entry2) {
    return lex_compare(entry1, entry2, number_compare);
}

function compare_column(col1, col2) {
    return lex_compare(col1, col2, compare_entry);
}

function compare(expr1, expr2) {
    return lex_compare(expr1, expr2, compare_column);
}

function entry_display([v, s], type) {
    const d_v = v + 1;
    const d_s = s + 1;
    if (type === 'html') return d_v + '<sup>' + d_s + '</sup>';
    return d_v + '^' + d_s;
}

function column_display(col, type) {
    if (col.length === 0) return '(0)';
    return '(' + col.map((entry) => entry_display(entry, type)).join(',') + ')';
}

function display(expr, type = 'plain') {
    if (is_infinity(expr)) return 'Limit';
    return expr.map((col) => column_display(col, type)).join('');
}

export function display_marked(expr, type, start_index = 1) {
    if (is_infinity(expr)) return 'Limit';
    const parts = [];
    let index = start_index;
    for (const col of expr) {
        parts.push(column_display_marked(col, type, index));
        index++;
    }
    return parts.join('');
}

function column_display_marked(col, type, index) {
    if (col.length === 0) {
        if (type === 'html') return "(0)<sub><span style='color:#888'>" + index + '</span></sub>';
        return '(:' + index + ')';
    }
    const content = col.map((entry) => entry_display(entry, type)).join(',');
    if (type === 'html') return '(' + content + ")<sub><span style='color:#888'>" + index + '</span></sub>';
    return '(' + content + ':' + index + ')';
}

export function from_display(str) {
    let i = 0;
    const s = str;

    function error() {
        throw new Error('Illegal input string: ' + s);
    }

    function skip_spaces() {
        while (i < s.length && s[i] === ' ') i++;
    }

    function skip_index() {
        if (i < s.length && s[i] === ':') {
            i++;
            skip_spaces();
            while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        }
    }

    function parse_number() {
        skip_spaces();
        const start = i;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        if (start === i) error();
        return parseInt(s.substring(start, i), 10);
    }

    function parse_entry() {
        const x = parse_number() - 1;
        skip_spaces();
        if (i < s.length && s[i] === '^') {
            i++;
            return [x, parse_number() - 1];
        }
        return [x, -1]; // '(0)' 这类省略上标的形式, 稍后作为空列处理
    }

    function parse_column() {
        skip_spaces();
        if (i >= s.length || s[i] !== '(') error();
        i++;

        const entries = [];
        skip_spaces();
        if (i < s.length && s[i] !== ')' && s[i] !== ':') {
            entries.push(parse_entry());
            skip_spaces();
            while (i < s.length && s[i] === ',') {
                i++;
                skip_spaces();
                if (i < s.length && s[i] === ')') break;
                entries.push(parse_entry());
                skip_spaces();
            }
        }

        skip_spaces();
        skip_index();
        skip_spaces();
        if (i >= s.length || s[i] !== ')') error();
        i++;
        while (entries.length > 0 && entries[entries.length - 1][0] === -1) entries.pop();
        return entries;
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
        return INFINITY;
    }

    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return result;
}

function height(col) {
    if (col.length === 0) return -1;
    return col[col.length - 1][1];
}

function filter_height_greater(col, h0) {
    return col.filter(([, h]) => h > h0);
}

function merge_column(...cols) {
    if (cols.length === 0) return [];
    if (cols.length === 1) return cols[0];
    if (cols.length === 2) {
        const col1 = cols[0];
        const col2 = cols[1];
        return [...col1, ...filter_height_greater(col2, height(col1))];
    }
    return merge_column(merge_column(cols[0], cols[1]), ...cols.slice(2));
}

function copy_value(value, r, offset, up) {
    return value > r || (value === r && up) ? value + offset : value;
}

function copy_entry(entry, r, offset, up) {
    return [copy_value(entry[0], r, offset, up), copy_value(entry[1], r, offset, up)];
}

function copy_column(col, r, offset, up) {
    return col.map((entry) => copy_entry(entry, r, offset, up));
}

function compare_rel_column(a, b) {
    return lex_compare(a, b, compare_rel_entry);
}

function compare_rel_entry(a, b) {
    return tuple_lex_compare(a, b, [boolean_compare, number_compare, boolean_compare, number_compare]);
}

function to_rel_value(v, r) {
    return v >= r ? [true, v - r] : [false, v];
}

function to_rel_entry(entry, r) {
    return [...to_rel_value(entry[0], r), ...to_rel_value(entry[1], r)];
}

function to_rel_column(col, r) {
    return col.map((entry) => to_rel_entry(entry, r));
}

function height_after(col, r) {
    const j = col.findLastIndex((entry) => entry[0] >= r);
    if (j === -1) return -1;
    return col[j][1];
}

function parent_at(col, h) {
    const j = col.findIndex((entry) => entry[1] >= h);
    if (j === -1) return -1;
    return col[j][0];
}

function discard_after(col, r) {
    return col.filter((entry) => entry[0] <= r);
}

function compute_up(expr, r, h) {
    const right = expr.length - 1;

    const result = Array(expr.length);
    result.fill(false, 0, r);
    result[r] = true;

    for (let i = r + 1; i < expr.length; i++) {
        // perform UP check

        let col = expr[i];

        let h_root = height_after(col, r);

        if (h_root < h) {
            result[i] = false;
            continue;
        }

        const h_proj = height_after(col, r + 1);

        if (h_proj >= h) {
            result[i] = result[parent_at(col, h)];
            continue;
        }

        if (h_proj >= 0) {
            let p_proj = i;
            let next;
            while ((next = parent_at(expr[p_proj], h_proj)) !== r) p_proj = next;

            if (!result[p_proj]) {
                result[i] = false;
                continue;
            }
        }

        const X_start = i;
        let Y_start = right;

        {
            let next;
            while ((next = parent_at(expr[Y_start], h_proj + 1)) !== r) Y_start = next;
        }

        if (Y_start <= X_start) {
            result[i] = X_start === Y_start;
            continue;
        }

        const X0 = discard_after(expr[X_start], r);
        const Y0 = discard_after(expr[Y_start], r);
        const cmp_0 = compare_column(X0, Y0);
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

function expand(expr, index, shorter) {
    if (expr.length === 0) return expr;
    const right = expr.length - 1;
    if (expr[right].length === 0) return expr.slice(0, -1);
    const top = expr[right].length - 1;
    const tr_entry = expr[right][top];
    const r = tr_entry[0];
    const h = tr_entry[1];

    const new_h = height(expr[h]);

    const result = expr.slice(0, -1);
    result.push(merge_column(expr[right].slice(0, -1), [[r, new_h]], expr[r]));

    const up = compute_up(expr, r, h);

    for (let w = 1; w <= index; w++) {
        for (let i = r + 1; i <= right; i++) {
            result.push(copy_column(result[i], r, (right - r) * w, up[i]));
        }
    }
    if (shorter) result.pop();
    return result;
}

function compute_layered_heights(expr) {
    const heights = [];
    for (let i = 0; i < expr.length; i++) {
        let h = 0;
        for (const [, y] of expr[i]) {
            const entry_height = heights[y] + 1;
            if (entry_height > h) h = entry_height;
        }
        heights[i] = h;
    }
    return heights;
}

export function convert_to_layered_height(expr) {
    if (is_infinity(expr)) return expr;
    const heights = compute_layered_heights(expr);
    return expr.map((col) => col.map(([x, y]) => [x, heights[y]]));
}

const INFINITY_dbms = Infinity;

function is_infinity_dbms(matrix) {
    return matrix === INFINITY_dbms;
}

export function convert_to_dbms(expr) {
    if (is_infinity(expr)) return INFINITY_dbms;
    const heights = compute_layered_heights(expr);
    return expr.map((col, i) => {
        const h = heights[i];
        const bms_column = [];
        for (let level = 1; level <= h; level++) {
            for (const [x, y] of col) {
                if (heights[y] + 1 >= level) {
                    bms_column.push(x);
                    break;
                }
            }
        }
        return bms_column;
    });
}

function display_dbms_column(col, index, type = 'plain') {
    const content = col.map((v) => ',' + (v + 1)).join('');
    if (index === undefined) return '(' + content + ')';
    if (type === 'html') return '(' + content + ")<sub><span style='color:#888'>" + index + '</span></sub>';
    return '(' + content + ':' + index + ')';
}

/** dbms 的显示: 各列依次拼接。 */
export function display_dbms(matrix) {
    if (is_infinity_dbms(matrix)) return 'Limit';
    return matrix.map((col) => display_dbms_column(col)).join('');
}

export function display_dbms_marked(matrix, type = 'plain', start_index = 1) {
    if (is_infinity_dbms(matrix)) return 'Limit';
    const parts = [];
    let index = start_index;
    for (const col of matrix) {
        parts.push(display_dbms_column(col, index, type));
        index++;
    }
    return parts.join('');
}

export function convert_dbms_to_layer(matrix) {
    if (is_infinity_dbms(matrix)) return matrix;
    const depth_map = [];
    for (let i = 0; i < matrix.length; i++) {
        depth_map[i] = [];
        for (let j = 0; j < matrix[i].length; j++) {
            const pi = matrix[i][j];
            depth_map[i][j] = j >= matrix[pi].length ? 0 : 1 + depth_map[pi][j];
        }
    }
    return depth_map;
}

function dbms_to_Y_mountain(matrix) {
    const M = [];
    for (let i = 0; i < matrix.length; i++) {
        M[i] = [];
        M[i][matrix[i].length] = 1;
        for (let j = matrix[i].length - 1; j >= 0; j--) {
            const up = M[i][j + 1] ?? 1;
            const left = M[matrix[i][j]][j] ?? 1;
            M[i][j] = up + left;
        }
    }
    return M;
}

function display_as_Y(matrix) {
    if (is_infinity_dbms(matrix)) return '1,3';
    return dbms_to_Y_mountain(matrix)
        .map((col) => col[0])
        .join(',');
}

function verify_up1mn(expr) {
    if (is_infinity(expr)) return true;
    const FS_up1dbms = convert_to_dbms(UP1DBMS.FS(expr, 3));
    const FS_up1mn = UP1MN.FS(convert_to_dbms(expr), 3);
    return UP1MN.compare(FS_up1dbms, FS_up1mn) === 0;
}

export const UP1DBMS = {
    id: 'up1dbms',
    name: 'UP1DBMS',
    category_id: 'category-upmn-test',
    display: {
        plain: (m) => display(m, 'plain'),
        html: (m) => display(m, 'html'),
        from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        'layered height': {
            plain: (m) => display(convert_to_layered_height(m), 'plain'),
            html: (m) => display(convert_to_layered_height(m), 'html'),
            name: { id: 'display.layered-height' },
        },
        marked: {
            plain: (m) => display_marked(m, 'plain'),
            html: (m) => display_marked(m, 'html'),
            from_display,
            name: { id: 'display.index-marked' },
        },
        'marked layered height': {
            plain: (m) => display_marked(convert_to_layered_height(m), 'plain'),
            html: (m) => display_marked(convert_to_layered_height(m), 'html'),
            name: { id: 'display.marked-layered-height' },
        },
        dbms: {
            plain: (m) => display_dbms(convert_to_dbms(m)),
            name: { id: 'display.dbms' },
        },
        'marked dbms': {
            plain: (m) => display_dbms_marked(convert_to_dbms(m), 'plain'),
            html: (m) => display_dbms_marked(convert_to_dbms(m), 'html'),
            name: { id: 'display.marked-dbms' },
        },
        'layered dbms': {
            plain: (m) => display_dbms(convert_dbms_to_layer(convert_to_dbms(m))),
            name: { id: 'display.layered-dbms' },
        },
        Y: {
            plain: (m) => display_as_Y(convert_to_dbms(m)),
        },
    },
    ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),
    is_limit,
    compare,
    credit_text_id: 'credit.up1mn',

    init: () => [INFINITY, []],
};

register_notation(UP1DBMS);
