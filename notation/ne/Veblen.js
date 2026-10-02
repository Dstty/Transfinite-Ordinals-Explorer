// ============================================================================
//  notation/ne/Veblen.js — Extended Veblen's φ Function（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/Misc/Veblen.ts
//  注册 id: veblen-phi（单一记号，无 generator 家族 → 不涉及 initial 调整）
//
//  与 ne 的差异（两处显式补充，其余逐行照搬）：
//    - category_id：ne 原版 VeblenPhi **没有** category_id（ne 的 main.ts 直接
//      register_notation(VeblenPhi)，该记号落在根级）。本项目旧版（远古 manifest
//      与 ui/notationList.js）把 veblen-phi 归在「OCF 序数折叠函数」，且 OCF 族
//      已搬的 ne 原生记号（BOCF_EBO / MOCF_EBO / NOCF_EBO / Inacc_OCF /
//      finite_Mahlo_OCF / UPS1_1r5）统一挂 'category-ocf'。为保持导航树不缩水，
//      此处补 category_id: 'category-ocf'，仍走 register_notation（该分类由
//      notation/ne/categories.js 骨架以「纯容器、无 generator」形式预注册，
//      不需要 ensure_category）。
//    - debug：ne 原版没有 debug 字段，本项目旧版（notation/rewritten/Veblen.js）
//      对外暴露过 debug.normalize，故补 debug: { normalize } 保留旧侧调试入口。
//      （引擎不读 debug；只有 debug_verification 会被 expander / tree 调用。）
//    - credit_text_id / FS_alter / FS_equiv 两侧都没有，未额外添加；FS / FS_short
//      由 FS_default_LNZ_variant 提供（与源文件一致）。
//    - 算法逐行照搬，只去类型注解：Expr / VeblenList / DisplayType / IndexSpec /
//      VItem / FS_Type 等类型别名与 interface、`as any`、`private` 修饰符、
//      `Array<Expr>(...)` 的泛型参数、函数参数与返回值的类型标注。
//
//  表达式：0 = [0]；1 = [1, Expr[]]（和）；2 = [2, VeblenList, Expr]（φ 列表），
//    VeblenList = [VeblenList, Expr][]。极限用 JS 数值常量 Infinity 本身当表达式
//    （is_infinity 用 `===` 判定），与源文件一致。
//  源文件用了 Array.prototype.toReversed()（ES2023，Node 24 原生支持），保持原样。
//
//  依赖说明：
//    - bind2 / boolean_compare / lex_compare / tuple_lex_compare_by ← core/ne/utils.js
//    - FS_default_LNZ_variant / merge_sum ← core/ne/notationUtils.js
//      ⚠ merge_sum 必须用这个文件的**字符串版**；notation/ne/OCN_utils.js 里的
//        merge_sum 是 OCNDisplayIR 版，语义不同（Veblen 的 impl 返回字符串）。
//    - 其余函数全部在本文件内定义，源文件没有引用其他未搬的 ne 记号文件。
// ============================================================================
import { bind2, boolean_compare, lex_compare, tuple_lex_compare_by } from '../../core/ne/utils.js';
import { FS_default_LNZ_variant, merge_sum } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

const INFINITY = Infinity;

function is_infinity(e) {
    return e === INFINITY;
}

function display_list_impl(l, d) {
    function impl_list(l) {
        if (l.length === 0) return '';
        if (list_is_finite(l[0][0])) {
            const max = list_to_nat(l[0][0]);
            const values = Array(max + 1).fill(zero());
            for (let [p, v] of l) values[list_to_nat(p)] = v;
            return values.map(d).toReversed().join(',');
        }
        return l.map(impl_list_entry).join(',');
    }

    function impl_list_entry([p, v]) {
        if (p.length === 0) return d(v) + '@0';
        if (p.length === 1 && p[0][0].length === 0) return d(v) + '@' + d(p[0][1]);
        return d(v) + '@(' + impl_list(p) + ')';
    }

    return impl_list(l);
}

function is_finite(e) {
    if (e[0] === 0) return true;
    if (e[0] === 2) return is_one(e);
    return is_one(e[1][0]);
}

