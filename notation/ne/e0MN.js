// ============================================================================
//  notation/ne/e0MN.js — e0 山记号（e0MN，ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/MN/e0MN.ts（快照 d2d79cd）
//  注册 id: e0mn（单体记号，无 generator，与 ne 原版一致）
//  category_id: 'category-ta0-mn'（该分类已由 notation/ne/categories.js 骨架以
//  纯容器形式注册，故本文件直接 register_notation，不需要 ensure_category）
//
//  表达式 = Column[]；Column = Entry[]；Entry = { a: number, x: Ord }；
//  Ord = { exp: Ord, coeff: number }[]（Cantor 正规形，zero = []）；
//  极限哨兵 INFINITY = Infinity（ne 原版写作 `Infinity as any`）。
//
//  与 ne 原版的差异（只有以下三处，均属依赖/接线层面，算法本体逐行照搬）：
//
//   1) 未提供 draw_diagram：它依赖 ne 的 src/notations/draw_mountain_diagram.ts
//      （DiagramControl / draw_mountain_diagram(shape, layout, opts) 图元层），
//      本项目的 ne 侧尚无该模块；core/mountainDiagram.js 是同名旧签名的 ω-Y 版
//      （draw_mountain_diagram(data, opts) ≠ ne 的 (shape, layout, opts)），
//      直接复用会产出错误图形，故不硬接（与 notation/ne/Omega_MN.js、BM.js 一致）。
//      draw_diagram 所依赖的 build_e0MN_mountain_source 已在本文件内逐行保留
//      （纯数据、零外部依赖），并照原样挂在 mountain_view 上，接线时可直接复用。
//      相应地，ne 原版导出的 draw_diagram_control 也不导出（本项目无消费者）。
//
//   2) MN_FS_variants 不内联：ne 的 src/notations/notation_utils.ts 中该函数
//      本项目已在 core/ne/notationUtils.js 逐字移植（本次已比对两者一致），故 import 使用。
//
//   3) 类型注解全部去除（TS → JS），其余一字未改。
// ============================================================================
import { MN_FS_variants } from '../../core/ne/notationUtils.js';
import { register_notation } from '../../core/ne/registry.js';

// Ord = [{ exp: Ord, coeff: positive integer }]; zero = []。

const INFINITY = Infinity;

function is_infinity(expr) {
    return expr === INFINITY;
}

/** 极限的基本列: 第 index 项为 ()(1:ω^^index)(原文件由 `makeLimit` 构造, 现按项目风格并入此处)。 */
function infinity_FS(index) {
    return [[], [{ a: 1, x: omegaTower(index) }]];
}

function cloneOrd(a) {
    return a.map((t) => ({ exp: cloneOrd(t.exp), coeff: t.coeff }));
}

function cloneCol(c) {
    return c.map((e) => ({ a: e.a, x: cloneOrd(e.x) }));
}

function cloneExpr(e) {
    return e.map(cloneCol);
}

function ordNat(n) {
    if (!Number.isSafeInteger(n) || n < 0) throw Error(`Natural number expected: ${n}`);
    return n ? [{ exp: [], coeff: n }] : [];
}

function ordOne() {
    return ordNat(1);
}

function isZero(a) {
    return a.length === 0;
}

function isOne(a) {
    return a.length === 1 && isZero(a[0].exp) && a[0].coeff === 1;
}

function isPositive(a) {
    return a.length > 0;
}

function ordCompare(a, b) {
    for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) {
        const c = ordCompare(a[i].exp, b[i].exp);
        if (c) return c;
        if (a[i].coeff !== b[i].coeff) return a[i].coeff > b[i].coeff ? 1 : -1;
    }
    return Math.sign(a.length - b.length);
}

function ordEq(a, b) {
    return ordCompare(a, b) === 0;
}

function ordIsSuccessor(a) {
    return isPositive(a) && isZero(a[a.length - 1].exp);
}

function ordIsStandard(a) {
    return (
        Array.isArray(a) &&
        a.every(
            (t, i) =>
                Number.isSafeInteger(t.coeff) &&
                t.coeff > 0 &&
                ordIsStandard(t.exp) &&
                (!i || ordCompare(a[i - 1].exp, t.exp) > 0),
        )
    );
}

