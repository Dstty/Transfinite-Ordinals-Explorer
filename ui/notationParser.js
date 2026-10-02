// ============================================================================
//  ui/notationParser.js — 「记号名 表达式」输入解析
// ============================================================================
//  语法：
//    limit(...) | limit ...   → 用该记号的 init() 示例建树
//    记号名 表达式             → 记号名匹配（id/name/alias，最长匹配）
//    表达式（无记号名）        → 根据格式自动推断：
//                                纯数字+逗号           → ω-Y (omega-y)
//                                括号包裹的数字序列      → BMS (bm4)
//                                含 w/e/z/h 的表达式     → CNF (cnf)
//  表达式本身由各记号的 parse 解析（记号自带 parse > NOTATION_META.parse），
//  通用解析器见 core/parseShorthands.js。
// ============================================================================
import { buildNameMap, getNotation } from '../core/ne/uiBridge.js';
import { resolveFamilyInput } from '../core/register.js';
import { resolve_ne_family_input } from '../core/ne/familyInput.js';
import { on_registry_change } from '../core/ne/registry.js';

// 预构建 小写输入 → 记号 id 映射；所有候选输入名（最长匹配用），无括号优先。
// ⚠ 必须**惰性重建**：/notation 命令会在运行期往 ne 注册表里加自定义记号，
// 若在模块求值时就把表定死，新记号的名字就永远匹配不到。
let _nameMap = null;
let _candidates = null;
function name_index() {
  if (!_nameMap) {
    _nameMap = buildNameMap();
    _candidates = Array.from(_nameMap.keys());
  }
  return { map: _nameMap, candidates: _candidates };
}
on_registry_change(() => {
  _nameMap = null;
  _candidates = null;
});

// ---------------------------------------------------------------------------
//  veblen-φ 的免记号名识别与字母归一化
// ---------------------------------------------------------------------------
//  用户输入习惯：
//    v(1,0)              → φ(1,0)            （字母 v 当 φ）
//    phi(1,0) / phi (1,0) → φ(1,0)           （phi 是别名）
//    veblen (1,0)         → φ(1,0)           （veblen 也是别名）
//    φ(φ(1,0,0),1)        → 原样              （φ 本来就行）
//    v(v(1,0,0),1)        → φ(φ(1,0,0),1)
//  这样它们和 bms 一样不需要写记号名。
//
//  判据刻意收紧，避免误伤：必须以 v/phi/veblen/φ 开头并紧跟 "("，
//  且整体只由这些字母、数字、逗号、括号、空白组成。
/**
 * @param {string} text 已把 ω→w、全角逗号→半角的输入（保留空格）
 * @returns {string|null} 归一化成 φ(...) 的式子；不像 veblen 就返回 null
 */
