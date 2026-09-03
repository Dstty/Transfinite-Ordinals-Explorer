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
import { buildNameMap, resolveFamilyInput } from '../core/register.js';

// 预构建 小写输入 → 记号 id 映射
const nameMap = buildNameMap();

// 所有候选输入名（用于最长匹配），无括号优先
const candidates = Array.from(nameMap.keys());

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
  if (/^(?:\(\))?(?:\(\d+(?:,\d+)*\))+$/.test(normalized)) {
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

  // ---------- 第 2.5 步：家族输入（带 n 可调，如 30MN / upms50 / -1y-30ss）----------
  // 优先于普通匹配：避免 -1y 之类的记号把 "-1y-30ss" 前缀吃掉；且保证
  // "30-mn" 与已静态注册的 "3-mn" 走同一条路径（家族 ensure 幂等）。
  const fam = resolveFamilyInput(lower);
  if (fam) {
    const famRest = fam.rest;
    if (famRest === '' || /^(\(limit\)|limit)$/i.test(famRest)) {
      return { notationId: fam.notationId, notationName: fam.notationName, kind: 'limit' };
    }
    return { notationId: fam.notationId, notationName: fam.notationName, kind: 'expr', expr: famRest };
  }

  // ---------- 第三步：匹配记号名（id / name / alias，最长匹配） ----------
  // 纯最长匹配：候选里谁前缀最长谁赢，保证 "NOCF(EBO)" 整体匹配而不是只吃掉 "NOCF"
  const matched = candidates
    .filter(c => lower.startsWith(c))
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
  const n = (window.register || []).find(x => x.id === id);
  return n ? n.name : id;
}