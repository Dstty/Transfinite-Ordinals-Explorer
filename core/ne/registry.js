// ============================================================================
//  core/ne/registry.js — 记号 / 分类注册表（移植自 ne-rewritten src/core/registry.ts）
// ============================================================================
//  取代远古版的「平铺 register.push 数组 + ui/notationList.js 旁挂分类」：
//    - 记号自带 category_id，导航树由注册表生成；
//    - 分类可带 generator，按 n 现场实例化成员（n-MN / GMS n-P / -1Y-nSS …）；
//    - 初始变体：用户自定义初始列表 → 派生出一个独立记号（base$seq）。
//
//  与 ne 的差异：去掉 i18n 依赖（name 由调用方解析）；其余行为逐行对齐。
// ============================================================================

import { resolve_display } from './notationDef.js';

export class RegisterError extends Error {
  constructor(id, message) {
    super(message ?? `条目 '${id}' 已注册。`);
    this.name = 'RegisterError';
    this.id = id;
  }
}

// ===========================================================================
//  分类注册
// ===========================================================================

const category_defs = new Map();
const root_items = [];
const category_items = new Map();

/**
 * 向容器列表（category/root）插入条目；after_id 给定时插入到该锚点之后（须在同一列表）。
 * 锚点不存在或不在同一列表 → 追加到末尾。
 */
function add_item(cat_id, kind, id, after_id) {
  const list = cat_id ? (category_items.get(cat_id) ?? []) : root_items;
  const item = { kind, id };
  if (after_id !== undefined) {
    const idx = list.findIndex((x) => x.id === after_id);
    if (idx !== -1) {
      list.splice(idx + 1, 0, item);
      if (cat_id && !category_items.has(cat_id)) category_items.set(cat_id, list);
      return;
    }
  }
  list.push(item);
  if (cat_id && !category_items.has(cat_id)) category_items.set(cat_id, list);
}

export function register_category(cat) {
  if (category_defs.has(cat.id) || map.has(cat.id)) {
    throw new RegisterError(cat.id, `分类 '${cat.id}' 与已有条目冲突。`);
  }
  if (cat.parent_id !== undefined && !category_defs.has(cat.parent_id)) {
    throw new RegisterError(cat.id, `分类 '${cat.id}' 的父分类 '${cat.parent_id}' 不存在。`);
  }
  category_defs.set(cat.id, cat);
  add_item(cat.parent_id, 'category', cat.id);
  // generator 分类：注册定义后立即水合其成员。
  if (cat.generator) {
    if (!gen_state_ready) {
      console.warn(
        `register_category: 分类 '${cat.id}' 带 generator，但注册前未调用 set_generator_state()；` +
          '持久化的档位进度可能丢失。',
      );
    }
    register_generated_members(cat);
  }
}

/** 注册或「升级」分类。
 *
 * 场景：notation/ne/categories.js 提供分类骨架（纯容器），而带 generator 的分类
 * 由记号文件自己注册（ne 里就在记号文件内定义）。两者分工时会出现「骨架已注册了
 * 同名分类但没有 generator」的情况——register_category 会因 id 重复抛错，
 * 导致 generator 无法水合成员。
 *
 * 本函数把这个场景变成幂等操作：分类不存在则注册；已存在但缺 generator 则补上
 * 并立即水合成员（不会注销重建，已注册的子项与子分类都不受影响）。
 */
export function ensure_category(def) {
  const existing = category_defs.get(def.id);
  if (!existing) {
    register_category(def);
    return;
  }
  if (def.generator && !existing.generator) {
    existing.generator = def.generator;
    if (!gen_state_ready) {
      console.warn(
        `ensure_category: 分类 '${def.id}' 补 generator 时尚未调用 set_generator_state()；档位进度可能丢失。`,
      );
    }
    register_generated_members(existing);
  }
}

export function get_category(id) {
  return category_defs.get(id);
}

export function get_root_items() {
  return root_items;
}

export function get_category_children(id) {
  return category_items.get(id) ?? [];
}

export function get_category_ancestors(category_id) {
  const ancestors = [];
  let current = category_id;
  while (current) {
    ancestors.unshift(current);
    current = category_defs.get(current)?.parent_id;
  }
  return ancestors;
}

/** 全部分类（供 /list 之类的导航渲染）。 */
export function list_categories() {
  return Array.from(category_defs.values());
}

// ===========================================================================
//  记号注册
// ===========================================================================

const map = new Map();