// Ordinal addition and the right difference beta-alpha defined by alpha+gamma=beta.
// These operate on standard Cantor-normal-form e0 ordinals.
function ordAdd(a, b) {
    if (!b.length) return cloneOrd(a);
    const lead = b[0].exp;
    let i = 0;
    while (i < a.length && ordCompare(a[i].exp, lead) > 0) i++;
    const out = cloneOrd(a.slice(0, i));
    if (i < a.length && ordEq(a[i].exp, lead)) {
        out.push({ exp: cloneOrd(lead), coeff: a[i].coeff + b[0].coeff });
        for (let j = 1; j < b.length; j++) out.push({ exp: cloneOrd(b[j].exp), coeff: b[j].coeff });
    } else {
        for (const t of b) out.push({ exp: cloneOrd(t.exp), coeff: t.coeff });
    }
    return out;
}

function ordRightDiff(a, b) {
    const cmp = ordCompare(a, b);
    if (cmp > 0) throw Error('Ordinal right difference requires the second ordinal to be at least the first');
    if (!cmp) return [];
    let i = 0;
    while (i < a.length && i < b.length && ordEq(a[i].exp, b[i].exp) && a[i].coeff === b[i].coeff) i++;
    if (i === a.length) return cloneOrd(b.slice(i));
    if (i >= b.length) throw Error('Ordinal right difference does not exist');
    const ec = ordCompare(a[i].exp, b[i].exp);
    if (ec < 0) return cloneOrd(b.slice(i));
    if (ec === 0 && a[i].coeff < b[i].coeff) {
        return [{ exp: cloneOrd(b[i].exp), coeff: b[i].coeff - a[i].coeff }, ...cloneOrd(b.slice(i + 1))];
    }
    throw Error('Ordinal right difference does not exist');
}

// e0 fundamental sequence, following cases 1--6 recursively.
function ordFS(src, m) {
    if (!Number.isSafeInteger(m) || m < 0) throw Error('FS index must be a non-negative integer');
    if (!src.length) return [];

    const a = cloneOrd(src),
        last = a[a.length - 1];
    if (isZero(last.exp)) {
        // cases 1, 2
        if (last.coeff === 1) a.pop();
        else last.coeff--;
        return a;
    }

    const exp = cloneOrd(last.exp),
        coeff = last.coeff;
    a.pop();
    if (coeff > 1) a.push({ exp, coeff: coeff - 1 });
    const nextExp = ordFS(exp, m);
    if (ordIsSuccessor(exp)) {
        // cases 3, 4
        if (m) a.push({ exp: nextExp, coeff: m });
    } else {
        // cases 5, 6
        a.push({ exp: nextExp, coeff: 1 });
    }
    return a;
}

function omegaPower(exp) {
    return [{ exp: cloneOrd(exp), coeff: 1 }];
}

function omegaTower(n) {
    if (!Number.isSafeInteger(n) || n < 0) throw Error('Tower height must be a non-negative integer');
    let r = ordOne();
    while (n--) r = omegaPower(r);
    return r;
}

// In rfl: visible positive integers inside e0 shift iff q > cutoff.
function shiftOrdNumbers(a, cutoff, d) {
    return a.map((t) => {
        if (isZero(t.exp)) return { exp: [], coeff: t.coeff > cutoff ? t.coeff + d : t.coeff };
        return {
            exp: isOne(t.exp) ? cloneOrd(t.exp) : shiftOrdNumbers(t.exp, cutoff, d),
            coeff: t.coeff !== 1 && t.coeff > cutoff ? t.coeff + d : t.coeff,
        };
    });
}

// ---------- e0 parser / display ----------
function normalizeOmega(s) {
    return s.replace(/omega/gi, 'ω').replace(/w/g, 'ω');
}

