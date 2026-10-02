// ============================================================================
//  notation/ne/S_omega_p1_DBMS.js — S ω+1 DBMS（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SDBMS/S_omega_p1_DBMS.ts（快照 d2d79cd）
//  注册 id: s-omega+1-dbms（单体记号，无 generator）
//  category_id: 'category-sdbms-test' —— 按源文件原文，**未改分类**。该分类源出
//  ne 的 src/notations/MN/SDBMS/categories.ts；本项目 notation/ne/categories.js
//  骨架里缺它，由 notation/ne/SDBMS_utils.js 按原文补注册（幂等），本文件末尾再
//  显式 ensure_category 一次以保证单独 import 时也成立。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [v, Height]；
//  Height = HeightEntry[]；HeightEntry = [v, HeightPos]；HeightPos = number | 'w'
//  （'w' 表示第 ω 个 pos）；极限哨兵 INFINITY。
//
//  与 ne 原版的差异（仅依赖/接线层面，算法本体逐行照搬）：
//   1) 本文件的 HeightPos 是 `number | 'w'`，DBMS 侧的整套代码（dbms_entry_display /
//      dbms_column_verticals / dbms_to_y_mountain / convert_dbms_to_layer …）与
//      SDBMS_utils.js 里那套的语义**不同**（后者用 anti_lex_compare 的 number[] 高度），
//      故**不复用** SDBMS_utils.js 的函数，全部按原文留在本文件内；只从它取分类定义。
//   2) 源文件从 S1DBMS.ts import 的 DiagramData 是纯类型，同时 sources 里的
//      `export interface DiagramData` 亦为纯类型，JS 下无运行时载体，按规范删除。
//   3) draw_diagram / mountain_view 完整搬入：源文件用 ne 的
//      draw_mountain_diagram(shape, layout, draw) 图元层，本项目已把它逐行搬到
//      core/ne/drawMountainDiagram.js，这里直接接上。
//   4) 另一处 TS 专有语法：copy_value 的重载签名（<T extends number | 'w'>）按规范
//      删除，只保留实现；`!` 非空断言与 `as number | undefined` 断言删除。
//   5) 类型注解全部去除，其余一字未改。
// ============================================================================
import {
    boolean_compare,
    deepcopy,
    lex_compare,
    lex_compare_by,
    number_compare,
    tuple_lex_compare,
} from '../../core/ne/utils.js';
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { draw_mountain_diagram } from '../../core/ne/drawMountainDiagram.js';
import { ensure_category, register_notation } from '../../core/ne/registry.js';
import { category_sdbms_test } from './SDBMS_utils.js';

// ---------------------------------------------------------------------------
//  S_omega_p1_DBMS.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    const result = [[]];
    for (let i = 0; i < index; ++i) {
        result.push([[i, [[i, 'w']]]]);
    }
    return result;
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare_height_pos(hp1, hp2) {
    if (hp1 === 'w' || hp2 === 'w') {
        return boolean_compare(hp1 === 'w', hp2 === 'w');
    }
    return number_compare(hp1, hp2);
}

function compare_height(h1, h2) {
    return lex_compare(h1, h2, lex_compare_by(compare_height_pos), false);
}

function compare_entry(entry1, entry2) {
    return tuple_lex_compare(entry1, entry2, [number_compare, compare_height]);
}

function compare_column(col1, col2) {
    return lex_compare(col1, col2, compare_entry);
}

function compare(expr1, expr2) {
    return lex_compare(expr1, expr2, compare_column);
}

function height_entry_display([v, p]) {
    const d_p = p === 'w' ? 'ω' : '' + (p + 1);
    return v + 1 + '@' + d_p;
}

function height_display(h) {
    return '(' + h.map(height_entry_display) + ')';
}

