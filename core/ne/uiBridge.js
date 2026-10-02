// ============================================================================
//  core/ne/uiBridge.js — 阶段四适配层（A 方案）
// ============================================================================
//  目的：让现有 UI（ui/app.js，按远古接口 + 旧引擎写的）能用上 notation/ne/ 里的
//  ne 原生记号，而**不改动 app.js 的树结构与展开逻辑**。
//
//  做法：把 ne 记号「伪装」成旧式记号对象 —— able / semiable / compare / FS /
//  FSalter / display / parse，以及 init() 返回 [{expr, low, subitems}]，
//  然后交给 core/engine.js 展开。
//
//  ── 核心难点：下界 ────────────────────────────────────────────────────────
//  ne 没有 low：上界由树位置决定（get_bound = 先根遍历的下一个节点）。旧引擎却
//  强制要求 low[0]，而且**终止条件依赖它**：engine.js:159 的
//      compare(low[0], expr) >= 0 → 停止展开
//  是防止 `0 → FS(0,0)=0 → 0 …` 这类不自减情形无限递归的唯一闸门。
//  第一版试过「下界放一个小于一切的哨兵对象」——结果正是死在这里：
//  哨兵让该比较恒为负，递归永不终止（RangeError: Maximum call stack size exceeded）。
//  所以下界必须是**记号自己的最小表达式**，且要满足：
//      compare(最小元, expr) < 0   （否则一开始就不展开）
//      降到最小元时 >= 0            （否则停不下来）
//
//  取值策略（按序探测，见 probe()）：
//    ① 空表达式 `[]` —— 序列/矩阵类记号的最小元，最常见；
//    ② 借用**同名远古记号** init 里作者手写的 low —— 本项目 168/168 个记号都有
//       同名旧版，这一级能兜住 CNF 这类（旧 CNF 的 low 是 `0`，而 `[]` 在 ne 的
//       CNF compare 里是非法表达式）；
//    ③ 都不行 → 判该记号**不适配**，不接管（继续用旧版），避免把崩溃带进 UI。
//  ⚠ 判据必须拿**基本列项**去验，不能只验 init 种子：旧引擎的 FSbounded 做的是
//    compare(FS(seed,n), low[0])（low 当右操作数），而很多记号的 init 种子是 `Limit`
//    这种 ∞ 占位式（引擎自己有 isInfinityExpr 特例跳过它）。只验种子会两头出错：
//    既漏掉 BOCF 这类「种子能比、FS 项不能比」的，又误拒 BBM 这类「种子是 ∞、
//    FS 项完全正常」的。详见 probe() 里的四条判据。
//
//  切换开关：**默认就用 ne**（notation/ne/ 是记号的正主）；URL 带 `?legacy=1` 退回
//  百分之百的远古实现。ne 引擎自己就崩的 6 个（见 NE_ENGINE_BROKEN）自动回落远古版。
//  验证：node scripts/verify-uibridge.mjs [--legacy]
// ============================================================================
import { deepClone } from '../engine.js';
import * as legacy from '../register.js';
import { get_notation as ne_get, list_notations as ne_list } from './registry.js';
import { resolve_display } from './notationDef.js';

/**
 * 是否用 ne 记号接管同名 id。**默认开**；`?legacy=1` 关掉（退回远古实现）。
 * `?ne=1` 仍然接受（等同默认），老书签不至于失效。
 */
export const USE_NE = (() => {
  try {
    const q = typeof location !== 'undefined' ? location.search : '';
    return new URLSearchParams(q).get('legacy') !== '1';
  } catch {
    return true;
  }
})();

const cache = new Map();
const unsafe = new Set(); // 判定为「无法安全适配」的 ne 记号 id

/**
 * 已知在 ne 引擎下自身就会失败的记号 —— 与 .tmp-ne/MIGRATION-NOTES.md 记录的那批
 * 冒烟例外一致（TON 的 DoR 四记号在 tier=1 的第二个分量上会抛，partial-UPMS 的
 * 第 8/9 档会陷入"试展开次数过多"）。它们即便被接管也没法在 UI 里展开，
 * 而且**会挂住进程**（全量冒烟实测卡在 ton-drc），所以直接不接管、留旧版。
 */