function to_nat(e) {
    return prim_list(e).length;
}

function from_nat(n) {
    return from_prim_list(Array(n).fill(one()));
}

function list_is_finite(l) {
    return l.length === 0 || (l.length === 1 && l[0][0].length === 0 && is_finite(l[0][1]));
}

function list_to_nat(l) {
    if (l.length === 0) return 0;
    return to_nat(l[0][1]);
}

function list_from_nat(n) {
    if (n === 0) return [];
    return [[[], from_nat(n)]];
}

function add_tail_to_list(l, tail) {
    let new_l = [];
    for (let [p, v] of l) {
        if (!list_is_finite(p)) new_l.push([p, v]);
        else new_l.push([list_from_nat(list_to_nat(p) + 1), v]);
    }
    if (!is_zero(tail)) new_l.push([[], tail]);
    return new_l;
}

function display(e, type) {
    const is_latex = type === 'latex';
    if (is_infinity(e)) return is_latex ? '\\mathrm{Limit}' : 'Limit';

    function impl(e) {
        switch (e[0]) {
            case 0:
                return '0';
            case 1:
                return merge_sum(e[1].map(impl));
            case 2:
                const phi = is_latex ? '\\varphi ' : 'φ';
                if (e[1].length === 0) {
                    if (is_zero(e[2])) return '1';
                    if (is_one(e[2])) return is_latex ? '\\omega' : 'ω';
                    if (type === 'html') {
                        return 'ω<sup>' + impl(e[2]) + '</sup>';
                    } else if (type === 'latex') {
                        return '\\omega^{' + impl(e[2]) + '}';
                    }
                    return phi + '(' + impl(e[2]) + ')';
                }
                let l = add_tail_to_list(e[1], e[2]);
                return phi + '(' + display_list_impl(l, impl) + ')';
            default:
                throw new Error('Unreachable');
        }
    }

    return impl(e);
}

function display_separate(e, type) {
    const is_latex = type === 'latex';
    if (is_infinity(e)) return is_latex ? '\\mathrm{Limit}' : 'Limit';

    function impl(e) {
        switch (e[0]) {
            case 0:
                return '0';
            case 1:
                return merge_sum(e[1].map(impl));
            case 2:
                const phi = is_latex ? '\\varphi ' : 'φ';
                if (e[1].length === 0) {
                    if (is_zero(e[2])) return '1';
                    if (is_one(e[2])) return is_latex ? '\\omega' : 'ω';
                    if (type === 'html') {
                        return 'ω<sup>' + impl(e[2]) + '</sup>';
                    } else if (type === 'latex') {
                        return '\\omega^{' + impl(e[2]) + '}';
                    }
                    return phi + '(' + impl(e[2]) + ')';
                }
                return phi + '(' + display_list_impl(e[1], impl) + ';' + impl(e[2]) + ')';
            default:
                throw new Error('Unreachable');
        }
    }

    return impl(e);
}

// ============ from_display: accepts both display (plain) and display_separate styles ============

function omega_of() {
    return [2, [], one()];
}

function from_display(str) {
    return new VParser(str).parse_top();
}

/** 独立的递归下降解析器实例 (便于对子串(如复合索引)复用同一套函数) */
class VParser {
    constructor(text) {
        this.t = text;
        this.i = 0;
    }

    error() {
        throw new Error('Illegal input string: ' + this.t);
    }

    skip() {
        while (this.i < this.t.length && this.t[this.i] === ' ') this.i++;
    }

    digits() {
        this.skip();
        const s = this.i;
        while (this.i < this.t.length && this.t[this.i] >= '0' && this.t[this.i] <= '9') this.i++;
        if (s === this.i) this.error();
        return parseInt(this.t.substring(s, this.i), 10);
    }

    // 读取当前 '(' 起、与之配对的 ')' (含) 之前的内容, 消费到 ')' 之后
    read_parens() {
        this.skip();
        if (this.i >= this.t.length || this.t[this.i] !== '(') this.error();
        let depth = 0;
        let j = this.i;
        for (; j < this.t.length; j++) {
            const c = this.t[j];
            if (c === '(') depth++;
            else if (c === ')') {
                depth--;
                if (depth === 0) break;
            }
        }
        if (j >= this.t.length) this.error();
        const inner = this.t.substring(this.i + 1, j);
        this.i = j + 1;
        return inner;
    }