function entry_display([v, h], type) {
    const d_v = v + 1;
    const d_s = height_display(h);
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

/** 单列的标记列标显示: 空列在 plain 下写作 '(:N)'(不带 0), html 下仍保留 (0)。 */
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

    /** 跳过 display_marked 写入的列标(如 ':2'), 其值被舍弃(列标即列的位置)。 */
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

    /** 行高的值: 数字 n 的内部值 = n - 1。本版本的高度无 ω 等特殊值。 */
    function parse_height_value() {
        return parse_number() - 1;
    }

    /**
     * 行高的位置: 数字 n 为列标, 内部位置 = n - 1(与 display 的 'p + 1' 互逆);
     * 或 'w' / 'ω' 表示第 ω 个 pos(内部存 'w')。
     * 本记号在 indexed SωDBMS 的基础上增加了第 ω 个 pos, 故位置可以是 ω。
     */
    function parse_height_pos() {
        skip_spaces();
        if (i < s.length && (s[i] === 'ω' || s[i] === 'w')) {
            i++;
            return 'w';
        }
        return parse_number() - 1;
    }

    /**
     * 行高的单项 'v@p': v 为值(见 parse_height_value), p 为位置(见 parse_height_pos)。
     * 内部按 [值, 位置] 存放(注意本版本与 v1/v2 的 [位置, 值] 顺序相反)。
     */
    function parse_height_item() {
        const v = parse_height_value();
        skip_spaces();
        if (i >= s.length || s[i] !== '@') error();
        i++;
        return [v, parse_height_pos()];
    }

    /**
     * 解析行高: 形如 '(项,项,…)', 每项为 'v@p'(见 parse_height_item), 空为 '()'。
     * 另容忍多一层外层括号(历史上 display 的 plain 曾输出 'v^((…))'), 使单/双括号都能解析。
     */
    function parse_height() {
        skip_spaces();
        if (i >= s.length || s[i] !== '(') error();
        i++;
        skip_spaces();

        let extra_paren = false;
        if (i < s.length && s[i] === '(') {
            extra_paren = true;
            i++;
            skip_spaces();
        }

        const result = [];
        if (i < s.length && s[i] !== ')') {
            result.push(parse_height_item());
            skip_spaces();
            while (i < s.length && s[i] === ',') {
                i++;
                skip_spaces();
                result.push(parse_height_item());
                skip_spaces();
            }
        }

        if (i >= s.length || s[i] !== ')') error();
        i++;
        if (extra_paren) {
            skip_spaces();
            if (i >= s.length || s[i] !== ')') error();
            i++;
        }
        return result;
    }

    function parse_entry() {
        const v = parse_number() - 1;
        skip_spaces();
        if (i < s.length && s[i] === '^') {
            i++;
            return [v, parse_height()];
        }
        if (i < s.length && s[i] === '(') {
            return [v, parse_height()];
        }
        return [v, []]; // '(0)' 这类省略上标的形式, 稍后作为空列处理
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
        // 删去列尾表示 0 的项(显示 0 ↔ 内部 v = -1): 空列的显示形式为 (0)
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
    if (col.length === 0) return undefined;
    return col[col.length - 1][1];
}

function filter_height_greater(col, h0) {
    return col.filter(([, h]) => compare_height(h, h0) > 0);
}

function merge_column(...cols) {
    if (cols.length === 0) return [];
    if (cols.length === 1) return cols[0];
    if (cols.length === 2) {
        const col1 = cols[0];
        const col2 = cols[1];
        let h = height(col1);
        return [...col1, ...(h === undefined ? col2 : filter_height_greater(col2, h))];
    }
    return merge_column(merge_column(cols[0], cols[1]), ...cols.slice(2));
}

function copy_value(value, r, offset) {
    return value === 'w' ? 'w' : value >= r ? value + offset : value;
}

function copy_height_entry([v, p], r, offset) {
    return [copy_value(v, r, offset), copy_value(p, r, offset)];
}

function copy_height(h, r, offset) {
    return h.map((he) => copy_height_entry(he, r, offset));
}

function copy_entry(entry, r, offset) {
    return [copy_value(entry[0], r, offset), copy_height(entry[1], r, offset)];
}

function copy_column(col, r, offset) {
    return col.map((entry) => copy_entry(entry, r, offset));
}

function height_fill_dec(h, p, v) {
    const new_h = h.slice();
    while (new_h.length > 0 && new_h[new_h.length - 1][0] >= v) new_h.pop();
    new_h.push([v, p]);

    return new_h;
}

function find_maximal_entry_below(expr, i, h, r) {
    if (r !== i) {
        const e = find_maximal_entry_below(expr, r, h, r);
        if (e === undefined) return undefined;
        return find_maximal_entry_below(expr, i, e[1], e[0]);
    }

    const j = expr[i].findIndex(([, hj]) => compare_height(hj, h) > 0);
    if (j === -1) {
        if (expr[i].length === 0) return undefined;
        return expr[i][expr[i].length - 1];
    }
    const lower = j === 0 ? undefined : expr[i][j - 1][1];
    const new_value = expr[i][j][0];
    const upper = descend_height_to_value(expr, h, new_value);
    if (upper !== undefined && (lower === undefined || compare_height(upper, lower) > 0)) {
        return [expr[i][j][0], upper];
    }
    return expr[i][j - 1];
}

function descend_height_to_value(expr, h, v) {
    const j = h.findIndex(([v1]) => v1 > v);

    if (j === -1) {
        return h;
    }

    if (j === 0) {
        const rh = h[0][0];
        const col_rh = expr[rh];
        const new_h = height(col_rh);
        if (new_h === undefined) return undefined;
        return descend_height_to_value(expr, new_h, v);
    }

    const [, p_bound] = h[j - 1];
    const new_p = find_lower_height_pos(expr, h, p_bound, v);
    return height_fill_dec(h, new_p, v);
}

function find_lower_height_pos(expr, h, p, r) {
    if (p === 'w') {
        return r;
    }

    const bound = find_maximal_entry_below(expr, p, h, r);
    if (bound === undefined) return undefined;

    const [r1, h1] = bound;
    const [v1, p1] = h1[h1.length - 1];
    if (p1 === 'w') return undefined;
    if (v1 === p1) return v1;
    return find_lower_height_pos(expr, h1, v1, r1);
}

function compute_new_height(h, expr, r) {
    const [v, p] = h[h.length - 1];

    let new_p = find_lower_height_pos(expr, h, p, r);

    if (new_p !== undefined) {
        return height_fill_dec(h, new_p, r);
    } else {
        return find_maximal_entry_below(expr, v, h, r)?.[1];
    }
}

function expand(expr, index, shorter) {
    if (expr.length === 0) return expr;
    const right = expr.length - 1;
    if (expr[right].length === 0) return expr.slice(0, -1);
    const top = expr[right].length - 1;
    const tr_entry = expr[right][top];
    const r = tr_entry[0];

    // compute lnz-1

    const h = tr_entry[1];

    const new_h = compute_new_height(h, expr, r);

    let new_col = expr[right].slice(0, -1);
    if (new_h !== undefined) new_col = merge_column(new_col, [[r, new_h]]);
    new_col = merge_column(new_col, expr[r]);

    const result = expr.slice(0, -1);
    result.push(new_col);

    for (let w = 1; w <= index; w++) {
        for (let i = r + 1; i <= right; i++) {
            result.push(copy_column(result[i], r, (right - r) * w));
        }
    }
    if (shorter) result.pop();
    return result;
}

function layered_top_separator(expr, h, r) {
    const [, p] = h[h.length - 1];
    if (p === 'w') return p;

    let layer = -1;
    let current = p;
    while (current !== undefined) {
        current = find_lower_height_pos(expr, h, current, r);
        layer++;
    }
    return layer;
}

const INFINITY_dbms = Infinity;

function is_infinity_dbms(expr) {
    return expr === INFINITY_dbms;
}

function convert_to_dbms(expr) {
    if (is_infinity(expr)) return INFINITY_dbms;

    return convert_to_dbms_data(expr)[1];
}

function convert_to_dbms_data(expr) {
    const result = [];
    const result_dbms = [];

    for (let i = 0; i < expr.length; i++) {
        const [result_i, result_dbms_i] = convert_to_dbms_data_column(expr, i);
        result[i] = result_i;
        result_dbms[i] = result_dbms_i;
    }

    return [result, result_dbms];
}

function convert_to_dbms_data_column(expr, i) {
    const result = [];
    const result_dbms = [];
    for (let j = expr[i].length - 1; j >= 0; j--) {
        const v = expr[i][j][0];
        let current = expr[i][j][1];
        while (true) {
            if (current === undefined || (j > 0 && compare_height(current, expr[i][j - 1][1]) <= 0)) break;
            const s = layered_top_separator(expr, current, v);
            result.push([v, current]);
            result_dbms.push([v, s]);
            current = compute_new_height(current, expr, v);
        }
    }
    result.reverse();
    result_dbms.reverse();
    return [result, result_dbms];
}

function dbms_entry_display([v, s]) {
    const d_v = v + 1;
    const d_s = s === 'w' ? ';' : ','.repeat(s + 1);
    return d_s + d_v;
}

function dbms_column_display(col) {
    if (col.length === 0) return '(0)';
    return '(' + col.map((entry) => dbms_entry_display(entry)).join('') + ')';
}

function dbms_display(expr) {
    if (is_infinity_dbms(expr)) return 'Limit';
    return expr.map((col) => dbms_column_display(col)).join('');
}

/** dbms 的单列标记列标显示: plain 在括号内以 ':' 追加列标(空列写作 '(0:N)'), html 作灰色下标写在括号之后。 */
function dbms_column_display_marked(col, index, type) {
    const content = col.length === 0 ? '0' : col.map((entry) => dbms_entry_display(entry)).join('');
    if (type === 'html') return '(' + content + ")<sub><span style='color:#888'>" + index + '</span></sub>';
    return '(' + content + ':' + index + ')';
}

/** dbms 的标记列标显示: 列标自 start_index 起(1-based)。 */
export function dbms_display_marked(expr, type = 'plain', start_index = 1) {
    if (is_infinity_dbms(expr)) return 'Limit';
    const parts = [];
    let index = start_index;
    for (const col of expr) {
        parts.push(dbms_column_display_marked(col, index, type));
        index++;
    }
    return parts.join('');
}

function compare_dbms_vertical(v1, v2) {
    return lex_compare(v1, v2, compare_height_pos);
}

function dbms_vertical_increase(v, s) {
    const result = deepcopy(v);
    while (result.length > 0 && compare_height_pos(result[result.length - 1], s) < 0) result.pop();
    result.push(s);
    return result;
}

function dbms_column_verticals(col) {
    let current = [];
    const result = [];
    for (let i = 0; i < col.length; i++) {
        current = dbms_vertical_increase(current, col[i][1]);
        result.push(current);
    }
    return result;
}

function dbms_find_index_below_row(V, v) {
    let l = 0,
        r = V.length;
    while (l < r) {
        const m = (l + r + 1) >> 1;
        if (compare_dbms_vertical(v, V[m - 1]) > 0) l = m;
        else r = m - 1;
    }
    return l;
}

function dbms_compute_parent(expr, V, [i, j]) {
    const pi = expr[i][j][0];
    const pj = dbms_find_index_below_row(V[pi], V[i][j]);
    return [pi, pj];
}

export function convert_dbms_to_layer(om) {
    if (is_infinity_dbms(om)) return om;

    const V = om.map(dbms_column_verticals);

    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
        const column = dm[i];
        for (let j = 0; j < column.length; j++) {
            const [pi, pj] = dbms_compute_parent(om, V, [i, j]);
            const entry = column[j];
            entry[0] = pj === om[pi].length ? 0 : 1 + dm[pi][pj][0];
        }
    }
    return dm;
}