/**
 * **ne 引擎自己就崩**的记号 —— 连 ne 路径都用不了，只能回落远古实现。
 *
 * 这一组全是 ne 上游缺陷（不是搬运问题，与 ne 原版逐字同错）：
 *   · TON 家族 9 个：`Cannot read properties of undefined (reading '1')`
 *   · upms-partial-8 / upms-partial-9：ne expander 的「试展开次数过多」守卫
 *
 * 判定依据（两条都要看，缺一会漏）：
 *   · node scripts/verify-ne-integration.mjs
 *       —— 只展开 init 的首个根节点，抓到 DoR 四记号 + upms-partial-8/9 共 6 个；
 *   · node .tmp-ne/verify-uiengine-all.mjs
 *       —— 按 UI 的真实做法连展两步，TON 家族另外 5 个（ton-m / ton-i / ton-ibp /
 *          ton-mc / ton-mpc）也抛同一个错。**只跑前一个会漏掉它们**，实测教训。
 *
 * ⚠ 曾经这份名单有 30 个 —— 那是因为当时 UI 走的是**旧引擎**（A 方案），
 * 旧引擎需要下界，而下界猜不出来、或者猜错会挂/爆栈的都只能排除。
 * 现在 ne 记号改走 ne 引擎（core/ne/uiEngine.js），旧引擎的约束不再适用：
 *   · 原「下界判据失效」那 17 个（OCF 系 + omega-y/y-seq/mm 系 + asan 系）已放行；
 *   · 只是**旧引擎**下会挂、ne 引擎正常的（如 cocf）也已放行。
 */
const NE_ENGINE_BROKEN = new Set([
  // TON 家族：9 个全中（名字按 id 排序）
  'ton-dr',
  'ton-drc',
  'ton-drp',
  'ton-drpc',
  'ton-i',
  'ton-ibp',
  'ton-m',
  'ton-mc',
  'ton-mpc',
  // UPMS partial 高段
  'upms-partial-8',
  'upms-partial-9',
]);

/** 该记号能否安全地交给旧引擎（见文件头「核心难点」）。 */
function probe(def) {
  if (unsafe.has(def.id) || NE_ENGINE_BROKEN.has(def.id)) {
    unsafe.add(def.id);
    return null;
  }
  const cached = cache.get(def.id);
  if (cached) return cached;

  let exprs;
  try {
    exprs = def.init ? def.init() : [];
  } catch {
    unsafe.add(def.id);
    return null;
  }
  if (!Array.isArray(exprs) || exprs.length === 0) {
    unsafe.add(def.id);
    return null;
  }
  const probeExpr = exprs[0];

  // 引擎对「∞ 占位式」有特例：engine.js:130 的 isInfinityExpr 会跳过它的所有下界比较
  // （这些记号的 init() 种子就是 `Limit`，不存在「比它小」的表达式，拿它验下界毫无意义）。
  const is_infinity = (e) => {
    try {
      return '' + e === 'Infinity';
    } catch {
      return false;
    }
  };

  // 下界合格判据。四条，缺一个都会在别处炸：
  //   ① low 与**基本列项**双向可比较 —— 只验 compare(low, seed) 不够：旧引擎的
  //      FSbounded（engine.js:84）做的是 compare(FS(seed,n), low[0])，即 low 当右操作数。
  //      BOCF 系就死在这：compare(Limit, []) 能过，compare(ψ(0), []) 读 undefined 的 '0'。
  //   ② 至少有一个前排基本列项严格大于 low —— 否则 FSbounded 的收敛条件永不成立。
  //   ③ seed 不是 ∞ 时，low 必须严格小于 seed（否则引擎的「下界已 ≥ 表达式」闸
  //      一开始就拦掉，永远展不开）。
  //   ④ seed 是 ∞ 时跳过 ③ —— 与引擎的 isInfinityExpr 特例同构。
  const ok = (low) => {
    try {
      if (!is_infinity(probeExpr)) {
        if (!(def.compare(low, probeExpr) < 0)) return false;
        if (!(def.compare(probeExpr, low) >= 0)) return false;
      }
      let any_above = false;
      for (let i = 0; i < 3; i++) {
        const t = def.FS(probeExpr, i);
        if (t === undefined || t === null) break;
        const c = def.compare(t, low); // 抛错即不合格
        def.compare(low, t); // 反向也要求能比
        if (is_infinity(t)) continue;
        if (c > 0) any_above = true;
      }
      return any_above || is_infinity(probeExpr);
    } catch {
      return false;
    }
  };

  let low;
  if (ok([])) {
    low = [];
  } else {
    // 借用同名远古记号 init 的手写下界
    try {
      const lg = legacy.getNotation(def.id);
      const cand = lg && typeof lg.init === 'function' ? lg.init()?.[0]?.low?.[0] : undefined;
      if (cand !== undefined && ok(cand)) low = cand;
    } catch {
      /* 落到下面判为不适配 */
    }
  }

  if (low === undefined) {
    unsafe.add(def.id);
    return null;
  }

  cache.set(def.id, low);
  return low;
}

