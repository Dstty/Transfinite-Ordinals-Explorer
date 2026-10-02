// ============================================================================
//  notation/ne/minus1_Y.js — -1Y sequence（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Y/minus1_Y.ts（60 行）
//  注册 id: -1y，分类 category-y
//    （与旧条目 notation/rewritten/minus1-Y.js 的 id 相同；分类骨架已由
//      notation/ne/categories.js 以「纯容器、无 generator」形式注册，
//      源文件也没有分类定义，故本文件直接 register_notation，不用 ensure_category）
//
//  与 ne 的差异：无。源文件不涉及图元层（无 y_diagram_control import、
//  无 draw_diagram 字段、无 mountain_view），因此本文件的导入面与 ne 逐字对应：
//    - 导入 lex_compare / number_compare（core/ne/utils.js）
//    - 导入 sequence_display / sequence_from_display（./Omega_Y.js）
//  算法逐行照搬，唯一改动是去掉类型注解（type Expr、参数/返回类型）。
//  INFINITY / is_infinity 在源文件里是模块私有（未 export），此处保持一致。
// ============================================================================
import { lex_compare, number_compare } from '../../core/ne/utils.js';
import { sequence_display, sequence_from_display } from './Omega_Y.js';
import { register_notation } from '../../core/ne/registry.js';

function INFINITY() {
    return [Infinity];
}

function is_infinity(e) {
    return '' + e === 'Infinity';
}

function is_limit(e) {
    return is_infinity(e) || (e.length > 0 && e[e.length - 1] > 1);
}

function compare(a, b) {
    return lex_compare(a, b, number_compare);
}

function root(a) {
    if (is_infinity(a)) return -1;
    if (a.length === 0) return -1;
    let result = a.length - 2;
    while (result >= 0 && a[result] >= a[a.length - 1]) result--;
    return result;
}

function infinity_FS(index) {
    return [1, index + 1];
}

function FS(a, index) {
    if (is_infinity(a)) return infinity_FS(index);
    if (a.length === 0) return a;
    if (a[a.length - 1] === 1) return a.slice(0, a.length - 1);

    let r = root(a);
    let result = a.slice(0, a.length - 1);
    let dup = a.slice(r, a.length - 1);
    dup[0] = a[a.length - 1] - 1;
    for (let i = 0; i < index; i++) result.push(...dup);
    return result;
}

export const Minus1_Y = {
    id: '-1y',
    name: '-1Y sequence',
    simple_name: '-1Y',
    category_id: 'category-y',
    display: { plain: sequence_display, from_display: sequence_from_display },
    compare,
    is_limit,
    FS,
    credit_text_id: 'credit.community_y',

    init: () => [INFINITY(), [1], []],
};

register_notation(Minus1_Y);
