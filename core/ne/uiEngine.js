// ============================================================================
//  core/ne/uiEngine.js — 让 ne 记号用 **ne 引擎**展开（B 方案的收口层）
// ============================================================================
//  背景：UI（ui/app.js）与 core/engine.js（旧引擎）绑在一起 —— 节点形状是
//  {expr, low, subitems}，展开靠 FSbounded + 手写下界。ne 记号没有 low，上界由树位置
//  决定（get_bound = 先根遍历的下一个节点），于是 core/ne/uiBridge.js 只能给它**猜**一个
//  下界。猜出来的下界能跑通，但**展开出来的树形与 ne 不一致**，实测：
//      node .tmp-ne/compare-engines-tree.mjs
//        prss    ne 3 节点 / 旧引擎+适配层 2 节点      （少展了一步）
//        rcss    ne 10     / 59                        （多展了）
//        mountain ne 5     / 17                        （多展了）
//  用户要求「ner 里能运行的 js，在我这边展开必须一致」，所以 ne 记号改走**真 ne 引擎**
//  （core/ne/tree.js + expander.js，与 ne-rewritten 的 expander.ts 同源）。
//
//  ── 做法：镜像 ────────────────────────────────────────────────────────────
//  不重写 UI，而是让 ne 树当**真相**，把它镜像成 UI 认识的旧式形状：
//    · 每个 UI 节点用 `_neNode` 指向对应的 ne 节点；
//    · 展开后重建 subitems（按 _neNode 身份复用旧 UI 节点，_uid / _collapsed / note
//      这些 UI 附加字段因此不丢）；
//    · `low` 字段在 ne 路径上没人用（旧引擎才读），填 [[]] 占位即可。
//  于是 UI 一行渲染代码都不用改，树形却完全由 ne 引擎决定。
//
//  ⚠ 与旧引擎的语义差异（有意为之，不是缺陷）：
//    · `extra`（additionalExpand，在节点前补若干 FS 项）ne 引擎没有对应概念 → 忽略；
//      该设置默认为 0，只有用户手动调大时才会察觉。
//    · 旧引擎的 tier 与 ne 的 tier 语义基本对齐（0=展开一次，1=沿链到底，≥2=多层）。
// ============================================================================
import { expand_item, set_expand_deadline, clear_expand_deadline } from './expander.js';
import { default_FS_variant, resolve_FS } from './fsVariants.js';
import { create_node, find_prev, get_bound, init_dataset } from './tree.js';

/** 该记号是否走 ne 引擎（适配层接管的 ne 记号都走）。 */
export function is_ne(notation) {
  return !!(notation && notation._ne && notation._def);
}

/** ne 节点 → UI 节点（首次创建）。 */
function to_ui_node(neNode) {
  return { expr: neNode.expr, low: [[]], subitems: [], _neNode: neNode };
}

/**
 * 把 ne 容器（含 children 的节点/根）镜像进 uiList（**原地**改写，保持数组引用）。
 * 已有的 UI 节点按 `_neNode` 身份复用，UI 附加字段（_uid/_collapsed/note）不丢。
 */
function rebuild(neContainer, uiList) {
  const byNe = new Map();
  for (const u of uiList) if (u && u._neNode) byNe.set(u._neNode, u);
  const next = (neContainer.children ?? []).map((k) => {
    const u = byNe.get(k) ?? to_ui_node(k);
    if (!u.subitems) u.subitems = [];
    rebuild(k, u.subitems);
    return u;
  });
  uiList.length = 0;
  uiList.push(...next);
}

/** 从任一 ne 节点上溯到数据集根（parent 为 null 的那个容器）。 */
function root_of(neNode) {
  let n = neNode;
  while (n && n.parent) n = n.parent;
  return n;
}

/**
 * 建树（ne 路径）。
 * @param {object} notation 适配层给的旧式对象（带 _def）
 * @param {*} expr 给定则用它当唯一根；不给则用 def.init() 的示例列表
 * @returns {Array} 旧式形状的根列表（节点带 _neNode）
 */
export function make_tree(notation, expr) {
  const def = notation._def;
  let container;
  if (expr === undefined || expr === null) {
    container = init_dataset(def);
  } else {
    // 与 init_dataset 同构，只是根换成用户给的表达式
    container = { expr: null, children: [], parent: null, index: -1 };
    container.children.push(create_node(expr, container, 0));
  }
  const uiList = [];
  rebuild(container, uiList);
  return uiList;
}