/**
 * 内部注册：不校验 generator 限制（供 generator 水合、变体注册等内部路径使用）。
 * after_id 给定时插入到容器列表中该锚点记号之后（须同一容器）。
 */
function _register_notation(notation, after_id) {
  if (notation.category_id !== undefined && !category_defs.has(notation.category_id)) {
    throw new RegisterError(
      notation.id,
      `记号 '${notation.id}' 的分类 '${notation.category_id}' 不存在。`,
    );
  }
  if (category_defs.has(notation.id)) {
    throw new RegisterError(notation.id, `已存在同名分类 '${notation.id}'，无法注册为记号。`);
  }
  if (map.has(notation.id)) {
    throw new RegisterError(notation.id, `记号 '${notation.id}' 已注册。`);
  }
  map.set(notation.id, notation);
  add_item(notation.category_id, 'notation', notation.id, after_id);
  // 注册后立即水合该记号可能存在的初始变体（幂等）
  ensure_variants(notation.id);
  // 通知订阅者（UI 的输入名索引要靠它感知运行期新注册的记号，
  // 如 /notation 命令加进来的自定义记号）
  notify_change();
}

/**
 * 注册记号。original_id 给定时插入到同一容器中该记号之后（让派生记号与源记号紧邻）。
 * generator 分类下的成员不允许直接注册（应由 register_category 自动水合）。
 */
export function register_notation(notation, original_id) {
  if (notation.category_id !== undefined) {
    const cat = category_defs.get(notation.category_id);
    if (cat?.generator) {
      throw new RegisterError(
        notation.id,
        `'${notation.id}' 属于 generator 分类 '${cat.id}'，其成员由 register_category 水合；` +
          '其他派生记号请走内部注册路径。',
      );
    }
  }
  _register_notation(notation, original_id);
}

export function get_notation(id) {
  return map.get(id);
}

export function list_notations() {
  return Array.from(map.values());
}

/** 原始注销：仅从注册表移除单个记号（变体注销与 base 级联的底层）。 */
function unregister_notation_raw(id) {
  const notation = map.get(id);
  if (!notation) return;
  map.delete(id);
  const list = notation.category_id
    ? (category_items.get(notation.category_id) ?? root_items)
    : root_items;
  const idx = list.findIndex((item) => item.id === id);
  if (idx !== -1) list.splice(idx, 1);
}

export function unregister_notation(id) {
  // 变体本身：仅注销（def 是否删除由 remove_init_variant 决定），不触发级联
  if (variant_base_of.has(id)) {
    unregister_notation_raw(id);
    return [id];
  }
  const notation = map.get(id);
  if (!notation) return [];
  // base：先卸载其已注册变体（defs 保留，base 重新注册时自动重生）
  const entries = variant_state.get(id);
  if (entries) {
    for (const entry of entries) {
      const vid = variant_id_of(id, entry.seq);
      if (map.has(vid)) unregister_notation_raw(vid);
    }
  }
  unregister_notation_raw(id);
  return [id];
}

export function unregister_category(id) {
  const cat = category_defs.get(id);
  if (!cat) return [];
  const removed = [];

  const children = category_items.get(id) ?? [];
  for (const child of children) {
    if (child.kind === 'category') {
      removed.push(...unregister_category(child.id));
    } else {
      removed.push(...unregister_notation(child.id));
    }
  }

  category_defs.delete(id);
  category_items.delete(id);

  const parent_list = cat.parent_id ? (category_items.get(cat.parent_id) ?? root_items) : root_items;
  const idx = parent_list.findIndex((item) => item.id === id);
  if (idx !== -1) parent_list.splice(idx, 1);

  removed.unshift(id);
  return removed;
}

export function unregister_item(id) {
  if (category_defs.has(id)) return unregister_category(id);
  if (map.has(id)) return unregister_notation(id);
  return [];
}

// ===========================================================================
//  Generator（按 n 现场实例化的家族分类）
// ===========================================================================

let gen_state = {};
/** 是否已注入持久化的 generator state（boot 时 set_generator_state 置 true）。 */
let gen_state_ready = false;

export function set_generator_state(state) {
  gen_state = state ?? {};
  gen_state_ready = true;
}

export function get_generator_state() {
  return gen_state;
}

/** Generator 变更监听器（供 UI 层订阅）。 */
const change_listeners = new Set();

export function on_registry_change(listener) {
  change_listeners.add(listener);
}

export function remove_registry_change_listener(listener) {
  change_listeners.delete(listener);
}

export function notify_change() {
  for (const listener of change_listeners) listener();
}