function dbms_to_y_mountain_column(expr, V, y_mountain, i) {
    const result = [];
    result[expr[i].length] = 1;
    for (let j = expr[i].length - 1; j >= 0; j--) {
        const [pi, pj] = dbms_compute_parent(expr, V, [i, j]);
        result[j] = y_mountain[pi][pj] + result[j + 1];
    }
    return result;
}

function dbms_to_y_mountain(expr) {
    const V = expr.map(dbms_column_verticals);
    const result = [];
    for (let i = 0; i < expr.length; i++) {
        result[i] = dbms_to_y_mountain_column(expr, V, result, i);
    }
    return result;
}

function display_as_Y(matrix) {
    if (is_infinity_dbms(matrix)) return '1,3,13';
    return dbms_to_y_mountain(matrix)
        .map((col) => col[0])
        .join(',');
}

function to_y_sequence(expr) {
    return dbms_to_y_mountain(convert_to_dbms(expr)).map((col) => col[0]);
}

function dbms_vertical_display(v) {
    return v.map((x) => (x === 'w' ? ';' : ','.repeat(x + 1))).join('/');
}

/** 由表达式与等价表示算出"形状 + 布局选项":画布版与 HTML 版共用这一份数据。 */
function build_SDBMS_mountain_source(expr, current_equiv) {
    if (is_infinity(expr) || expr.length === 0) return undefined;

    const is_dbms = current_equiv === 'dbms' || current_equiv === 'm dbms';
    const is_m = current_equiv === 'm' || current_equiv === 'm dbms';
    const is_l_dbms = current_equiv === 'l dbms';
    const is_y = current_equiv === 'Y';

    const [mountain, dbms] = convert_to_dbms_data(expr);
    const V = dbms.map(dbms_column_verticals);
    const layered = is_l_dbms ? convert_dbms_to_layer(dbms) : [];
    const y = is_y ? dbms_to_y_mountain(dbms) : [];

    const shape = [];

    for (let i = 0; i < expr.length; i++) {
        shape[i] = [
            {
                vertical: [],
                text: is_y ? '' + y[i][0] : is_m ? ':' + (i + 1) : '*',
            },
        ];

        for (let j = 0; j < dbms[i].length; j++) {
            shape[i][j + 1] = {
                vertical: V[i][j],
                text: is_dbms
                    ? dbms_entry_display(dbms[i][j])
                    : is_l_dbms
                      ? dbms_entry_display(layered[i][j])
                      : is_y
                        ? '' + y[i][j + 1]
                        : entry_display(mountain[i][j], 'html'),
                leg_target: dbms_compute_parent(dbms, V, [i, j]),
            };
        }
    }

    return {
        shape,
        layout: {
            vertical_display: dbms_vertical_display,
            vertical_compare: compare_dbms_vertical,
            separator_count: (higher, lower) => 1,
        },
        display_html_entry: true,
    };
}

