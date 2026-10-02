// ============================================================================
//  notation/ne/CNF.js — Cantor normal form（CNF，含 ε/ζ/η 折叠函数）
// ============================================================================
//  「硬切改写」第二个（前一个：notation/ne/PrSS.js）。CNF 是**自有记号**，
//  ne-rewritten 里没有对应物，所以不是搬运，而是把远古接口实现改写成
//  ne 风格 NotationDefinition：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const + register_notation
//    display(expr) → HTML 字符串              display: { plain, html, from_display }
//    able: isLimit                            is_limit: isLimit
//    semiable: 后继半展开判定                  ——（ne 无此概念，见下）
//    parse 作为记号外挂字段                    from_display: parse
//    init() → [{expr, low, subitems}]         init() → [表达式, ...]
//    无分类                                    category_id: 'category-bss'
//
//  算法本体（tokenize / parse / fmt / display / cnfNat..norm / compare /
//  cleanup / isFinite / isLimit / dec / 各 tower* / FS / debug）**逐行照搬**，
//  一个字未改；只换外层接口与包法（IIFE → ESM 模块）。
//
//  三条必须知道的语义变化：
//
//   1. **display**。远古 display 返回的就是 HTML（`ω`、`<sup>`、`·`、
//      `ε<sub>n</sub>`）；ne 的 display 规格拆成 { plain, html, latex,
//      from_display }。这里 plain 与 html 指向**同一个函数**，与
//      core/ne/legacyAdapter.js 的处理完全一致（适配层即 `{ plain: display,
//      html: display }`，且明确注释「与旧行为完全一致，不引入额外的标签剥离」）。
//      没有加 stripHtml：那会改变现有显示。latex 未给，由 resolve_display
//      从 html 转出（html_to_latex 已认 ω 与 <sup>/<sub>）。
//
//   2. **semiable 不移植**。CNF 的 semiable(e) = 「非 limit 且 dec(e) 不抛」。
//      ne 的 expand_single 对非 limit 节点一律算 `FS(expr, 0)` 并要求结果**严格
//      小于**自身，而 CNF 的 FS 在非 limit 分支上恰好就是 `dec(e)`：
//      凡 semiable(e) 为真者，ne 侧的可展开判定与旧引擎逐条同值
//      （实证见 .tmp-ne/verify-cnf-hardcut.mjs 第 6 节：真实树上的可展开性对照，
//      以及第 6b 节 400 个随机表达式上除 0 族外 FS 零差异）。
//      因此该字段被引擎既有分支完整吸收，**无需移植**，也不存在被丢弃的语义。
//      （唯一边界是 e === 0：旧引擎靠 able||semiable 短路从不把 0 交给 dec，
//      ne 却必然探测它 → 由第 4 条的那一行保护行兜住。）
//
//   3. **low 边界退役**。旧 init 给的是 `{ expr: ['e',0], low: [0], subitems: [] }`；
//      那个 `low: [0]` 是记号的私存下界，**不是**树节点（旧树上根本不出现 0）。
//      ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound），于是同一个
//      0 变成 1 的显式子节点。旧版把展开出的新项作为**兄弟**插进根列表，ne 把它
//      作为**子节点**挂下去——树形不同，但能展开出的序数相同。
//
//  4. **FS 顶部新增一行 `if (e === 0) return e;`**——这是唯一的算法函数改动，
//      属接口契约层（不是数学层）。原因：ne 的 expand_single 对**非 limit 节点
//      一律**先算 `FS(expr, 0)` 试探，而远古引擎只对 `able || semiable` 的节点调
//      FS（core/engine.js expandTier 的 `if (!(ableHit || semiableHit)) return;`，
//      且 canExpandNode 对 0 也直接 false），所以 0 从未被递到 dec 上，dec(0)
//      的「0 无法减一」在远古行为里不可观测。ne 侧 0 是真节点（见第 3 条），
//      必然被探测 → tier 展开抛错。
//      返回自身 = 「不可展开」（引擎随后 `compare(res, expr) >= 0` → 视作不可展开），
//      与远古行为一致；legacyAdapter 的 make_legacy_FS 对不可展开输入同样返回自身。
//      实证（探针打印的调用序列）：init=['e',0] 做 tier=1 展开时，
//      FS(['e',0], 0) → 1 生成子节点 1；引擎随即对 1 再做一次 expand_single，
//      is_limit(1)=false → FS(1,0) 内部先 dec(0) 抛错。更进一步，只要 0 作为
//      节点留在树上（它正是 1 的基本列后继），后续任何一次展开都会递到 FS(0,0)。
//      详见 .tmp-ne/verify-cnf-hardcut.mjs 第 4/6 节（含去掉该行即失败的反证）。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';

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

// 远古 semiable(e)：非 limit 且 dec(e) 可算（即「后继半展开」判定）。
// ne 不移植此字段：expand_single 对非 limit 节点直接算 FS(e, 0)（=== dec(e)）
// 并要求严格小于自身，语义已由引擎既有分支吸收。保留原实现仅作对照注释：
//
//   function semiable(e) {
//     if (isLimit(e)) return false;
//     try { dec(e); return true; } catch (_) { return false; }
//   }
//
// （不等价的角落见文件头第 2 条。）

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
  // ★ 硬切新增的唯一一行（接口层，非算法层）：零元的最小元探测。
  // ne 的 expand_single 对**非 limit 节点一律**先算 `FS(expr, 0)` 试探，而远古
  // 引擎只对 `able || semiable` 的节点调用 FS（core/engine.js expandTier 的
  // `if (!(ableHit || semiableHit)) return;`），所以 0 从来没被递到 dec 上。
  // 0 之下没有任何更小序数，dec(0) 抛错，树里出现 0 节点时 ne 侧必然冒泡。
  // 返回自身即「不可展开」（引擎随后 compare(res, expr) === 0 → 视为不可展开），
  // 与远古行为一致；legacyAdapter 的 make_legacy_FS 对不可展开输入也是返回自身。
  if (e === 0) return e;
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
export const CNF = {
  id: 'cnf',
  name: 'Cantor normal form',
  category_id: 'category-bss',
  // 远古 display 返回的就是 HTML；适配层用同一函数填 plain/html，
  // 这里保持一致（不引入 stripHtml，不改变现有显示）。
  display: { plain: display, html: display, from_display: parse },
  is_limit: isLimit,
  compare,
  FS,
  init: () => [['e', 0]],
  // 旧版把 parse/display 旁挂在记号上供调试；ne 原版无 debug 字段，
  // 这里保留以免旧侧调试入口消失（引擎不读 debug）。
  debug: { parse, display },
};

register_notation(CNF);
