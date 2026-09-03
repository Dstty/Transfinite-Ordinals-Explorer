// ============================================================================
//  ui/completion.js — 命令补全（含灰色说明）
// ============================================================================
//  输入时给出一组候选下拉：**命令词 + 记号名**。每个候选行的右侧用灰字说明
//  它是做什么的（命令 = 用法 + 说明；记号 = 全名）。Tab/点击填入，↑↓ 选择。
//  约定：命令可带 / 前缀（help == /help）；裸输入是 tree 的缩写。
//  本模块只做「计算」，不碰 React / DOM；对输入的全部推导都判定为只读、幂等。
// ============================================================================

import { buildNameMap, getNotation } from '../core/register.js';
import { parseNotation } from './notationParser.js';

// ----------------------------------------------------------------------------
//  命令目录（结构化）：用法 / 说明 —— 供补全与灰字说明共用
// ----------------------------------------------------------------------------
export const COMMANDS = [
  { name: 'tree',    usage: 'tree <记号名> <表达式>',    desc: '建树：用记号展开表达式（裸输入等价）' },
  { name: 'draw',    usage: 'draw <Y序列> [DBMS|DBMS\'|ADBMS]', desc: '画图：Y 序列山脉图或 IBLP 图案' },
  { name: 'list',    usage: 'list',                      desc: '按分类列出全部记号' },
  { name: 'convert', usage: 'convert <源> <表达式> to <目标>', desc: '记号互译' },
  { name: 'save',    usage: 'save [csv|xlsx] [n] [True|False]', desc: '导出当前树为 csv/xlsx' },
  { name: 'import',  usage: 'import [记号名]',           desc: '导入 xlsx/csv 还原成一棵树' },
  { name: 'set',     usage: 'set <key>=<value>',         desc: '设置（theme/font/default/additional/tier）' },
  { name: 'clear',   usage: 'clear',                     desc: '清空屏幕' },
  { name: 'help',    usage: 'help',                      desc: '显示帮助' },
];

// 补全条数上限
const MAX_COMMAND_SUGGESTIONS = 9;   // 每个 / 命令词的候选上限
const MAX_MIXED_SUGGESTIONS = 12;    // 首词同时匹配命令+记号的候选上限
const MAX_NOTATION_SUGGESTIONS = 10; // 记号候选上限
// 最后一个参数（可能）是记号名的命令：它们接受「记号名」做参数，补全时给出记号候选；
// 其余命令（save/set/draw/list/clear/help）的参数不是记号名，不做记号补全。
const NOTATION_ARG_COMMANDS = new Set(['tree', 'limit', 'import', 'convert']);

// —— 参数命令的固定选项（用于 save/set/draw 加空格后的候选）——
const SAVE_OPTIONS = ['csv', 'xlsx', 'true', 'false'];
const SAVE_OPTION_HINT = {
  csv: '导出为 CSV',
  xlsx: '导出为 xlsx',
  true: '连无注释的行一起导出',
  false: '只导出有注释的行（默认）',
};
const SET_KEYS = ['theme', 'font', 'default', 'additional', 'tier'];
const SET_KEY_HINT = {
  theme: '主题：dark/light/paper/solarizeddark/solarizedlight',
  font: '字体大小 10-28（默认 16）',
  default: '初始展开层数（默认 2）',
  additional: '「加载更多」额外项数（默认 1）',
  tier: '展开层级 0-9（默认 1）',
};
const SET_KEY_VALUES = {
  theme: ['dark', 'light', 'paper', 'solarizeddark', 'solarizedlight'],
};
const DRAW_OPTIONS = ['iblp'];

/** 命令词 → 补全候选（label/insert/hint）。withSlash 控制展示是否带前导 /。 */
function commandSuggestion(c, withSlash) {
  return {
    type: 'command',
    label: withSlash ? '/' + c.name : c.name,
    insert: (withSlash ? '/' : '') + c.name + ' ',
    hint: `${c.usage} — ${c.desc}`,
  };
}

/** 通过 buildNameMap 的 key 前缀匹配记号名；返回 { key, id, name } 列表（按相关性排序）。 */
function matchNotations(tokenLower) {
  if (!tokenLower) return [];
  const map = buildNameMap();
  const seen = new Set();
  const out = [];
  for (const key of map.keys()) {
    const normKey = key.toLowerCase().replace(/\s+/g, '');
    if (normKey.startsWith(tokenLower) && normKey !== tokenLower) {
      const id = map.get(key);
      if (seen.has(id)) continue;
      seen.add(id);
      const nt = getNotation(id);
      out.push({ key, id, name: nt ? nt.name : id });
    }
  }
  // 先按「与输入更接近」（key 更短 → 更相关），再按字母序，保证候选稳定易懂
  out.sort((a, b) => (a.key.length - b.key.length) || a.key.localeCompare(b.key));
  return out.slice(0, MAX_NOTATION_SUGGESTIONS);
}