function parseOrd(text, allowZero = false) {
    const s = normalizeOmega(String(text)).replace(/\s+/g, '');
    const tower = s.match(/^ω\^\^(\d+)$/);
    if (tower) return omegaTower(Number(tower[1]));
    let i = 0;

    const fail = (msg) => {
        throw Error(`Illegal e0 expression "${text}": ${msg} at position ${i}`);
    };
    const number = () => {
        const start = i;
        while (/\d/.test(s[i] || '')) i++;
        if (start === i) fail('number expected');
        const n = Number(s.slice(start, i));
        if (!Number.isSafeInteger(n)) fail('number is too large');
        return n;
    };

    function expr(end) {
        if (s[i] === '0' && (i + 1 === s.length || (end && s[i + 1] === end))) {
            i++;
            return [];
        }
        const out = [];
        while (i < s.length && (!end || s[i] !== end)) {
            out.push(term());
            if (s[i] !== '+') break;
            i++;
            if (i >= s.length || (end && s[i] === end)) fail('term expected after "+"');
        }
        return out;
    }

    function exponent() {
        if (i >= s.length) fail('exponent expected');
        const open = s[i];
        if (open === '{' || open === '(') {
            const close = open === '{' ? '}' : ')';
            i++;
            if (s[i] === close) {
                i++;
                return [];
            }
            const e = expr(close);
            if (s[i] !== close) fail(`missing "${close}"`);
            i++;
            return e;
        }
        if (/\d/.test(s[i])) return ordNat(number());
        if (s[i] === 'ω') return [term()];
        return fail('bad exponent');
    }

    function term() {
        if (i >= s.length) fail('term expected');
        if (/\d/.test(s[i])) {
            const n = number();
            if (n <= 0) fail('positive integer expected');
            return { exp: [], coeff: n };
        }
        if (s[i] !== 'ω') fail('term must start with a positive integer or ω');
        i++;
        let exp = ordOne();
        if (s[i] === '^') {
            i++;
            exp = exponent();
        }
        let coeff = 1;
        if (/\d/.test(s[i] || '')) {
            coeff = number();
            if (coeff <= 0) fail('positive coefficient expected');
        }
        return { exp, coeff };
    }

    if (!s) fail('empty expression');
    if (s === '0') {
        if (allowZero) return [];
        fail('row label must be positive');
    }
    const out = expr();
    if (i !== s.length) fail(`unexpected character "${s[i]}"`);
    if (!allowZero && !out.length) fail('row label must be positive');
    return out;
}

function ordTo(a, mode) {
    if (!a.length) return '0';
    return a
        .map((t) => {
            if (isZero(t.exp)) return String(t.coeff);
            let q = mode === 'latex' ? '\\omega' : 'ω';
            if (!isOne(t.exp)) {
                const e = ordTo(t.exp, mode);
                q += mode === 'html' ? `<sup>${e}</sup>` : `^{${e}}`;
            }
            return q + (t.coeff === 1 ? '' : t.coeff);
        })
        .join('+');
}

function ordToPlain(a) {
    return ordTo(a, 'plain');
}

function ordToHTML(a) {
    return ordTo(a, 'html');
}

function ordToLatex(a) {
    return ordTo(a, 'latex');
}

function towerIndex(a) {
    if (isOne(a)) return 0;
    if (a.length !== 1 || a[0].coeff !== 1 || isZero(a[0].exp)) return -1;
    const k = towerIndex(a[0].exp);
    return k < 0 ? -1 : k + 1;
}

// ---------- e0MN parse / display ----------
function entryCompare(p, q) {
    return p.a === q.a ? ordCompare(p.x, q.x) : p.a > q.a ? 1 : -1;
}

function arrayLexCompare(a, b, cmp) {
    for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) {
        const c = cmp(a[i], b[i]);
        if (c) return c;
    }
    return Math.sign(a.length - b.length);
}

function colCompare(a, b) {
    return arrayLexCompare(a, b, entryCompare);
}

function exprCompare(a, b) {
    return a === INFINITY ? (b === INFINITY ? 0 : 1) : b === INFINITY ? -1 : arrayLexCompare(a, b, colCompare);
}

function isLegalColumn(c, colNo) {
    return c.every(
        (e, i) =>
            Number.isSafeInteger(e.a) &&
            e.a > 0 &&
            e.a < colNo &&
            isPositive(e.x) &&
            (!i || (c[i - 1].a > e.a && ordCompare(c[i - 1].x, e.x) < 0)),
    );
}

function isLegalExpr(e) {
    return Array.isArray(e) && e.every((c, i) => Array.isArray(c) && isLegalColumn(c, i + 1));
}

function isLimitExpr(e) {
    return is_infinity(e) || (isLegalExpr(e) && !!e.length && !!e[e.length - 1].length);
}