/**
 * 展开（ne 路径）。
 * @returns {{changed: boolean, created: object|null}|null}
 *          null 表示「这个节点不是 ne 节点，请走旧引擎」；
 *          created 是新建出来的 ne 节点（app.js 的初始展开链要拿它继续展开）。
 */
/**
 * 这棵树里的这个节点**还能不能展开**（用于决定要不要显示 `[+]`）。
 *
 * 为什么不能用 core/engine.js 的 canExpandNode：那是旧引擎的判据（看 `able`/`semiable`），
 * 既不看 ne 的 `is_limit`/FS 语义，也不看树位置带来的上界（bound）。实测
 * `bm4 (0)(0)(1)`：旧判据说"能展开"→ 显示 `[+]`，而 ne 引擎展开返回 undefined → **点了没反应**
 * （用户反馈的正是这个）。
 *
 * 这里与 expander.js 的 `expand_single` **同构**（只是不建节点）：
 *   · 极限式：从 fs_state 续接（或从头）找第一个越过 bound 的基本列项；
 *   · 非极限式：FS(e,0) 必须严格小于自身、且越过 bound。
 *
 * @returns {boolean|null} null = 不是 ne 记号（调用方回退旧判据）
 */
export function can_expand_ne(notation, uiNode) {
  if (!is_ne(notation) || !uiNode || !uiNode._neNode) return null;
  const def = notation._def;
  const node = uiNode._neNode;
  const variant = default_FS_variant(def);
  let fs;
  try {
    fs = resolve_FS(def, variant);
  } catch {
    return false;
  }
  if (typeof fs !== 'function') return false;
  const bound = get_bound(node);
  try {
    if (def.is_limit(node.expr)) {
      let i = node.fs_state && node.fs_state.variant === variant ? node.fs_state.index + 1 : 0;
      for (let k = 0; k < MAX_EXPAND_TRIES; k++, i++) {
        const res = fs(node.expr, i);
        if (res === undefined || res === null) return false;
        if (bound === undefined || def.compare(res, bound) > 0) return true;
      }
      return false;
    }
    const res = fs(node.expr, 0);
    if (res === undefined || res === null) return false;
    if (def.compare(res, node.expr) >= 0) return false;
    if (bound !== undefined && def.compare(res, bound) <= 0) return false;
    return true;
  } catch {
    return false; // 判据本身抛错（病态记号）→ 当作展不动，宁可少显示一个 [+]
  }
}

/** 判定时的试展开上限（与 expander 的 max_find_fs 同量级；只用于显示判定）。 */
const MAX_EXPAND_TRIES = 32;

/**
 * 展开一次（ne 引擎），随后把整棵 ne 树镜像回 rootList。
 * @param {object} notation UI 侧记号对象（含 _ne/_def）
/**
 * **导航到目标表达式** —— 照 ne-rewritten 的「跳转到」做法（`analysis.ts` 的
 * `import_analysis_eager` + `SettingsBar.handle_find`）：
 *
 * 它**不是枚举搜索**，而是用 `compare` 在树上"走"：
 *   · 与目标相等        → 命中，返回该节点
 *   · 当前 **小于** 目标 → 在当前位置 `expand_item` **现场展开一步**（树会长出来），继续比
 *   · 当前 **大于** 目标 → `find_prev` 往前挪一个节点（先根序的前驱）
 * 所以它是"按序逼近"，对能反解析的记号很快（这也解释了参考版跳转后树里会多出一串节点）。
 *
 * ⚠ 会在**原地**改树（这正是参考版的行为：跳转时按需展开）。失败时给明确原因。
 *
 * @returns {{found: boolean, node?: object, steps: number, reason?: string, last?: any}}
 *          reason: 'no-start' | 'expand-failed' | 'no-prev' | 'max-steps'
 */