/**
 * 为「最后一个待补全词」生成记号补全候选。
 * @param {string} token 当前正在输入（待补全）的词
 * @param {string} prefix 已输入好的前文（如 "tree"），补全时原样保留
 */
function notationSuggestions(token, prefix) {
  const lower = token.toLowerCase().trim();
  if (!lower) return [];
  return matchNotations(lower).map(({ id, name }) => ({
    type: 'notation',
    label: id,
    insert: (prefix ? prefix + ' ' : '') + id + ' ',
    hint: name,
  }));
}

// 记号名参数命令（tree/limit/import/convert）在「命令+空格但尚未输入记号」时给一小组常用记号
const DEFAULT_NOTATION_IDS = ['prss', 'pps', 'sps', 'dfss', 'bm4', '0y', 'den', 'den2', 'cnf', 'omega-y', 'ton-m', 'tbm'];

/** 为「记号名参数位置但还没输入」提供一组常用记号候选，避免打了空格却一无所有。 */
function defaultNotationSuggestions(prefix) {
  const map = buildNameMap();
  const seen = new Set();
  const out = [];
  for (const id of DEFAULT_NOTATION_IDS) {
    const key = map.has(id) ? id : (Array.from(map.keys()).find((k) => map.get(k) === id));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const nt = getNotation(id);
    out.push({ type: 'notation', label: key, insert: (prefix ? prefix + ' ' : '') + key + ' ', hint: nt ? nt.name : id });
  }
  return out;
}

/** 对「已完成、可自动解析」的输入给出识别结果候选（如 1,2,5→ω-Y、(0)(1,1)→BMS、w^w→CNF）。 */
function parseInfoSuggestion(trimmed) {
  try {
    const p = parseNotation(trimmed);
    const action = p.kind === 'limit'
      ? `用 ${p.notationName} 的内置示例建树`
      : `用 ${p.notationName} 展开 ${p.expr}`;
    return [{ type: 'info', label: p.notationId, insert: trimmed, hint: `自动识别：${action}（回车建树）` }];
  } catch (e) {
    return [];
  }
}

/** 同时匹配命令 + 记号的一个词（用于「首词」补全，含完整命令与潜在的同名记号）。 */
function completeToken(token, prefix) {
  const lower = token.toLowerCase().trim();
  if (!lower) return [];
  const commandSugs = COMMANDS
    .filter((c) => c.name.startsWith(lower)) // 含完整命令，如 "save" 自身
    .map((c) => ({ ...commandSuggestion(c, false), insert: (prefix ? prefix + ' ' : '') + c.name + ' ' }));
  const notationSugs = notationSuggestions(token, prefix);
  return commandSugs.concat(notationSugs).slice(0, MAX_MIXED_SUGGESTIONS);
}

/**
 * 为「固定参数」的命令（save/set/draw）生成**位置感知**候选。
 * restTokens：命令之后的全部 token（含当前正在输入的部分词）。
 * rawInput：输入框当前值，用于拼出正确的 insert（补全末尾词 或 追加下一参数）。
 * 规则：末尾是「完整参数／空」→ 追加下一个可用参数；末尾是「部分词」→ 用它补全。
 */
