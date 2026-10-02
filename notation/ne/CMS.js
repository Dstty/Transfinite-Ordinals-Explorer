// ============================================================================
//  notation/ne/CMS.js — Crane matrix system（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/BM-like/CMS.ts
//  注册 id: cms
//
//  算法逐行照搬（含 `var` + IIFE 内的记忆化缓存，保持原样），只去类型注解。
//  依赖本项目的 ./BM.js（compare / display / from_display / is_limit /
//  normalize / standardize）。字段（id / name / simple_name / category_id /
//  display / is_limit / compare / FS / init）全部保留，与 ne 版逐项对应。
//
//  与 ne 的差异：无（数值常量、缓存语义、return 分支均未改动）。
//  表达式 = number[][]（Expr）；init() 返回 [Limit, 空矩阵]。
// ============================================================================
import { compare, display, from_display, is_limit, normalize, standardize } from './BM.js';
import { register_notation } from '../../core/ne/registry.js';

export const CMS = {
    id: 'cms',
    name: 'Crane matrix system',
    simple_name: 'CMS',
    category_id: 'category-bm-like',
    display: {
        plain: display,
        from_display,
    },
    is_limit,
    compare,
    FS: (() => {
        var data = {},
            expand = (m1, FSterm) => {
                var parent = (m, cache, x, y) => {
                        var str = x + ',' + y;
                        if (cache[str] !== undefined) return cache[str];
                        for (var p = x; (p = y ? parent(m, cache, p, y - 1) : p - 1) >= 0;) {
                            if (m[p][y] < m[x][y]) break;
                        }
                        return (cache[str] = p);
                    },
                    L = (m, cache, x1, x2) => {
                        var x, y;
                        for (y = ymax; y >= 0; --y) {
                            if (!m[x2][y]) continue;
                            for (x = x2; x1 < x;) x = parent(m, cache, x, y);
                            if (x === x1) return y;
                        }
                        return -1;
                    },
                    ascending = (r, x, y) => {
                        var str = r + ',' + x + ',' + y;
                        if (ascending_cache[str] !== undefined) return ascending_cache[str];
                        return (ascending_cache[str] =
                            r <= x && (r === x || ascending(r, parent(m1, m1cache, x, y), y)));
                    },
                    m1cache = {},
                    m2cache = {},
                    ascending_cache = {},
                    endcol = m1.length - 1,
                    m2 = m1.slice(0, endcol),
                    child = m1[endcol],
                    ymax = child.length - 1,
                    LNZ;
                for (LNZ = ymax; LNZ >= 0; --LNZ) {
                    if (child[LNZ] > 0) break;
                }
                if (LNZ < 0 || !FSterm) return m2;
                var BR = parent(m1, m1cache, endcol, LNZ),
                    BRcolumn = m1[BR],
                    offset = child.map((value, y) => (y < LNZ ? value - BRcolumn[y] : 0)),
                    offset_asc = Array(endcol)
                        .fill(0, BR)
                        .map((t, x) => offset.map((value, y) => (ascending(BR, x, y) ? value : 0))),
                    col,
                    n;
                for (n = 0; ++n <= FSterm;) {
                    for (col = BR; col < endcol; ++col) {
                        m2.push(m1[col].map((value, y) => value + offset_asc[col][y] * n));
                    }
                }
                for (col = endcol; BR < --col;) if (L(m1, m1cache, BR, col) > LNZ) break;
                if (col === BR) {
                    if (ymax > 0 && m2.every((column) => column[ymax] === 0))
                        m2 = m2.map((column) => column.slice(0, ymax));
                    return m2;
                }
                m2.push(child.map((value, y) => value + (y <= LNZ ? value - BRcolumn[y] : 0) * FSterm));
                var c = col,
                    c_ = c + (endcol - BR),
                    d = m2.length - 1,
                    D = [];
                for (col = endcol; col < d; ++col)
                    D.push(
                        m2[col].map((value, k) => {
                            if (k > LNZ) return value;
                            var u = 0,
                                ss = col,
                                nextss;
                            while (true) {
                                nextss = parent(m2, m2cache, ss, k);
                                if (nextss < endcol) break;
                                ++u;
                                ss = nextss;
                            }
                            if (L(m2, m2cache, ss, d) >= k - 1) return m2[c_][k] + u;
                            else return value;
                        }),
                    );
                m2 = m2.slice(0, c_).concat(D);
                if (ymax > 0 && m2.every((column) => column[ymax] === 0))
                    m2 = m2.map((column) => column.slice(0, ymax));
                return m2;
            };
        return (m, FSterm) => {
            if ('' + m === 'Infinity') return [[], Array(FSterm + 1).fill(1)];
            if (m.length === 0) return [];
            var datakey = display(m);
            if (!data[datakey]) data[datakey] = [];
            else if (data[datakey][FSterm] !== undefined) return data[datakey][FSterm];
            return (data[datakey][FSterm] = normalize(expand(standardize(m), FSterm)));
        };
    })(),
    init: () => [[[Infinity]], []],
};

register_notation(CMS);
