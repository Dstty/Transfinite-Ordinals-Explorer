// ============================================================================
//  ui/notationList.js — /list 记号的分类、显示名与列表构建
// ============================================================================
//  职责：
//    - NOTATION_CATEGORIES：文件夹式分组（id 顺序即显示顺序）
//    - 显示名映射（SIMPLE_NAMES / SHORT_OVERRIDES / SPECIAL_SHORTS）
//    - formatNotationRow：把单个记号格式化成 /list 行文本
//    - buildNotationList：全部记号按分类分组，供 FolderView 渲染
//  输出：categories = [{ name, rows: [{ text, infiniteDescending }] }]（已排好序，空分类被过滤）
// ============================================================================

import { NOTATION_META } from '../core/register.js';

// ----------------------------------------------------------------------------
//  /list 分类定义：文件夹式分组（id 顺序即显示顺序；未列出的记号归「其他」）
// ----------------------------------------------------------------------------
const NOTATION_CATEGORIES = [
  { name: 'Y 序列', ids: ['y-seq', '0y', '-1y', 't--1y', 'omega-y', 'omega-y-weak', 'omega-y-medium', 'omega-y-strong', 'x-y', 'weak-omega-y', 'omega-y-12omega', 'omega-y-1257omega', 'omega-y-skew'] },
  { name: 'Bashicu 矩阵系', ids: ['bm4', 'bhm', 'bsm', 'blm', 'cms', 'wmms', 'upms', 'dsm', 'tbm', 'btbm', 'btbm-weak', 'bhm2', 'btm', 'bim', 'bsm2', 'bdm', 'bhhm', 'mm', 'mm2', 'mm3', 'epm', 'bpms', 'lpms', 'lptss'] },
  { name: 'OCF 序数折叠函数', ids: ['cocf', 'bocf-ebo', 'mocf-ebo', 'nocf-ebo', 'inacc-ocf', 'finite-mahlo-ocf', 'veblen-phi', 'lmn', 'lon', 'hspn'] },
  { name: 'aSAN 数列', ids: ['asan-1', 'asan-2', 'asan-3', 'asan-tilde3plus'] },
  { name: 'TON', ids: ['ton-m', 'ton-dr', 'ton-drc', 'ton-drp', 'ton-drpc', 'ton-i', 'ton-ibp', 'ton-mc', 'ton-mpc'] },
  { name: 'DEN', ids: ['den', 'den2', 'den3'] },
  { name: 'ω 山记号 (MN)', ids: ['t-omega-mn', 'b-omega-mn', 'a-omega2-mn-2', 'weak-a-omega2-mn-2', 'a-omega2-mn-3', 'weak-a-omega2-mn-3', 'm-omega-mn', 'mt-omega-mn', 'd-omega2-mn', 'f-omega2-mn', 'td-omega-pow-omega-mn', 'omega-mn', 'sa-omega2-mn', 's-omega2-mn', 's-omega-pow-omega-mn'] },
  { name: '基础序列系统', ids: ['prss', 'pps', 'sps', 'dfss', 'ups1.1r5', 'ups', 'pps4', 'wpps4', 'ewpps4', 'spps4', 'tpps4'] },
  { name: '其他', ids: [] },
];

