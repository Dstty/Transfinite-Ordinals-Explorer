// ============================================================================
//  ui/notationList.js — /list 记号的分类树、显示名与行格式化
// ============================================================================
//  输出：categories = [{ name, rows: [...] }]（空分类被过滤，顺序即显示顺序）
//  行对象三形态见 ui/FolderView.js：
//    { id, text, infiniteDescending }   普通记号行（双击建树）
//    { ellipsis: true, text }           灰字提示行（非记号）
//    { subfolder: true, name, rows }    子文件夹（可继续嵌套）
//
//  ── 与改造前的区别（本次重构）────────────────────────────────────────────────
//  改造前：分类是手写在 NOTATION_CATEGORIES 里的 9 组、约 150 个 id 字面量，
//  家族子文件夹来自 window.NOTATION_FAMILIES（远古家族文件在自身闭包里注册）。
//  后果是「记号归属」有两个真相源：记号文件 + 本文件。新增记号忘了改这里就掉进
//  「其他」；反过来本文件里还会留着已经删掉的 id（实测 `m-omega-mn`、`bpms`、
//  `mt-omega-mn`、`d-omega2-mn`、`f-omega2-mn`、`td-omega-pow-omega-mn` 六个在
//  manifest 里已不存在，只在旧列表里空挂着）。
//
//  改造后：分类与归属**全部读 core/ne/registry.js**——
//    · 顶层/父分类由 notation/ne/categories.js 注册；
//    · 记号归属由各记号文件自己的 category_id 决定；
//    · generator 分类（n-MN / nBM-BHM / (>n)-UPMS / -1Y-nSS 系列 / GMS n-P …）
//      的成员由注册表按档位水合，本文件不再维护家族表。
//  本文件只保留 ne 架构里**不提供**的三样东西：
//    ① 显示名兜底表 —— ne 里就没有 simple_name 的那批记号（硬切改写 + 家族成员）；
//    ② INFINITE_DESCENDING_IDS —— 「无穷降链」是远古版才有的标注；
//    ③ HIDDEN_IDS —— 隐藏但仍可输入的记号。
//
//  两套注册表并存期的处理：分类树只当**索引**用，行数据一律从传入的 all
//  （core/ne/uiBridge.js 的合并结果）里取 id 对应的对象。于是带不带 `?legacy=1`
//  共用同一套分类结构，区别只在同名 id 取 ne 版还是远古版。
// ============================================================================

import { NOTATION_META } from '../core/ne/uiBridge.js';
import { get_category, get_category_children, get_notation, get_root_items } from '../core/ne/registry.js';

// ----------------------------------------------------------------------------
//  GMS（General Matrix System）：21 个记号共享超长 id 前缀，此处程序化生成
// ----------------------------------------------------------------------------
const GMS_PREFIX = 'BMS-20260721-v10-weirdfull-display-';
const GMS_SYSTEMS = ['GBMS', 'UPMS', 'LPMS2'];
const GMS_PROJECTIONS = ['omega-P', 'pQSS', 'QSS', 'Full', 'Weirdly Full'];
const GMS_IDS = [];
for (const sys of GMS_SYSTEMS) {
  for (const p of GMS_PROJECTIONS) GMS_IDS.push(GMS_PREFIX + sys + '-' + p);
}
// GMS 的 ne simple_name 只有投影名（'ω-P'、'QSS'…）甚至档位模板名（'n-P'），直接用会
// 丢掉系统前缀、或把 'GBMS 2-P' 显示成 '2-P'，故这些 id 一律保留下面的本地表名。
const GMS_NAME_KEEP = new Set(GMS_IDS);
for (const sys of GMS_SYSTEMS) {
  for (let n = 2; n <= 3; n++) GMS_NAME_KEEP.add(GMS_PREFIX + sys + '-n-' + n + '-P');
}

