// ============================================================================
//  ui/persistedSettings.js — 设置与主题的持久化
// ============================================================================
//  为什么要有：自定义记号存在 localStorage（刷新后还在），设置却每次恢复默认 ——
//  同一个应用里两套行为，用户一眼就看出不一致（反馈原话：「自制记号刷新了之后依然是
//  导入状态，那设置里的其他项为啥不是恢复之前的状态」）。
//
//  约定：
//    · 键名统一 `dsh.*`（与自定义记号的 `dsh.userNotations` 同一前缀）
//    · 读取时**逐项校验**（类型 / 整数 / 上下限），任何一项不合法就用默认值 ——
//      存档可能来自旧版本、也可能被手改过，不能让坏值把界面带崩
//    · localStorage 不可用（隐私模式、Node 环境）时静默降级为「只在内存里」
// ============================================================================

export const SETTINGS_KEY = 'dsh.settings';
export const THEME_KEY = 'dsh.theme';

/**
 * 每一项：默认值 + 范围。范围与 §设置弹窗 / `set` 命令里的校验保持一致。
 */
const SCHEMA = {
  defaultExpand: { def: 2, min: 1, max: 100 },
  additionalExpand: { def: 0, min: 0, max: 100 },
  tier: { def: 0, min: 0, max: 9 },
  fontSize: { def: 16, min: 10, max: 28 },
  timeLimit: { def: 5000, min: 0, max: 600000 },
  noteWidth: { def: 200, min: 80, max: 500 }, // 节点注释框宽度（自助版/ner 样式用）
  searchMs: { def: 8000, min: 500, max: 120000 },
  maxFindFs: { def: 10, min: 1, max: 9999 }, // 「最大搜索基本列项数」= 展开引擎的试展开上限（同 ne-rewritten） // 跳转兜底搜索的毫秒上限（与 time_limit 解耦）
  // 长行是否换行（统一影响树节点与输出流；用户要求：要么全换要么全不换，默认不换）
  wrapLong: { def: false, enum: [true, false] },
};

/** 默认设置（全新用户 / 存档损坏时的兜底）。 */
export function default_settings() {
  const out = {};
  for (const [k, spec] of Object.entries(SCHEMA)) out[k] = spec.def;
  return out;
}

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // 某些环境下访问 localStorage 本身就抛（禁 cookie 等）
  }
}

/** 把一项值规整成合法值；不合法返回 undefined（调用方用默认值）。 */
function coerce(key, raw) {
  const spec = SCHEMA[key];
  if (!spec) return undefined;
  // 枚举项（如树样式）：只接受白名单里的字符串
  if (spec.enum) return spec.enum.includes(raw) ? raw : undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  if (n < spec.min || n > spec.max) return undefined;
  return n;
}

/**
 * 读取设置：返回**完整**的设置对象（缺失/非法的项用默认值补齐）。
 * 未知键直接丢掉（旧版遗留或手改的内容不该进内存）。
 */
export function load_settings() {
  const out = default_settings();
  const st = storage();
  if (!st) return out;
  let raw;
  try {
    raw = st.getItem(SETTINGS_KEY);
  } catch {
    return out;
  }
  if (!raw) return out;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out; // 存档坏了 → 全默认，不抛
  }
  if (!parsed || typeof parsed !== 'object') return out;
  for (const key of Object.keys(SCHEMA)) {
    const v = coerce(key, parsed[key]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** 保存设置（只写 schema 内的键，写前再校验一遍）。 */
export function save_settings(settings) {
  const st = storage();
  if (!st) return false;
  const out = {};
  for (const key of Object.keys(SCHEMA)) {
    const v = coerce(key, settings?.[key]);
    if (v !== undefined) out[key] = v;
  }
  try {
    st.setItem(SETTINGS_KEY, JSON.stringify(out));
    return true;
  } catch {
    return false; // 配额满/被禁 → 静默降级
  }
}

/** 读取主题；不在候选列表里就回默认。 */
export function load_theme(validKeys, fallback) {
  const st = storage();
  if (!st) return fallback;
  try {
    const k = st.getItem(THEME_KEY);
    return k && validKeys.includes(k) ? k : fallback;
  } catch {
    return fallback;
  }
}

/** 保存主题。 */
export function save_theme(key) {
  const st = storage();
  if (!st) return false;
  try {
    st.setItem(THEME_KEY, String(key));
    return true;
  } catch {
    return false;
  }
}

/** 清掉持久化的设置与主题（「恢复默认」用；当前 UI 未挂按钮，保留供脚本调用）。 */
export function clear_persisted() {
  const st = storage();
  if (!st) return false;
  try {
    st.removeItem(SETTINGS_KEY);
    st.removeItem(THEME_KEY);
    return true;
  } catch {
    return false;
  }
}