// 移植自 ne-rewritten 的记号：缩写显示直接用网页 simple_name
const SIMPLE_NAMES = {
  '0y': '0Y',
  '-1y': '-1Y',
  't--1y': 'T(-1)Y',
  'tbm': 'TBMS',
  'btbm': 'BTBMS',
  'btbm-weak': 'wBTBMS',
  'dsm': 'DSM',
  'bocf-ebo': 'BOCF (EBO)',
  'mocf-ebo': 'MOCF (EBO)',
  'nocf-ebo': 'NOCF (EBO)',
  'inacc-ocf': 'OCF (I)',
  'veblen-phi': 'BHO φ',
  'ups1.1r5': 'UPS 1.1r5',
  'cnf': 'CNF',
  // 用户自有 aSAN 系列（Aarex），显示名与文件名一致
  'asan-1': 'aSAN-1',
  'asan-2': 'aSAN-2',
  'asan-3': 'aSAN-3',
  'asan-tilde3plus': 'aSAN~3+',
  // 2026 远古版下载记号：缩写按官方名直接显示
  'x-y': 'X-Y',
  'bhm2': 'BHM2',
  'btm': 'BTM',
  'bim': 'BIM',
  'bsm2': 'BSM2',
  'bdm': 'BDM',
  'bhhm': 'BHhM',
  'mm': 'MM',
  'mm2': 'MM2',
  'mm3': 'MM3',
  'epm': 'EPM',
  'bpms': 'BPMS',
  'ups': 'UPS',
  'm-omega-mn': 'MωMN',
  'mt-omega-mn': 'MTωMN',
  'd-omega2-mn': 'Dω2MN',
  'f-omega2-mn': 'Fω2MN',
  'td-omega-pow-omega-mn': 'TDω^ωMN',
  // 2026 新接入：ne-rewritten 移植记号
  'pps4': 'PPS4',
  'wpps4': 'wPPS4',
  'ewpps4': 'ewPPS4',
  'spps4': '2ndPPS4',
  'tpps4': '3rdPPS4',
  'finite-mahlo-ocf': 'OCF (Fin.Mahlo)',
  'omega-mn': 'ωMN',
  'sa-omega2-mn': 'SAω2MN',
  's-omega2-mn': 'Sω2MN',
  's-omega-pow-omega-mn': 'Sω^ωMN',
  'lpms': 'LPMS',
  'lptss': 'LPTSS',
  // 2026 新接入：ne-rewritten 移植（weak ω-Y 与 limit variants）
  'weak-omega-y': 'weak ωY',
  'omega-y-12omega': '12ωY',
  'omega-y-1257omega': '1257ωY',
  'omega-y-skew': 'Skew ωY',
};
// 特殊缩写保持原样/特定写法；其余缩写显示为大写
const SHORT_OVERRIDES = {
  cocf: 'cOCF', prss: 'PrSS',
  cms: 'CMS',
  wmms: 'wMMS',
  twmn: 'TωMN',
  bwmn: 'BωMN',
  aw2mn2: 'Aω2MN2',
  aw2mn3: 'Aω2MN3',
  waw2mn2: 'wAω2MN2',
  waw2mn3: 'wAω2MN3',
  'ton-dor': 'TON-DoR',
  // BHO φ 系列：phi 是小写函数名，不是大写缩写
  'bho-phi': 'BHO-phi',
  'bhophi': 'BHOphi'
};
const SPECIAL_SHORTS = new Set(['wy', 'w-y', 'wy-w', 'w-y-w', 'wy-m', 'w-y-m', 'wy-s', 'w-y-s', 'iblp', 'phi', 'φ']);

// 大写缩写时，omega 不允许显示成 O（如 OMEGA），统一还原为 ω；
// 若已含 ω/w 则原样保留（如 TωMN、TDω^ωMN）。
const upperShort = s => s.toUpperCase().replace(/OMEGA/g, 'ω');

// 存在无穷降链（即远古版标注 "(pale haTEL'I / non-terminating)"）的记号：
// 其 FS 展开不终止，/list 行尾注明「已无穷降链」。
const INFINITE_DESCENDING_IDS = new Set([
  'x-y', 'pps', 'sps', 'bhm2', 'btm', 'bim', 'bsm2', 'bdm', 'bhhm',
  'mm', 'mm2', 'mm3', 'epm', 'm-omega-mn', 'mt-omega-mn', 'bpms', 'ups',
]);

const normInput = s => s.toLowerCase().replace(/\s+/g, '');