// ----------------------------------------------------------------------------
//  显示名兜底表：**只在记号自己没有 ne simple_name 时生效**
//  （优先级链见 short_of()）。ne 里带 simple_name 的记号一律以 ne 为准，
//  这里的同名条目是历史遗留，保留是为了让 ne 没给名字的那批维持熟悉写法。
// ----------------------------------------------------------------------------
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
  // 硬切改写 / 自有记号（ne 里没有对应物，因而没有 simple_name）
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
  'ups': 'UPS',
  // 2026 新接入：ne-rewritten 移植记号
  'pps4': 'PPS4',
  'wpps4': 'wPPS4',
  'ewpps4': 'ewPPS4',
  'spps4': '2ndPPS4',
  'tpps4': '3rdPPS4',
  'lpms': 'LPMS',
  'lptss': 'LPTSS',
  // —— 以下这批 ne 侧没有 simple_name，若没有本地表名，默认模式（旧注册表优先）下
  //    会因为取不到 ne 的 simple_name 而退化成别名大写（如 W-OY / 12WY）——
  'omega-mn': 'ωMN',
  'sa-omega2-mn': 'SAω2MN',
  's-omega2-mn': 'Sω2MN',
  's-omega-pow-omega-mn': 'Sω^ωMN',
  'weak-omega-y': 'weak ωY',
  'omega-y-12omega': '12ωY',
  'omega-y-1257omega': '1257ωY',
  'omega-y-skew': 'Skew ωY',
  'finite-mahlo-ocf': 'OCF (Fin.Mahlo)',
  // -1Y-nSS 系列静态档 1..6（家族成员在 ne 里没有 simple_name）
  '-1y-1ss': '-1Y-1ss', '-1y-2ss': '-1Y-2ss', '-1y-3ss': '-1Y-3ss',
  '-1y-4ss': '-1Y-4ss', '-1y-5ss': '-1Y-5ss', '-1y-6ss': '-1Y-6ss',
  't--1y-1ss': 'T(-1)Y-1ss', 't--1y-2ss': 'T(-1)Y-2ss', 't--1y-3ss': 'T(-1)Y-3ss',
  't--1y-4ss': 'T(-1)Y-4ss', 't--1y-5ss': 'T(-1)Y-5ss', 't--1y-6ss': 'T(-1)Y-6ss',
  'bt--1y-1ss': 'BT(-1)Y-1ss', 'bt--1y-2ss': 'BT(-1)Y-2ss', 'bt--1y-3ss': 'BT(-1)Y-3ss',
  'bt--1y-4ss': 'BT(-1)Y-4ss', 'bt--1y-5ss': 'BT(-1)Y-5ss', 'bt--1y-6ss': 'BT(-1)Y-6ss',
};
// GMS 家族：显示官方名（系统 + 投影 / n-P），如 'GBMS ω-P'、'LPMS2 2-P'
for (const sys of GMS_SYSTEMS) {
  for (let n = 2; n <= 3; n++) SIMPLE_NAMES[GMS_PREFIX + sys + '-n-' + n + '-P'] = sys + ' ' + n + '-P';
  for (const p of GMS_PROJECTIONS) {
    SIMPLE_NAMES[GMS_PREFIX + sys + '-' + p] = sys + ' ' + p.replace('omega', 'ω');
  }
}
// BT*(-1)Y-nSS：静态档 2..6（v1 无尾标；v2 id 尾部带撇号；v3 带 -v3；BTL 用 btl- 前缀）
for (let k = 2; k <= 6; k++) {
  SIMPLE_NAMES['bt*--1y-' + k + 'ss'] = 'BT*(-1)Y-' + k + 'ss';
  SIMPLE_NAMES["bt*--1y-" + k + "ss'"] = "BT*(-1)Y-" + k + "ss'";
  SIMPLE_NAMES['bt*--1y-' + k + 'ss-v3'] = 'wBT*(-1)Y-' + k + 'ss-v3';
  SIMPLE_NAMES['btl--1y-' + k + 'ss'] = 'BTL(-1)Y-' + k + 'ss';
}

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