export function is_extra_generated(id) {
  const notation = get_notation(id);
  if (!notation?.category_id) return false;
  const cat = get_category(notation.category_id);
  if (!cat?.generator) return false;
  const items = get_category_children(notation.category_id);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return false;
  return idx >= cat.generator.initial - cat.generator.start + 1;
}

/** 内部：注册 generator 分类当前计数下的全部成员。 */
function register_generated_members(cat) {
  const gen = cat.generator;
  if (!gen) return;
  const cur = gen_state[cat.id] ?? gen.initial;
  for (let n = gen.start; n <= cur; n++) {
    _register_notation(gen.create(n));
  }
  gen_state[cat.id] = cur;
}

export function generator_current(cat_id) {
  const cat = category_defs.get(cat_id);
  if (!cat?.generator) return 0;
  return gen_state[cat_id] ?? cat.generator.initial;
}

export function generator_can_increment(cat_id) {
  return category_defs.get(cat_id)?.generator !== undefined;
}

export function generator_can_decrement(cat_id) {
  const cat = category_defs.get(cat_id);
  if (!cat?.generator) return false;
  return generator_current(cat_id) > cat.generator.initial;
}

/** 增加一档。(ne 无上限；本项目的家族上限策略在 UI 层另行约束。) */
export function generator_increment(cat_id) {
  const cat = category_defs.get(cat_id);
  if (!cat?.generator) return null;
  const cur = gen_state[cat_id] ?? cat.generator.initial;
  const next_n = cur + 1;
  const notation = cat.generator.create(next_n);
  _register_notation(notation);
  gen_state[cat_id] = next_n;
  notify_change();
  return notation.id;
}

export function generator_decrement(cat_id) {
  const cat = category_defs.get(cat_id);
  if (!cat?.generator) return;
  const cur = gen_state[cat_id] ?? cat.generator.initial;
  if (cur <= cat.generator.initial) return;
  // 从注册表中移除最后一个记号（不删除内存中的树和分析数据）
  const items = get_category_children(cat_id);
  const last_id = items.length > 0 ? items[items.length - 1].id : undefined;
  if (last_id) unregister_notation(last_id);
  gen_state[cat_id] = cur - 1;
  notify_change();
}

// ===========================================================================
//  初始变体（Init variants）
// ===========================================================================
//  变体 =「base 记号 + 用户自定义初始列表」派生的独立记号（合成 NotationDefinition 并注册）。
//  变体 id = `${base_id}$${seq}`（不透明，不反解；`$` 避开现有 id 字符集）。

const variant_state = new Map(); // base_id -> entries（seq 升序）
const variant_base_of = new Map(); // variant_id -> { base_id, seq }

function variant_id_of(base_id, seq) {
  return base_id + '$' + seq;
}

function rebuild_variant_index() {
  variant_base_of.clear();
  for (const [base_id, entries] of variant_state) {
    for (const entry of entries) {
      variant_base_of.set(variant_id_of(base_id, entry.seq), { base_id, seq: entry.seq });
    }
  }
}

export function is_init_variant(id) {
  return variant_base_of.has(id);
}

export function get_init_variant_meta(id) {
  return variant_base_of.get(id);
}

export function list_init_variant_ids(base_id) {
  const entries = variant_state.get(base_id);
  if (!entries) return [];
  return entries.map((entry) => variant_id_of(base_id, entry.seq));
}

export function list_init_variants(base_id) {
  const entries = variant_state.get(base_id);
  if (!entries) return [];
  return entries.map((entry) => ({ seq: entry.seq, init: entry.init.slice() }));
}

/** boot：从持久化数据采纳变体定义（镜像 set_generator_state）。 */
export function set_variant_state(state) {
  variant_state.clear();
  for (const base_id of Object.keys(state ?? {})) {
    const list = state[base_id];
    if (!Array.isArray(list)) continue;
    const entries = [];
    for (const e of list) {
      if (e && typeof e.seq === 'number' && Number.isFinite(e.seq) && e.seq >= 1 && Array.isArray(e.init)) {
        entries.push({ base_id, seq: e.seq, init: e.init.map(String) });
      }
    }
    entries.sort((a, b) => a.seq - b.seq);
    if (entries.length > 0) variant_state.set(base_id, entries);
  }
  rebuild_variant_index();
  for (const base_id of variant_state.keys()) ensure_variants(base_id);
}

/** 供 UI 回写持久化镜像。 */
export function get_variant_state_snapshot() {
  const result = {};
  for (const [base_id, entries] of variant_state) {
    result[base_id] = entries.map((entry) => ({ seq: entry.seq, init: entry.init.slice() }));
  }
  return result;
}

