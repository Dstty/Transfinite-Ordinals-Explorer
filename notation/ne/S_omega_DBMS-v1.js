// ============================================================================
//  notation/ne/S_omega_DBMS-v1.js — SωDBMS v1（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/SDBMS/S_omega_DBMS-v1.ts（快照 d2d79cd）
//  注册 id: s-omega-dbms（单体记号，无 generator）
//  category_id: 'category-sdbms-test' —— 按源文件原文，**未改分类**。该分类源出
//  ne 的 src/notations/MN/SDBMS/categories.ts；本项目 notation/ne/categories.js
//  骨架里缺它，由 notation/ne/SDBMS_utils.js 按原文补注册（幂等）。
//
//  表达式 = Column[]；Column = Entry[]；Entry = [v: number, h: Height]；
//  Height = number[]（显示时 1-based 且反序，见 entry_display / parse_height）；
//  极限哨兵 INFINITY = Infinity。
//
//  与 ne 原版的差异（仅依赖/接线层面，算法本体逐行照搬）：
//   1) DBMS 侧的共用代码（DBMS 文本显示、Vertical 换算、convert_dbms_to_layer、
//      dbms_to_y_mountain、display_as_Y）在 v1/v2/v3 三个源文件里逐字相同，抽到
//      notation/ne/SDBMS_utils.js。convert_dbms_to_layer 与 dbms_display_marked
//      在源文件里是 export，本文件原样 re-export，导出面不变。
//   2) deepcopy 在本文件里的唯一调用点（convert_dbms_to_layer）随之上移，
//      故 import 里不再列出它（其余 import 与源文件一致）。
//   3) ne 原版 v1 本就**没有** draw_diagram / mountain_view 字段（v2/v3 才有），
//      本文件同样没有。
//   4) 类型注解全部去除，其余一字未改。
// ============================================================================
import { anti_lex_compare, lex_compare, number_compare, tuple_lex_compare } from '../../core/ne/utils.js';
import { sequence_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';
import {
    INFINITY_dbms,
    convert_dbms_to_layer,
    dbms_display,
    dbms_display_marked,
    display_as_Y,
} from './SDBMS_utils.js';

export { convert_dbms_to_layer, dbms_display_marked };

// ---------------------------------------------------------------------------
//  S_omega_DBMS-v1.ts 正文（逐行照搬，仅去掉类型注解）
// ---------------------------------------------------------------------------

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

function infinity_FS(index) {
    return [[], [[0, Array(index + 1).fill(0)]]];
}

function is_limit(expr) {
    if (is_infinity(expr)) return true;
    return expr.length > 0 && expr[expr.length - 1].length > 0;
}

function compare_height(h1, h2) {
    return anti_lex_compare(h1, h2, number_compare);
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

function entry_display([v, s], type) {
    const d_v = v + 1;
    const d_s = s
        .map((x) => x + 1)
        .toReversed()
        .join(',');
    if (type === 'html') return d_v + '<sup>' + d_s + '</sup>';
    return d_v + '^(' + d_s + ')';
}

function column_display(col, type) {
    if (col.length === 0) return '(0)';
    return '(' + col.map((entry) => entry_display(entry, type)).join(',') + ')';
}

function display(expr, type = 'plain') {
    if (is_infinity(expr)) return 'Limit';
    return expr.map((col) => column_display(col, type)).join('');
}

/** 标记列标显示: 对每一列显式给出其列标(1-based, 自 start_index 起递增), 仿 S1DBMS 的 display_marked。
 *  plain 把列标写在括号内并以 ':' 引导(如 (:1)(1^(1):2));
 *  html 把列标写在括号之后作为灰色下标。 */
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

/** 反解析(手写递归下降, 不用正则)。语法与 display 的 plain 产物一致:
 *  若干列 '(...)' 依次拼接, 空列为 '(0)', 项为 'v^(s1,s2,…)'。
 *  行高在显示时按 1-based 且反序(见 entry_display), 故解析时反向还原: 先减一, 再反序。 */
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

    function parse_height() {
        skip_spaces();
        if (i >= s.length || s[i] !== '(') error();
        i++;
        const displayed = [];
        skip_spaces();
        if (i < s.length && s[i] !== ')') {
            displayed.push(parse_number());
            skip_spaces();
            while (i < s.length && s[i] === ',') {
                i++;
                displayed.push(parse_number());
                skip_spaces();
            }
        }
        if (i >= s.length || s[i] !== ')') error();
        i++;
        return displayed.map((x) => x - 1).toReversed();
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
    return value >= r ? value + offset : value;
}

function copy_height(h, r, offset) {
    return h.map((s) => copy_value(s, r, offset));
}

function copy_entry(entry, r, offset) {
    return [copy_value(entry[0], r, offset), copy_height(entry[1], r, offset)];
}

function copy_column(col, r, offset) {
    return col.map((entry) => copy_entry(entry, r, offset));
}

function find_index_below_height(col, h) {
    let l = 0,
        r = col.length;
    while (l < r) {
        const m = (l + r + 1) >> 1;
        if (compare_height(h, col[m - 1][1]) > 0) l = m;
        else r = m - 1;
    }
    return l;
}

function top_separator(h) {
    if (h.length === 0) return 0;
    const rh = h[0];
    let s = 0;
    while (s < h.length && h[s] === rh) s++;
    return s;
}

function compute_new_height(h, col_rh, r) {
    const s = top_separator(h);

    const new_h = h.slice();
    const hj = find_index_below_height(col_rh, h);
    if (hj === col_rh.length) {
        const h_candidate = height(col_rh);
        if (h_candidate.length < s) {
            new_h.pop();
        } else {
            new_h[s - 1] = h_candidate[s - 1];
        }
    } else {
        const base_h = hj === 0 ? [] : col_rh[hj - 1][1];
        if (base_h.length === h.length && lex_compare(base_h.slice(s), h.slice(s), number_compare) === 0) {
            new_h[s - 1] = base_h[s - 1];
        } else {
            new_h[s - 1] = col_rh[hj][0];
        }
    }
    new_h.fill(r, 0, s - 1);

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
    const rh = h[0];

    const new_h = compute_new_height(h, expr[rh], r);

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

// Entry_DBMS / Column_DBMS / Expr_DBMS 的声明与 is_infinity_dbms、DBMS 显示、
// Vertical 换算、convert_dbms_to_layer、dbms_to_y_mountain、display_as_Y
// 均与 v2/v3 逐字相同, 已抽到 notation/ne/SDBMS_utils.js。

function convert_to_dbms(expr) {
    if (is_infinity(expr)) return INFINITY_dbms;

    const result = [];
    for (let i = 0; i < expr.length; i++) {
        result[i] = [];
        for (let j = 0; j < expr[i].length; j++) {
            const part = [];

            const v = expr[i][j][0];
            let current = expr[i][j][1];
            while (true) {
                if (current.length === 0 || (j > 0 && compare_height(current, expr[i][j - 1][1]) <= 0)) break;
                const s = top_separator(current);
                current = compute_new_height(current, expr[current[0]], v);
                part.push([v, s - 1]);
            }

            result[i].push(...part.reverse());
        }
    }
    return result;
}

export const S_omega_DBMS_v1 = {
    id: 's-omega-dbms',
    name: 'SωDBMS v1',
    category_id: 'category-sdbms-test',
    display: {
        plain: (m) => display(m, 'plain'),
        html: (m) => display(m, 'html'),
        from_display,
        name: { id: 'display.index' },
    },
    display_equiv: {
        marked: {
            plain: (m) => display_marked(m, 'plain'),
            html: (m) => display_marked(m, 'html'),
            from_display,
            name: { id: 'display.index-marked' },
        },
        dbms: {
            plain: (m) => dbms_display(convert_to_dbms(m)),
            name: { id: 'display.dbms' },
        },
        'marked dbms': {
            plain: (m) => dbms_display_marked(convert_to_dbms(m), 'plain'),
            html: (m) => dbms_display_marked(convert_to_dbms(m), 'html'),
            name: { id: 'display.marked-dbms' },
        },
        'layered dbms': {
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
    credit_text_id: 'credit.s-omega-dbms',

    init: () => [INFINITY, [[]], []],
};

register_notation(S_omega_DBMS_v1);
