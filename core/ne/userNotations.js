// ============================================================================
//  core/ne/userNotations.js — 用户自定义记号（/notation 命令的后端）
// ============================================================================
//  目标：把「一份能在 ne 里跑的记号 JS」直接变成本项目能用的记号，且**展开结果与
//  ne 一致** —— 做法是照 ne 的接口收，注册进 ne 注册表，再交给 core/ne/uiEngine.js
//  用 ne 引擎展开（见该文件说明）。
//
//  接受两种形状（都能贴）：
//    ① ne 记号定义：{ id, name, display|format, is_limit|able, compare, FS, init, ... }
//       —— 与 notation/ne/*.js 导出的对象同构，也就是 ne-rewritten 的 NotationDefinition。
//    ② 经典 6 方法对象 / 工厂：{ parse, format, isSuccessor, generateLimit, expand, compare }
//       —— 参考版「自助版 NE-4.8.1」里 __BUILTIN_FACTORIES 的那套接口；
//          若求值结果是个函数，会先调用它（正好可以整段贴工厂）。
//       这一形状由 core/ne/classicNotation.js 适配成 ①（下标基数/后继式两处差异在那处理）。
//
//  自定义记号一律落进 `category-user`（/list 里的「自定义记号」文件夹），
//  来源存在 localStorage，刷新后自动重放。
// ============================================================================
import { define_classic_notation } from './classicNotation.js';
import { get_notation, register_notation, unregister_notation } from './registry.js';

/** /list 里自定义记号落的分类 id（见 notation/ne/categories.js）。 */
export const USER_CATEGORY_ID = 'category-user';

const STORAGE_KEY = 'dsh.userNotations';

/** 有 localStorage 就用（浏览器），没有就当内存表（Node 验证脚本）。 */
const memory = new Map();