    // 序数: '+' 链; 结果用代码一致的扁平素项列表表示 ([1, atoms])
    ordinal() {
        const atoms = [];
        while (true) {
            this.skip();
            atoms.push(...this.prime_atoms());
            this.skip();
            if (this.i < this.t.length && this.t[this.i] === '+') {
                this.i++;
                continue;
            }
            break;
        }
        if (atoms.length === 1) return atoms[0];
        return [1, atoms];
    }

    // 素项(0/n/ω/φ(…))加可选系数后缀: 'ω2' = ω+ω, 'φ(2)3' = φ(2) 重复 3 次
    // 返回扁平素项序列 (n 为 n 个 1; 系数为 m 个该素项)
    prime_atoms() {
        this.skip();
        if (this.i >= this.t.length) this.error();
        const c = this.t[this.i];
        if (c >= '0' && c <= '9') {
            const n = this.digits();
            if (n === 0) return [zero()];
            return Array(n).fill(one());
        }
        let prime;
        if (c === 'ω' || c === 'w') {
            // 'w' 视作 'ω'
            this.i++;
            prime = omega_of();
        } else if (c === 'φ' || c === 'f') {
            // 'f' 视作 'φ'
            this.i++;
            this.skip();
            if (this.i >= this.t.length || this.t[this.i] !== '(') this.error();
            this.i++;
            prime = this.phi_body();
        } else {
            this.error();
        }
        let mult = 1;
        if (this.i < this.t.length && this.t[this.i] >= '0' && this.t[this.i] <= '9') {
            const s = this.i;
            while (this.i < this.t.length && this.t[this.i] >= '0' && this.t[this.i] <= '9') this.i++;
            mult = parseInt(this.t.substring(s, this.i), 10);
        }
        return Array(mult).fill(prime);
    }

    // '@' 之后的索引
    index_spec() {
        this.skip();
        if (this.i >= this.t.length) this.error();
        if (this.t[this.i] === '(') {
            const inner = this.read_parens();
            return { kind: 'list', l: new VParser(inner).index_list() };
        }
        if (this.t[this.i] >= '0' && this.t[this.i] <= '9') return { kind: 'nat', n: this.digits() };
        return { kind: 'scalar', e: this.ordinal() };
    }

    // 索引列表文本: 项可以是 "值" 或 "值@索引"(索引递归), 无独立 tail;
    // 语义等同 separate 模式: 无标号项按从右偏移 0,1,… 编号
    index_list() {
        const items = [];
        while (true) {
            this.skip();
            if (this.i >= this.t.length) break;
            const v = this.ordinal();
            this.skip();
            let idx = null;
            if (this.i < this.t.length && this.t[this.i] === '@') {
                this.i++;
                idx = this.index_spec();
            }
            items.push({ v, idx });
            this.skip();
            if (this.i < this.t.length && this.t[this.i] === ',') {
                this.i++;
                continue;
            }
            if (this.i >= this.t.length) break;
            this.error();
        }
        const n = items.length;
        const l = [];
        for (let k = 0; k < n; k++) {
            const it = items[k];
            if (it.idx === null) {
                const off = n - 1 - k;
                if (is_zero(it.v)) continue;
                l.push([list_from_nat(off), it.v]);
            } else if (it.idx.kind === 'nat') {
                if (is_zero(it.v)) continue;
                l.push([list_from_nat(it.idx.n), it.v]);
            } else if (it.idx.kind === 'scalar') {
                l.push([this.scalar_prefix(it.idx.e, false), it.v]);
            } else {
                l.push([it.idx.l, it.v]);
            }
        }
        return l;
    }

    // 若 e 是纯自然数(0 或若干 '1' 之和)返回其值, 否则 -1
    natural_value(e) {
        if (is_zero(e)) return 0;
        if (is_one(e)) return 1;
        if (e[0] === 1 && e[1].every(is_one)) return e[1].length;
        return -1;
    }