function predecessor(e) {
    return e.length ? cloneExpr(e.slice(0, -1)) : [];
}

function exprLimitIndex(e) {
    return e.length === 2 && !e[0].length && e[1].length === 1 && e[1][0].a === 1 ? towerIndex(e[1][0].x) : -1;
}

function splitTop(s, sep) {
    const out = [];
    let start = 0,
        p = 0,
        b = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') p++;
        else if (ch === ')') p--;
        else if (ch === '{') b++;
        else if (ch === '}') b--;
        else if (ch === sep && !p && !b) {
            out.push(s.slice(start, i));
            start = i + 1;
        }
    }
    out.push(s.slice(start));
    return out;
}

function topColon(s) {
    let p = 0,
        b = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') p++;
        else if (ch === ')') p--;
        else if (ch === '{') b++;
        else if (ch === '}') b--;
        else if (ch === ':' && !p && !b) return i;
    }
    return -1;
}

function parseColumn(s) {
    if (!s.trim()) return [];
    return splitTop(s, ';').map((piece) => {
        const colon = topColon(piece);
        if (colon < 0) throw Error(`Entry must have form a:x; got: ${piece}`);
        const aText = piece.slice(0, colon).trim(),
            xText = piece.slice(colon + 1).trim();
        if (!/^\d+$/.test(aText)) throw Error(`Left-leg column label must be a positive integer: ${aText}`);
        const a = Number(aText);
        if (!Number.isSafeInteger(a) || a <= 0)
            throw Error(`Left-leg column label must be a positive integer: ${aText}`);
        return { a, x: parseOrd(xText) };
    });
}

function parseExpr(text) {
    const raw = String(text).trim();
    if (!raw || raw === '0' || raw === '∅') return [];
    if (/^Limit$/i.test(raw)) return INFINITY;
    const lim = raw.match(/^Limit\s*\[\s*(\d+)\s*\]$/i);
    if (lim) return infinity_FS(Number(lim[1]));

    const out = [];
    for (let i = 0; i < raw.length;) {
        while (/\s/.test(raw[i] || '')) i++;
        if (i >= raw.length) break;
        if (raw[i] !== '(') throw Error(`Expected "(" at position ${i} in e0MN expression`);
        let p = 0,
            b = 0,
            end = -1;
        for (let j = i; j < raw.length; j++) {
            const ch = raw[j];
            if (ch === '(') p++;
            else if (ch === ')') {
                p--;
                if (!p && !b) {
                    end = j;
                    break;
                }
            } else if (ch === '{') b++;
            else if (ch === '}') b--;
        }
        if (end < 0) throw Error('Unmatched "(" in e0MN expression');
        out.push(parseColumn(raw.slice(i + 1, end)));
        i = end + 1;
    }
    return out;
}

function colTo(c, mode) {
    if (!c.length) return mode === 'latex' ? '\\left(\\right)' : '()';
    const body = c.map((e) => `${e.a}:${ordTo(e.x, mode)}`).join(';');
    return mode === 'latex' ? `\\left(${body}\\right)` : `(${body})`;
}

function exprToPlain(e) {
    return is_infinity(e) ? 'Limit' : e.map((c) => colTo(c, 'plain')).join('');
}

function exprToHTML(e) {
    return is_infinity(e) ? 'Limit' : e.map((c) => colTo(c, 'html')).join('');
}

function exprToLatex(e) {
    return is_infinity(e) ? '\\operatorname{Limit}' : e.map((c) => colTo(c, 'latex')).join('');
}

function exprToLimit(e, mode) {
    if (is_infinity(e)) return mode === 'latex' ? '\\operatorname{Limit}' : 'Limit';
    const n = exprLimitIndex(e);
    if (n < 0) return mode === 'plain' ? exprToPlain(e) : mode === 'html' ? exprToHTML(e) : exprToLatex(e);
    return mode === 'latex' ? `\\operatorname{Limit}[${n}]` : `Limit[${n}]`;
}

// Equivalent display "行高差": keep the first row ordinal, then display the
// unique gamma with x_prev + gamma = x_cur.  In HTML/LaTeX gamma is a superscript.
function rowHeightEntry(a, delta, mode) {
    if (isOne(delta)) return String(a);
    const d = ordTo(delta, mode);
    if (mode === 'html') return `${a}<sup>${d}</sup>`;
    if (mode === 'latex') return `${a}^{${d}}`;
    return `${a}:${d}`;
}