/** 该 ne 记号的 parse/views 元数据能否用。与 getNotation 同口径：
 *  只要 ne 引擎能用（不是那 6 个上游缺陷），就返回它的 meta —— 哪怕它同时
 *  也能被旧引擎适配、或者只能走 ne 路径。 */
function is_adapted(id, def) {
  const d = def ?? ne_get(id);
  return !!d && usable_ne(d);
}

/** ne 记号 → 旧式记号对象；无法安全适配时返回 null。 */
function to_legacy(def) {
  const low = probe(def);
  if (low === null) return null;

  const disp = resolve_display(def.display);
  return {
    id: def.id,
    name: def.name,
    simple_name: def.simple_name,
    category_id: def.category_id,
    credit_text_id: def.credit_text_id,
    _ne: true,
    _def: def,

    // 旧 UI 会把 display 的返回值塞进 innerHTML，故优先用 html 视图
    display: (expr) => {
      try {
        const f = disp.html || disp.plain;
        return f(expr);
      } catch {
        return String(expr);
      }
    },
    parse: typeof disp.from_display === 'function' ? (s) => disp.from_display(s) : undefined,

    able: typeof def.is_limit === 'function' ? def.is_limit : undefined,
    // ne 引擎对非 limit 节点也会试 FS(expr,0)；旧引擎只有 semiable 才走这条路。
    // 但**不能简单等价成「非 limit」** —— 旧引擎的展开链靠
    //     it.low[0] = 新项  （engine.js:180）
    // 推进，而新项的 low 复刻的是父节点的 low（engine.js:167）。若 FS(后继式, 0)
    // 返回自身（就是「没有前驱」的情形，classicNotation 适配器正是这么做的），那么
    // 「compare(FS(e,0), low[0]) > 0」恒真、每轮都生成同一个表达式、low 永远不动 ——
    // 展开链无限递归，最后在 '' + 深层嵌套数组 上爆栈（实测 33 个移植记号全中，
    // 见 .tmp-ne/debug-classic-path.mjs）。
    // 所以这里再加一道闸：只有 FS(expr,0) 严格小于 expr（真前驱）时才算可展开。
    // ne 原生记号本来就满足这条，行为不变；不满足的（后继无前驱）直接判不可展开。
    semiable:
      typeof def.is_limit === 'function'
        ? (expr) => {
            try {
              if (def.is_limit(expr)) return false;
              return def.compare(def.FS(expr, 0), expr) < 0;
            } catch {
              return false;
            }
          }
        : undefined,

    compare: def.compare,
    FS: def.FS,
    FSalter: def.FS_alter,
    FSshort: def.FS_short,

    // 每次调用都新建节点对象（旧引擎会原地改 low/subitems），expr / low 深拷贝避免共享
    init: () => {
      let exprs;
      try {
        exprs = def.init ? def.init() : [];
      } catch {
        return [];
      }
      return exprs.map((expr) => ({
        expr: deepClone(expr),
        low: [deepClone(low)],
        subitems: [],
      }));
    },
  };
}

