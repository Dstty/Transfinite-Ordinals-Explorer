// ============================================================================
//  notation/ne/S_omega_DBMS-v2.js — SωDBMS v2（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SDBMS/S_omega_DBMS-v2.ts（快照 d2d79cd）
//  注册 id: s-omega-dbms-v2（单体记号，无 generator）
//  category_id: 'category-sdbms-test' —— 按源文件原文，**未改分类**。该分类源出
//  ne 的 src/notations/MN/SDBMS/categories.ts；本项目 notation/ne/categories.js
//  骨架里缺它，由 notation/ne/SDBMS_utils.js 按原文补注册（幂等）。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [v: number|undefined, h: Height]；
//  Height = HeightEntry[]；HeightEntry = [p: number|undefined, v: number|undefined]
//  （p === undefined 表示「无穷位置」，v === undefined 表示 ω）；哨兵 INFINITY。
//
//  与 ne 原版的差异（仅依赖/接线层面，算法本体逐行照搬）：
//   1) DBMS 侧共用代码（DBMS 文本显示、Vertical 换算、convert_dbms_to_layer、
//      dbms_to_y_mountain、display_as_Y、dbms_vertical_display）在 v1/v2/v3 三个
//      源文件里逐字相同，抽到 notation/ne/SDBMS_utils.js。源文件里 export 的
//      convert_dbms_to_layer / dbms_display_marked 本文件原样 re-export，导出面不变。
//   2) anti_lex_compare 在本文件里的唯一调用点（compare_dbms_vertical）随之上移，
//      故 import 里不再列出它（其余 import 与源文件一致，deepcopy 仍被 height_fill 使用）。
//   3) draw_diagram 完整搬入：源文件用 ne 的 draw_mountain_diagram(shape, layout, opts)
//      图元层，本项目已把它逐行搬到 core/ne/drawMountainDiagram.js，这里直接接上，
//      第三个实参（MountainDiagramOptions 选项对象）按源文件原样传递。
//      另两个纯类型 import（DiagramControl / Diagram / DiagramData / MountainViewSource
//      / MountainShape）在 JS 下无运行时载体，按规范删除。
//   4) 类型注解全部去除，其余一字未改。
// ============================================================================
import {
    anti_lex_compare,
    compare_undefined_last_by,
    deepcopy,
    lex_compare,
    lex_compare_by,
    number_compare,
    tuple_lex_compare,
} from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
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
    dbms_to_y_mountain,
    dbms_vertical_display,
    display_as_Y,
} from './SDBMS_utils.js';

export { convert_dbms_to_layer, dbms_display_marked };