function storage_read() {
  try {
    if (typeof localStorage === 'undefined') return Object.fromEntries(memory);
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function storage_write(obj) {
  try {
    if (typeof localStorage === 'undefined') {
      memory.clear();
      for (const [k, v] of Object.entries(obj)) memory.set(k, v);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* 存不下就算了，本次会话内仍可用 */
  }
}

/** 判断求值结果属于哪种形状。 */
function detect_kind(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.FS === 'function' && typeof obj.compare === 'function' &&
      (typeof obj.is_limit === 'function' || typeof obj.able === 'function')) {
    return 'ne';
  }
  const classic = ['parse', 'format', 'isSuccessor', 'generateLimit', 'expand', 'compare'];
  if (classic.every((m) => typeof obj[m] === 'function')) return 'classic';
  return null;
}

/** 把用户对象的 display 规格补成 ne 认识的样子。 */
function normalize_display(obj) {
  if (typeof obj.display === 'function') return { plain: obj.display };
  if (obj.display && typeof obj.display === 'object') {
    const d = { ...obj.display };
    if (typeof d.plain !== 'function' && typeof d.html === 'function') d.plain = d.html;
    return d;
  }
  if (typeof obj.format === 'function') return { plain: (e) => obj.format(e) };
  return null;
}

/**
 * 求值一段用户 JS，得到记号对象。
 * 用 new Function（本工具是本地单页应用，用户贴的就是自己的代码；
 * 这里的作用是「加载」而不是「沙箱」）。
 */
function evaluate(source, id) {
  // 三种写法都收：
  //   ① 表达式：对象字面量 / 工厂函数 / IIFE        → `return (源码)`
  //   ② 声明式：`const Notation = {…}`             → `源码; return Notation;`
  //      （参考版「自助版 NE-4.8.1」的模板与内置工厂都是这个约定）
  //   ③ **自注册式**：ne-rewritten 内置记号的形态 ——
  //      `(() => { … const notation = {…};
  //                if (typeof register_notation === 'function') register_notation(notation); })();`
  //      它**没有返回值**，靠调用 `register_notation` 注册（那边它是全局函数）。
  //      所以这里注入一个「只捕获、不真注册」的 shim：捕获到的定义交给 add_user_notation
  //      走正常注册流程（分类强制覆盖等都在那边做）。
  //      ⚠ 实测：这正是 CTN2（下载来的 CTN2.ne-rewritten.js）在 ner 里能导入、
  //      在这里报「求值结果不是记号对象」的原因 —— IIFE 返回 undefined。
  // ⚠ 也不能靠正则猜是哪条路：参考版工厂是 `function(){ var Notation = {…}; return Notation; }`,
  //   `var Notation =` 在**函数体内部**，按文本判断会误判成声明式 → 被当函数声明解析 →
  //   "Function statements require a function name"（踩过）。两条路都试就天然正确。
  const captured = [];
  const capture = (def) => { captured.push(def); return def; };
  const ARG_NAMES = ['register_notation', 'register_category', 'get_notation', 'register_user_notation'];
  const ARGS = [capture, (c) => c, get_notation, capture];
  // 末尾的分号要去掉：`(() => {…})();` 是常见写法（自注册式记号尤其如此），
  // 直接包进 `return ( … )` 会变成 `return ( …() ; )` → Unexpected token ';'，
  // 而那样 IIFE 根本不会执行（也就捕获不到自注册的定义）。
  const body = String(source).trim().replace(/;+\s*$/, '');

  const as_expression = () => new Function(...ARG_NAMES, `"use strict"; return (${body});`)(...ARGS); // eslint-disable-line no-new-func
  const as_declaration = () => new Function(...ARG_NAMES, `"use strict";\n${body}\n; return Notation;`)(...ARGS); // eslint-disable-line no-new-func

  let value;
  let first_error = null;
  try {
    value = as_expression();
  } catch (e) {
    first_error = e;
    try {
      value = as_declaration();
    } catch {
      throw new Error(`JS 求值失败：${first_error.message}`);
    }
  }
  if (typeof value === 'function') {
    try {
      value = value();
    } catch (e) {
      throw new Error(`工厂函数执行失败：${e.message}`);
    }
  }
  if (!value || typeof value !== 'object') {
    // 自注册式：IIFE 没有返回值，但把定义交给了 register_notation
    if (captured.length) value = captured[captured.length - 1];
  }
  if (!value || typeof value !== 'object') {
    throw new Error(
      '求值结果不是记号对象（既不是 ne 定义，也不是经典 6 方法对象）' +
        (captured.length ? '' : '；这份 JS 也没有调用 register_notation 自注册'),
    );
  }
  const kind = detect_kind(value);
  if (!kind) {
    throw new Error(
      '认不出这个记号：ne 定义需要 {display|format, is_limit|able, compare, FS, init}；' +
        '经典接口需要 {' + ['parse', 'format', 'isSuccessor', 'generateLimit', 'expand', 'compare'].join(', ') + '}',
    );
  }
  return { value, kind };
}

/** 用户对象 → 可注册的 ne 记号定义。 */
function to_definition(value, kind, id, meta) {
  const name = value.name || meta.name || id;
  const simple_name = value.simple_name || value.simpleName || meta.simple_name || undefined;

  if (kind === 'classic') {
    // 工厂本体原样交给适配器（它在构造时立即调用 create()）
    const def = define_classic_notation({
      id,
      name,
      simple_name,
      category_id: USER_CATEGORY_ID,
      credit_text_id: 'credit.user',
      description: '用户自定义（经典 6 方法接口）',
      create: () => value,
    });
    return def;
  }

  const display = normalize_display(value);
  if (!display || typeof display.plain !== 'function') {
    throw new Error('ne 定义缺少可用的 display（或经典接口的 format）');
  }
  if (typeof value.init !== 'function') {
    throw new Error('ne 定义缺少 init()（UI 建树要用它给示例表达式）');
  }
  return {
    ...value,
    id,
    name,
    simple_name,
    // 强制进「自定义记号」文件夹：用户定义里的 category_id 可能指向不存在的分类，
    // 而 register_notation 校验分类存在性，不覆盖会直接抛。
    category_id: USER_CATEGORY_ID,
    display,
    init: value.init,
  };
}

/**
 * 生成一个没被占用的默认 id：user1、user2 ……
 * 场景：用户点「新建」后既不填 id、JS 里也没写 id —— 不该拦着不让保存。
 */
export function next_default_id() {
  for (let i = 1; i < 10000; i++) {
    const id = 'user' + i;
    if (!get_notation(id) && !Object.prototype.hasOwnProperty.call(storage_read(), id)) return id;
  }
  return 'user' + Date.now();
}

/**
 * 把「一份可能带 ES module 外壳的记号 JS」规整成可求值的表达式。
 *
 * 参考版（自助版 NE-4.8.1）的 `__BUILTIN_FACTORIES["X"] = function(){…}` 本体是自包含的；
 * 但用户手上更常见的是 ne-rewritten 那种**模块文件**，外壳有 `export default`、
 * `export const X = …`、`export function X(){}` 三种。这里把外壳剥掉。
 *
 * ⚠ 带 `import` 的文件**没法在浏览器里求值** —— 那不是「格式问题」而是缺依赖，
 *   所以直接给明确错误，而不是剥掉 import 让它跑到后面才炸。
 *
 * @returns {{ok: boolean, source?: string, id?: string, name?: string, note?: string, error?: string}}
 */
export function normalize_source(text) {
  let s = String(text ?? '');
  if (!s.trim()) return { ok: false, error: '文件是空的' };

  if (/^\s*import\s/m.test(s)) {
    const first = (s.match(/^\s*import\s[^\n]*/m) || [''])[0].trim();
    return {
      ok: false,
      error:
        '这个文件里有 ES module 的 import（依赖别的模块），浏览器里无法直接求值。\n' +
        `  第一处：${first}\n` +
        '  请改成自包含形式：把依赖内联进来，或只贴「记号对象 / 工厂函数」本体。',
    };
  }

  const notes = [];
  const idFromSource = (s.match(/\bid\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1];
  const nameFromSource =
    (s.match(/\bname\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1] ||
    (s.match(/\bsimple_name\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1];

  let m = s.match(/^\s*export\s+default\s+([\s\S]*)$/m);
  if (m) {
    s = m[1];
    notes.push('已剥掉 export default');
  } else {
    m = s.match(/^\s*export\s+(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*([\s\S]*)$/m);
    if (m) {
      s = m[1];
      notes.push('已剥掉 export const');
    } else {
      m = s.match(/^\s*export\s+(function\b[\s\S]*)$/m);
      if (m) {
        s = m[1];
        notes.push('已剥掉 export（function）');
      } else if (/^\s*export\s/m.test(s)) {
        s = s.replace(/^\s*export\s+/m, '');
        notes.push('已去掉 export 前缀');
      }
    }
  }

  s = s.trim().replace(/;\s*$/, '').trim();
  if (!s) return { ok: false, error: '剥掉模块外壳后没有内容了' };
  return { ok: true, source: s, id: idFromSource, name: nameFromSource, note: notes.join('；') };
}

/**
 * 注册一个自定义记号。
 * @param {string} source 用户贴的 JS（对象字面量或工厂函数）
 * @param {{id?: string, name?: string, simple_name?: string}} [meta]
 * @returns {{ok: boolean, id?: string, kind?: string, generated_id?: boolean, error?: string}}
 */
export function add_user_notation(source, meta = {}) {
  const src = String(source ?? '').trim();
  if (!src) return { ok: false, error: '用法: /notation add <JS 记号定义>' };

  // 先粗取 id：优先 meta.id，其次源码里的 id: 'xxx'；都没有就用默认 id
  // （用户点「新建」后什么都不填就保存，不该被拦下来 —— 用 user1、user2… 兜住）
  const idFromSource = (src.match(/\bid\s*:\s*['"`]([^'"`]+)['"`]/) || [])[1];
  const id = String(meta.id || idFromSource || '').trim() || next_default_id();
  const generated_id = !(meta.id || idFromSource);
  if (get_notation(id)) {
    return { ok: false, error: `记号 '${id}' 已存在（自定义的先用 /notation del ${id} 删掉）`, id };
  }

  let value, kind;
  try {
    ({ value, kind } = evaluate(src, id));
  } catch (e) {
    return { ok: false, error: e.message, id };
  }

  let def;
  try {
    def = to_definition(value, kind, id, meta);
    register_notation(def);
  } catch (e) {
    return { ok: false, error: `注册失败：${e.message}`, id, kind };
  }

  const store = storage_read();
  store[id] = { source: src, name: def.name, simple_name: def.simple_name, kind, meta };
  storage_write(store);

  return { ok: true, id, kind, adapted: true, generated_id };
}

/** 删除一个自定义记号（并清掉持久化）。 */
export function remove_user_notation(id) {
  const store = storage_read();
  const known = Object.prototype.hasOwnProperty.call(store, id);
  const exists = !!get_notation(id);
  if (!known && !exists) return { ok: false, error: `没有名为 '${id}' 的自定义记号` };
  try {
    unregister_notation(id);
  } catch (e) {
    return { ok: false, error: `注销失败：${e.message}` };
  }
  if (known) {
    delete store[id];
    storage_write(store);
  }
  return { ok: true, id };
}

/** 列出已持久化的自定义记号。 */
export function list_user_notations() {
  return Object.entries(storage_read()).map(([id, v]) => ({
    id,
    kind: v.kind,
    name: v.name,
    simple_name: v.simple_name,
  }));
}

/** 取某个自定义记号的源码（便于用户改）。 */
export function get_user_source(id) {
  const v = storage_read()[id];
  return v ? v.source : null;
}

/**
 * boot 时重放全部自定义记号。逐个 try/catch —— 某一个坏了不能连累其余，
 * 也不能让应用起不来。
 * @returns {{ok: string[], failed: {id: string, error: string}[]}}
 */
export function load_user_notations() {
  const store = storage_read();
  const ok = [];
  const failed = [];
  for (const [id, v] of Object.entries(store)) {
    try {
      const src = v.source;
      // 已经注册过（同一会话内重复 boot）就跳过
      if (get_notation(id)) { ok.push(id); continue; }
      const { value, kind } = evaluate(src, id);
      const def = to_definition(value, kind, id, v.meta || {});
      register_notation(def);
      ok.push(id);
    } catch (e) {
      failed.push({ id, error: e.message });
    }
  }
  return { ok, failed };
}