// 在 /list 中隐藏但仍可输入的记号（输入匹配走 register.js 的别名/id）。
const HIDDEN_IDS = new Set(['cnf']);

/**
 * 把单个记号格式化成 /list 行文本（沿用原有缩写美化逻辑）。
 */
function formatNotationRow(n) {
  const aliases = (NOTATION_META[n.id] && NOTATION_META[n.id].aliases) || [];
  const short = aliases.length ? aliases[0] : n.id;
  const shownShort = (() => {
    if (SIMPLE_NAMES[n.id]) return SIMPLE_NAMES[n.id];
    if (SHORT_OVERRIDES[short]) return SHORT_OVERRIDES[short];
    if (SPECIAL_SHORTS.has(short)) return short;
    return upperShort(short);
  })();
  // 可输入名：移植记号用网页 simple_name 打头；有别名时不显示内部 id（id 仍可输入）；
  // 输入匹配不区分大小写且忽略空格，显示前按归一化去重
  const rawInputNames = SIMPLE_NAMES[n.id]
    ? [SIMPLE_NAMES[n.id], ...aliases]
    : (aliases.length ? aliases : [n.id]);
  const seenInputs = new Set();
  const dedupedNames = rawInputNames.filter(s => {
    const k = normInput(s);
    if (seenInputs.has(k)) return false;
    seenInputs.add(k);
    return true;
  });
  // 显示美化：去空格、统一大写；官方缩写（cOCF/PrSS/wMMS/TωMN、网页 simple_name 等）保留原样
  // 若输入的是 omega 的 w 缩写（如 mwmn、tdw^wmn），按 ω 形式显示（TDω^ωMN）
  const prettyInput = (name) => {
    const compact = name.replace(/\s+/g, '');
    if (SHORT_OVERRIDES[compact]) return SHORT_OVERRIDES[compact];
    if (SIMPLE_NAMES[n.id]) {
      const simple = SIMPLE_NAMES[n.id].replace(/\s+/g, '');
      if (normInput(simple) === normInput(compact)) return simple;
      if (normInput(simple) === normInput(compact).replace(/w/g, 'ω')) return simple;
    }
    if (SPECIAL_SHORTS.has(compact)) return compact;
    return upperShort(compact);
  };
  // 美化后再按显示结果去重（w 缩写与 ω 主名会显示成同一串，如 MωMN）
  const seenPretty = new Set();
  const inputNames = dedupedNames.map(prettyInput).filter(s => {
    if (seenPretty.has(s)) return false;
    seenPretty.add(s);
    return true;
  });
  const namePart = n.name && n.name !== shownShort ? ` (${n.name})` : '';
  // 返回结构化行：text 为行文本；infiniteDescending 标记「已无穷降链」，由 FolderView 渲染为醒目颜色
  return {
    text: `  ${shownShort}${namePart} (可输入：${inputNames.join(', ')})`,
    infiniteDescending: INFINITE_DESCENDING_IDS.has(n.id),
  };
}

/**
 * 把全部记号按 NOTATION_CATEGORIES 分组，返回 FolderView 数据。
 */
export function buildNotationList(all) {
  const categories = NOTATION_CATEGORIES.map(cat => ({ name: cat.name, rows: [] }));
  const byId = new Map(all.map(n => [n.id, n]));
  const placed = new Set();
  categories.forEach((cat, ci) => {
    for (const id of NOTATION_CATEGORIES[ci].ids) {
      const n = byId.get(id);
      if (!n) continue;
      cat.rows.push(formatNotationRow(n));
      placed.add(id);
    }
  });
  // 未分类的记号追加到「其他」（隐藏记号不进列表）
  const others = categories[categories.length - 1];
  for (const n of all.slice().sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))) {
    if (HIDDEN_IDS.has(n.id)) continue;
    if (!placed.has(n.id)) others.rows.push(formatNotationRow(n));
  }
  return categories.filter(cat => cat.rows.length > 0);
}
