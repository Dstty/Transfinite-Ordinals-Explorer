// ============================================================================
//  core/importer.js — 分析导入（xlsx / csv → 还原成一棵可再展开的树）
// ============================================================================
//  与 ui/exportUtils.js 的 downloadTreeAsCSV / downloadTreeAsXLSX 对称：
//  导出的每一行是 [展示文本, 注释]，导入时把「展示文本」用记号自带的 parse（或
//  NOTATION_META.parse）解析回表达式，然后按 compare 递减排成一棵新树放进输出流。
//
//  限制（与 README 一致）：只有「能解析回表达式」的记号可 round-trip ——
//  register.js 里配了 parse 的序列类（PS）与矩阵类（PM）记号（各自自带 parse 的
//  如 PrSS 也支持）；其余记号（OCF/DEN/TON/MN/aSAN 等只支持 limit 建树）导入时
//  报「暂不支持导入」，并把对应表达式列出，不清不丢。
//
//  分支说明：导出是「先序平铺」，文件里没有父子/兄弟边界信息，因此精确还原原始
//  分支结构在数据上是不可行的。这里还原成「一棵按表达式递减平铺、每个节点都可
//  继续展开」的树：所有表达式与注释全部保留，节点 subitems 在需要时由展开引擎生成。
// ============================================================================

import { deepEqual } from './engine.js';

// ----------------------------------------------------------------------------
//  xlsx 读取（按需动态加载，保持零构建｜不引入打包依赖）
//   读库来自 esm.sh 的 read-excel-file browser 构建；失败时 user 可改用 CSV。
// ----------------------------------------------------------------------------
let xlsxReaderPromise = null;
function loadXlsxReader() {
  if (!xlsxReaderPromise) {
    xlsxReaderPromise = import('https://esm.sh/read-excel-file@9/browser')
      .then((mod) => mod.default)
      .catch((err) => {
        xlsxReaderPromise = null; // 允许再次尝试
        throw new Error(`加载 xlsx 读取库失败（需要联网）: ${err && err.message ? err.message : err}`);
      });
  }
  return xlsxReaderPromise;
}

// ----------------------------------------------------------------------------
//  纯 JS 的 CSV 解析（兜底：与现有 save(csv) 互通，不依赖任何库）
//  支持引号包裹字段（含逗号/换行）与 "" 转义。
// ----------------------------------------------------------------------------
function parseCsvText(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.length > 1 || row[0] !== '') rows.push(row); // 跳过纯空行
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // "" 转义
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushRow();
    } else if (c === '\r') {
      // 忽略 \r（配合 \n）
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows;
}

/**
 * 读取导入文件为「行数组」。
 * 每个元素是 { exprText, note }；多余列并入 note（便于读回 ner 风格的多列分析）。
 * @param {string} fileName 文件名（用于识别扩展名）
 * @param {string|ArrayBuffer} data 文本（csv）或 ArrayBuffer（xlsx）
 */
export async function parseImportFile(fileName, data) {
  const lower = fileName.toLowerCase();
  const isXlsx = lower.endsWith('.xlsx') || lower.endsWith('.xls');
  let rows;
  if (isXlsx) {
    const readXlsxFile = await loadXlsxReader();
    const buffer = data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer();
    rows = await readXlsxFile(buffer);
  } else {
    const text = typeof data === 'string' ? data : new TextDecoder('utf-8').decode(data);
    rows = parseCsvText(text);
  }

  const entries = [];
  for (const values of rows) {
    if (!values || values.length === 0) continue;
    const exprText = values[0];
    if (exprText === undefined || exprText === null || String(exprText).trim() === '') continue;
    const noteParts = values.slice(1).map((v) => (v === null || v === undefined ? '' : String(v).trim()));
    // 修剪尾部空分析列（读回时 Excel 补齐最大列宽）
    while (noteParts.length > 0 && noteParts[noteParts.length - 1] === '') noteParts.pop();
    entries.push({ exprText: String(exprText).trim(), note: noteParts.join('\n').trim() });
  }
  return entries;
}

function getParser(notation, meta) {
  if (typeof notation.parse === 'function') return notation.parse;
  if (meta && typeof meta.parse === 'function') return meta.parse;
  return null;
}

/**
 * 把解析过的条目重建为一棵可再展开的树（递减平铺，保留注释）。
 * @param {object} notation 记号对象
 * @param {Array<{expr:*, note?:string}>} entries 已解析条目
 * @param {*} minLow 每个节点的初始下界（取自记号 init() 第一个示例的 low[0]）
 * @returns {Array} 根列表（远古版树）
 */
export function rebuildTreeFromEntries(notation, entries, minLow) {
  // 去重（同一表达式只保留一条；后出现的 note 覆盖）
  const seen = [];
  const unique = [];
  for (const e of entries) {
    if (seen.some((s) => deepEqual(s, e.expr))) continue;
    seen.push(e.expr);
    unique.push(e);
  }

  const lowRef = minLow !== undefined ? [deepCloneLow(minLow)] : [[]];
  const sorted = unique
    .slice()
    .sort((a, b) => notation.compare(b.expr, a.expr)); // 递减：大在前

  return sorted.map((e) => {
    const node = { expr: e.expr, low: deepCloneLow(lowRef), subitems: [] };
    if (e.note && e.note.trim()) node.note = e.note.trim();
    return node;
  });
}

function deepCloneLow(v) {
  if (v === null || v === undefined) return [[]];
  if (Array.isArray(v)) return v.map(deepCloneLow);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deepCloneLow(v[k]);
    return out;
  }
  return v;
}

/**
 * 导入主流程：把 parseImportFile 的行 + 记号解析成树。
 * @param {object} notation 记号（含 parse）
 * @param {object|undefined} meta 该记号的 NOTATION_META（内含 parse）
 * @param {Array<{exprText:string,note?:string}>} rows
 * @returns {{rootList?:Array, error?:string, unsupported?:Array<string>, count:number}}
 */
export function buildImportTree(notation, meta, rows) {
  const count = rows.length;
  const unsupported = [];
  const entries = [];

  for (const row of rows) {
    const parser = getParser(notation, meta);
    let expr;
    try {
      if (!parser) throw new Error('该记号不支持从展示文本解析回表达式');
      expr = parser(row.exprText);
    } catch (e) {
      unsupported.push(row.exprText);
      continue;
    }
    entries.push({ expr, note: row.note });
  }

  if (entries.length === 0) {
    return { error: '没有可导入的表达式（可能记号不支持解析，或文件为空）', unsupported, count };
  }

  // 取记号最小下界：init() 第一个示例的 low[0]
  let minLow = [];
  try {
    const samples = notation.init();
    if (samples && samples[0] && samples[0].low && samples[0].low[0] !== undefined) {
      minLow = samples[0].low[0];
    }
  } catch {
    minLow = [];
  }

  const rootList = rebuildTreeFromEntries(notation, entries, minLow);
  return { rootList, unsupported, count: entries.length };
}