// ---------------------------------------------------------------------------
//  S_omega_DBMS-v2.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    return [
        [],
        [
            [
                0,
                [
                    [undefined, 0],
                    [index, undefined],
                ],
            ],
        ],
    ];
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare_height(h1, h2) {
    return lex_compare(h1, h2, lex_compare_by(compare_undefined_last_by(number_compare)));
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

function height_entry_display([p, v]) {
    const d_v = v === undefined ? 'ω' : '' + (v + 1);
    if (p === undefined) return d_v;
    return d_v + '@' + p;
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

    /** 行高的值: 'ω'(容错写法 'w')表示 ω(内部 undefined); 数字 n 的内部值 = n - 1。 */
    function parse_height_value() {
        skip_spaces();
        if (i < s.length && (s[i] === 'ω' || s[i] === 'w')) {
            i++;
            return undefined;
        }
        return parse_number() - 1;
    }

    /**
     * 行高的单项: 'v@p', 或省略 '@p' 的 'v'。
     * v 为值(见 parse_height_value, undefined 即 ω); p 为位置, **p === undefined 表示无穷**,
     * display 对无穷省略 '@p', 因此该写法只在首位合法(即 '@无穷' 只能出现在首位)。
     * 内部按 [位置, 值] 存放。
     */
    function parse_height_item(first) {
        const v = parse_height_value();
        skip_spaces();
        if (i < s.length && s[i] === '@') {
            i++;
            return [parse_number(), v];
        }
        if (!first) error(); // 省略 '@p'(即位置为无穷)只允许出现在首位
        return [undefined, v];
    }

    /**
     * 解析行高: 形如 '(项,项,…)', 项为 'v@p' 或首位的 'v'(见 parse_height_item), 空为 '()'。
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
            result.push(parse_height_item(true));
            skip_spaces();
            while (i < s.length && s[i] === ',') {
                i++;
                skip_spaces();
                result.push(parse_height_item(false));
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
    if (col.length === 0) return [];
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
        return [...col1, ...filter_height_greater(col2, height(col1))];
    }
    return merge_column(merge_column(cols[0], cols[1]), ...cols.slice(2));
}

function copy_value(value, r, offset) {
    return value === undefined ? undefined : value >= r ? value + offset : value;
}

function copy_height_entry([p, v], r, offset) {
    return [p, copy_value(v, r, offset)];
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
    if (h[h.length - 1][1] === undefined) return h[h.length - 1][0] + 1;
    return 0;
}

function height_fill(h, p, v) {
    const new_h = deepcopy(h);
    while (new_h.length > 1 && new_h[new_h.length - 1][0] <= p) new_h.pop();
    if (new_h[new_h.length - 1][1] !== v) {
        new_h.push([p, v]);
    }
    return new_h;
}

function compute_new_height(h, expr, r) {
    const [p, v] = h[h.length - 1];
    let new_h = h;
    if (v === undefined) {
        if (p === undefined) {
            throw new Error('Illegal state');
        }

        new_h = height_fill(new_h, p, r);
        if (p > 0) {
            new_h = height_fill(new_h, p - 1, undefined);
        }
    } else if (p === undefined) {
        new_h = height(expr[v]);
    } else {
        const col_rh = expr[v];
        const hj = col_rh.findIndex(([, hv]) => compare_height(h, hv) <= 0);

        if (hj === -1) {
            new_h = height(col_rh);
        } else {
            const new_value = col_rh[hj][0];
            new_h = height_fill(new_h, p, new_value);
            if (p > 0) {
                new_h = height_fill(new_h, p - 1, undefined);
            }
            if (hj > 0) {
                const lower = hj > 0 ? col_rh[hj - 1][1] : [];
                if (compare_height(lower, new_h) > 0) {
                    new_h = lower;
                }
            }
        }
    }
    return new_h;
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

// Entry_DBMS / Column_DBMS / Expr_DBMS / Vertical_DBMS 的声明、is_infinity_dbms、
// DBMS 显示、Vertical 换算、convert_dbms_to_layer、dbms_to_y_mountain、display_as_Y、
// dbms_vertical_display 均与 v1/v3 逐字相同, 已抽到 notation/ne/SDBMS_utils.js。

function convert_to_dbms(expr) {
    if (is_infinity(expr)) return INFINITY_dbms;

    return convert_to_dbms_data(expr)[1];
}

function convert_to_dbms_data(expr) {
    const result = [];
    const result_dbms = [];

    for (let i = 0; i < expr.length; i++) {
        result[i] = [];
        result_dbms[i] = [];
        for (let j = expr[i].length - 1; j >= 0; j--) {
            const v = expr[i][j][0];
            let current = expr[i][j][1];
            while (true) {
                if (current.length === 0 || (j > 0 && compare_height(current, expr[i][j - 1][1]) <= 0)) break;
                const s = top_separator(current);
                result[i].push([v, current]);
                result_dbms[i].push([v, s]);
                current = compute_new_height(current, expr, v);
            }
        }
        result[i].reverse();
        result_dbms[i].reverse();
    }

    return [result, result_dbms];
}

function to_y_sequence(expr) {
    return dbms_to_y_mountain(convert_to_dbms(expr)).map((col) => col[0]);
}

function verify_with_weak_omega_y(expr) {
    if (is_infinity(expr)) return true;

    const index = 3;
    const y_seq = to_y_sequence(expr);
    const mine = to_y_sequence(S_omega_DBMS_v2.FS(expr, index));
    const theirs = omega_Y_weak.FS(y_seq, index);

    const result = omega_Y_weak.compare(mine, theirs) === 0;
    if (!result) {
        console.log(mine, theirs);
    }
    return result;
}

/** 由表达式与等价表示算出"形状 + 布局选项":画布版与 HTML 版共用这一份数据。 */
function build_SomegaDBMS_mountain_source(expr, current_equiv) {
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

function draw_SomegaDBMS_diagram(expr, current_equiv, invert_vertical) {
    const source = build_SomegaDBMS_mountain_source(expr, current_equiv);
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
    draw_diagram: (_expr, _data) => draw_SomegaDBMS_diagram(_expr, _data.current_equiv, _data.invert_vertical ?? false),
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

export const S_omega_DBMS_v2 = {
    id: 's-omega-dbms-v2',
    name: 'SωDBMS v2',
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
        },
    },
    ...sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display),
    is_limit,
    compare,

    draw_diagram: draw_diagram_control,
    mountain_view: (expr, data) => build_SomegaDBMS_mountain_source(expr, data?.current_equiv),

    credit_text_id: 'credit.s-omega-dbms',

    init: () => [INFINITY, [[]], []],
};

register_notation(S_omega_DBMS_v2);
