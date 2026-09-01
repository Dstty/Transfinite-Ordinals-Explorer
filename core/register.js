// ============================================================================
//  core/register.js — 记号注册表
// ============================================================================
//  远古版记号文件（notation/*.js）都是 IIFE + `register.push({...})`，
//  因此必须先建立全局 `register` 数组，再按顺序加载记号文件。
//
//  本文件同时维护 UI 层需要的补充信息（别名、parse 函数、示例），
//  这些信息**不写进** notation/ 下的远古算法文件（保持算法文件只读不改）。
// ============================================================================
import {
  parseMatrix,
  parseSequence,
} from './parseShorthands.js';

// 简写引用
const PM = parseMatrix;      // 矩阵简写：BMS ()(1,1,1)(2,1)(1,1,1)
const PS = parseSequence;    // 数列：PrSS 0,1,2

// 注意：只有矩阵类（PM）与序列类（PS）记号保留 parse。
// 其余记号（JSON/字符串等）一律不配 parse，输入具体表达式时报
// 「该记号暂不支持输入特定表达式（只支持 limit 建树）」，
// 避免远古版 FS 对非法输入死循环。

// 全局注册表（远古版格式）。记号文件通过 register.push 注册自己。
// 注意：index.html 已用内联脚本初始化 window.register = []，
// 这里只在不存在时兜底，避免 ES Module 加载时清空已注册记号。
if (!window.register) window.register = [];

