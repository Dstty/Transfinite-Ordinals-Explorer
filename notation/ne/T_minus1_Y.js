// ============================================================================
//  notation/ne/T_minus1_Y.js — Transfinite -1Y（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/T_minus1_Y.ts（132 行）
//  注册 id: t--1y，分类 category-y
//    （与旧条目 notation/rewritten/T-minus1-Y.js 的 id 相同；分类骨架已由
//      notation/ne/categories.js 以「纯容器、无 generator」形式注册，
//      源文件也没有分类定义，故本文件直接 register_notation，不用 ensure_category）
//
//  与 ne 的差异：无（仅去类型注解）。源文件不涉及图元层，导入面与 ne 一致：
//    - 导入 lex_compare（core/ne/utils.js）
//  表达式 = 嵌套数组（元素本身是 Expr），显示为 "1,2,(1,2)" / "Limit"。
//  注：源文件里 `type Expr = Expr[]` 是自递归类型别名（TS 里本就无用），
//      按规范删除类型后该行消失，运行时行为不受影响；
//      源文件第二处的 `compare` 以自身作为 lex_compare 的比较器（递归比较子项），
//      照搬如此，不"修正"。
// ============================================================================
import { lex_compare } from '../../core/ne/utils.js';
import { register_notation } from '../../core/ne/registry.js';

function INFINITY() {
    return [Infinity];
}

function is_infinity(e) {
    return '' + e === 'Infinity';
}

function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && e[e.length - 1].length > 0);
}

function compare(a, b) {
    return lex_compare(a, b, compare);
}

function root(a) {
    if (is_infinity(a)) return -1;
    if (a.length === 0) return -1;
    let result = a.length - 2;
    while (result >= 0 && compare(a[result], a[a.length - 1]) >= 0) result--;
    return result;
}

function infinity_FS(index) {
    if (index === 0) return [[]];
    return [[], infinity_FS(index - 1)];
}

function FS(a, index) {
    if (is_infinity(a)) return infinity_FS(index);
    if (a.length === 0) return a;
    if (a[a.length - 1].length === 0) return a.slice(0, -1);

    if (is_limit(a[a.length - 1])) {
        return [...a.slice(0, -1), FS(a[a.length - 1], index)];
    }

    let r = root(a);
    let result = a.slice(0, -1);
    let dup = a.slice(r, -1);
    dup[0] = a[a.length - 1].slice(0, -1);
    for (let i = 0; i < index; i++) result.push(...dup);
    return result;
}

function display(a, top_level = true) {
    if (is_infinity(a)) return 'Limit';
    if (top_level) return a.map((t) => display(t, false)).join(',');
    if (a.every((t) => t.length === 0)) return '' + a.length;
    return '(' + display(a, true) + ')';
}

function from_display(str) {
    let i = 0;
    const s = str;

    function error() {
        throw new Error('Illegal input string: ' + s);
    }

    function skip_spaces() {
        while (i < s.length && s[i] === ' ') i++;
    }

    // 逗号分隔的子项列表: 顶层表达式与括号内容共用同一语法; ')' 处结束, 由调用方消费
    function parse_list() {
        const result = [];
        skip_spaces();
        if (i >= s.length || s[i] === ')') return result;
        while (true) {
            result.push(parse_child());
            skip_spaces();
            if (i >= s.length || s[i] !== ',') break;
            i++;
            skip_spaces();
            if (i >= s.length || s[i] === ')') error();
        }
        return result;
    }

    function parse_child() {
        skip_spaces();
        if (i >= s.length) error();
        if (s[i] === '(') {
            i++;
            const inner = parse_list();
            skip_spaces();
            if (i >= s.length || s[i] !== ')') error();
            i++;
            return inner;
        }
        // 整数 k: 由 k 个空数组构成的子项 (display 中显示为计数)
        const start = i;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        if (start === i) error();
        const k = parseInt(s.substring(start, i), 10);
        return Array.from({ length: k }, () => []);
    }

    // 'Limit' 只允许作为整串输入 (带或不带前后空格)
    skip_spaces();
    if (s.slice(i, i + 5) === 'Limit') {
        i += 5;
        skip_spaces();
        if (i !== s.length) error();
        return INFINITY();
    }
    const result = parse_list();
    skip_spaces();
    if (i !== s.length) error();
    return result;
}

export const T_Minus1_Y = {
    id: 't--1y',
    name: 'Transfinite -1Y',
    simple_name: 'T(-1)Y',
    category_id: 'category-y',
    display: { plain: display, from_display },
    compare,
    is_limit,
    FS,
    credit_text_id: 'credit.community_y',

    init: () => [INFINITY(), []],
};

register_notation(T_Minus1_Y);