/** 解析 base 主显示的 from_display；失败返回 null。初始列表须严格递减。 */
function parse_init_list(base, strings) {
  const from_display = resolve_display(base.display).from_display;
  if (!from_display) return null;
  const exprs = [];
  for (const s of strings) {
    try {
      exprs.push(from_display(s));
    } catch {
      return null;
    }
  }
  for (let i = 1; i < exprs.length; i++) {
    if (!(base.compare(exprs[i - 1], exprs[i]) > 0)) return null;
  }
  return exprs;
}

function build_init_variant_definition(base, id, parsed) {
  return {
    ...base,
    id,
    // 标签（含 "(variant N)" 后缀）由导航在渲染期拼接，此处沿用 base 的名称字段
    name: base.name,
    simple_name: base.simple_name,
    init: () => parsed.slice(),
  };
}

/** 为已注册的 base 注册其全部（尚未注册的）变体；幂等。 */
function ensure_variants(base_id) {
  const entries = variant_state.get(base_id);
  if (!entries || entries.length === 0) return;
  const base = map.get(base_id);
  if (!base) return; // base 未注册 → defs 保留，待 base 注册时水合
  // generator 分类的成员暂不支持变体（导航/计数语义复杂）
  if (base.category_id && category_defs.get(base.category_id)?.generator) {
    console.warn(`init_variant: base '${base_id}' 是 generator 成员，其变体已跳过。`);
    return;
  }
  let anchor = base_id;
  for (const entry of entries) {
    const id = variant_id_of(base_id, entry.seq);
    if (map.has(id)) {
      anchor = id; // 已注册（幂等）
      continue;
    }
    const parsed = parse_init_list(base, entry.init);
    if (!parsed) {
      console.warn(`init_variant: 跳过 '${id}'（解析或严格递减检查未通过）。`);
      continue;
    }
    try {
      _register_notation(build_init_variant_definition(base, id, parsed), anchor);
    } catch (err) {
      console.warn(`init_variant: 注册 '${id}' 失败。`, err);
      continue;
    }
    anchor = id;
  }
}

/**
 * 新建变体：编号回填该 base 的最小空缺 seq。base 须已注册且不在 generator 分类。
 * @returns {{ ok: boolean, id?: string, error?: string }}
 */
export function create_init_variant(base_id, init_strings) {
  const base = map.get(base_id);
  if (!base) return { ok: false, error: 'unknown-base' };
  if (base.category_id && category_defs.get(base.category_id)?.generator) {
    return { ok: false, error: 'generator-base' };
  }
  if (!resolve_display(base.display).from_display) return { ok: false, error: 'no-from-display' };
  const parsed = parse_init_list(base, init_strings);
  if (!parsed) return { ok: false, error: 'parse' };

  const entries = variant_state.get(base_id) ?? [];
  let seq = 1;
  while (entries.some((e) => e.seq === seq)) seq++;
  const id = variant_id_of(base_id, seq);
  if (map.has(id) || variant_base_of.has(id)) return { ok: false, error: 'id-conflict' };

  const entry = { base_id, seq, init: init_strings.slice() };
  entries.push(entry);
  entries.sort((a, b) => a.seq - b.seq);
  variant_state.set(base_id, entries);
  rebuild_variant_index();

  // 锚点 = base（或其最后一个已注册变体），保证导航紧邻且 seq 递增
  let anchor = base_id;
  for (const e of entries) {
    const vid = variant_id_of(base_id, e.seq);
    if (map.has(vid)) anchor = vid;
  }
  try {
    _register_notation(build_init_variant_definition(base, id, parsed), anchor);
  } catch (err) {
    console.warn(`init_variant: 注册 '${id}' 失败；回滚定义。`, err);
    variant_state.set(
      base_id,
      entries.filter((e) => e.seq !== seq),
    );
    rebuild_variant_index();
    return { ok: false, error: 'id-conflict' };
  }
  notify_change();
  return { ok: true, id };
}

/** 删除变体（仅注销 + 删 def；不做存储/设置清理）。 */
export function remove_init_variant(id) {
  const meta = variant_base_of.get(id);
  if (!meta) return;
  const entries = variant_state.get(meta.base_id);
  if (!entries) return;
  variant_state.set(
    meta.base_id,
    entries.filter((entry) => entry.seq !== meta.seq),
  );
  rebuild_variant_index();
  unregister_notation_raw(id);
  notify_change();
}
