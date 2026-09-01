// ============================================================================
//  notation/cnf.js — Cantor normal form (CNF)  (修正 dec 的幂分支)
// ============================================================================
;(() => {

  // atom 开头字符
  function isAtomStart(ch) {
    return (/[0-9]/.test(ch) || ch === 'w' || ch === 'e' || ch === 'z' || ch === 'h' || ch === '(');
  }
  function nextIsAtomStart(s, i) {
    let j = i;
    while (j < s.length && /\s/.test(s[j])) j++;
    return j < s.length && isAtomStart(s[j]);
  }

  // --------------------------------------------------------------------------
  //  词法
  // --------------------------------------------------------------------------
  function tokenize(input) {
    const tokens = [];
    let i = 0;
    const s = input
      .replace(/ω/g, 'w')
      .replace(/ζ/g, 'z')
      .replace(/η/g, 'h')
      .replace(/epsilon/gi, 'e')
      .replace(/omega/gi, 'w')
      .replace(/zeta/gi, 'z')
      .replace(/eta/gi, 'h')
      .replace(/×/g, '*')
      .replace(/·/g, '*')
      .replace(/＋/g, '+')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')');
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9]/.test(ch)) {
        let num = '';
        while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++; }
        tokens.push({ type: 'num', value: parseInt(num, 10) });
        if (nextIsAtomStart(s, i)) tokens.push({ type: 'imul' });
        continue;
      }
      if (ch === 'w') {
        tokens.push({ type: 'w' });
        i++;
        if (nextIsAtomStart(s, i)) tokens.push({ type: 'imul' });
        continue;
      }
      if (ch === 'e' || ch === 'z' || ch === 'h') {
        tokens.push({ type: ch });
        i++;
        continue;
      }
      if (ch === '_') {
        tokens.push({ type: '_' });
        i++;
        continue;
      }
      if (ch === '^' || ch === '*' || ch === '+' || ch === '(' || ch === ')') {
        tokens.push({ type: ch });
        i++;
        continue;
      }
      throw new Error(`无法识别的字符: ${ch}`);
    }
    tokens.push({ type: 'eof' });
    return tokens;
  }

  // --------------------------------------------------------------------------
  //  语法分析
  // --------------------------------------------------------------------------
  function parse(input) {
    const str = String(input).trim();
    if (!str) throw new Error('CNF 表达式为空');
    const tokens = tokenize(str);
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function parseExpr() {
      let e = parseTerm();
      while (peek().type === '+') {
        next();
        e = ['+', e, parseTerm()];
      }
      return e;
    }
    function parseTerm() {
      let t = parsePow();
      while (peek().type === '*') {
        next();
        t = ['*', t, parsePow()];
      }
      return t;
    }
    function parsePow() {
      const b = parseImul();
      if (peek().type === '^') {
        next();
        return ['^', b, parsePow()];
      }
      return b;
    }
    function parseImul() {
      let a = parseAtom();
      while (peek().type === 'imul') {
        next();
        a = ['*', a, parseAtom()];
      }
      return a;
    }
    function parseAtom() {
      const t = peek();
      if (t.type === 'num') { next(); return t.value; }
      if (t.type === 'w') { next(); return 'w'; }
      if (t.type === 'e' || t.type === 'z' || t.type === 'h') {
        const isEps = t.type === 'e', isZeta = t.type === 'z';
        next();
        let sub = null;
        const p = peek();
        if (p.type === '_') {
          next();
          if (peek().type === '(') {
            next();
            sub = parseExpr();
            if (peek().type !== ')') throw new Error('缺少右括号 )');
            next();
          } else {
            sub = parseAtom();
          }
        } else if (p.type === 'num' || p.type === 'w' || p.type === 'e' || p.type === 'z' || p.type === 'h') {
          sub = parseAtom();
        } else if (p.type === '(') {
          next();
          sub = parseExpr();
          if (peek().type !== ')') throw new Error('缺少右括号 )');
          next();
        }
        if (sub === null) throw new Error(isEps ? 'ε 必须带下标（如 e0、ee0、e_w）' : isZeta ? 'ζ 必须带下标（如 z0、zz0、z_w）' : 'η 必须带下标（如 h0、hh0、h_w）');
        return isEps ? ['e', sub] : isZeta ? ['z', sub] : ['h', sub];
      }
      if (t.type === '(') {
        next();
        const e = parseExpr();
        if (peek().type !== ')') throw new Error('缺少右括号 )');
        next();
        return e;
      }
      if (t.type === 'eof') throw new Error('表达式意外结束');
      throw new Error(`此处不允许出现 ${t.type}`);
    }
    const expr = parseExpr();
    if (peek().type !== 'eof') throw new Error(`表达式末尾有多余内容: ${peek().type}`);
    return cleanup(expr);
  }

  // --------------------------------------------------------------------------
  //  display
  // --------------------------------------------------------------------------
  function fmt(e, parentPrec, inExp) {
    if (typeof e === 'number') return String(e);
    if (e === 'w') return 'ω';
    const op = e[0];
    if (op === 'e') return 'ε<sub>' + fmt(e[1], 0, true) + '</sub>';
    if (op === 'z') return 'ζ<sub>' + fmt(e[1], 0, true) + '</sub>';
    if (op === 'h') return 'η<sub>' + fmt(e[1], 0, true) + '</sub>';
    const prec = op === '+' ? 0 : op === '*' ? 1 : 2;
    if (inExp) {
      if (op === '+') return fmt(e[1], 0, true) + '+' + fmt(e[2], 0, true);
      if (op === '*') return fmt(e[1], 1, true) + '·' + fmt(e[2], 2, true);
      return fmt(e[1], 3, true) + '<sup>' + fmt(e[2], 2, true) + '</sup>';
    }
    let s;
    if (op === '+') s = fmt(e[1], 0, false) + '+' + fmt(e[2], 0, false);
    else if (op === '*') s = fmt(e[1], 1, false) + '·' + fmt(e[2], 2, false);
    else s = fmt(e[1], 3, false) + '<sup>' + fmt(e[2], 2, true) + '</sup>';
    return parentPrec > prec ? `(${s})` : s;
  }
  function display(expr) {
    return fmt(expr, 0, false);
  }

  // --------------------------------------------------------------------------
  //  标准化（仅用于比较）
  // --------------------------------------------------------------------------
  function cnfNat(n) { return n > 0 ? [[[], n]] : []; }
  function cnfIsOne(c) { return c.length === 1 && c[0][0].length === 0 && c[0][1] === 1; }
  function isFp(x) { return x !== null && typeof x === 'object' && (x.t === 'E' || x.t === 'Z' || x.t === 'H'); }
  function asList(x) { return isFp(x) ? [[x, 1]] : x; }

  function extractFp(x) {
    while (!isFp(x)) {
      if (Array.isArray(x) && x.length > 0) { x = x[0][0]; continue; }
      return null;
    }
    return { t: x.t, a: x.a };
  }
  function cmpExpOne(L, Fp) {
    if (!Array.isArray(L) || L.length === 0) return -1;
    const Y1 = L[0][0], k1 = L[0][1];
    const c = cmpExp(Y1, Fp);
    if (c !== 0) return c;
    if (k1 > 1) return 1;
    if (L.length > 1) return 1;
    return 0;
  }
  function fpTail(x, y) {
    const fx = isFp(x), fy = isFp(y);
    if (fx && fy) return 0;
    if (fx) return -cmpExpOne(y, x);
    if (fy) return cmpExpOne(x, y);
    return cmpCnf(x, y);
  }
  function cmpExp(x, y) {
    const fx = extractFp(x), fy = extractFp(y);
    if (fx === null && fy === null) return cmpCnf(x, y);
    if (fx === null) return -1;
    if (fy === null) return 1;
    if (fx.t === 'Z' && fy.t === 'Z') {
      const c = compare(fx.a, fy.a);
      return c !== 0 ? c : fpTail(x, y);
    }
    if (fx.t === 'E' && fy.t === 'E') {
      const c = compare(fx.a, fy.a);
      return c !== 0 ? c : fpTail(x, y);
    }
    if (fx.t === 'H' && fy.t === 'H') {
      const c = compare(fx.a, fy.a);
      return c !== 0 ? c : fpTail(x, y);
    }
    if (fx.t === 'E' && fy.t === 'Z') {
      const c = compare(fx.a, ['z', fy.a]);
      if (c !== 0) return c;
      return fpTail(x, y);
    }
    if ((fx.t === 'E' || fx.t === 'Z') && fy.t === 'H') {
      const c = compare(fx.a, ['h', fy.a]);
      if (c !== 0) return c;
      return fpTail(x, y);
    }
    return -cmpExp(y, x);
  }
  function cmpCnf(a, b) {
    const m = Math.min(a.length, b.length);
    for (let i = 0; i < m; i++) {
      const ce = cmpExp(a[i][0], b[i][0]);
      if (ce !== 0) return ce;
      if (a[i][1] !== b[i][1]) return a[i][1] > b[i][1] ? 1 : -1;
    }
    if (a.length !== b.length) return a.length > b.length ? 1 : -1;
    return 0;
  }
  function normAdd(a, b) {
    if (a.length === 0) return b.slice();
    if (b.length === 0) return a.slice();
    const F1 = b[0][0];
    let cut = a.length;
    while (cut > 0 && cmpExp(a[cut - 1][0], F1) < 0) cut--;
    if (cut === 0) return b.slice();
    const res = a.slice(0, cut);
    if (cmpExp(a[cut - 1][0], F1) === 0) {
      const last = a[cut - 1];
      res.pop();
      res.push([F1, last[1] + b[0][1]]);
      for (let j = 1; j < b.length; j++) res.push(b[j]);
    } else {
      for (const t of b) res.push(t);
    }
    return res;
  }
  function normMul(a, b) {
    if (a.length === 0 || b.length === 0) return [];
    const E1 = a[0][0];
    const [F1, l1] = b[0];
    if (!isFp(F1) && F1.length === 0) {
      const res = a.map(([E, c]) => [E, c * l1]);
      return normAdd(res, normMul(a, b.slice(1)));
    }
    return normAdd([[normAdd(asList(E1), asList(F1)), l1]], normMul(a, b.slice(1)));
  }
  function dPowW(d, F) {
    if (isFp(F)) return [[F, 1]];
    if (F.length === 0) return [[cnfNat(1), 1]];
    if (F.length === 1 && F[0][0].length === 0) {
      const k = F[0][1];
      if (k === 1) return [[cnfNat(1), 1]];
      return [[[[cnfNat(k - 1), 1]], 1]];
    }
    return [[[[F, 1]], 1]];
  }
  function normPow(a, b) {
    if (a.length === 0) return b.length === 0 ? cnfNat(1) : [];
    if (b.length === 0) return cnfNat(1);
    if (cnfIsOne(a)) return cnfNat(1);
    if (b.length === 1 && b[0][0].length === 0) {
      let r = cnfNat(1);
      for (let i = 0; i < b[0][1]; i++) r = normMul(r, a);
      return r;
    }
    const E1 = a[0][0];
    if (!isFp(E1) && E1.length === 0) {
      const d = a[0][1];
      const [F1, l1] = b[0];
      const dPowWF = dPowW(d, F1);
      const part1 = normPow(dPowWF, cnfNat(l1));
      return normMul(part1, normPow(a, b.slice(1)));
    }
    return [[normMul(asList(E1), b), 1]];
  }
  function norm(e) {
    if (typeof e === 'number') return cnfNat(e);
    if (e === 'w') return [[cnfNat(1), 1]];
    const op = e[0];
    if (op === 'e') return [[{ t: 'E', a: e[1] }, 1]];
    if (op === 'z') return [[{ t: 'Z', a: e[1] }, 1]];
    if (op === 'h') return [[{ t: 'H', a: e[1] }, 1]];
    if (op === '+') return normAdd(norm(e[1]), norm(e[2]));
    if (op === '*') return normMul(norm(e[1]), norm(e[2]));
    return normPow(norm(e[1]), norm(e[2]));
  }
  function compare(a, b) {
    return cmpCnf(norm(a), norm(b));
  }

  // --------------------------------------------------------------------------
  //  化简（只做恒等式，不合并纯数值）
  // --------------------------------------------------------------------------
  function cleanup(e) {
    if (typeof e === 'number') return e;
    if (e === 'w') return e;
    const op = e[0];
    if (op === 'e') return ['e', cleanup(e[1])];
    if (op === 'z') return ['z', cleanup(e[1])];
    if (op === 'h') return ['h', cleanup(e[1])];
    const a = cleanup(e[1]);
    const b = cleanup(e[2]);
    if (op === '+') {
      if (a === 0) return b;
      if (b === 0) return a;
      if (b && b[0] === '+') {
        return cleanup(['+', ['+', a, b[1]], b[2]]);
      }
      return ['+', a, b];
    }
    if (op === '*') {
      if (a === 0 || b === 0) return 0;
      if (b === 1) return a;
      return ['*', a, b];
    }
    // '^'
    if (b === 0) return 1;
    if (a === 0) return 0;
    if (a === 1) return 1;
    if (b === 1) return a;
    return ['^', a, b];
  }

  // --------------------------------------------------------------------------
  //  有限性判断（表达式是否仅由自然数构成，不含ω/ε/ζ/η）
  // --------------------------------------------------------------------------
  function isFinite(e) {
    if (typeof e === 'number') return true;
    if (e === 'w') return false;
    const op = e[0];
    if (op === 'e' || op === 'z' || op === 'h') return false;
    return isFinite(e[1]) && isFinite(e[2]);
  }

  // --------------------------------------------------------------------------
  //  极限/后继判断（新规）
  // --------------------------------------------------------------------------
  function isLimit(e) {
    e = cleanup(e);
    if (typeof e === 'number') return false;
    if (e === 'w') return true;
    const op = e[0];
    if (op === 'e' || op === 'z' || op === 'h') return true;
    if (op === '+') return isLimit(e[2]);
    if (op === '*') return isLimit(e[1]) || isLimit(e[2]);
    if (op === '^') {
      const b = e[2];
      return !( isFinite(b) && !isLimit(e[1]) );
    }
    return false;
  }

  function semiable(e) {
    if (isLimit(e)) return false;
    try {
      dec(e);
      return true;
    } catch (_) {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  //  前驱函数 dec(α) = α-1  (α 为后继序数)
  // --------------------------------------------------------------------------
  function dec(e) {
    e = cleanup(e);
    if (typeof e === 'number') {
      if (e <= 0) throw new Error('0 无法减一');
      return e - 1;
    }
    const op = e[0];
    if (op === '+') {
      return cleanup(['+', e[1], dec(e[2])]);
    }
    if (op === '*') {
      const a = e[1], b = e[2];
      const bdec = dec(b);
      const adec = dec(a);
      if (bdec === 0) {
        return adec;
      } else {
        return cleanup(['+', cleanup(['*', a, bdec]), adec]);
      }
    }
    if (op === '^') {
      const a = e[1], b = e[2];
      // ★ 修正点：b 可能是有限表达式树，必须用 dec(b) 得到前驱
      const bdec = dec(b);
      const powPart = cleanup(['^', a, bdec]);
      const mulPart = cleanup(['*', powPart, a]);
      return dec(mulPart);
    }
    throw new Error('非后继表达式');
  }

  // --------------------------------------------------------------------------
  //  塔构造
  // --------------------------------------------------------------------------
  function towerW(h) {
    if (h <= 0) return 1;
    let t = 'w';
    for (let i = 1; i < h; i++) t = ['^', 'w', t];
    return t;
  }
  function towerEfromPred(pred, n) {
    if (n === 0) return cleanup(['+', ['e', pred], 1]);
    let t = cleanup(['+', ['e', pred], 1]);
    for (let i = 0; i < n; i++) t = ['^', 'w', t];
    return t;
  }
  function towerZfromPred(pred, n) {
    if (n === 0) return cleanup(['+', ['z', pred], 1]);
    let t = cleanup(['+', ['z', pred], 1]);
    for (let i = 0; i < n; i++) t = ['e', t];
    return t;
  }
  function towerHfromPred(pred, n) {
    if (n === 0) return cleanup(['+', ['h', pred], 1]);
    let t = cleanup(['+', ['h', pred], 1]);
    for (let i = 0; i < n; i++) t = ['z', t];
    return t;
  }
  function towerZ0(n) {
    if (n <= 0) return 0;
    let t = 0;
    for (let i = 0; i < n; i++) t = ['e', t];
    return t;
  }
  function towerH0(n) {
    if (n <= 0) return 0;
    let t = 0;
    for (let i = 0; i < n; i++) t = ['z', t];
    return t;
  }

  // --------------------------------------------------------------------------
  //  基本序列 FS（新规）
  // --------------------------------------------------------------------------
  function FS(e, n) {
    if (typeof n !== 'number' || !(n >= 0)) n = 0;
    e = cleanup(e);
    if (!isLimit(e)) {
      return dec(e);
    }
    if (e === 'w') return n;
    const op = e[0];
    if (op === '+') {
      return cleanup(['+', e[1], FS(e[2], n)]);
    }
    if (op === '*') {
      const a = e[1], b = e[2];
      if (isLimit(b)) {
        return cleanup(['*', a, FS(b, n)]);
      } else {
        return cleanup(['+', cleanup(['*', a, dec(b)]), FS(a, n)]);
      }
    }
    if (op === '^') {
      const a = e[1], b = e[2];
      if (isLimit(b)) {
        return cleanup(['^', a, FS(b, n)]);
      } else {
        const inner = cleanup(['^', a, dec(b)]);
        return FS(cleanup(['*', inner, a]), n);
      }
    }
    if (op === 'e') {
      const a = e[1];
      if (isLimit(a)) {
        return ['e', FS(a, n)];
      } else {
        if (a === 0) {
          return towerW(n);
        } else {
          const pred = dec(a);
          return towerEfromPred(pred, n);
        }
      }
    }
    if (op === 'z') {
      const a = e[1];
      if (isLimit(a)) {
        return ['z', FS(a, n)];
      } else {
        if (a === 0) {
          return towerZ0(n);
        } else {
          const pred = dec(a);
          return towerZfromPred(pred, n);
        }
      }
    }
    if (op === 'h') {
      const a = e[1];
      if (isLimit(a)) {
        return ['h', FS(a, n)];
      } else {
        if (a === 0) {
          return towerH0(n);
        } else {
          const pred = dec(a);
          return towerHfromPred(pred, n);
        }
      }
    }
    throw new Error(`暂不支持展开: ${JSON.stringify(e)}`);
  }

  // --------------------------------------------------------------------------
  //  注册
  // --------------------------------------------------------------------------
  register.push({
    id: 'cnf',
    name: 'Cantor normal form',
    display,
    able: isLimit,
    semiable,
    compare,
    FS,
    init: () => ([
      { expr: ['e', 0], low: [0], subitems: [] },
    ]),
    parse,
    debug: { parse, display },
  });
})();