export function navigate_to_target(notation, rootList, targetExpr, opts = {}) {
  if (!is_ne(notation)) return { found: false, steps: 0, reason: 'not-ne' };
  const def = notation._def;
  const maxSteps = opts.maxSteps ?? 4000;
  const timeLimitMs = opts.timeLimitMs;

  /**
   * 起点必须是**最后一个后代**（照 ne-rewritten 的 `last_descendant(root)`）：
   * ne 树的先根序是**递减**的（越往后越小），所以树末 = 最小的项。
   * 从这里出发：需要更小就展开、需要更大就 find_prev —— 两个方向都朝目标走。
   */
  const last_descendant = (list) => {
    let node = null;
    for (const n of list) if (n && n._neNode) node = n;
    if (!node) return null;
    while (node.subitems && node.subitems.length) {
      const kids = node.subitems.filter((k) => k && k._neNode);
      if (!kids.length) break;
      node = kids[kids.length - 1];
    }
    return node;
  };

  let uiNode = last_descendant(rootList);
  if (!uiNode) return { found: false, steps: 0, reason: 'no-start' };
  let steps = 0;

  while (steps < maxSteps) {
    steps++;
    let cmp;
    try {
      cmp = def.compare(uiNode.expr, targetExpr);
    } catch (e) {
      return { found: false, steps, reason: 'expand-failed', last: e && e.message };
    }
    if (cmp === 0) return { found: true, node: uiNode, steps };

    if (cmp > 0) {
      // 当前比目标**大** → 展开一步得到更小的项（树序递减）
      const res = expand_ne(notation, rootList, uiNode, 0, 0, timeLimitMs);
      if (!res || !res.changed) return { found: false, steps, reason: 'expand-failed', last: uiNode };
      const created = ui_node_of(rootList, res.created);
      if (!created) return { found: false, steps, reason: 'expand-failed', last: uiNode };
      uiNode = created;
    } else {
      // 当前比目标**小** → 沿先根序往前挪（那边是更大的项）
      const prev = find_prev(uiNode._neNode, 0);
      if (!prev) return { found: false, steps, reason: 'no-prev', last: uiNode };
      const ui = ui_node_of(rootList, prev);
      if (!ui) return { found: false, steps, reason: 'no-prev', last: uiNode };
      uiNode = ui;
    }
  }
  return { found: false, steps, reason: 'max-steps', last: uiNode };
}

/**
 * 把一个**外部解析出来的表达式**作为新的根追加进树（ner 允许在节点里放任意表达式；
 * 这里最接近的做法就是加一个根）。返回新建的 ne 节点，失败返回 null。
 */
export function append_root(notation, rootList, expr) {
  if (!is_ne(notation)) return null;
  const first = rootList.find((n) => n && n._neNode);
  const container = first ? root_of(first._neNode) : null;
  if (!container) return null;
  const node = create_node(expr, container, container.children.length);
  container.children.push(node);
  rebuild(container, rootList);
  return node;
}

/**
 * @param {Array} rootList UI 根列表（原地改写）
 * @param {object} uiNode 要展开的 UI 节点
 * @param {number} tier 展开层级
 * @param {number} extra 额外 FS 项（ne 路径忽略）
 * @param {number} [timeLimitMs] 毫秒上限（0/未给 = 不限制）；超时抛 TimeLimitError
 * @returns {{changed: boolean, created: object|null}|null} null = 不是 ne 记号（交给旧引擎）
 */
export function expand_ne(notation, rootList, uiNode, tier, extra, timeLimitMs) {
  if (!is_ne(notation) || !uiNode || !uiNode._neNode) return null;
  const def = notation._def;
  // 期限用 try/finally 兜住：抛错（超时 / 试展开过多）也必须清掉，否则会污染后续展开
  set_expand_deadline(timeLimitMs);
  try {
    const created = expand_item(uiNode._neNode, def, default_FS_variant(def), tier);
    const container = root_of(uiNode._neNode);
    if (container) rebuild(container, rootList);
    if (extra) {
      // 有意忽略：ne 引擎没有「在节点前补额外 FS 项」的概念（见文件头说明）
    }
    return { changed: !!created, created: created ?? null };
  } finally {
    clear_expand_deadline();
  }
}

/**
 * 展开后 UI 侧需要知道「新生成的节点在哪」时用：把 ne 节点换成对应的 UI 节点。
 * （app.js 的初始展开链要拿到刚生成的那个节点继续展开。）
 */
export function ui_node_of(rootList, neNode) {
  let found = null;
  const walk = (list) => {
    for (const u of list) {
      if (u._neNode === neNode) { found = u; return true; }
      if (u.subitems && walk(u.subitems)) return true;
    }
    return false;
  };
  walk(rootList);
  return found;
}