    // 标量索引 → 前缀: 纯自然数按自然槽位编码(plain 偏移 -1; sep/索引列表不偏移), 否则复杂标量 [([], e)]
    scalar_prefix(e, plain) {
        const n = this.natural_value(e);
        if (n >= 0) {
            if (n === 0) {
                if (plain) this.error();
                return list_from_nat(0);
            }
            return list_from_nat(plain ? n - 1 : n);
        }
        const pref = [[[], e]];
        return pref;
    }

    // 组装条目 (去掉零值的自然槽, 天然槽省略; 保持文本顺序)
    assemble(entriesSrc, tail) {
        const l = [];
        for (const e of entriesSrc) {
            if (is_zero(e.v) && e.prefix.length === 0) continue;
            l.push([e.prefix, e.v]);
        }
        return [2, l, tail];
    }

    // φ( 内部 (已消费 '(')
    phi_body() {
        const items = [];
        let tail = null;
        while (true) {
            this.skip();
            if (this.i >= this.t.length) this.error();
            if (this.t[this.i] === ')') {
                this.i++;
                break;
            }
            const v = this.ordinal();
            this.skip();
            let idx = null;
            if (this.i < this.t.length && this.t[this.i] === '@') {
                this.i++;
                idx = this.index_spec();
            }
            items.push({ v, idx });
            this.skip();
            if (this.i < this.t.length && this.t[this.i] === ',') {
                this.i++;
                continue;
            }
            if (this.i < this.t.length && this.t[this.i] === ';') {
                this.i++;
                tail = this.ordinal();
                this.skip();
                if (this.i >= this.t.length || this.t[this.i] !== ')') this.error();
                this.i++;
                break;
            }
            if (this.i < this.t.length && this.t[this.i] === ')') {
                this.i++;
                break;
            }
            this.error();
        }
        return this.build_phi(items, tail);
    }

    build_phi(items, semiTail) {
        const src = [];
        if (semiTail !== null) {
            // separate 形式: ';' 后为 tail; 各项按自然索引(右起)或无标号项偏移
            const n = items.length;
            for (let k = 0; k < n; k++) {
                const it = items[k];
                if (it.idx === null) {
                    const off = n - 1 - k; // 右起 0
                    src.push({ prefix: list_from_nat(off), v: it.v });
                } else if (it.idx.kind === 'nat') {
                    src.push({ prefix: list_from_nat(it.idx.n), v: it.v });
                } else if (it.idx.kind === 'scalar') {
                    src.push({ prefix: this.scalar_prefix(it.idx.e, false), v: it.v });
                } else {
                    src.push({ prefix: it.idx.l, v: it.v });
                }
            }
            return this.assemble(src, semiTail);
        }

        // 普通形式: 末项为 tail (无标号, 或 '@0'); 无末项时 tail = 0
        let body = items;
        let tail;
        if (items.length === 0) {
            tail = zero();
        } else {
            const last = items[items.length - 1];
            const lastIsTail =
                last.idx === null ||
                (last.idx.kind === 'nat' && last.idx.n === 0) ||
                (last.idx.kind === 'list' && last.idx.l.length === 0);
            if (lastIsTail) {
                tail = last.v;
                body = items.slice(0, -1);
            } else {
                tail = zero();
            }
        }
        // 无标号项只允许出现在尾部
        let bareSeen = false;
        for (const it of body) {
            if (it.idx === null) bareSeen = true;
            else if (bareSeen) this.error();
        }
        const m = body.length;
        for (let k = 0; k < m; k++) {
            const it = body[k];
            if (it.idx === null) {
                // 普通自然槽: 距最右 tail 的偏移 offset+1 = 槽号, 前缀 nat(槽-1)
                const off = m - 1 - k + 1; // >= 1
                src.push({ prefix: list_from_nat(off - 1), v: it.v });
            } else if (it.idx.kind === 'nat') {
                if (it.idx.n === 0) this.error();
                src.push({ prefix: list_from_nat(it.idx.n - 1), v: it.v });
            } else if (it.idx.kind === 'scalar') {
                src.push({ prefix: this.scalar_prefix(it.idx.e, true), v: it.v });
            } else {
                src.push({ prefix: it.idx.l, v: it.v });
            }
        }
        return this.assemble(src, tail);
    }

