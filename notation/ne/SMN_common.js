// ============================================================================
//  notation/ne/SMN_common.js — Smile MN 系（SAω²MN / Sω²MN / Sω↑ωMN / nMN）共享代数层
// ============================================================================
//  来源（逐行照搬，仅去类型注解）：
//    ne-rewritten src/notations/MN/SMN/SA_omega2_MN.ts        （快照 d2d79cd）
//    ne-rewritten src/notations/MN/SMN/S_omega2_MN.ts
//    ne-rewritten src/notations/MN/SMN/S_omega_pow_omega_MN.ts
//    ne-rewritten src/notations/MN/SMN/n_MN.ts               （仅 is_infinity / is_limit）
//
//  为什么要抽这一份：上述源文件各自内联了一整套**逐字相同**的代数层。按
//  .tmp-ne/PORTING-GUIDE.md「共享函数抽公共模块、不要多份拷贝」的要求，这里把
//  「函数体逐字相同、且它调用的函数也都在本模块内」的函数收敛成一份。
//
//  判据（不是凭感觉挑的）：逐个函数比对三个源文件的 (参数表 + 函数体) 文本；
//  只有整条调用链都在公共集合内的函数才搬得动 —— 函数体虽然相同、但调用了
//  各记号自己那份分叉实现的函数（extend / expand 依赖各文件的 subtract_1 /
//  copy_column / stretch_data_*，display 链依赖各文件的 entry_display 与
//  sep_display）一律留在各自记号文件里，否则会绑到错误的作用域。
//
//  本模块的函数在三个源文件里文本完全一致，唯一一处差异是 SAω²MN 原文的
//    entry_compare: tuple_lex_compare(e1, e2, [number_compare, sep_compare, undefined])
//  第三位比较器是 undefined；core/ne/utils.js 的 tuple_lex_compare 遇到 undefined
//  会跳过该字段（恒为 0），故与 Sω²MN / Sω↑ωMN 的二元版本行为完全一致。此处取
//  二元版本，等价性由 .tmp-ne/verify-smn.mjs 的 compare 矩阵（含 SA 的三元 Entry）
//  逐对验证。
//
//  类型约定（JS 无运行载体，记录用）：
//    Sep = number[]；Vertical = Sep[]；
//    Entry = [number, Sep]（S 系）/ [number, Sep, boolean]（SA 系）；
//    Column = Entry[]；Mountain = Column[]。
// ============================================================================

import {
    anti_lex_compare,
    boolean_compare,
    deepcopy,
    lex_compare,
    number_compare,
    tuple_lex_compare,
} from '../../core/ne/utils.js';

// ---------------------------------------------------------------------------
//  极限 / 判定
// ---------------------------------------------------------------------------

export function Limit_expr() {
    return [[[Infinity]]];
}

export function is_infinity(m) {
    return '' + m === 'Infinity';
}

export function is_limit(m) {
    return is_infinity(m) || (m.length > 0 && m[m.length - 1].length > 0);
}

// ---------------------------------------------------------------------------
//  比较
// ---------------------------------------------------------------------------

export function sep_compare(s1, s2) {
    return anti_lex_compare(s1, s2, number_compare);
}

export function vertical_compare(v1, v2) {
    return lex_compare(v1, v2, sep_compare);
}

export function entry_compare(e1, e2) {
    return tuple_lex_compare(e1, e2, [number_compare, sep_compare]);
}

export function column_compare(c1, c2) {
    return lex_compare(c1, c2, entry_compare);
}

export function mountain_compare(m1, m2) {
    return lex_compare(m1, m2, column_compare);
}

export function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
        return boolean_compare(is_infinity(a), is_infinity(b));
    }
    return mountain_compare(a, b);
}

// ---------------------------------------------------------------------------
//  Sep 运算
// ---------------------------------------------------------------------------

export function sep_is_one(s) {
    return s.length === 1 && s[0] === 1;
}

export function sep_dimension(s) {
    let d = 0;
    while (s[d] === 0) d++;
    return d;
}

export function sep_add(a, b) {
    if (b.length === 0) return a;
    let result = deepcopy(a);
    while (result.length < b.length) result.push(0);
    result[b.length - 1] += b[b.length - 1];
    for (let d = 0; d < b.length - 1; d++) {
        result[d] = b[d];
    }
    return result;
}