function draw_SDBMS_diagram(expr, current_equiv, invert_vertical) {
    const source = build_SDBMS_mountain_source(expr, current_equiv);
    if (!source) return undefined;
    const is_original = current_equiv === undefined || current_equiv === 'm';
    return draw_mountain_diagram(source.shape, source.layout, {
        invert_vertical,
        display_html_entry: source.display_html_entry,
        column_width: is_original ? 100 : 30,
    });
}

export const draw_diagram_control = {
    default_data: { current_equiv: undefined, invert_vertical: undefined },
    draw_diagram: (_expr, _data) => draw_SDBMS_diagram(_expr, _data.current_equiv, _data.invert_vertical ?? false),
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

// 从极限展开, 查找 to_y_seq 等于 target 的表达式
function from_y_seq(target) {
    if (target.length === 0) return [];
    if (target[0] !== 1) throw new Error('Illegal argument');
    if (target.length === 1) return [[]];
    if (!target.every((x) => Number.isInteger(x) && x > 0)) throw new Error('Illegal argument');

    let bound = [[]];
    let [mountain, dbms] = convert_to_dbms_data(bound);
    let V = dbms.map(dbms_column_verticals);
    let y_mountain = dbms_to_y_mountain(dbms);

    bound = INFINITY; // 初始时, bound 是 INFINITY. 缓存的各项数据都初始化为空.

    // 假设: to_y_seq(bound) 和 target 仅在 bound 的末位不同.
    while (true) {
        const right = bound.length - 1;

        // 首先尝试直接截断山脉. 注意 INFINITY 跳过这步.

        if (!is_infinity(bound)) {
            let new_l = dbms[right].length;
            while (new_l > 0 && y_mountain[right][0] - y_mountain[right][new_l - 1] + 1 > target[right]) {
                new_l--;
            }

            if (new_l !== dbms[right].length) {
                bound = deepcopy(bound);
                const [v, h] = mountain[right][new_l - 1];
                while (bound[right][bound[right].length - 1][0] < v) bound[right].pop();
                bound[right][bound[right].length - 1][1] = h;
            }
        }

        // 进行展开. 展开其实是线性的, 代价远低于 to_dbms 和 y_mountain. 只需对后两者进行重用.

        let bound_fs_index = 0;
        let bound_fs = is_infinity(bound) ? infinity_FS(bound_fs_index) : expand(bound, bound_fs_index, false);
        let mountain_fs = mountain.slice(0, -1);
        let dbms_fs = dbms.slice(0, -1);
        let V_fs = V.slice(0, -1);
        let y_mountain_fs = y_mountain.slice(0, -1);

        // 不断生成并比较基本列

        let compared = is_infinity(bound) ? 0 : right;
        while (true) {
            if (compared === target.length) return bound_fs.slice(0, compared);
            if (compared === bound_fs.length) {
                bound_fs_index++;
                bound_fs = is_infinity(bound) ? infinity_FS(bound_fs_index) : expand(bound, bound_fs_index, false);
            }
            const [next, dbms_next] = convert_to_dbms_data_column(bound_fs, compared);
            mountain_fs.push(next);
            dbms_fs.push(dbms_next);
            V_fs.push(dbms_column_verticals(dbms_next));
            y_mountain_fs.push(dbms_to_y_mountain_column(dbms_fs, V_fs, y_mountain_fs, compared));

            if (y_mountain_fs[compared][0] > target[compared]) {
                break;
            }

            if (y_mountain_fs[compared][0] < target[compared]) {
                throw new Error('Not standard');
            }

            compared++;
        }

        [bound, mountain, dbms, V, y_mountain] = [
            bound_fs.slice(0, compared + 1),
            mountain_fs,
            dbms_fs,
            V_fs,
            y_mountain_fs,
        ];
    }
}

function from_display_y_seq(str) {
    const seq = str.split(',').map((x) => Number(x.trim()));
    if (!seq.every(Number.isInteger)) throw new Error('Illegal input: ' + str);
    if (lex_compare(seq, [1, 3, 13], number_compare) === 0) return INFINITY;
    return from_y_seq(seq);
}

function truncate(expr) {
    const right = expr.length - 1;
    const top = expr[right].length - 1;
    const result = expand(expr, 0, false);
    if (result[right].length <= top) return result;
    result[right] = result[right].slice(0, result[right][top][0] === expr[right][top][0] ? top + 1 : top);
    return result;
}

export const S_omega_p1_DBMS = {
    id: 's-omega+1-dbms',
    name: 'S ω+1 DBMS',
    category_id: 'category-sdbms-test',
    display: {
        plain: (m) => display(m, 'plain'),
        html: (m) => display(m, 'html'),
        from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        m: {
            plain: (m) => display_marked(m, 'plain'),
            html: (m) => display_marked(m, 'html'),
            from_display,
            name: { id: 'display.index-marked' },
        },
        dbms: {
            plain: (m) => dbms_display(convert_to_dbms(m)),
            name: { id: 'display.dbms' },
        },
        'm dbms': {
            plain: (m) => dbms_display_marked(convert_to_dbms(m), 'plain'),
            html: (m) => dbms_display_marked(convert_to_dbms(m), 'html'),
            name: { id: 'display.marked-dbms' },
        },
        'l dbms': {
            plain: (m) => dbms_display(convert_dbms_to_layer(convert_to_dbms(m))),
            name: { id: 'display.layered-dbms' },
        },
        Y: {
            plain: (m) => display_as_Y(convert_to_dbms(m)),
            from_display: from_display_y_seq,
        },
    },
    ...MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, display, compare_column, truncate),
    is_limit,
    compare,

    draw_diagram: draw_diagram_control,
    mountain_view: (expr, data) => build_SDBMS_mountain_source(expr, data?.current_equiv),

    credit_text_id: 'credit.up2dbms-v2',

    init: () => [INFINITY, [[]], []],
};

ensure_category(category_sdbms_test);
register_notation(S_omega_p1_DBMS);