    // 顶层: Limit | 序号 (可为 '+' 和/merge 系数)
    parse_top() {
        this.skip();
        if (this.t.slice(this.i, this.i + 5) === 'Limit') {
            this.i += 5;
            this.skip();
            if (this.i !== this.t.length) this.error();
            return INFINITY;
        }
        if (this.i >= this.t.length) this.error();
        const result = this.ordinal();
        this.skip();
        if (this.i !== this.t.length) this.error();
        return result;
    }
}

function zero() {
    return [0];
}

function one() {
    return [2, [], zero()];
}

function is_zero(e) {
    return e[0] === 0;
}

function is_one(e) {
    return e[0] === 2 && e[1].length === 0 && is_zero(e[2]);
}

function infinity_FS(index) {
    let list = [];
    for (let i = 0; i < index; i++) {
        list = [[list, one()]];
    }
    return [2, list, zero()];
}

function is_limit(e) {
    if (is_infinity(e)) return true;
    if (e[0] === 0) return false;
    else if (e[0] === 1) return is_limit(e[1][e[1].length - 1]);
    return e[1].length !== 0 || !is_zero(e[2]);
}

function list_is_limit(l) {
    if (l.length === 0) return false;
    const [p, v] = l[l.length - 1];
    return p.length > 0 || is_limit(v);
}

function prim_list(a) {
    switch (a[0]) {
        case 0:
            return [];
        case 1:
            return a[1];
        case 2:
            return [a];
    }
}

function from_prim_list(a) {
    if (a.length === 0) return [0];
    if (a.length === 1) return a[0];
    return [1, a];
}

function count_unbounded(l, bound) {
    let result = 0;
    for (let [p, v] of l) {
        result += count_unbounded(p, bound);
        if (compare(v, bound) >= 0) result++;
    }
    return result;
}

function bounded_by(l, bound) {
    return count_unbounded(l, bound) === 0;
}

function list_lex_compare(a, b) {
    return lex_compare(a, b, tuple_lex_compare_by([list_lex_compare, compare]));
}

function compare(a, b) {
    if (is_infinity(a) || is_infinity(b)) {
        return boolean_compare(is_infinity(a), is_infinity(b));
    }

    if (a[0] === 0 || b[0] === 0) {
        return boolean_compare(!is_zero(a), !is_zero(b));
    }
    if (a[0] === 1 || b[0] === 1) {
        return lex_compare(prim_list(a), prim_list(b), compare);
    }
    let list_cmp = list_lex_compare(a[1], b[1]);
    if (list_cmp === 0) return compare(a[2], b[2]);
    if (list_cmp < 0) [a, b] = [b, a];

    // in standard form, now (a < b) iff b contains an ordinal >= a

    return list_cmp * (bounded_by(b[1], a) && compare(b[2], a) < 0 ? 1 : -1);
}

function get_abnormal(l, current) {
    if (current === undefined) current = l;
    if (current.length === 0) return undefined;

    const [p, v] = current[current.length - 1];
    if (v[0] !== 2) return undefined;
    if (is_one(v)) return get_abnormal(l, p);

    if (list_lex_compare(l, v[1]) < 0 && count_unbounded(l, v) === 1) return v;
    return undefined;
}

function is_normal_tail(l, v) {
    if (v[0] !== 2) return true;
    return list_lex_compare(l, v[1]) >= 0 || !bounded_by(l, v);
}

function normalized_phi(l, v) {
    if (!is_normal_tail(l, v)) return v;
    if (is_zero(v)) {
        let abnormal = get_abnormal(l);
        if (abnormal !== undefined) return abnormal;
    }
    return [2, l, v];
}

function normalize(e) {
    if (e[0] !== 2) throw new Error('illegal argument');
    return normalized_phi(e[1], e[2]);
}

const MARK = Symbol('mark');