function rowHeightColTo(c, mode) {
    if (!c.length) return mode === 'latex' ? '\\left(\\right)' : '()';
    let prev = [];
    const body = c
        .map((e, i) => {
            const delta = i ? ordRightDiff(prev, e.x) : cloneOrd(e.x);
            if (i && !ordEq(ordAdd(prev, delta), e.x))
                throw Error('Internal error: row-height difference is incorrect');
            prev = e.x;
            return rowHeightEntry(e.a, delta, mode);
        })
        .join(',');
    return mode === 'latex' ? `\\left(${body}\\right)` : `(${body})`;
}

function exprToRowHeightPlain(e) {
    return is_infinity(e) ? 'Limit' : e.map((c) => rowHeightColTo(c, 'plain')).join('');
}

function exprToRowHeightHTML(e) {
    return is_infinity(e) ? 'Limit' : e.map((c) => rowHeightColTo(c, 'html')).join('');
}

function exprToRowHeightLatex(e) {
    return is_infinity(e) ? '\\operatorname{Limit}' : e.map((c) => rowHeightColTo(c, 'latex')).join('');
}

function parseRowHeightColumn(s) {
    if (!s.trim()) return [];
    let prev = [];
    return splitTop(s, ',').map((rawPiece, i) => {
        const piece = rawPiece.trim();
        if (!piece) throw Error('Empty entry in 行高差 column');
        const colon = topColon(piece);
        const aText = (colon < 0 ? piece : piece.slice(0, colon)).trim();
        if (!/^\d+$/.test(aText)) throw Error(`Left-leg column label must be a positive integer: ${aText}`);
        const a = Number(aText);
        if (!Number.isSafeInteger(a) || a <= 0)
            throw Error(`Left-leg column label must be a positive integer: ${aText}`);
        const delta = colon < 0 ? ordOne() : parseOrd(piece.slice(colon + 1).trim());
        const x = i ? ordAdd(prev, delta) : cloneOrd(delta);
        prev = x;
        return { a, x };
    });
}

function parseRowHeightExpr(text) {
    const raw = String(text).trim();
    if (!raw || raw === '0' || raw === '∅') return [];
    if (/^Limit$/i.test(raw)) return INFINITY;
    const lim = raw.match(/^Limit\s*\[\s*(\d+)\s*\]$/i);
    if (lim) return infinity_FS(Number(lim[1]));

    const out = [];
    for (let i = 0; i < raw.length;) {
        while (/\s/.test(raw[i] || '')) i++;
        if (i >= raw.length) break;
        if (raw[i] !== '(') throw Error(`Expected "(" at position ${i} in 行高差 expression`);
        let p = 0,
            b = 0,
            end = -1;
        for (let j = i; j < raw.length; j++) {
            const ch = raw[j];
            if (ch === '(') p++;
            else if (ch === ')') {
                p--;
                if (!p && !b) {
                    end = j;
                    break;
                }
            } else if (ch === '{') b++;
            else if (ch === '}') b--;
        }
        if (end < 0) throw Error('Unmatched "(" in 行高差 expression');
        out.push(parseRowHeightColumn(raw.slice(i + 1, end)));
        i = end + 1;
    }
    return out;
}

// ---------- down / rfl / e0MN fundamental sequence ----------
function down(src) {
    if (!isLimitExpr(src)) return predecessor(src);
    const e = cloneExpr(src),
        l = e.length,
        last = e[l - 1],
        n = last.length;
    const { a: an, x: xn } = last[n - 1],
        d = l - an;
    if (d <= 0) throw Error('Illegal e0MN expression: d <= 0');

    const source = e[an - 1];
    let s = 0;
    while (s < source.length && ordCompare(source[s].x, xn) < 0) s++;

    const newLast = last.slice(0, -1).map((z) => ({ a: z.a, x: cloneOrd(z.x) }));
    const xnL = ordFS(xn, l - 1); // exactly x_n[l-1]
    const omit = isOne(xn) || (n > 1 && ordCompare(xnL, last[n - 2].x) <= 0);
    if (!omit && isPositive(xnL)) newLast.push({ a: an, x: xnL });
    for (let j = s; j < source.length; j++) newLast.push({ a: source[j].a, x: cloneOrd(source[j].x) });
    e[l - 1] = newLast;
    return e;
}

