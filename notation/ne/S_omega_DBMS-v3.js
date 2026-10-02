// ============================================================================
//  notation/ne/S_omega_DBMS-v3.js — SωDBMS v3（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SDBMS/S_omega_DBMS-v3.ts（快照 d2d79cd）
//  注册 id: s-omega-dbms-v3（单体记号，无 generator）
//  category_id: 'category-sdbms' —— 按源文件原文，**未改分类**（该分类已在
//  notation/ne/categories.js 骨架里注册，故本文件直接 register_notation）。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [v: number, h: Height]；
//  Height = HeightEntry[]；HeightEntry = [v: number, p: number] —— 注意 v3 的
//  行高项顺序与 v1/v2 相反（见 parse_height_item 的注释）；哨兵 INFINITY。
//
//  与 ne 原版的差异（仅依赖/接线层面，算法本体逐行照搬）：
//   1) DBMS 侧共用代码（DBMS 文本显示、Vertical 换算、convert_dbms_to_layer、
//      dbms_to_y_mountain、display_as_Y、dbms_vertical_display）在 v1/v2/v3 三个
//      源文件里逐字相同，抽到 notation/ne/SDBMS_utils.js。其中
//      dbms_to_y_mountain_column 是 v3 自己拆出来的（v1/v2 是单函数内联版），
//      为保持本文件里的 dbms_to_y_mountain 一字不改，那个两行版仍留在本文件内，
//      被 from_y_seq 复用的 column 版放进共用模块。源文件里 export 的
//      convert_dbms_to_layer / dbms_display_marked 本文件原样 re-export，导出面不变。
//   2) anti_lex_compare 在本文件里的唯一调用点（compare_dbms_vertical）随之上移，
//      故 import 里不再列出它（其余 import 与源文件一致，deepcopy 仍被 from_y_seq 使用）。
//   3) draw_diagram 完整搬入：源文件用 ne 的 draw_mountain_diagram(shape, layout, opts)
//      图元层，本项目已把它逐行搬到 core/ne/drawMountainDiagram.js，这里直接接上，
//      第三个实参（MountainDiagramOptions 选项对象）按源文件原样传递。
//      另几个纯类型 import（DiagramControl / Diagram / DiagramData / MountainViewSource
//      / MountainShape）在 JS 下无运行时载体，按规范删除。
//   4) 类型注解全部去除，其余一字未改。
// ============================================================================
import { anti_lex_compare, deepcopy, lex_compare, lex_compare_by, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { draw_mountain_diagram } from '../../core/ne/drawMountainDiagram.js';
import { register_notation } from '../../core/ne/registry.js';
import { omega_Y_weak } from './Omega_Y.js';
import {
    INFINITY_dbms,
    compare_dbms_vertical,
    convert_dbms_to_layer,
    dbms_column_verticals,
    dbms_compute_parent,
    dbms_display,
    dbms_display_marked,
    dbms_entry_display,
    dbms_to_y_mountain_column,
    dbms_vertical_display,
    display_as_Y,
} from './SDBMS_utils.js';

export { convert_dbms_to_layer, dbms_display_marked };

// ---------------------------------------------------------------------------
//  S_omega_DBMS-v3.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    return [[], [[0, [[0, index]]]]];
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare_height(h1, h2) {
    return lex_compare(h1, h2, lex_compare_by(number_compare), false);
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
    return v + 1 + '@' + p;
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
     * 行高的单项 'v@p': v 为值(见 parse_height_value), p 为位置(原样, 不存在缺省)。
     * 内部按 [值, 位置] 存放(注意本版本与 v1/v2 的 [位置, 值] 顺序相反)。
     */
    function parse_height_item() {
        const v = parse_height_value();
        skip_spaces();
        if (i >= s.length || s[i] !== '@') error();
        i++;
        return [v, parse_number()];
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
        // 上标一律带括号, 故本版本允许省略 '^': '2^(1@1)' 与 '2(1@1)' 等价。
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
    return value >= r ? value + offset : value;
}

function copy_height_entry([v, p], r, offset) {
    return [copy_value(v, r, offset), p];
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

function top_separator(h) {
    return h[h.length - 1][1];
}

function height_fill_dec(h, p, v) {
    const new_h = h.slice();
    while (new_h.length > 0 && new_h[new_h.length - 1][1] <= p) new_h.pop();
    if (new_h.length > 0 && new_h[new_h.length - 1][0] === v) new_h.pop();
    new_h.push([v, p]);

    return new_h;
}

function compute_new_height(h, expr, r) {
    const [v, p] = h[h.length - 1];
    if (p > 0) {
        return height_fill_dec(h, p - 1, r);
    } else if (h.length === 1) {
        return height(expr[v]);
    } else {
        const p_bound = h[h.length - 2][1];

        const col_rh = expr[v];
        const hj = col_rh.findIndex(([, hv]) => compare_height(h, hv) <= 0);

        if (hj === -1) {
            return height(col_rh);
        } else {
            const new_value = col_rh[hj][0];
            let new_h = height_fill_dec(h, p_bound - 1, new_value);
            if (hj > 0) {
                const lower = hj > 0 ? col_rh[hj - 1][1] : [];
                if (compare_height(lower, new_h) > 0) {
                    new_h = lower;
                }
            }
            return new_h;
        }
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

// Entry_DBMS / Column_DBMS / Expr_DBMS / Vertical_DBMS 的声明、is_infinity_dbms、
// DBMS 显示、Vertical 换算、convert_dbms_to_layer、display_as_Y、dbms_vertical_display
// 均与 v1/v2 逐字相同, 已抽到 notation/ne/SDBMS_utils.js。

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
            const s = top_separator(current);
            result.push([v, current]);
            result_dbms.push([v, s]);
            current = compute_new_height(current, expr, v);
        }
    }
    result.reverse();
    result_dbms.reverse();
    return [result, result_dbms];
}

function dbms_to_y_mountain(expr) {
    const V = expr.map(dbms_column_verticals);
    const result = [];
    for (let i = 0; i < expr.length; i++) {
        result[i] = dbms_to_y_mountain_column(expr, V, result, i);
    }
    return result;
}

function to_y_sequence(expr) {
    return dbms_to_y_mountain(convert_to_dbms(expr)).map((col) => col[0]);
}

function verify_with_weak_omega_y(expr) {
    if (is_infinity(expr)) return true;

    const index = 3;
    const y_seq = to_y_sequence(expr);
    const mine = to_y_sequence(S_omega_DBMS_v3.FS(expr, index));
    const theirs = omega_Y_weak.FS(y_seq, index);

    const result = omega_Y_weak.compare(mine, theirs) === 0;
    if (!result) {
        console.log(mine, theirs);
    }
    return result;
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
            separator_count: () => 1,
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

// 从极限展开, 查找 to_y_seq 等于 target 的表达式
function from_y_seq(target) {
    if (target.length === 0) return [];
    if (target[0] !== 1) throw new Error('Illegal argument');
    if (target.length === 1) return [[]];
    if (!target.every((x) => Number.isInteger(x) && x > 0)) throw new Error('Illegal argument');

    let bound = infinity_FS(target[1] - 1); // 初始时, to_y_seq(bound) = (1, target[1]+1)
    let [mountain, dbms] = convert_to_dbms_data(bound);
    let V = dbms.map(dbms_column_verticals);
    let y_mountain = dbms_to_y_mountain(dbms);

    // 假设: to_y_seq(bound) 和 target 仅在 bound 的末位不同.
    while (true) {
        const right = bound.length - 1;

        // 首先尝试直接截断山脉.

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

        // 进行展开. 展开其实是线性的, 代价远低于 to_dbms 和 y_mountain. 只需对后两者进行重用.

        let bound_fs_index = 0;
        let bound_fs = expand(bound, bound_fs_index, false);
        let mountain_fs = mountain.slice(0, -1);
        let dbms_fs = dbms.slice(0, -1);
        let V_fs = V.slice(0, -1);
        let y_mountain_fs = y_mountain.slice(0, -1);

        // 不断生成并比较基本列

        let compared = right;
        while (true) {
            if (compared === target.length) return bound_fs.slice(0, compared);
            if (compared === bound_fs.length) {
                bound_fs_index++;
                bound_fs = expand(bound, bound_fs_index, false);
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
    if (str.trim() === '1,w' || str.trim() === '1,ω') return INFINITY;
    const seq = str.split(',').map((x) => Number(x.trim()));
    if (!seq.every(Number.isInteger)) throw new Error('Illegal input: ' + str);
    return from_y_seq(seq);
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

function truncate(expr) {
    const right = expr.length - 1;
    const top = expr[right].length - 1;
    const result = expand(expr, 0, false);
    if (result[right].length <= top) return result;
    result[right] = result[right].slice(0, result[right][top][0] === expr[right][top][0] ? top + 1 : top);
    return result;
}

export const S_omega_DBMS_v3 = {
    id: 's-omega-dbms-v3',
    name: 'SωDBMS v3',
    category_id: 'category-sdbms',
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

    credit_text_id: 'credit.s-omega-dbms',

    init: () => [INFINITY, [[]], []],
};

register_notation(S_omega_DBMS_v3);