/**
 * 显示名不是可输入写法的家族：这两支的显示名沿用了本地约定 `BT*(-1)Y-5ss` /
 * `BTL(-1)Y-5ss`，但远古家族 matcher（notation/rewritten/*-minus1Y-nSS.js 注册的
 * window.NOTATION_FAMILIES）只认 id 形式的拼写。实测（.tmp-ne/probe-family-input-forms.mjs）：
 *   'bt*--1y-5ss' ✓   'BT*--1Y-5ss' ✓   'bt*-1y-5ss' ✓   'BT*(-1)Y-5ss' ✗
 *   'btl--1y-5ss' ✓   'BTL--1Y-5ss' ✓                     'BTL(-1)Y-5ss' ✗
 * 所以这两族额外把 id 一并列进「可输入」，避免 /list 给出输不进去的名字。
 * 同类还有 2ndPPS4 / 3rdPPS4（表名带序数词，不是任何可输入串，id `spps4` / `tpps4` 才行）。
 */
const ID_ALSO_INPUT = /^(?:bt\*--1y-|btl--1y-|spps4$|tpps4$)/;

// 在 /list 中隐藏但仍可输入的记号（输入匹配走 uiBridge.buildNameMap 的别名/id）。
const HIDDEN_IDS = new Set(['cnf']);

// ----------------------------------------------------------------------------
//  显示名解析：ne simple_name 优先，本地表兜底
// ----------------------------------------------------------------------------

/** 取该记号的「已策展」显示短名；返回 null 表示只能从别名/id 美化。 */
function curated_short(n) {
  const tabled = SIMPLE_NAMES[n.id];
  // GMS：本地表带系统前缀，优先于 ne 的裸投影名
  if (tabled && GMS_NAME_KEEP.has(n.id)) return tabled;
  // ne 自带 simple_name —— **直接查 ne 注册表**，不要走 NOTATION_META：
  // 默认模式（?ne 不带）下 all 里是旧版记号对象（没有 simple_name 字段），
  // 而 NOTATION_META 对「旧注册表有 meta」的 id 只返回旧 meta（只有 aliases），
  // 于是 ne 的 simple_name 会被整个挡住 —— 表现就是 '12ωY' 退化成 '12WY'、
  // '1BM-BHM' 退化成 '1BMBHM'。ne 有名字的一律以 ne 为准。
  const neSimple = get_notation(n.id)?.simple_name ?? (NOTATION_META[n.id] || {}).simple_name;
  if (neSimple) return String(neSimple);
  if (tabled) return tabled;
  return null;
}

/** 名字本身够短时，直接当显示名用（不再加重复的括号全名）。 */
const SHORT_NAME_MAX = 16;

/**
 * 别名/id 美化级的兜底短名；返回显示名与其对应的可输入名。
 * 顺序：有别名 → 别名美化；无别名但 name 够短 → 直接用 name；否则 id 美化。
 * 例：`s-omega-dbms` 无别名、name='SωDBMS v1'（10 字）→ 用它（verbatim，因为它
 * 本身就是可输入原串），而不是退化成 id 大写 'S-ω-DBMS'；`bm4` 有别名 'BMS' →
 * 用 'BMS'，name='Bashicu matrix' 不会被选中。
 */
function fallback_short(n, aliases) {
  if (aliases.length) {
    const key = aliases[0];
    const short = SHORT_OVERRIDES[key] || (SPECIAL_SHORTS.has(key) ? key : upperShort(key));
    return { short, inputs: aliases, verbatim: false };
  }
  const nm = typeof n.name === 'string' ? n.name.trim() : '';
  if (nm && nm.length <= SHORT_NAME_MAX) return { short: nm, inputs: [nm], verbatim: true };
  return { short: upperShort(n.id), inputs: [n.id], verbatim: false };
}

/**
 * 把单个记号格式化成 /list 行文本。
 * text 形如：`  ωMN (ω mountain notation) (可输入：ωMN, omega-mn)`
 */