function normalizeVeblen(text) {
  if (!/^(?:v|phi|veblen|φ)\s*\(/i.test(text)) return null;
  if (!/^[vphiblenφ0-9,()\s]+$/i.test(text)) return null;
  const folded = text
    .replace(/veblen/gi, 'φ')
    .replace(/phi/gi, 'φ')
    // 只有「处在式子开头或逗号/左括号之后、并且后面紧跟 (」的 v 才当 φ
    .replace(/(^|[,(]\s*)v(?=\s*\()/gi, (m, pre) => pre + 'φ');
  if (!/^[φ0-9,()\s]+$/.test(folded.replace(/\s+/g, ' '))) return null;
  return folded.replace(/\s+/g, '');
}

/**
 * 根据输入格式自动推断记号
 * @param {string} normalized 标准化后的输入（已去空格、全角转半角）
 * @returns {{ notationId: string, notationName: string } | null}
 */
function inferNotationByFormat(normalized) {
  // 1. 纯数字+逗号（如 1,3,4,2,5,8）→ ω-Y
  if (/^(\d+,)+\d+$/.test(normalized)) {
    return { notationId: 'omega-y', notationName: 'ω-Y sequence' };
  }

  // 2. 括号包裹的数字序列（如 ()(1,1,1)(2,1) 或 (0)(1,1)）→ BMS
  //    可选的前导空括号 ()，然后是一个或多个括号组
  if (/^(?:\((?:\d+(?:,\d+)*)?\))+$/.test(normalized)) {
    return { notationId: 'bm4', notationName: 'BMS (BM4)' };
  }

  // 3. CNF：先把英文单词别名（omega/epsilon/zeta/eta）替换成符号，
  //    再判定——输入只含数字、w/e/z/h、+、*、^、_、括号（含 {}），
  //    且确实含 w/e/z/h，才算 CNF。
  //    含其他字符（如 phi、den 的 d 等不属于上述单词/符号集的字母）→ 不判为 CNF。
  const cnfWord = normalized
    .replace(/epsilon/gi, 'e')
    .replace(/omega/gi, 'w')
    .replace(/zeta/gi, 'z')
    .replace(/eta/gi, 'h');
  if (/[wezh]/i.test(cnfWord) && /^[0-9wezh\+\*\^_(){}]+$/i.test(cnfWord)) {
    return { notationId: 'cnf', notationName: 'Cantor normal form' };
  }

  return null;
}

/**
 * 解析完整输入。
 * @param {string} input 用户原始输入
 * @returns {{ notationId: string, notationName: string, kind: 'limit'|'expr', expr?: string }}
 */
export function parseNotation(input) {
  let trimmed = input.trim();

  // ---------- 第一步：处理 "limit" 前缀 ----------
  const limitParen = trimmed.match(/^limit\s*\((.+)\)\s*$/i);
  if (limitParen) {
    trimmed = limitParen[1].trim();
  } else {
    const limitSpace = trimmed.match(/^limit\s+(.+)/i);
    if (limitSpace) trimmed = limitSpace[1].trim();
  }
  if (trimmed === '') throw new Error('limit 关键字后缺少表达式');

  // ---------- 第二步：全角 ω → 半角 w；去空白（名称匹配不区分大小写/空格，
  //            所以 "NOCF (EBO)" 与 "nocf(ebo)" 是同一个输入） ----------
  const normalized = trimmed.replace(/ω/g, 'w').replace(/，/g, ',').replace(/\s+/g, '');
  const lower = normalized.toLowerCase();

  // ---------- 第 2.6 步：veblen-φ（免记号名 + 字母 v 归一化）----------
  // 放在记号名匹配之前：'phi (1,0)' 这种写法会被这里接住，统一成 φ(1,0)，
  // 避免走「剥掉记号名」那条路（那条路会把 phi 剥掉，而 φ 的 parse 需要完整的 φ(...)）。
  const veblenExpr = normalizeVeblen(trimmed.replace(/ω/g, 'w').replace(/，/g, ','));
  if (veblenExpr) {
    return {
      notationId: 'veblen-phi',
      notationName: "Extended Veblen's φ Function",
      kind: 'expr',
      expr: veblenExpr,
    };
  }

  // ---------- 第 2.5 步：家族输入（带 n 可调，如 30MN / upms50 / -1y-30ss）----------
  // 优先于普通匹配：避免 -1y 之类的记号把 "-1y-30ss" 前缀吃掉；且保证
  // "30-mn" 与已静态注册的 "3-mn" 走同一条路径（家族 ensure 幂等）。
  // 两个来源按序尝试：
  //   ① 远古家族表（window.NOTATION_FAMILIES，notation/rewritten/ 各文件自注册，
  //      上限 100，超出会抛「n 最大支持 100」）；
  //   ② ne 原生 generator 分类（core/ne/familyInput.js，按注册表当前档位逐档水合）。
  // 远古优先是刻意的：?legacy=1 时同一个 id 要落到远古版本，
  // 若先走 ne 生成，远古注册表里就没有该 id，getNotation 会静默取到 ne 版本。
  // （默认模式下两者产出的 id 相同，谁先都落到同一处，故不影响默认行为。）
  const fam = resolveFamilyInput(lower) || resolve_ne_family_input(lower);
  if (fam) {
    const famRest = fam.rest;
    if (famRest === '' || /^(\(limit\)|limit)$/i.test(famRest)) {
      return { notationId: fam.notationId, notationName: fam.notationName, kind: 'limit' };
    }
    return { notationId: fam.notationId, notationName: fam.notationName, kind: 'expr', expr: famRest };
  }

  // ---------- 第三步：匹配记号名（id / name / alias，最长匹配） ----------
  // 纯最长匹配：候选里谁前缀最长谁赢，保证 "NOCF(EBO)" 整体匹配而不是只吃掉 "NOCF"
  const { map: nameMap, candidates } = name_index();
  // 保留空格的原始形态，用来判断「记号名后面紧跟的是什么」。
  // 必要性：w 是 omega 的别名，但 w^w 是 CNF 写法 —— 若允许前缀匹配，
  // w^w 会被切成「记号 w + 表达式 ^w」，然后 omega 的 parse 拿到 ^w 抛错。
  // 规则：记号名后面必须是 结尾 / 空白 / 左括号，才算「真的是记号名」。
  const rawLower = trimmed.replace(/ω/g, 'w').replace(/，/g, ',').toLowerCase();
  const boundaryOk = (name) => {
    if (!rawLower.startsWith(name)) return false;
    const after = rawLower.slice(name.length);
    if (after === '') return true;
    return /^[\s(（]/.test(after);
  };
  const matched = candidates
    .filter(c => lower.startsWith(c) && boundaryOk(c))
    .sort((a, b) => b.length - a.length);

  let notationId, notationName, rest;

  if (matched.length === 0) {
    // 没匹配到记号名 → 根据格式自动推断
    const inferred = inferNotationByFormat(normalized);
    if (!inferred) {
      throw new Error('无效输入：不是已注册记号表达式。输入 /list 查看可用记号');
    }
    notationId = inferred.notationId;
    notationName = inferred.notationName;
    rest = normalized; // 整个输入都是表达式
  } else {
    notationId = nameMap.get(matched[0]);
    notationName = getNotationName(notationId);
    rest = normalized.substring(matched[0].length);
  }

  // ---- limit 格式：用 init() 示例建树 ----
  if (rest === '' || /^(\(limit\)|limit)$/i.test(rest)) {
    return { notationId, notationName, kind: 'limit' };
  }

  return { notationId, notationName, kind: 'expr', expr: rest };
}

function getNotationName(id) {
  // 走适配层：ne 原生记号不在 window.register 里，直接查旧表会退回裸 id
  const n = getNotation(id);
  return n ? n.name : id;
}