/** ne 记号对应的旧式 meta（parse / views / simple_name）。 */
function meta_of(def) {
  const disp = resolve_display(def.display);
  return {
    parse: typeof disp.from_display === 'function' ? disp.from_display : undefined,
    views: def.display_equiv ? Object.keys(def.display_equiv) : undefined,
    simple_name: def.simple_name,
    _ne: true,
  };
}

/**
 * ne 记号 → **ne 路径**用的薄对象。
 *
 * 什么时候用：UI 现在让 ne 记号走 ne 引擎（core/ne/uiEngine.js），而 ne 引擎
 * **不需要下界**。所以「probe 猜不出下界」不再是不能用的理由 —— 只有 ne 引擎自己
 * 就崩的那 6 个（NE_ENGINE_BROKEN）才真用不了。这个薄对象只提供 ne 路径与渲染真正
 * 会用到的东西（display / parse / compare / _def），**故意不提供 able/semiable/FS**：
 * 万一有人误把它喂给旧引擎（例如导入的树没有 _neNode），core/engine.js 会看到
 * `typeof FS !== 'function'` 直接返回「未展开」，不会崩。
 */
function to_ne_native(def) {
  const disp = resolve_display(def.display);
  return {
    id: def.id,
    name: def.name,
    simple_name: def.simple_name,
    category_id: def.category_id,
    credit_text_id: def.credit_text_id,
    _ne: true,
    _def: def,
    display: (expr) => {
      try {
        const f = disp.html || disp.plain;
        return f(expr);
      } catch {
        return String(expr);
      }
    },
    parse: typeof disp.from_display === 'function' ? (s) => disp.from_display(s) : undefined,
    compare: def.compare,
  };
}

/** 该 ne 记号是否可用（ne 引擎路径）。只有 6 个上游就崩的不算。 */
function usable_ne(def) {
  return !NE_ENGINE_BROKEN.has(def.id);
}

/**
 * 取记号。USE_NE 时同 id 优先 ne 版本（但只在该版本能安全适配时）；
 * 否则维持旧行为，仅在旧注册表没有该 id 时才回落到 ne。
 */
export function getNotation(id) {
  if (USE_NE) {
    const n = ne_get(id);
    if (n && usable_ne(n)) {
      // 优先给「同时能喂旧引擎」的完整适配对象；猜不出下界也无所谓 ——
      // UI 的 ne 记号走 ne 引擎，给薄的 ne 原生对象即可。
      return to_legacy(n) ?? to_ne_native(n);
    }
    // 剩下的是 ne 引擎自己就崩的 6 个 → 回落远古实现
  }
  const l = legacy.getNotation(id);
  if (l) return l;
  const n = ne_get(id);
  if (!n) return undefined;
  return usable_ne(n) ? (to_legacy(n) ?? to_ne_native(n)) : undefined;
}

/**
 * 全部记号。USE_NE 时用 ne 版本替换同 id 的旧版本（除非该记号 ne 引擎自己就崩）；
 * 否则旧版优先，只追加旧注册表里没有的 ne 记号（迁移期两者并存）。
 */
export function getAllNotations() {
  const out = legacy.getAllNotations().slice();
  const seen = new Set(out.map((n) => n.id));
  for (const def of ne_list()) {
    if (!usable_ne(def)) continue; // ne 引擎自己就崩的（见 NE_ENGINE_BROKEN）：保留远古版
    const picked = () => to_legacy(def) ?? to_ne_native(def);
    if (seen.has(def.id)) {
      if (USE_NE) {
        const i = out.findIndex((n) => n.id === def.id);
        if (i >= 0) out[i] = picked();
      }
    } else {
      out.push(picked());
      seen.add(def.id);
    }
  }
  return out;
}

