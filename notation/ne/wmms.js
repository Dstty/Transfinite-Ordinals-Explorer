// ============================================================================
//  notation/ne/wmms.js — Weak mutant matrix（**本项目远古版**，硬切改写）
// ============================================================================
//  来源：notation/legacy/wMM.js（远古接口，register.push 形态，id = 'wmms'）。
//
//  ⚠⚠ 命名警告：**不要**把本文件与 notation/ne/wMM.js 当成重复文件删掉！
//      两者是**两个不同的记号**，只是名字撞了：
//
//        notation/ne/wMM.js    id = 'wmm'   （注意：一个 m）
//          · 移植自 ne-rewritten: src/notations/BM-like/wMM.ts
//          · display / is_limit / compare 取自 ne 的 notation/ne/BM.js
//          · FS 变体取自 core/ne/notationUtils.js 的 Y_FS_variants
//          · 算法文本与本文件**不等价**（见下「实测差异」）
//
//        notation/ne/wmms.js   id = 'wmms'  （注意：多一个 s，全小写文件名）
//          · 本项目远古 side 的 wMM（notation/legacy/wMM.js），ne 里无对应物
//          · display / is_limit / compare 取自 notation/ne/legacyMatrixUtils.js
//            （远古 BM 版三件套，**与 ne 的 BM.js 导出实测不等价**）
//          · FS / FS_alter 用本记号自己的远古实现（含 data / dataalter 缓存）
//
//      远古清单里 wmms 在「Bashicu 矩阵系」，ui/notationList.js:35 的 ids 列表里
//      也是 'wmms'，显示名 wMMS。core/notation-manifest.js 里 ne 的 wMM.js 那条
//      备注写「旧清单里叫 wmms」是**误记**：两条是不同 id 的不同记号，故本文件
//      注册 id 'wmms'，与 'wmm' 并存，不冲突。
//
//  ## 实测差异（.tmp-ne/verify-hardcut-mn-misc.mjs 的 E 段逐条复现）
//    display([[]])          远古 '()'         ne wMM '(0)'        （ne 去尾零、空列补 (0)）
//    display([[0,0]])       远古 '(0,0)'      ne wMM '(0)'
//    display([[0],[0,0]])   远古 '(0)(0,0)'   ne wMM '(0)(0)'
//    display([[1,0]])       远古 '(1,0)'      ne wMM '(1)'
//    is_limit(Infinity)     远古 false        ne wMM true
//    is_limit([Infinity])   远古 false        ne wMM true
//    compare(·, Infinity)   远古抛 TypeError（Cannot read properties of undefined /
//                           seq2.slice is not a function）        ne wMM 返回数值，不抛
//    E 段实测计数：display 4/11、is_limit 2/11、compare 34/121 不一致。
//
//    算法本体两者**同源**：`var data .. expand` 去空白后仅差 `(e)=>e`、`var`/`const`、
//    尾随逗号这类改写（E 段打印首处差异 @1250）。也就是说**差异全在记号接口层**
//    （显示 / 极限判定 / 比较），所以不能拿 ne 的 BM.js / notationUtils 顶替。
//
//  ## 接口映射（样板：notation/ne/PrSS.js、notation/ne/MM.js）
//
//    远古接口                                   ne 风格
//    ----                                       --
//    register.push({...})                       export const wmms = {...} + register_notation
//    display: matrix_display（远古全局）          display: { plain: matrix_display }
//    able:    matrix_limit                      is_limit: matrix_limit
//    compare: matrix_compare                    compare: matrix_compare
//    FSalter                                    FS_alter
//    init() → [{expr, low, subitems}, ...]      init() → [表达式, ...]（只取 expr）
//    无分类                                      category_id: 'category-bm-like'
//    （源文件无 parse）                          ——（不设 from_display，与远古一致）
//
//  matrix_display / matrix_limit / matrix_compare 从 **notation/ne/legacyMatrixUtils.js**
//  引入（远古 notation/legacy/BM.js 的逐行照搬版）。远古 FS 里
//  `typeof matrix_display !== 'undefined' ? matrix_display(m) : JSON.stringify(m)`
//  这种「全局存在性探测」按原样保留（import 进来的绑定恒有定义，语义与远古一致），
//  一字未改。data / dataalter / vertical_cache 仍是 IIFE 内的模块级闭包变量，
//  与远古的模块级私有缓存等价。
//
//  ## 算法本体
//  `var data = {},` 起至 `if (typeof register !== 'undefined')` 之前的全部算法
//  （vertical_compare / vertical_increase / extract / get_vertical / parentCheck /
//  parent / expand）以及 FS / FS_alter 的函数体，全部逐字照搬。
//  可复现证据：.tmp-ne/verify-hardcut-mn-misc.mjs 的 A 段（去空白逐字比对）。
//
//  ## FS 门控（决策记录，勿当冗余删掉；与 notation/ne/MM.js 末尾同款）
//  ne 引擎对**非 limit 节点**一律先调 `FS(expr, 0)` 探测可展开性
//  （core/ne/expander.js:80）；远古引擎先看 able（core/engine.js:157 的
//  `!(ableHit || semiableHit)` 短路），非 able 的表达式根本不递给 FS。
//  wmms 的远古 FS 在退化矩阵上会崩（与 MM 同因）：
//    FS([[]], 0)  → expand 里 LNZy = -1 → TypeError: Cannot read properties of
//                   undefined (reading '-1')
//    FS([[0]], 0) → 同上（findLastIndex(e=>e) 对 0 判假 → LNZy = -1）
//  旧引擎在这两例上只是「不展开」（able = matrix_limit = false，且无 semiable），
//  不报错。故按远古引擎的 able 短路补门控
//  `matrix_limit(m) ? FS_raw(m, n) : m`（与 core/ne/legacyAdapter.js 的
//  make_legacy_FS 完全同款），只包在对外的 FS / FS_alter 字段外层，
//  函数体本身一字未改。
//
//  F 段实测（非 limit = matrix_limit 为假的输入，固定样本 + 120 例确定性随机，共 134 例）：
//  **数组型** 131 例里 130 例直接抛 TypeError（[[]]、[[],[]]、[[0]]、[[0],[]]、
//  [[0],[0],[0]]、[[1],[0]] …），只有 [] 一例原样返回；远古引擎因 able=false 从不调用
//  它们。故门控是**必需**的。B4 段 FS / FS_alter 与远古比对各 212 例
//  → 148 例逐字一致 + 64 例门控短路（均满足「远古 able 为假 ∧ 我返回自身」）、
//  **0 例未解释漂移**。
//
//  C/G 段实测：ne 树形与「远古接口经 legacyAdapter 适配后」的 ne 树形**逐字相同**；
//  tier=0 逐次点击 FS：Limit → ()(1) → () → 不可展开（链终止，无抛错），
//  FS_alter：Limit → ()(1) → ()() → 不可展开。`()`（= [[]]）正是 MM 那次踩的坑位
//  （远古实现会 TypeError），门控把「able=false 就不展开」的远古引擎语义完整复现。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const wmms = (()=>{
    var data = {},
        dataalter = {},
        vertical_cache = new Map();


    const vertical_compare = (a, b) => {
        if (a.length > b.length) return 1;
        if (a.length < b.length) return -1;
        for (var i = a.length; i--;) {
            if (a[i] > b[i]) return 1;
            if (a[i] < b[i]) return -1;
        }
        return 0;
    };


    const vertical_increase = (y, d) => {
        var c = y.slice();
        c[d] === undefined ? (c[d] = 1) : (c[d] += 1);
        c.fill(0, 0, d);
        return c;
    };


    const extract = (A, [x, y]) => A[x][y] || 0;


    const get_vertical = (A, [x, y]) => {
        var val;
        if (vertical_cache.has(A)) {
            val = vertical_cache.get(A);
        } else {
            val = A.map((column, x) => {
                var result = [], i, y = 0;
                for (; y < column.length; ++y) {
                    i = y;
                    while (--i >= 0 && extract(A, [x, y]) === extract(A, [x, i]));
                    result.push(vertical_increase(result[i] ?? [], y - i - 1));
                }
                return result;
            });
            vertical_cache.set(A, val);
        }

        if (val[x][y] !== undefined) return val[x][y];
        var ending = val[x].length - 1;
        return vertical_increase(ending >= 0 ? val[x][ending] : [], y - ending - 1);
    };


    const parentCheck = (A, [x, y]) => {
        if (!y) return [x - 1, y];
        var p = parent(A, [x, y - 1])[0];
        var i = Math.max(y, A[p].length - 1);
        while (extract(A, [p, i]) < extract(A, [x, y]) - 1 ||
               vertical_compare(get_vertical(A, [p, i]), get_vertical(A, [x, y])) > 0) {
            --i;
        }
        return [p, i];
    };


    const parent = (A, cur) => {
        if (!extract(A, cur)) return [-1, cur[1]];
        var p = cur;
        do {
            p = parentCheck(A, p);
        } while (extract(A, p) !== extract(A, cur) - 1);
        return p;
    };


    const expand = (M, FSterm) => {
        var LNZx = M.length - 1;
        var LNZy = M[LNZx].findLastIndex(e => e);
        var LNZ = M[LNZx][LNZy];
        var collection = [];
        var working = [LNZx, LNZy];


        do {
            while (extract(M, working) !== LNZ - 1) {
                working = parent(M, working);
            }
            if (!collection[working[0]]) collection[working[0]] = [];
            collection[working[0]].unshift(working[1]);
        } while (--working[1] >= 0);

        var counts = collection.filter(() => true).map(e => e.length);
        var columns = collection.map((e, i) => i).filter(() => true);
        counts.unshift(1);

        var root;
        var r = counts.length - 1;


        if (counts[r] === 1) {
            root = parent(M, [LNZx, LNZy]);
        } else {

            const lastValidColumnIndex = columns[columns.length - 1];

            root = [lastValidColumnIndex, collection[lastValidColumnIndex][0]];


            console.assert(
                collection[lastValidColumnIndex] && collection[lastValidColumnIndex].length > 0,
                '末列数据异常', lastValidColumnIndex, collection
            );
        }

        var width = LNZx - root[0];
        var height = LNZy - root[1];
        var A = M.map(column => column.slice());


        --A[LNZx][LNZy];


        M[root[0]].slice(root[1]).forEach((val, dy) => {
            A[LNZx][LNZy + dy] = val;
        });

        var ascending_cache = {};


        const ascendingAt = (cur) => {
            var str = '' + cur;
            if (ascending_cache[str] !== undefined) return ascending_cache[str];
            if (cur[0] < root[0]) return ascending_cache[str] = -1;
            if (cur[0] === root[0]) return ascending_cache[str] = cur[1];
            return ascending_cache[str] = ascendingAt(parent(A, cur));
        };


        for (var n = 1; n <= FSterm; ++n) {
            var reference = [], y1 = 0, y2 = 0, cmp;


            while (y2 <= root[1] + height * n) {
                cmp = vertical_compare(
                    get_vertical(A, [root[0], y1 + 1]),
                    get_vertical(A, [root[0] + width * n, y2])
                );
                if (cmp > 0 || y1 >= root[1]) {
                    reference[y1] = y2;
                    ++y2;
                    continue;
                } else {
                    ++y1;
                    continue;
                }
            }


            for (var dx = 1; dx <= width; ++dx) {
                var x = root[0] + dx;
                var targetColumn = A[x + width * n] = [];
                var lastmagma = -1;

                A[x].forEach((val, y) => {
                    var asc = ascendingAt([x, y]);
                    if (~asc) {
                        if (asc <= root[1] && !vertical_compare(get_vertical(A, [root[0], asc]), get_vertical(A, [x, y]))) {
                            for (var j = (reference[asc - 1] ?? -1) + 1; j <= reference[asc]; ++j) {
                                targetColumn.push(val - extract(A, [root[0], asc]) + extract(A, [root[0] + width * n, j]));
                            }
                            lastmagma = asc;
                        } else {
                            if (~lastmagma) {
                                targetColumn.push(val - extract(A, [root[0], lastmagma]) + extract(A, [root[0] + width * n, reference[lastmagma]]));
                            } else {
                                targetColumn.push(val - extract(A, [root[0], 0]) + extract(A, [root[0] + width * n, 0]));
                            }
                        }
                    } else {
                        targetColumn.push(val);
                    }
                });
            }


            vertical_cache.delete(A);
        }


        A.forEach(column => {
            var i = column.findLastIndex(e => e);
            column.splice(i + 1);
        });

        return A;
    };


    var def = {
        id: 'wmms',
        name: 'Weak mutant matrix',
        simple_name: 'wMMS',
        category_id: 'category-bm-like',
        display: { plain: matrix_display },
        is_limit: matrix_limit,
        compare: matrix_compare,
        FS: function(m, FSterm) {
            if (String(m) === 'Infinity') return [[], Array(FSterm + 1).fill(1)];
            if (m.length === 0) return [];
            var datakey = typeof matrix_display !== 'undefined' ? matrix_display(m) : JSON.stringify(m);
            if (!data[datakey]) data[datakey] = [];
            else if (data[datakey][FSterm] !== undefined) return data[datakey][FSterm];
            return data[datakey][FSterm] = expand(m, FSterm).slice(0, -1);
        },
        FS_alter: function(m, FSterm) {
            if (String(m) === 'Infinity') return [[], Array(FSterm + 1).fill(1)];
            if (m.length === 0) return [];
            var datakey = typeof matrix_display !== 'undefined' ? matrix_display(m) : JSON.stringify(m);
            if (!dataalter[datakey]) dataalter[datakey] = [];
            else if (dataalter[datakey][FSterm] !== undefined) return dataalter[datakey][FSterm];
            return dataalter[datakey][FSterm] = expand(m, FSterm);
        },
        init: function() {
            return [
                [[Infinity]],
                []
            ];
        }
    };
    // ---- 接口层门控（见文件头「FS 门控」一节）--------------------------------
    var FS_raw = def.FS
    ,FS_alter_raw = def.FS_alter
    def.FS = (m,FSterm)=>matrix_limit(m) ? FS_raw(m,FSterm) : m
    def.FS_alter = (m,FSterm)=>matrix_limit(m) ? FS_alter_raw(m,FSterm) : m
    return def
})()

register_notation(wmms);