function formatNotationRow(n) {
  const aliases = (NOTATION_META[n.id] && NOTATION_META[n.id].aliases) || [];
  const curated = curated_short(n);
  const fb = curated ? null : fallback_short(n, aliases);
  const shownShort = curated || fb.short;
  const verbatim = !curated && fb.verbatim;

  // 可输入名：有策展短名时以它打头；否则用别名；再否则由 fallback_short 给出
  // （name 够短就用 name 原串，否则用 id —— id 恒可输入）。
  // 输入匹配不区分大小写且忽略空格，显示前按归一化去重。
  const rawInputNames = curated ? [curated, ...aliases] : fb.inputs;
  // 显示名不可输入时，把可输入的 id 放最前（提示里排第一的那个才是「照着打就行」的）
  if (ID_ALSO_INPUT.test(n.id)) rawInputNames.unshift(n.id);
  const seenInputs = new Set();
  const dedupedNames = rawInputNames.filter(s => {
    const k = normInput(s);
    if (seenInputs.has(k)) return false;
    seenInputs.add(k);
    return true;
  });

  // 显示美化：去空格、统一大写；官方缩写（cOCF/PrSS/wMMS/TωMN 等）保留原样；
  // 若输入的是 omega 的 w 缩写（如 mwmn），按 ω 形式显示（MωMN）
  const prettyInput = (name) => {
    // 候选就是记号自己的 name 时**原样显示**：大写化会把 ω 变成 Ω（'SωDBMS v1' →
    // 'SΩDBMSV1'），反而成了输入不进去的串。
    if (verbatim) return name;
    const compact = name.replace(/\s+/g, '');
    if (SHORT_OVERRIDES[compact]) return SHORT_OVERRIDES[compact];
    if (curated) {
      const simple = curated.replace(/\s+/g, '');
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
  // 返回结构化行：text 为行文本；id 供「双击直接建树」；infiniteDescending 标记「已无穷降链」
  return {
    id: n.id,
    text: `  ${shownShort}${namePart} (可输入：${inputNames.join(', ')})`,
    infiniteDescending: INFINITE_DESCENDING_IDS.has(n.id),
  };
}

// ----------------------------------------------------------------------------
//  显示归组：参考版「自助版 NE-4.8.1」的「类 / 子类」两级体系
// ----------------------------------------------------------------------------
//  这一层是**显示概念**，不是注册表概念：ne 注册表里分类是按记号家族建的
//  （category-y / category-bm-like / category-mn …），而参考版是按用途分四大类
//  （序列类 / 矩阵类 / 山脉类 / 函数类）+ 转换器，类下再分子类。两者可以互相换算：
//
//    实测（.tmp-ne/plan-display-groups.mjs）：对能对上的 109 个记号，
//    「按 category_id 取参考版的众数」+ 6 条按记号的例外，就能**完全复现**参考版
//    的 (类, 子类) 分配。所以这里是一张约 40 行的表，而不是手写 200 个 id。
//
//  新增记号时：给它一个已有 category_id 即可自动归类；若是新分类，
//  verify-notation-list.mjs 会报「未映射的分类」，把 id 补进 DISPLAY_GROUP 即可。
// ----------------------------------------------------------------------------

/** category_id → [类, 子类]。 */
const DISPLAY_GROUP = {
  // —— 序列类 ——
  'category-y': ['序列类', 'Y 序列'],
  'category-y-omega': ['序列类', 'Y 序列'],
  'category-y-variants': ['序列类', 'Y 序列'],
  'category-bm-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-t-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-bt-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-bt-star-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  "category-bm-bt-star-minus1-y-nss'": ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-bt-star-minus1-y-nss-v3': ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-btl-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  'category-bm-rel-bt-minus1-y-nss': ['序列类', '(-1)Y-nSS 系列'],
  'category-asan': ['序列类', '数组记号'],
  'category-bss': ['序列类', 'Primitive 序列'], // PrSS / PPS / SPS / DFSS / PPS4 系
  'category-seq-primitive': ['序列类', 'Primitive 序列'],
  'category-seq-sss': ['序列类', 'SSS 系'],
  'category-seq-ancestral': ['序列类', '祖先/基本列序列'],
  'category-seq-worm': ['序列类', '虫/三角序列'],
  'category-seq-diff': ['序列类', '差序列'],

  // —— 矩阵类 ——
  'category-bm-like': ['矩阵类', 'Bashicu 矩阵'],
  'category-GMS-20260721-v10-weirdfull-display': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-GBMS': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-GBMS-n-P': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-UPMS': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-UPMS-n-P': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-LPMS2': ['矩阵类', 'GMS 变体'],
  'category-GMS-20260721-v10-weirdfull-display-LPMS2-n-P': ['矩阵类', 'GMS 变体'],
  'category-bm-bhm': ['矩阵类', 'nBM-BHM'],
  'category-upms-partial': ['矩阵类', '投影矩阵'],
  'category-mx-l0y': ['矩阵类', 'L0-Y 矩阵'],
  'category-mx-descending': ['矩阵类', '降下矩阵'],
  'category-mx-sudden': ['矩阵类', 'sudden 矩阵'],

  // —— 山脉类 ——
  'category-mn': ['山脉类', 'ω-MN'],
  'category-ta0-mn': ['山脉类', 'ω-MN'], // e0MN 系：参考版没有，归进 ω-MN
  'category-hypcos-w2mn': ['山脉类', 'ω2MN 变体'],
  'category-smile-mn': ['山脉类', 'ω2MN 变体'],
  'category-sdbms': ['山脉类', 'ω2MN 变体'],
  'category-sdbms-test': ['山脉类', 'ω2MN 变体'],
  'category-n-mn': ['山脉类', 'n-MN'],
  'category-upmn': ['山脉类', 'UP2MN'],
  'category-upmn-test': ['山脉类', 'UP2MN'],
  'category-mt-general': ['山脉类', '山脉系'],

  // —— 函数类 ——
  'category-ocf': ['函数类', 'OCF'],
  'category-ocn': ['函数类', 'OCF'],
  'category-ton': ['函数类', '反射度序数（TON）'],
  'category-den': ['函数类', '嵌入记号（IBLP）'],

  // —— 转换器 ——
  'category-translators': ['转换器', ''],
  'category-converter': ['转换器', ''],

  // —— 自定义记号（/notation 命令注册的记号全落这里）——
  'category-user': ['自定义记号', ''],

  // 无分类（根级记号，如 omega）：与参考版一致，落在 φ / ω 表达式
  '(无分类)': ['函数类', 'φ / ω 表达式'],
};

/** 按记号的例外（与所属分类的默认不同）。6 条，来自参考版实测。 */
const DISPLAY_GROUP_EXCEPTIONS = {
  upms: ['矩阵类', '投影矩阵'],
  lpms: ['矩阵类', '投影矩阵'],
  lptss: ['矩阵类', '投影矩阵'],
  tupms: ['矩阵类', '投影矩阵'],
  bbm: ['矩阵类', 'Branching BMS'],
  'veblen-phi': ['函数类', 'φ / ω 表达式'],
  cnf: ['函数类', 'φ / ω 表达式'],
};

/** 类 / 子类的显示顺序（参考版 nav 的次序 + 自定义记号排最后）。 */
const GROUP_ORDER = ['序列类', '矩阵类', '山脉类', '函数类', '转换器', '自定义记号'];
const SUB_ORDER = {
  序列类: ['Y 序列', '(-1)Y-nSS 系列', '数组记号', 'Primitive 序列', 'SSS 系', '祖先/基本列序列', '虫/三角序列', '差序列', '段階配列'],
  矩阵类: ['Bashicu 矩阵', '投影矩阵', 'GMS 变体', 'nBM-BHM', 'sudden 矩阵', '降下矩阵', 'L0-Y 矩阵', 'Branching BMS'],
  山脉类: ['ω-MN', 'ω2MN 变体', 'n-MN', 'UP2MN', '山脉系'],
  函数类: ['OCF', 'Rathjen OCF', '反射度序数（TON）', '嵌入记号（IBLP）', 'φ / ω 表达式', 'ψ 函数'],
  转换器: [''],
  自定义记号: [''], // 自定义记号直接挂在类下（不再分子类），与用户「放到自定义记号文件夹里」的要求一致
};

/**
 * 某个记号属于哪个 (类, 子类)。
 * ⚠ 归属必须查 **ne 注册表**，不能读 `all` 里那个对象的 `category_id`：
 * 只有「被适配层接管的 ne 记号」才带这个字段，`all` 里凡是回落到远古实现的
 * （`?legacy=1` 下的全部、以及不接管的那 9 个）都没有 category_id，
 * 于是它们会整批掉进兜底 —— 第一次实现就是这么错的：110 个记号全挤进
 * 「函数类 / φ / ω 表达式」（.tmp-ne/verify-notation-list.txt 的结构转储一眼看出来）。
 */
function groupOf(id) {
  const ex = DISPLAY_GROUP_EXCEPTIONS[id];
  if (ex) return ex;
  const def = get_notation(id);
  const mapped = DISPLAY_GROUP[def?.category_id ?? '(无分类)'];
  if (mapped) return mapped;
  return ['函数类', '其他']; // 兜底：新分类忘了登记时不会崩，自检脚本会报出来
}

/** 分类显示名：优先中文 name，退回 simple_name / id。 */
function categoryLabel(cat) {
  if (!cat) return '(未知分类)';
  const name = cat.name;
  // 防御：ne 分类的 name 可能是 i18n 键对象（本地已解析为字符串，仍留一层保险）
  if (typeof name === 'string' && name) return name;
  if (name && typeof name === 'object' && typeof name.zh === 'string') return name.zh;
  if (typeof cat.simple_name === 'string' && cat.simple_name) return cat.simple_name;
  return cat.id;
}

/**
 * 按 ne 注册表顺序遍历分类树，把每个记号交给它的 (类, 子类)。
 * generator 分类的成员逐个列出，但**计数只算一个家族**（用户口径：家族算一个），
 * 且末尾补一行「更高档位」提示。
 */
function collect(all) {
  const byId = new Map(all.map((n) => [n.id, n]));
  const placed = new Set();
  const buckets = new Map(); // 类 → 子类 → rows
  let counted = 0;

  const bucket = (group, sub) => {
    if (!buckets.has(group)) buckets.set(group, new Map());
    const m = buckets.get(group);
    if (!m.has(sub)) m.set(sub, []);
    return m.get(sub);
  };

  const usedFamilyLabels = new Set(); // 家族标题去重（短名撞车时改用完整名）

  const visitCategory = (catId) => {
    const cat = get_category(catId);
    const children = get_category_children(catId);
    const isFamily = !!(cat && cat.generator);

    // —— 家族：包成**独立的家族文件夹**（用户要求），不再把档位平铺进类/子类 ——
    //    成员全部不计，家族本身计 1（口径不变：家族算一个）。
    if (isFamily) {
      const members = [];
      let firstId = null;
      for (const item of children) {
        if (item.kind === 'category') { visitCategory(item.id); continue; }
        if (HIDDEN_IDS.has(item.id)) continue;
        const n = byId.get(item.id);
        if (!n) continue;
        placed.add(item.id);
        if (!firstId) firstId = item.id;
        const row = formatNotationRow(n);
        row.uncounted = true; // 家族只算一个：档位本身都不计
        members.push(row);
      }
      if (members.length) {
        counted++; // 家族算一个
        // 家族标题：优先短名；**短名撞车时改用完整名**（GMS 那三个 simple_name 都叫 n-P，
        // 但 name 分别是 GBMS n-P / UPMS n-P / LPMS2 n-P），仍重名才附上 id。
        let label = cat.simple_name || categoryLabel(cat);
        if (usedFamilyLabels.has(label)) label = categoryLabel(cat);
        if (usedFamilyLabels.has(label)) label = `${label} (${cat.id})`;
        usedFamilyLabels.add(label);
        members.push({
          ellipsis: true,
          text: `⋯ 更高档位未预注册，直接输入档位名现场生成`,
        });
        // 落位：家族挂到「首个成员所属的（类, 子类）」下
        const [group, sub] = groupOf(firstId);
        bucket(group, sub).push({
          subfolder: true,
          family: true,
          name: `${label} 家族`,
          rows: members,
        });
      }
      return;
    }

    for (const item of children) {
      if (item.kind === 'category') {
        visitCategory(item.id);
        continue;
      }
      if (HIDDEN_IDS.has(item.id)) continue;
      const n = byId.get(item.id);
      if (!n) continue;
      placed.add(item.id);
      const [group, sub] = groupOf(item.id);
      bucket(group, sub).push(formatNotationRow(n));
      counted++; // ⚠ 别漏：漏了 /list 头部的计数会掉（家族分支 return 前那次是我另加的）
    }
  };

  for (const item of get_root_items()) {
    if (item.kind === 'category') {
      visitCategory(item.id);
      continue;
    }
    // 根级记号（如 omega）：按 (无分类) 的归组落位
    if (HIDDEN_IDS.has(item.id)) continue;
    const n = byId.get(item.id);
    if (!n) continue;
    placed.add(item.id);
    const [group, sub] = groupOf(item.id);
    bucket(group, sub).push(formatNotationRow(n));
    counted++;
  }

  // 兜底：注册表里有、树里没有的（理论上不该发生）
  const leftovers = all
    .filter((n) => !placed.has(n.id) && !HIDDEN_IDS.has(n.id))
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  for (const n of leftovers) {
    bucket('其他', '未归组').push(formatNotationRow(n));
    counted++;
  }

  // 按参考版次序输出两级文件夹
  const categories = [];
  const groups = [
    ...GROUP_ORDER.filter((g) => buckets.has(g)),
    ...[...buckets.keys()].filter((g) => !GROUP_ORDER.includes(g)).sort(),
  ];
  for (const g of groups) {
    const subs = buckets.get(g);
    const order = SUB_ORDER[g] ?? [];
    const subKeys = [
      ...order.filter((s) => subs.has(s)),
      ...[...subs.keys()].filter((s) => !order.includes(s)).sort(),
    ];
    const rows = [];
    for (const s of subKeys) {
      const subRows = subs.get(s);
      if (subRows.length === 0) continue;
      // 转换器没有子类：行直接挂在类下
      if (s === '') rows.push(...subRows);
      else rows.push({ subfolder: true, name: s, rows: subRows });
    }
    if (rows.length) categories.push({ name: g, rows });
  }

  return { categories, counted };
}

/**
 * 计数：/list 头部「已注册 N 个记号」。
 * 口径（用户指定）：**家族算一个** —— generator 家族只计 1，其档位实例不逐个计入；
 * 隐藏记号不计。与列表里「计数的行」严格一致（同一遍遍历得出）。
 * @returns {number}
 */
export function countNotationsForDisplay(all) {
  return build(all).counted;
}

const _cache = new WeakMap();
function build(all) {
  const hit = _cache.get(all);
  if (hit) return hit;
  const r = collect(all);
  _cache.set(all, r);
  return r;
}

/**
 * 把全部记号按参考版的「类 / 子类」两级体系分组，返回 FolderView 数据。
 * 归属由记号自身的 category_id 经 DISPLAY_GROUP 换算（见文件头说明）；
 * 家族成员逐个列出但只算一个；未归组的落进「其他」。
 */
export function buildNotationList(all) {
  return build(all).categories;
}
