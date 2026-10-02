// ============================================================================
//  core/ne/utils.js — 通用工具（移植自 ne-rewritten src/utils.ts）
// ============================================================================
//  ne 架构运行时（core/ne/）的第一层：纯函数工具，无任何外部依赖。
//
//  ⚠ 与 notation/rewritten/shared.js 的 window.NEUTILS 的重要差异：
//    - bind2：ne 的语义是 (t1, ...rest) => fn(t1, t2, ...rest)，
//      而旧 shared.js 写成 (a) => fn(a, t2)（只接受一个参数）。
//      ne 的记号定义大量使用 bind2(is_limit, n) / bind3(expand, n) 这类绑定，
//      凡是要直接搬 ne 源码的地方，必须用本文件的版本，不能用旧 NEUTILS.bind2。
//    - lex_compare：ne 带 longer_last 参数（默认 true），旧版固定 longer-last。
// ============================================================================

export function number_compare(a, b) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function boolean_compare(a, b) {
  return (a ? 1 : 0) - (b ? 1 : 0);
}

export function compare_undefined_last(a, b, cmp) {
  if (a === undefined || b === undefined) {
    return boolean_compare(a === undefined, b === undefined);
  }
  return cmp(a, b);
}

export function compare_undefined_first(a, b, cmp) {
  if (a === undefined || b === undefined) {
    return boolean_compare(a !== undefined, b !== undefined);
  }
  return cmp(a, b);
}

export function compare_undefined_last_by(cmp) {
  return (a, b) => compare_undefined_last(a, b, cmp);
}

export function compare_undefined_first_by(cmp) {
  return (a, b) => compare_undefined_first(a, b, cmp);
}

export function max_by_compare(cmp, a0, ...rest) {
  let result = a0;
  for (const x of rest) if (cmp(x, result) > 0) result = x;
  return result;
}

export function min_by_compare(cmp, a0, ...rest) {
  let result = a0;
  for (const x of rest) if (cmp(x, result) < 0) result = x;
  return result;
}

export function compare_by(transform, cmp) {
  return (a, b) => cmp(transform(a), transform(b));
}

/** 字典序比较（通用）。longer_last=true 时长度更长者视为更大。 */
export function lex_compare(a, b, cmp, longer_last = true) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const result = cmp(a[i], b[i]);
    if (result !== 0) return result;
  }
  return (longer_last ? 1 : -1) * number_compare(a.length, b.length);
}

export function lex_compare_by(cmp, longer_last = true) {
  return (a, b) => lex_compare(a, b, cmp, longer_last);
}

export function anti_lex_compare(a, b, cmp) {
  if (a.length !== b.length) return number_compare(a.length, b.length);
  for (let i = a.length - 1; i >= 0; i--) {
    const result = cmp(a[i], b[i]);
    if (result !== 0) return result;
  }
  return 0;
}

export function anti_lex_compare_by(cmp) {
  return (a, b) => anti_lex_compare(a, b, cmp);
}

/** 逐字段字典序比较；cmp[i] 为 undefined 表示该字段跳过。 */
export function tuple_lex_compare(a, b, cmp) {
  for (let i = 0; i < cmp.length; i++) {
    const result = cmp[i] ? cmp[i](a[i], b[i]) : 0;
    if (result !== 0) return result;
  }
  return 0;
}

export function tuple_lex_compare_by(cmp) {
  return (a, b) => tuple_lex_compare(a, b, cmp);
}

export function object_lex_compare(a, b, cmp, order) {
  for (const key of order) {
    const result = cmp[key](a[key], b[key]);
    if (result !== 0) return result;
  }
  return 0;
}

export function object_lex_compare_by(cmp, order) {
  return (a, b) => object_lex_compare(a, b, cmp, order);
}

/** 深度克隆（支持数组与普通对象；数组保持空洞语义）。 */
export function deepcopy(obj) {
  if (!obj) return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'string') return obj;
  if (Array.isArray(obj)) {
    const result = Array.from({ length: obj.length });
    for (let i = 0, len = obj.length; i < len; i++) {
      if (i in obj) result[i] = deepcopy(obj[i]);
    }
    return result;
  }
  const result = {};
  for (const key in obj) result[key] = deepcopy(obj[key]);
  return result;
}

export function index_of_first(array, predicate) {
  return array.findIndex(predicate);
}

export function index_of_last(array, predicate) {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
//  参数绑定（语义与 ne 完全一致，见文件头说明）
// ---------------------------------------------------------------------------

export function bind1(fn, t1) {
  return (...rest) => fn(t1, ...rest);
}

export function bind2(fn, t2) {
  return (t1, ...rest) => fn(t1, t2, ...rest);
}

export function bind3(fn, t3) {
  return (t1, t2, ...rest) => fn(t1, t2, t3, ...rest);
}

// ---------------------------------------------------------------------------
//  以 display 为键的集合 / 映射（值语义去重；analysis 等模块使用）
// ---------------------------------------------------------------------------

export class DisplaySet {
  constructor(display, items) {
    this._display = display;
    this._map = new Map();
    if (items) for (const item of items) this.add(item);
  }

  add(value) {
    this._map.set(this._display(value), value);
    return this;
  }

  has(value) {
    return this._map.has(this._display(value));
  }

  delete(value) {
    return this._map.delete(this._display(value));
  }

  values() {
    return Array.from(this._map.values());
  }

  get size() {
    return this._map.size;
  }

  forEach(callback) {
    this._map.forEach((value) => callback(value));
  }

  [Symbol.iterator]() {
    return this._map.values();
  }
}

export class DisplayMap {
  constructor(display, entries) {
    this._display = display;
    this._map = new Map();
    if (entries) for (const [key, value] of entries) this.set(key, value);
  }

  set(key, value) {
    this._map.set(this._display(key), [key, value]);
    return this;
  }

  get(key) {
    return this._map.get(this._display(key))?.[1];
  }

  has(key) {
    return this._map.has(this._display(key));
  }

  delete(key) {
    return this._map.delete(this._display(key));
  }

  entries() {
    return Array.from(this._map.values());
  }

  values() {
    return Array.from(this._map.values()).map(([, v]) => v);
  }

  keys() {
    return Array.from(this._map.values()).map(([k]) => k);
  }

  get size() {
    return this._map.size;
  }

  forEach(callback) {
    this._map.forEach(([k, v]) => callback(v, k));
  }
}

/** 二叉最小堆（泛型，比较器注入）。 */
export class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  is_empty() {
    return this.items.length === 0;
  }

  push(value) {
    const items = this.items;
    items.push(value);
    let i = items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.compare(items[i], items[p]) >= 0) break;
      const tmp = items[i];
      items[i] = items[p];
      items[p] = tmp;
      i = p;
    }
  }

  peek_min() {
    return this.items[0];
  }

  pop_min() {
    const items = this.items;
    const length = items.length;
    if (length === 0) return undefined;
    const top = items[0];
    const last = items.pop();
    if (length === 1) return top;
    items[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      if (l >= items.length) break;
      let m = l;
      if (r < items.length && this.compare(items[r], items[l]) < 0) m = r;
      if (this.compare(items[i], items[m]) <= 0) break;
      const tmp = items[i];
      items[i] = items[m];
      items[m] = tmp;
      i = m;
    }
    return top;
  }
}
