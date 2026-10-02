// ============================================================================
//  notation/ne/SDBMS_utils.js — SDBMS（SωDBMS v1 / v2 / v3）共用层
// ============================================================================
//  来源：ne-rewritten 快照 d2d79cd
//    src/notations/MN/SDBMS/S_omega_DBMS-v1.ts
//    src/notations/MN/SDBMS/S_omega_DBMS-v2.ts
//    src/notations/MN/SDBMS/S_omega_DBMS-v3.ts
//
//  三个源文件里**逐字相同**的 DBMS 侧代码集中于此（已逐块比对：v1 与 v2 的六块
//  全同；v3 只有 dbms_to_y_mountain 一项被拆成了 dbms_to_y_mountain_column +
//  dbms_to_y_mountain，故 v3 的那个两行版仍留在 v3 文件内，拆出的 column 版因为
//  被 v3 的 from_y_seq 复用，放在本模块）。
//
//  本模块只处理 Expr_DBMS = [number, number][][] → layer / Y 山 / DBMS 文本，
//  不含任何版本私有的高度语义（Height 的类型与比较三个版本各不相同，都在各自
//  文件内），故可安全共用。
//
//  导出面说明：dbms_display_marked 与 convert_dbms_to_layer 在源文件里就是
//  `export function`，本模块原样 export；其余 DBMS 侧函数在源文件里是模块私有，
//  拆成独立模块后必须跨模块引用，故一并 export（不改函数体）。
//
//  分类：ne 的 src/notations/MN/SDBMS/categories.ts 导出 category_sdbms 与
//  category_sdbms_test 两个分类。本项目 notation/ne/categories.js 骨架只注册了
//  category-sdbms，缺 category-sdbms-test，而 v1/v2 的 category_id 正是后者，
//  register_notation 会因「分类不存在」抛 RegisterError。故本模块按 categories.ts
//  原文（id / name / parent_id 一字未改）补注册；ensure_category 幂等——日后若把
//  它补进 categories.js 骨架，这里自动退化为空操作。**未改任何记号分类。**
//
//  与 ne 的差异：仅去掉类型注解（Entry_DBMS / Column_DBMS / Expr_DBMS /
//  Vertical_DBMS 与 `Infinity as any` 的 as any、`Array<number>(n)` 的类型实参）。
//  函数体、常量、运算顺序零改动。
// ============================================================================
import { anti_lex_compare, deepcopy, number_compare } from '../../core/ne/utils.js';
import { ensure_category } from '../../core/ne/registry.js';

// ---------------------------------------------------------------------------
//  DBMS 表示：Entry_DBMS = [number, number]; Column_DBMS = Entry_DBMS[];
//  Expr_DBMS = Column_DBMS[]; Vertical_DBMS = number[]。
// ---------------------------------------------------------------------------

const INFINITY_dbms = Infinity;

function is_infinity_dbms(expr) {
    return expr === INFINITY_dbms;
}

function dbms_entry_display([v, s]) {
    const d_v = v + 1;
    const d_s = ','.repeat(s + 1);
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
    return anti_lex_compare(v1, v2, number_compare);
}

function dbms_vertical_increase(v, s) {
    if (v.length <= s) return [...Array(s).fill(0), 1];
    const result = v.slice();
    result[s]++;
    result.fill(0, 0, s);
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

function dbms_to_y_mountain(expr) {
    const V = expr.map(dbms_column_verticals);
    const result = [];
    for (let i = 0; i < expr.length; i++) {
        result[i] = [];
        result[i][expr[i].length] = 1;
        for (let j = expr[i].length - 1; j >= 0; j--) {
            const [pi, pj] = dbms_compute_parent(expr, V, [i, j]);
            result[i][j] = result[pi][pj] + result[i][j + 1];
        }
    }
    return result;
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

function display_as_Y(matrix) {
    if (is_infinity_dbms(matrix)) return '1,ω';
    return dbms_to_y_mountain(matrix)
        .map((col) => col[0])
        .join(',');
}

function dbms_vertical_display(v) {
    const result = [];
    for (let i = 0; i < v.length; i++) {
        for (let j = 0; j < v[i]; j++) {
            result.push(','.repeat(i + 1));
        }
    }
    return result.toReversed().join('/');
}

// ---------------------------------------------------------------------------
//  跨记号文件引用（拆模块后必需的导出面；函数体与原文件完全一致）
// ---------------------------------------------------------------------------
export {
    INFINITY_dbms,
    compare_dbms_vertical,
    dbms_column_verticals,
    dbms_compute_parent,
    dbms_display,
    dbms_entry_display,
    dbms_to_y_mountain,
    dbms_to_y_mountain_column,
    dbms_vertical_display,
    display_as_Y,
};

// ---------------------------------------------------------------------------
//  分类：ne 的 src/notations/MN/SDBMS/categories.ts 中的 category_sdbms_test
// ---------------------------------------------------------------------------
export const category_sdbms_test = {
    id: 'category-sdbms-test',
    // ne 这里是 i18n 键对象 { id: 'category-name.sdbms-test' }；本项目没有分类级 i18n
    // 解析，原样保留会让分类名变成 "[object Object]"（/list 渲染时 React 直接抛错）。
    // 取 ne i18n 目录（use_i18n.ts）里的中文值。
    name: '试作记号',
    parent_id: 'category-sdbms',
};

ensure_category(category_sdbms_test);