export function sep_sub(a, b) {
    if (a.length > b.length) return a;
    if (a.length < b.length) return [];
    let d = a.length;
    while (d > 0 && a[d - 1] === b[d - 1]) d--;
    if (d === 0 || a[d - 1] < b[d - 1]) return [];
    let result = a.slice(0, d);
    result[d - 1] -= b[d - 1];
    return result;
}

export function sep_increase(a, d) {
    let result = deepcopy(a);
    while (result.length <= d) result.push(0);
    result[d]++;
    result.fill(0, 0, d);
    return result;
}

// ---------------------------------------------------------------------------
//  列 / 垂直向量
// ---------------------------------------------------------------------------

export function vertical_increase(v, s) {
    let i = v.length;
    while (i - 1 >= 0 && sep_compare(v[i - 1], s) < 0) i--;
    return [...v.slice(0, i), s];
}

export function column_verticals(c) {
    const result = [];
    let current = [];
    for (let e of c) {
        result.push((current = vertical_increase(current, e[1])));
    }
    return result;
}

export function find_index_below(Vi, v) {
    let l = 0,
        r = Vi.length;
    while (l < r) {
        const j = Math.ceil((l + r) / 2);
        const Vij = j === 0 ? [] : Vi[j - 1];
        if (vertical_compare(Vij, v) < 0) l = j;
        else r = j - 1;
    }
    return l;
}

export function find_index_below_equal(Vi, v) {
    let l = 0,
        r = Vi.length;
    while (l < r) {
        const j = Math.ceil((l + r) / 2);
        const Vij = j === 0 ? [] : Vi[j - 1];
        if (vertical_compare(Vij, v) <= 0) l = j;
        else r = j - 1;
    }
    return l;
}

export function parent(m, V, [i, j]) {
    const [value, _] = m[i][j];
    const pi = value - 1;
    const pj = pi === -1 ? 0 : find_index_below(V[pi], V[i][j]);
    return [pi, pj];
}

export function magma_indices(m, V, [Ri, Rj], MI_partial) {
    const result = MI_partial ?? [];
    for (let i = result.length; i < m.length; i++) {
        result.push([]);
        if (i <= Ri) {
            // do nothing
        } else {
            for (let j = 0; j < m[i].length; j++) {
                let [pi, pj] = parent(m, V, [i, j]);
                if (pi < Ri) {
                    break;
                } else if (pi === Ri) {
                    result[i][j] = Math.min(pj, Rj);
                } else {
                    if (pj === m[pi].length) pj--;
                    if (pj >= result[pi].length) break;
                    result[i][j] = result[pi][pj];
                }
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
//  拉伸（stretch）
// ---------------------------------------------------------------------------

export function compute_stretch(sep, data) {
    if (data === undefined) return sep;
    let { threshold, stretch_to } = data;
    if (sep_compare(sep, threshold) <= 0) {
        return sep;
    } else {
        return sep_add(stretch_to, sep_sub(sep, threshold));
    }
}

// ---------------------------------------------------------------------------
//  层（layer）等价表示
// ---------------------------------------------------------------------------

export function calc_ancestor_depths(m) {
    const V = m.map(column_verticals);
    const depthMap = [];

    for (let i = 0; i < m.length; i++) {
        depthMap[i] = [];
        for (let j = 0; j < m[i].length; j++) {
            const [pi, pj] = parent(m, V, [i, j]);
            depthMap[i][j] = pj === m[pi].length ? 1 : 1 + depthMap[pi][pj];
        }
    }
    return depthMap;
}

export function convert_to_layer(om) {
    if (is_infinity(om)) return om;

    const depthMap = calc_ancestor_depths(om);
    const dm = deepcopy(om);
    for (let i = 0; i < dm.length; i++) {
        const column = dm[i];
        for (let j = 0; j < column.length; j++) {
            const entry = column[j];
            entry[0] = depthMap[i][j];
        }
    }
    return dm;
}

export function convert_from_layer(dm) {
    if (is_infinity(dm)) return dm;

    const om = deepcopy(dm);

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
                let j0 = find_index_below_equal(V[i1], j === 0 ? [] : V[i][j - 1]);
                if (j0 === dm[i1].length || dm[i1][j0][0] < entry[0]) {
                    entry[0] = i1 + 1;
                    break;
                }
            }
        }
    }

    return om;
}
