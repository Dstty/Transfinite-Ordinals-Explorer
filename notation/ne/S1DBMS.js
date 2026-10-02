// ============================================================================
//  notation/ne/S1DBMS.js — S1DBMS（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SDBMS/S1DBMS.ts（快照 d2d79cd）
//  注册 id: s1dbms（单体记号，无 generator）
//  category_id: 'category-sdbms' —— 按源文件原文，**未改分类**（该分类已在
//  notation/ne/categories.js 骨架里注册）。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [v, h]（两者都是 0-based 列标，
//  显示时 +1，见 entry_display）；Expr_DBMS = number[][]；极限哨兵 INFINITY。
//
//  与 ne 原版的差异（仅依赖/接线层面，算法本体逐行照搬）：
//   1) S1DBMS 的 DBMS 侧代码与 S_omega_DBMS-v1/v2/v3 的**不是同一套**
//      （高度语义与 dbms_to_Y_mountain / convert_dbms_to_layer 的实现都不同），
//      故**不复用** notation/ne/SDBMS_utils.js，全部按原文留在本文件内。
//   2) draw_diagram / mountain_view 完整搬入：源文件用 ne 的
//      draw_mountain_diagram(shape, layout, draw) 图元层，本项目已把它逐行搬到
//      core/ne/drawMountainDiagram.js，这里直接接上，选项对象按源文件原样传递。
//   3) 纯类型 import（DiagramControl / NotationDefinition / Diagram / MountainShape /
//      MountainViewSource / DisplayType）与 `export interface DiagramData` 在 JS 下
//      无运行时载体，按规范删除；其余 import 与源文件一致。
//   4) 类型注解全部去除，其余一字未改。
// ============================================================================
import { lex_compare, number_compare } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { draw_mountain_diagram } from '../../core/ne/drawMountainDiagram.js';
import { register_notation } from '../../core/ne/registry.js';

// ---------------------------------------------------------------------------
//  S1DBMS.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

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

function copy_value(value, r, offset) {
    return value >= r ? value + offset : value;
}

function copy_entry(entry, r, offset) {
    return [copy_value(entry[0], r, offset), copy_value(entry[1], r, offset)];
}

function copy_column(col, r, offset) {
    return col.map((entry) => copy_entry(entry, r, offset));
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

    for (let w = 1; w <= index; w++) {
        for (let i = r + 1; i <= right; i++) {
            result.push(copy_column(result[i], r, (right - r) * w));
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

function draw_s1dbms_mountain_diagram(expr, layered_height) {
    const shape = [];

    const heights = compute_layered_heights(expr);

    for (let i = 0; i < expr.length; i++) {
        shape[i] = [];

        const col = expr[i];
        for (let j = col.length - 1; j >= 0; j--) {
            const [v, h] = col[j];
            let current = h;
            const base = j === 0 ? -1 : col[j - 1][1];
            while (current !== base) {
                const next = height(expr[current]);

                shape[i].push({
                    vertical: heights[current] + 1,
                    text: '' + (v + 1) + '<sup>' + (layered_height ? heights[current] + 1 : current + 1) + '</sup>',
                    leg_target: [v, heights[current]],
                });

                current = next;
            }
        }
        shape[i].push({
            vertical: 0,
            text: '*',
        });
        shape[i].reverse();
    }

    return shape;
}

function draw_dbms_mountain_diagram(expr, variant) {
    const shape = [];

    const layered = variant === 'l' ? convert_dbms_to_layer(expr) : [];
    const y_mountain = variant === 'y' ? dbms_to_Y_mountain(expr) : [];

    for (let i = 0; i < expr.length; i++) {
        shape[i] = [
            {
                vertical: 0,
                text: variant === 'y' ? '' + y_mountain[i][0] : '*',
            },
        ];

        const col = expr[i];

        for (let j = 0; j < col.length; j++) {
            const v = col[j];

            shape[i].push({
                vertical: j + 1,
                text: '' + (variant === 'l' ? layered[i][j] + 1 : variant === 'y' ? y_mountain[i][j + 1] : v + 1),
                leg_target: [v, j],
            });
        }
    }

    return shape;
}

/** 由表达式与等价表示算出"形状 + 布局选项":画布版与 HTML 版共用这一份数据。 */
function build_s1dbms_mountain_source(expr, current_equiv) {
    if (is_infinity(expr) || expr.length === 0) return undefined;

    let shape;

    if (current_equiv === undefined || current_equiv === 'm') {
        shape = draw_s1dbms_mountain_diagram(expr, false);
    } else if (current_equiv.includes('lh')) {
        shape = draw_s1dbms_mountain_diagram(expr, true);
    } else if (current_equiv === 'dbms' || current_equiv === 'm dbms') {
        shape = draw_dbms_mountain_diagram(convert_to_dbms(expr));
    } else if (current_equiv === 'l dbms') {
        shape = draw_dbms_mountain_diagram(convert_to_dbms(expr), 'l');
    } else if (current_equiv === 'Y') {
        shape = draw_dbms_mountain_diagram(convert_to_dbms(expr), 'y');
    } else {
        return undefined;
    }

    return {
        shape,
        layout: {
            vertical_display: (x) => '' + x,
            vertical_compare: number_compare,
            separator_count: (higher, lower) => 0,
        },
        display_html_entry: true,
    };
}

function draw_s1dbms_mountain_diagram_dispatcher(expr, current_equiv, invert_vertical) {
    const source = build_s1dbms_mountain_source(expr, current_equiv);
    if (!source) return undefined;
    return draw_mountain_diagram(source.shape, source.layout, {
        invert_vertical,
        display_html_entry: source.display_html_entry,
    });
}

export const draw_diagram_control = {
    default_data: { current_equiv: undefined, invert_vertical: undefined },
    draw_diagram: (_expr, _data) =>
        draw_s1dbms_mountain_diagram_dispatcher(_expr, _data.current_equiv, _data.invert_vertical ?? false),
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

export const S1DBMS = {
    id: 's1dbms',
    name: 'S1DBMS',
    category_id: 'category-sdbms',
    display: {
        plain: (m) => display(m, 'plain'),
        html: (m) => display(m, 'html'),
        from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        lh: {
            plain: (m) => display(convert_to_layered_height(m), 'plain'),
            html: (m) => display(convert_to_layered_height(m), 'html'),
            name: { id: 'display.layered-height' },
        },
        m: {
            plain: (m) => display_marked(m, 'plain'),
            html: (m) => display_marked(m, 'html'),
            from_display,
            name: { id: 'display.index-marked' },
        },
        'm lh': {
            plain: (m) => display_marked(convert_to_layered_height(m), 'plain'),
            html: (m) => display_marked(convert_to_layered_height(m), 'html'),
            name: { id: 'display.marked-layered-height' },
        },
        dbms: {
            plain: (m) => display_dbms(convert_to_dbms(m)),
            name: { id: 'display.dbms' },
        },
        'm dbms': {
            plain: (m) => display_dbms_marked(convert_to_dbms(m), 'plain'),
            html: (m) => display_dbms_marked(convert_to_dbms(m), 'html'),
            name: { id: 'display.marked-dbms' },
        },
        'l dbms': {
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

    draw_diagram: draw_diagram_control,
    mountain_view: (expr, data) => build_s1dbms_mountain_source(expr, data?.current_equiv),

    credit_text_id: 'credit.s1dbms',

    init: () => [INFINITY, []],
};

register_notation(S1DBMS);