function processRflCol(c, cutoff, d) {
    return c.map((z) => ({
        a: z.a >= cutoff ? z.a + d : z.a,
        x: shiftOrdNumbers(z.x, cutoff, d),
    }));
}

function rfl(src) {
    if (!isLimitExpr(src)) return predecessor(src);
    const l = src.length,
        an = src[l - 1][src[l - 1].length - 1].a,
        d = l - an;
    if (d <= 0) throw Error('Illegal e0MN expression: d <= 0');
    const out = down(src);
    for (let col = an + 1; col <= l; col++) out.push(processRflCol(src[col - 1], an, d));
    return out;
}

function FS(src, m, shorter = true) {
    if (!Number.isSafeInteger(m) || m < 0) throw Error('FS index must be a non-negative integer');
    if (is_infinity(src)) return infinity_FS(m);
    if (!src.length) return [];
    if (!m || !isLimitExpr(src)) return predecessor(src);
    let r = cloneExpr(src);
    while (m--) r = rfl(r);
    if (shorter) {
        return predecessor(r);
    } else {
        const l = r.length;
        r = rfl(r);
        return cloneExpr(r.slice(0, l));
    }
}

function shortExpansion(src) {
    if (!isLimitExpr(src)) return predecessor(src);
    const l = src.length,
        last = src[l - 1],
        n = last.length;
    const { a: an, x: xn } = last[n - 1];
    const prev = n > 1 ? last[n - 2].x : [];
    const xnL = ordFS(xn, l - 1);
    const omit = isOne(xn) || (n > 1 && ordCompare(xnL, prev) <= 0);
    if (omit) return down(src);

    let s = 0,
        xnS = ordFS(xn, 0);
    while (ordCompare(xnS, prev) <= 0) {
        s++;
        if (!Number.isSafeInteger(s)) throw Error('No finite short-expansion index found');
        xnS = ordFS(xn, s);
    }

    const e = cloneExpr(src);
    e[l - 1] = last.slice(0, -1).map((z) => ({ a: z.a, x: cloneOrd(z.x) }));
    e[l - 1].push({ a: an, x: xnS });
    return e;
}

function FSShort(src, m) {
    if (!Number.isSafeInteger(m) || m < 0) throw Error('FS index must be a non-negative integer');
    if (is_infinity(src)) return infinity_FS(m);
    if (!src.length) return [];
    if (!m || !isLimitExpr(src)) return predecessor(src);
    const short = shortExpansion(src);
    if (m === 1) return short;
    const first = FS(src, 1);
    return FS(src, exprCompare(short, first) === 0 ? m : m - 1);
}

// ---------- diagram ----------
// 原文件自带一套画布绘制; 现改为"只描述形状 + 交给项目共享的山脉图工具绘制"。
// 行高向量取该项的序数 x 本身(底行哨兵 '*' 取 [] = 零序数), 于是:
//   - 行的排序即 ordCompare, 行标即 ordToHTML(x);
//   - 同列相邻两格之间的右腿、以及"落到父列中低于本格的最新一行"的左腿,
//     与共享工具的右腿/左腿折线几何完全一致。

/**
 * 由表达式算出山脉图形状。
 *
 * 每列第 0 个节点是底行哨兵 '*'(行号 0), 其余每个项占它序数所对应的那一行(行号 1 起);
 * 左腿落点为父列(列标 a - 1)中严格低于本格行号的最大已占用行, 没有则落到底行 0。
 */
/** 任何一个"有项的列"都没有时不出图(与原实现一致: 空表达式与 `()` 都返回 undefined)。 */
function has_entries(expr) {
    return expr.some((column) => column.length > 0);
}