function argSuggestions(cmdName, restTokens, rawInput) {
  const trailingSpace = /\s$/.test(rawInput);
  const lastTok = restTokens.length > 0 ? restTokens[restTokens.length - 1] : '';
  const lastLower = lastTok.toLowerCase().trim();
  const hasCurrent = lastTok !== '' && !trailingSpace;
  const beforeLast = hasCurrent ? rawInput.slice(0, rawInput.lastIndexOf(lastTok)) : rawInput;
  const appendBase = rawInput + (trailingSpace ? '' : ' ');

  let mode, candidates;

  if (cmdName === 'save') {
    // 格式、标志各选一；数字 n 树号任意。末尾是部分词 → 用它补全；否则追加下一个可用参数。
    let used = restTokens.map((t) => t.toLowerCase());
    const isPartial = hasCurrent && !SAVE_OPTIONS.includes(lastLower) && !/^\d+$/.test(lastLower);
    mode = isPartial ? 'replace' : 'append';
    if (isPartial) used = used.slice(0, -1);
    const hasFormat = used.some((t) => t === 'csv' || t === 'xlsx');
    const hasFlag = used.some((t) => t === 'true' || t === 'false');
    candidates = [];
    for (const o of SAVE_OPTIONS) {
      if ((o === 'csv' || o === 'xlsx') && hasFormat) continue;
      if ((o === 'true' || o === 'false') && hasFlag) continue;
      if (!used.includes(o)) candidates.push({ token: o, hint: SAVE_OPTION_HINT[o] || o });
    }
    if (isPartial) candidates = candidates.filter((c) => c.token.startsWith(lastLower) && c.token !== lastLower);
  } else if (cmdName === 'set') {
    const used = restTokens.map((t) => t.toLowerCase());
    const eq = lastLower.match(/^(\w+)=(\S*)$/);
    const committedKey = used.find((k) => SET_KEYS.includes(k));
    if (eq) {
      // 正在补全 value（key=…）：替换末尾词
      mode = 'replace';
      const values = SET_KEY_VALUES[eq[1]] || [];
      candidates = values
        .filter((v) => v.startsWith(eq[2]))
        .map((v) => ({ token: eq[1] + '=' + v, hint: `设置 ${eq[1]} = ${v}` }));
    } else if (committedKey) {
      // 已选 key → 补 value（追加）
      mode = 'append';
      const values = SET_KEY_VALUES[committedKey] || [];
      candidates = values.map((v) => ({ token: v, hint: `设置 ${committedKey} = ${v}` }));
    } else {
      // 补 key
      const isPartial = hasCurrent && !SET_KEYS.includes(lastLower);
      mode = isPartial ? 'replace' : 'append';
      candidates = SET_KEYS.map((k) => ({ token: k, hint: SET_KEY_HINT[k] || `设置 ${k}` }));
      if (isPartial) candidates = candidates.filter((c) => c.token.startsWith(lastLower) && c.token !== lastLower);
    }
  } else if (cmdName === 'draw') {
    const isPartial = hasCurrent && !DRAW_OPTIONS.includes(lastLower);
    mode = isPartial ? 'replace' : 'append';
    candidates = DRAW_OPTIONS.map((o) => ({ token: o, hint: '绘制 IBLP（DEN2）图案' }));
    if (isPartial) candidates = candidates.filter((c) => c.token.startsWith(lastLower) && c.token !== lastLower);
  } else {
    return [];
  }

  return candidates.map((c) => ({
    type: 'arg',
    label: c.token,
    insert: (mode === 'replace' ? beforeLast : appendBase) + c.token + ' ',
    hint: c.hint,
  }));
}

/**
 * 解析一份输入，产出补全候选。
 * @param {string} input 输入框当前值
 * @returns {{ suggestions: Array }}
 */
export function analyzeInput(input) {
  const raw = input || '';
  const trimmed = raw.trim();
  const trailingSpace = /\s$/.test(raw);

  // —— 空输入 ——
  if (!trimmed) return { suggestions: [] };

  // —— / 命令补全：只补命令词本身 ——
  if (trimmed.startsWith('/')) {
    const q = trimmed.slice(1).toLowerCase();
    const matches = COMMANDS
      .filter((c) => q.length === 0 || (c.name.startsWith(q) && c.name !== q))
      .slice(0, MAX_COMMAND_SUGGESTIONS)
      .map((c) => commandSuggestion(c, true));
    return { suggestions: matches };
  }

  const parts = trimmed.split(/\s+/);
  const firstLower = parts[0].toLowerCase();

  // —— limit 关键字 ——
  if (firstLower === 'limit') {
    const rest = parts.slice(1);
    if (rest.length > 0) {
      const last = rest[rest.length - 1];
      return { suggestions: notationSuggestions(last, parts.slice(0, -1).join(' ')), format: 'limit <记号名>' };
    }
    return { suggestions: defaultNotationSuggestions('limit'), format: 'limit <记号名>' };
  }

  // —— 名字补全（尚无空格）：命令 + 记号名 一起候选 ——
  //  这样「save」（未定是命令还是要打 save2 这类记号）只按名字匹配，不会跳到 save 的参数。
  if (parts.length === 1 && !trailingSpace) {
    const nameSugs = completeToken(parts[0], '');
    if (nameSugs.length > 0) return { suggestions: nameSugs };
    // 名字不匹配，但可能是「可自动解析」的表达式（如 1,2,5 / (0)(1,1) / w^w）→ 给出识别结果
    return { suggestions: parseInfoSuggestion(trimmed) };
  }

  // —— 第一词已是完整命令（后面跟了空格/参数）→ 参数或记号补全 ——
  const cmd = COMMANDS.find((c) => c.name === firstLower);
  if (cmd) {
    const restTokens = parts.slice(1);
    if (NOTATION_ARG_COMMANDS.has(cmd.name)) {
      if (restTokens.length > 0) {
        const last = restTokens[restTokens.length - 1];
        return { suggestions: notationSuggestions(last, parts.slice(0, -1).join(' ')), format: cmd.usage };
      }
      return { suggestions: defaultNotationSuggestions(cmd.name), format: cmd.usage };
    }
    if (cmd.name === 'save' || cmd.name === 'set' || cmd.name === 'draw') {
      return { suggestions: argSuggestions(cmd.name, restTokens, raw), format: cmd.usage };
    }
    return { suggestions: [] };
  }

  // —— 已经是「记号 + 表达式」（或其它可解析输入）→ 给出识别结果 ——
  return { suggestions: parseInfoSuggestion(trimmed) };
}
