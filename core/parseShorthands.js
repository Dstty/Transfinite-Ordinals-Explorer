// ============================================================================
//  core/parseShorthands.js — 通用表达式解析器（矩阵 / 序列 / JSON / 字符串）
// ============================================================================
//  远古版记号（notation/*.js）大多只声明 display/able/FS，不声明 parse。
//  这里提供按表达式结构分类的通用解析器，在 register.js 的 NOTATION_META
//  里按记号配置；app.js 解析时：记号自带 parse > NOTATION_META.parse > 报错。
//
//  矩阵解析（BMS 等）：
//    (0,0,0)(1,1,1)(2,1)(1,1,1) → [[0,0,0],[1,1,1],[2,1,0],[1,1,1]]
//    () 表示全 0 列；(2,1) 短列自动补 0 到最长列宽；w/ω/∞ 表示无穷大
//  序列解析（PrSS 等）：
//    0,1,2 或 [0,1,2] → [0,1,2]；支持 Infinity/w/ω
// ============================================================================

/**
 * 数字解析：支持 0,1,2… 与 w/ω/∞/Infinity（→ Infinity）。
 * 无法解析时返回 undefined。
 */
function parseNumber(s) {
  if (s === '') return undefined;
  const lower = s.toLowerCase();
  if (lower === 'w' || lower === 'ω' || lower === '∞' || lower === 'infinity') return Infinity;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 矩阵简写解析（不匹配矩阵格式时返回 null，供调用方 fallback）。
 * 规则：
 *   - 每个 (...) 是一列，逗号分隔数字
 *   - () 表示全 0 列（宽度按最长列补全）
 *   - (2,1) 短列末尾自动补 0 到最长列宽
 *   - 支持 w/ω/∞/Infinity 表示无穷大
 */
export function tryParseMatrixShorthand(str) {
  const s = str.trim();
  if (s === '') return null;
  if (!/^\(\s*[^()]*\s*\)(\s*\(\s*[^()]*\s*\))*$/.test(s)) return null;
  const colRe = /\(([^()]*)\)/g;
  const cols = [];
  let m;
  while ((m = colRe.exec(s)) !== null) {
    const content = m[1].trim();
    if (content === '') { cols.push(null); continue; }
    const entries = content.split(',').map(x => parseNumber(x.trim()));
    if (entries.some(e => e === undefined)) return null;
    cols.push(entries);
  }
  if (cols.length === 0) return null;
  const widths = cols.filter(c => c !== null).map(c => c.length);
  const width = widths.length ? Math.max(...widths) : 0;
  return cols.map(c => {
    if (c === null) return new Array(width).fill(0);
    return c.concat(new Array(Math.max(0, width - c.length)).fill(0));
  });
}

/**
 * JSON 解析（支持 Infinity，JSON 原生不认）。
 */
export function tryParseJSON(str) {
  const s = str.trim();
  if (s === '') return undefined;
  const placeholder = '\u0000INF\u0000';
  const withPlaceholder = s.replace(/Infinity/g, placeholder);
  const parsed = JSON.parse(withPlaceholder);
  return reviveInfinity(parsed, placeholder);
}

function reviveInfinity(v, placeholder) {
  if (v === placeholder) return Infinity;
  if (Array.isArray(v)) return v.map(x => reviveInfinity(x, placeholder));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = reviveInfinity(v[k], placeholder);
    return out;
  }
  return v;
}

/**
 * 矩阵记号解析器：优先矩阵简写，回退 JSON（兼容 [[0,0],[1,1]]）。
 */
export function parseMatrix(str) {
  const m = tryParseMatrixShorthand(str);
  if (m !== null) return m;
  const j = tryParseJSON(str);
  if (j !== undefined) return j;
  throw new Error(`无法解析的矩阵表达式: ${str}`);
}

/**
 * 序列记号解析器：0,1,2 或 [0,1,2]；支持 w/ω/∞/Infinity。
 */
export function parseSequence(str) {
  const s = str.trim();
  if (s === '') throw new Error('缺少表达式');
  if (s.startsWith('[') || s.startsWith('{')) {
    const j = tryParseJSON(s);
    if (j !== undefined) return j;
  }
  const parts = s.split(',').map(x => x.trim());
  if (parts.some(p => p === '')) throw new Error(`序列格式错误: ${str}`);
  const nums = parts.map(parseNumber);
  if (nums.some(n => n === undefined)) throw new Error(`序列含无法解析的元素: ${str}`);
  return nums;
}

/**
 * 字符串记号解析器（cOCF/HSPN/TON 等，表达式本身就是字符串）。
 */
export function parseString(str) {
  const s = str.trim();
  if (s === '') throw new Error('缺少表达式');
  return s;
}

/**
 * 对象/嵌套结构记号解析器（OCF、BTBM、MN 类等，JSON 输入）。
 */
export function parseJSON(str) {
  const j = tryParseJSON(str);
  if (j !== undefined) return j;
  throw new Error(`表达式不是合法 JSON: ${str}`);
}