function build_e0MN_mountain_source(expr) {
    if (is_infinity(expr) || !has_entries(expr)) return undefined;

    // 行标 → 行号(0 为底行哨兵), 行标即该记号自身形式下的序数
    const rows = [];
    expr.forEach((column) =>
        column.forEach((z) => {
            if (!rows.some((r) => ordEq(r, z.x))) rows.push(cloneOrd(z.x));
        }),
    );
    rows.sort(ordCompare);

    // 预先算好每列: 行号 → 文字(含底行 '*'), 以及各项的行号与"最终成格"的下标
    const columns = expr.map((column) => {
        const texts = new Map([[0, '*']]);
        const drawn_index = new Map(); // 行号 → 该行最终成格项的下标
        const node_rows = [];
        column.forEach((z, i) => {
            const row = rows.findIndex((r) => ordEq(r, z.x)) + 1;
            texts.set(row, String(z.a));
            drawn_index.set(row, i);
            node_rows.push(row);
        });
        // 行号 → 该节点在本列 shape 中的下标(第 0 个节点是底行哨兵, 故从 1 起编号)
        const shape_index = new Map([[0, 0]]);
        let next = 1;
        column.forEach((_, i) => {
            const row = node_rows[i];
            if (drawn_index.get(row) !== i) return;
            shape_index.set(row, next++);
        });
        return { texts, drawn_index, shape_index, node_rows };
    });

    /** 某列中严格低于 row 的最大已占用行, 不存在则 0。 */
    const below = (col, row) => {
        for (let r = row - 1; r >= 0; r--) if (columns[col].texts.has(r)) return r;
        return 0;
    };

    const shape = expr.map((column, col) => {
        const { texts, drawn_index, node_rows } = columns[col];
        const nodes = [{ vertical: [], text: texts.get(0) }];
        column.forEach((z, i) => {
            if (drawn_index.get(node_rows[i]) !== i) return; // 被遮盖的项不单独成格
            nodes.push({ vertical: z.x, text: String(z.a) });
        });
        column.forEach((z, i) => {
            const row = node_rows[i];
            const target_col = z.a - 1;
            if (drawn_index.get(row) !== i) return;
            if (row <= 0 || target_col < 0 || target_col >= col) return;
            const target_row = below(target_col, row);
            const target_shape_index = columns[target_col].shape_index.get(target_row);
            const self_index = columns[col].shape_index.get(row);
            if (target_shape_index === undefined || self_index === undefined) return;
            nodes[self_index].leg_target = [target_col, target_shape_index];
        });
        return nodes;
    });

    return {
        shape,
        layout: {
            // 仅作行去重键与默认行标: 必须单射(ordToHTML 会把 ω^0 也显示成 1, 故不用它)
            vertical_display: ordToLatex,
            vertical_compare: ordCompare,
            separator_count: () => 0,
            row_label: (v) => ordToHTML(v),
        },
        display_html_row_label: true,
    };
}

// draw_diagram_control：ne 原版此处导出 { default_data, draw_diagram }，
// 但 draw_diagram 依赖未移植的 ne src/notations/draw_mountain_diagram.ts，
// 故本文件不提供该导出（详见文件头 1）。build_e0MN_mountain_source 已完整保留。

export const e0MN = {
    id: 'e0mn',
    name: 'e0 Mountain Notation',
    simple_name: 'e0MN',
    category_id: 'category-ta0-mn',
    display: {
        plain: (e) => exprToPlain(e),
        html: (e) => exprToHTML(e),
        latex: (e) => exprToLatex(e),
        from_display: parseExpr,
        name: '原记号',
    },
    display_equiv: {
        行高差: {
            plain: (e) => exprToRowHeightPlain(e),
            html: (e) => exprToRowHeightHTML(e),
            latex: (e) => exprToRowHeightLatex(e),
            from_display: parseRowHeightExpr,
            name: '行高差',
        },
    },
    is_limit: isLimitExpr,
    compare: exprCompare,
    ...MN_FS_variants(FS, is_infinity, infinity_FS, isLimitExpr, exprToPlain, colCompare, shortExpansion),
    mountain_view: (expr) => build_e0MN_mountain_source(expr),
    credit_text_id: 'credit.e0mn',
    init: () => [INFINITY, [[]], []],
    debug: {
        parseOrd,
        ordFS,
        ordAdd,
        ordRightDiff,
        parseExpr,
        parseRowHeightExpr,
        exprToPlain,
        exprToRowHeightPlain,
        down,
        rfl,
        isLegalExpr,
        build_e0MN_mountain_source,
    },
};

register_notation(e0MN);