function replace_mark(template, value) {
    function impl(t) {
        if (t === MARK) return value;

        switch (t[0]) {
            case 0:
                return [0];
            case 1:
                return [1, t[1].map(impl)];
            case 2:
                return [2, impl_list(t[1]), impl(t[2])];
        }
    }

    function impl_list(l) {
        const result = l.map(impl_entry);
        if (result.length > 0 && is_zero(result[result.length - 1][1])) result.pop();
        return result;
    }

    function impl_entry([p, v]) {
        return [impl_list(p), impl(v)];
    }

    return impl(template);
}

function prev_list(l) {
    const [p, v] = l[l.length - 1];
    const v_prev = FS(v, 0);
    if (is_zero(v_prev)) return l.slice(0, -1);
    return [...l.slice(0, -1), [p, v_prev]];
}

function create_template_list(l, index) {
    const [p, v] = l[l.length - 1];
    if (is_limit(v)) return [[...l.slice(0, -1), [p, FS(v, index)]], 'plain'];
    const v_prev = FS(v, 0);
    let new_l = l.slice(0, -1);
    if (!is_zero(v_prev)) new_l.push([p, v_prev]);

    if (!list_is_limit(p)) {
        new_l.push([prev_list(p), MARK]);
        return [new_l, 'iterate'];
    }
    const [new_p, type] = create_template_list(p, index);
    new_l.push([new_p, one()]);
    return [new_l, type];
}

function create_template(l, index) {
    if (!list_is_limit(l)) {
        const l_prev = prev_list(l);
        return [[2, l_prev, MARK], 'iterate'];
    }

    const [tl, type] = create_template_list(l, index);
    if (type === 'plain') return [[2, tl, MARK], 'plain'];
    else return [[2, tl, zero()], 'iterate'];
}

function FS(a, index) {
    if (is_infinity(a)) return infinity_FS(index);

    if (a[0] === 0) return zero();
    if (a[0] === 1) {
        const tail_FS = FS(a[1][a[1].length - 1], index);
        return from_prim_list([...a[1].slice(0, -1), ...prim_list(tail_FS)]);
    }
    if (is_limit(a[2])) {
        const tail_FS = FS(a[2], index);
        return normalized_phi(a[1], tail_FS);
    }
    if (a[1].length === 0) {
        if (is_zero(a[2])) return zero();
        let tail_FS = FS(a[2], 0);
        let result = normalized_phi([], tail_FS);
        return from_prim_list(Array(index).fill(result));
    }

    let initial_value;
    if (is_zero(a[2])) initial_value = zero();
    else initial_value = [1, [normalized_phi(a[1], FS(a[2], 0)), one()]];

    const [t, type] = create_template(a[1], index);
    if (type === 'plain') return normalize(replace_mark(t, initial_value));
    if (index === 0) return initial_value;
    let current = normalize(replace_mark(t, initial_value));
    for (let i = 1; i < index; i++) current = replace_mark(t, current);
    return current;
}

export const VeblenPhi = {
    id: 'veblen-phi',
    name: "Extended Veblen's φ Function",
    simple_name: 'BHO φ',
    aliases: ['veblen', 'veb'],   // 用户习惯：直接敲 veblen 就建这棵树
    category_id: 'category-ocf',
    is_limit,
    ...FS_default_LNZ_variant(FS, compare, is_infinity, infinity_FS, is_limit, (e) => display(e, 'plain')),
    compare,
    display: {
        plain: bind2(display, 'plain'),
        html: bind2(display, 'html'),
        latex: bind2(display, 'latex'),
        from_display,
    },
    display_equiv: {
        separate: {
            plain: bind2(display_separate, 'plain'),
            html: bind2(display_separate, 'html'),
            latex: bind2(display_separate, 'latex'),
            from_display,
            name: { id: 'display.veblen-separate' },
        },
    },
    init: () => [INFINITY, zero()],
    // 本项目旧版（notation/rewritten/Veblen.js）对外暴露过 debug.normalize；
    // ne 原版没有 debug 字段，这里保留以免旧侧调试入口消失（引擎不读 debug，
    // 仅 debug_verification 会被 expander/tree 调用）。
    debug: { normalize },
};

register_notation(VeblenPhi);