// ============================================================================
//  补充表：UI 层扩展信息
//  key 与记号文件里的 id 一致。
//  aliases — 输入别名（小写匹配）
//  parse   — 输入字符串 → 表达式（app.js 解析时：记号自带 parse > 此 parse）
//  examples— 额外示例（init() 已有；这里只在需要补充别名/parse 时使用）
//
//  —— v2.5 规划：记号能力扩展（详见 DESIGN.md §5.3，均可选，不影响核心）——
//  standard      — (expr) => bool  标准化判定
//  converters    — [{ target, convert }] 互译目标（core/converters.js 消费）
//  mountainData  — (expr) => mountain 山脉图数据（ui/MountainView.js 消费）
// ============================================================================
// ω-Y 系列共享视图：DBMS 三种等价显示（移植自 ne-rewritten）
// （山脉图视图暂未启用，见 core/mountainDiagram.js 头注释）
const OY_VIEWS = [
  { id: 'dbms', label: 'DBMS', kind: 'oy-dbms', type: 'DBMS' },
  { id: 'dbms2', label: "DBMS'", kind: 'oy-dbms', type: "DBMS'" },
  { id: 'adbms', label: 'ADBMS', kind: 'oy-dbms', type: 'ADBMS' },
];
export const NOTATION_META = {
  // —— 保留 parse：序列类（PS）——
  'y-seq':   { aliases: ['1-y', '1y', 'y'], parse: PS },
  'omega-y': { aliases: ['wy', 'w-y'], parse: PS, views: OY_VIEWS },
  'omega-y-weak':   { aliases: ['wy-w', 'w-y-w'], parse: PS, views: OY_VIEWS },
  'omega-y-medium': { aliases: ['wy-m', 'w-y-m'], parse: PS, views: OY_VIEWS },
  'omega-y-strong': { aliases: ['wy-s', 'w-y-s'], parse: PS, views: OY_VIEWS },
  'omega-y-actual': { aliases: [], views: OY_VIEWS },
  // —— ne-rewritten 移植：weak ω-Y 与 limit variants ——
  'weak-omega-y':  { aliases: ['w-oy', 'woy'], views: OY_VIEWS },
  'omega-y-12omega':    { aliases: ['12wy'], views: OY_VIEWS },
  'omega-y-1257omega':  { aliases: ['1257wy'], views: OY_VIEWS },
  'omega-y-skew':       { aliases: ['skew-oy', 'skewy'], views: OY_VIEWS },
  'prss':     { aliases: [], parse: PS },
  'pps':      { aliases: [], parse: PS },
  'sps':      { aliases: [], parse: PS },
  'dfss':     { aliases: [], parse: PS },
  'cnf':      { aliases: ['cantor', 'cantor normal form'] },
  '-1y':        { aliases: [], parse: PS },
  'ups1.1r5':   { aliases: [], parse: PS },
  'x-y':        { aliases: ['xy'], parse: PS },
  // —— 保留 parse：矩阵类（PM）——
  'bm4':     { aliases: ['bms', 'bm'], parse: PM, converters: [{ target: '0y', label: '0-Y', convert: (m) => m }], views: [
    { id: 'simple', label: 'simple', kind: 'bm-simple' },
    { id: 'ocf', label: 'OCF', kind: 'bm-ocf', type: 'ocf' },
    { id: 'ocf-full', label: 'OCF full', kind: 'bm-ocf', type: 'ocf-full' },
    { id: 'ns', label: 'n.s. OCF', kind: 'bm-ocf', type: 'ns' },
    { id: 'ns-full', label: 'n.s. OCF full', kind: 'bm-ocf', type: 'ns-full' },
  ] },
  'upms':    { aliases: [], parse: PM },
  'bhm':     { aliases: [], parse: PM },
  'bsm':     { aliases: [], parse: PM },
  'blm':     { aliases: [], parse: PM },
  'cms':     { aliases: [], parse: PM },
  'wmms':    { aliases: [], parse: PM },
  '0y':         { aliases: [], parse: PM, converters: [{ target: 'bm4', label: 'BMS', convert: (m) => m }] },
  'tbm':        { aliases: ['tbms'], parse: PM, views: [{ id: 'plain', label: '纯文本', kind: 'strip-html' }] },
  'dsm':        { aliases: [], parse: PM },
  // —— 2026 新接入矩阵类（远古版下载）——
  'bhm2':       { aliases: [], parse: PM },
  'btm':        { aliases: ['btms'], parse: PM },
  'bim':        { aliases: [], parse: PM },
  'bsm2':       { aliases: [], parse: PM },
  'bdm':        { aliases: [], parse: PM },
  'bhhm':       { aliases: [], parse: PM },
  'mm':         { aliases: [], parse: PM },
  'mm3':        { aliases: [], parse: PM },
  'epm':        { aliases: [], parse: PM },
  // —— 其余记号：只保留别名，不配 parse（输入表达式报「暂不支持」）——
  'den':     { aliases: [] },
  'den2':    { aliases: ['iblp'] },
  'den3':    { aliases: [] },
  'cocf':    { aliases: [] },
  'hspn':    { aliases: [] },
  'lmn':     { aliases: [] },
  'lon':     { aliases: [] },
  't-omega-mn':   { aliases: ['twmn'] },
  'b-omega-mn':   { aliases: ['bwmn'] },
  'a-omega2-mn-2':{ aliases: ['aw2mn2'] },
  'weak-a-omega2-mn-2': { aliases: ['waw2mn2'] },
  'a-omega2-mn-3':{ aliases: ['aw2mn3'] },
  'weak-a-omega2-mn-3': { aliases: ['waw2mn3'] },
  'asan-1':   { aliases: ['san1'] },
  'asan-2':   { aliases: ['san2'] },
  'asan-3':   { aliases: ['san3'] },
  'asan-tilde3plus': { aliases: ['san3+', 'san~3+', 'asan~3+'] },
  'ton-m':    { aliases: ['ton'] },
  'ton-dr':   { aliases: ['ton-dor'] },
  'ton-drc':  { aliases: [] },
  'ton-drp':  { aliases: [] },
  'ton-drpc': { aliases: [] },
  'ton-i':    { aliases: [] },
  'ton-ibp':  { aliases: [] },
  'ton-mc':   { aliases: [] },
  'ton-mpc':  { aliases: [] },
  't--1y':      { aliases: ['t(-1)y'] },
  'btbm':       { aliases: ['btbms'], views: [{ id: 'plain', label: '纯文本', kind: 'strip-html' }] },
  'btbm-weak':  { aliases: ['weak-btbms', 'weakbtbms', 'wbtbms', 'wbtb'], views: [{ id: 'plain', label: '纯文本', kind: 'strip-html' }] },
  'bocf-ebo':   { aliases: ['bocf', 'bocf(ebo)'] },
  'mocf-ebo':   { aliases: ['mocf', 'mocf(ebo)'] },
  'nocf-ebo':   { aliases: ['nocf', 'nocf(ebo)'] },
  'inacc-ocf':  { aliases: ['ocf(i)'] },
  'veblen-phi': { aliases: ['phi', 'φ', 'bho-phi', 'bhophi', 'bhoφ'], views: [{ id: 'plain', label: '纯文本', kind: 'strip-html' }] },
  // —— 2026 新接入（结构非标准矩阵/序列，只支持 limit 建树）——
  'mm2':        { aliases: [] },
  'bpms':       { aliases: [] },
  'ups':        { aliases: [] },
  'm-omega-mn':   { aliases: ['mwmn'] },
  'mt-omega-mn':  { aliases: ['mtwmn'] },
  'd-omega2-mn':  { aliases: ['dω2mn', 'dw2mn'] },
  'f-omega2-mn':  { aliases: ['fω2mn', 'fw2mn'] },
  'td-omega-pow-omega-mn': { aliases: ['tdω^ωmn', 'tdw^wmn'] },
  // —— 2026 新接入：ne-rewritten 移植记号 ——
  'pps4':       { aliases: [] },
  'wpps4':      { aliases: [] },
  'ewpps4':     { aliases: [] },
  'spps4':      { aliases: [] },
  'tpps4':      { aliases: [] },
  'finite-mahlo-ocf': { aliases: ['ocf(n-mahlo)', 'n-mahlo', 'mahlo-ocf'] },
  'omega-mn':   { aliases: ['wmn', 'ωmn'] },
  'sa-omega2-mn': { aliases: ['saω2mn', 'saw2mn'] },
  's-omega2-mn':  { aliases: ['sω2mn', 'sw2mn'] },
  's-omega-pow-omega-mn': { aliases: ['sω^ωmn', 'sw^wmn'] },
  'lpms':       { aliases: [], views: [{ id: 'simple', label: 'simple', kind: 'bm-simple' }, { id: '0y', label: '0-Y', kind: 'bm-0y' }] },
  'lptss':      { aliases: [], views: [{ id: 'simple', label: 'simple', kind: 'bm-simple' }, { id: '0y', label: '0-Y', kind: 'bm-0y' }] },
};

// ============================================================================
//  从 register 取已注册记号（id 或 name 匹配）
// ============================================================================
export function getNotation(id) {
  if (!window.register) return null;
  return window.register.find(n => n.id === id) || null;
}

export function getAllNotations() {
  return window.register || [];
}

// ============================================================================
//  构建 输入名 → 记号 id 的映射（最长匹配用）
//  匹配优先级：id > name（小写） > 补充别名
// ============================================================================
export function buildNameMap() {
  const map = new Map(); // 小写输入 → id
  for (const n of getAllNotations()) {
    map.set(n.id.toLowerCase(), n.id);
    if (n.name) {
      map.set(n.name.toLowerCase(), n.id);
      // 去空格 + ω→w 变体：输入侧匹配前也会去空格、ω→w，多词全名才能命中
      map.set(n.name.toLowerCase().replace(/ω/g, 'w').replace(/\s/g, ''), n.id);
    }
  }
  for (const [id, meta] of Object.entries(NOTATION_META)) {
    for (const alias of meta.aliases || []) {
      map.set(alias.toLowerCase().replace(/\s/g, ''), id);
    }
  }
  return map;
}