/** 名字 → id 映射，合并两套注册表。
 *
 * 除字面形式外，还登记**输入归一化后的形式**：ui/notationParser.js 匹配前会把输入
 * 统一成「小写 + ω→w + 去空白」，所以 'ωY actual'、'SωDBMS v1'、'TON_DoR' 这类带
 * 空格/ω 的名字必须按归一化键登记，否则 /list 里显示「可输入：ωYactual」但实际
 * 输入进去匹配不上（这次重构 /list 时发现）。
 */
export function buildNameMap() {
  const map = legacy.buildNameMap();
  const norm = (s) => String(s).toLowerCase().replace(/ω/g, 'w').replace(/\s+/g, '');
  // 只增不覆盖：默认模式下必须保持旧输入的解析结果不变，所以 ne 侧的名字只在
  // 该键还**没有**映射时才登记。少了这一层，/list 里显示的 ne 名字（如 'ωY weak'、
  // 'TON_DoR'、'(>2)-UPMS'）会因为旧注册表里存在同 id 而被跳过，出现「显示得出来、
  // 输进去不认」的假提示（这次重构 /list 时实测到）。
  const put = (key, id) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, id);
    const nk = norm(key);
    if (nk && !map.has(nk)) map.set(nk, id);
  };
  for (const def of ne_list()) {
    if (USE_NE || !map.has(def.id.toLowerCase())) put(def.id, def.id);
    if (def.name) put(def.name, def.id);
    if (def.simple_name) put(def.simple_name, def.id);
    // 记号自带的输入别名（如 veblen-phi 的 'veblen'）——用户在输入框里会直接敲它
    if (Array.isArray(def.aliases)) for (const a of def.aliases) put(a, def.id);
  }
  return map;
}

/**
 * NOTATION_META 的惰性视图：ne 记号按需生成 parse / views。
 * 用 Proxy 而不是加载时合并 —— ne 记号是 ES module，加载时机晚于本模块求值。
 */
export const NOTATION_META = new Proxy(
  {},
  {
    get(_t, key) {
      if (typeof key !== 'string') return undefined;
      if (USE_NE) {
        const n = ne_get(key);
        // ⚠ 必须与 getNotation 同口径：接管失败的记号在 ?ne=1 下拿到的仍是远古版
        // 对象，若这里仍返回 ne 的 parse/views，就会出现「对象是远古的、解析规则是
        // ne 的」这种混搭（UI 的视图切换/表达式解析都会错）。
        if (n && is_adapted(key, n)) return meta_of(n);
      }
      const l = legacy.NOTATION_META[key];
      if (l) return l;
      const n = ne_get(key);
      // 同上：接管不成功且远古侧没有 meta 时，返回 undefined 而不是 ne 的 meta
      return n && is_adapted(key, n) ? meta_of(n) : undefined;
    },
    has(_t, key) {
      return typeof key === 'string' && (!!legacy.NOTATION_META[key] || !!ne_get(key));
    },
    ownKeys() {
      return [...new Set([...Object.keys(legacy.NOTATION_META), ...ne_list().map((n) => n.id)])];
    },
    getOwnPropertyDescriptor(_t, key) {
      if (typeof key !== 'string') return undefined;
      if (legacy.NOTATION_META[key] || ne_get(key)) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  },
);

/**
 * 供测试与诊断：ne 引擎**自己就崩**、因而只能回落远古实现的记号 id。
 * ⚠ 语义已变：以前是「probe 猜不出下界、旧引擎用不了」的清单（曾有 30 个），
 * 现在 UI 的 ne 记号走 ne 引擎，只有这 6 个上游缺陷才算不能用。
 * `probe()` 里仍会把「旧引擎适配失败」记进同一个 unsafe 集合 —— 那只是
 * 「旧引擎用不了、但 ne 路径照常」，故这里按 NE_ENGINE_BROKEN 过滤后返回。
 */
export function ne_unsafe_ids() {
  for (const def of ne_list()) probe(def);
  return ne_list()
    .map((d) => d.id)
    .filter((id) => NE_ENGINE_BROKEN.has(id))
    .sort();
}
