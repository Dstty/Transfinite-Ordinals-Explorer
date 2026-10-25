// ============================================================================
//  scripts/verify-tree-keyboard.mjs — 树上键盘导航（三档样式 + 注释框入口）
// ============================================================================
//  背景：ner 样式每行都有一个常驻注释输入框，焦点一旦落进去，全局键盘守卫
//  （非主输入框的表单控件不抢键）会把 ↑↓ 一起吞掉 —— 表现出来就是"上下键
//  按了没反应"。这里把三个真实入口都跑一遍：
//    ① 焦点在树容器上        → ↑↓ 必须移动高亮
//    ② 焦点在行内注释框      → ↑↓ 仍要移动（注释已实时落库）
//    ③ 折叠子树             → ↑↓ 不得选中看不见的节点
//
//  运行：node scripts/verify-tree-keyboard.mjs
// ============================================================================
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (rel) => pathToFileURL(join(root, rel)).href;

const fakeEl = () => ({
  style: {}, children: [], appendChild() {}, addEventListener() {}, removeEventListener() {},
  setAttribute() {}, getAttribute: () => null, focus() {}, blur() {}, setSelectionRange() {},
  scrollTop: 0, scrollHeight: 0, value: '', tagName: 'DIV',
});
const rootEl = fakeEl();
rootEl.id = 'root';
globalThis.document = {
  getElementById: (id) => (id === 'root' ? rootEl : null),
  createElement: () => fakeEl(), querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  activeElement: null, head: fakeEl(), body: fakeEl(),
};
// 让 TreeNodeView 的「聚焦目标行注释框」effect 能找到元素（真实浏览器走同一选择器）
globalThis.document.querySelector = (sel) => {
  const m = /\[data-note-uid="([^"]+)"\]/.exec(String(sel));
  if (!m) return null;
  const hit = els.find((e) => e.type === 'input' && e.props && String(e.props['data-note-uid']) === m[1]);
  if (!hit) return null;
  return { focus() { noteFocusCalls.push(m[1]); } };
};

const hookStates = [];
let hookCursor = 0;
const els = [];
const effects = [];
/** 记录「把焦点送进某行注释框」的调用，供断言使用。 */
const noteFocusCalls = [];
globalThis.React = {
  createElement(type, props, ...children) {
    const el = { __el: true, type, props: props || {}, children: children.flat().filter((c) => c != null) };
    els.push(el);
    return el;
  },
  useState(init) {
    const i = hookCursor++;
    if (hookStates.length <= i) hookStates[i] = typeof init === 'function' ? init() : init;
    return [hookStates[i], (v) => { hookStates[i] = typeof v === 'function' ? v(hookStates[i]) : v; }];
  },
  useEffect(fn) { effects.push(fn); }, useMemo(fn) { return fn(); }, useCallback(fn) { return fn; },
  useRef(init) { return { current: init ?? null }; },
};
let rendered = null;
globalThis.ReactDOM = {
  createRoot() {
    return { render(el) { rendered = el; if (typeof el.type === 'function') el.type(el.props); } };
  },
};
globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://127.0.0.1:8123/' };
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' };
globalThis.window.register = [];
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

await import(url('core/notation-manifest.js'));
const manifest = globalThis.window.NOTATION_MANIFEST;
for (const e of manifest.filter((x) => !x.module)) {
  try { vm.runInThisContext(readFileSync(join(root, e.file), 'utf8'), { filename: e.file }); } catch {}
}
for (const e of manifest.filter((x) => x.module)) { try { await import(url(e.file)); } catch {} }

await import(url('ui/app.js'));
const AppFn = rendered.type;

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const renderApp = () => {
  const start = els.length;
  hookCursor = 0;
  AppFn({});
  return els.slice(start);
};
const treeOf = (t) => t.find((e) => typeof e.type === 'function' && e.type.name === 'TreeNodeView');

// build a tree and switch it to the ner style through its own settings panel
let t = renderApp();
t.find((e) => e.type === 'input' && e.props.autoFocus === true)
  .props.onChange({ target: { value: 'PrSS 0,1', selectionStart: 8 }, nativeEvent: {} });
t = renderApp();
t.find((e) => e.type === 'input' && e.props.autoFocus === true)
  .props.onKeyDown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
await new Promise((r) => setTimeout(r, 20));

t = renderApp();
t.find((e) => e.type === 'button' && e.children.includes('⚙️ 树设置')).props.onClick();
t = renderApp();
const panel = t.find((e) => typeof e.type === 'function' && e.type.name === 'TreeSettings');
panel.props.onChange({ style: 'ner' });
panel.props.onClose();
t = renderApp();

let view = treeOf(t);
check(view && view.props.treeStyle === 'ner', 'tree did not switch to the ner style');

const press = (key, target) => {
  const fresh = renderApp();
  const container = fresh.find((e) => e.type === 'div' && e.props.tabIndex === 0 && e.props.onKeyDown);
  container.props.onKeyDown({ key, preventDefault() {}, stopPropagation() {}, target: target || { tagName: 'DIV' } });
  const after = renderApp();
  const view = treeOf(after);
  // 渲染一次子树，让 TreeNodeView 的 effect 按最新 props 执行（桩不判依赖）
  const before = effects.length;
  view.type(view.props);
  for (const fn of effects.slice(before)) {
    try { fn(); } catch { /* 滚动跟随在桩里没有布局，忽略 */ }
  }
  return view.props.focusUid;
};

const rootNode = view.props.rootList[0];
view.props.onFocusRow(view.props.treeIndex, rootNode._uid);
t = renderApp();
view = treeOf(t);
const start = view.props.focusUid;

const pressTracked = (key, target) => {
  noteFocusCalls.length = 0;
  const uid = press(key, target);
  return { uid, focused: noteFocusCalls.slice() };
};

const d1 = pressTracked('ArrowDown');
check(d1.uid !== start, 'ArrowDown did not move the selection when focus was on the tree');
check(d1.focused.length === 1 && d1.focused[0] === String(d1.uid),
  `ArrowDown moved the row but the caret did not land in its note box (focused=${JSON.stringify(d1.focused)}, row=${d1.uid})`);

const d2 = pressTracked('ArrowDown');
check(d2.uid !== d1.uid, 'second ArrowDown did not move the selection');
check(d2.focused.length === 1 && d2.focused[0] === String(d2.uid),
  `second ArrowDown did not put the caret into the next note box (focused=${JSON.stringify(d2.focused)})`);

const u1 = pressTracked('ArrowUp');
check(u1.uid === d1.uid, 'ArrowUp did not return to the previous node');
check(u1.focused.length === 1 && u1.focused[0] === String(u1.uid),
  `ArrowUp did not put the caret back into the previous note box (focused=${JSON.stringify(u1.focused)})`);

// 第一次点进某行注释框：选中行必须跟着走，否则 ↑↓ 会从旧位置出发
{
  const v = treeOf(renderApp());
  const sub = v.type(v.props);
  const boxes = [];
  const walkBoxes = (el) => {
    if (!el || typeof el !== 'object') return;
    if (el.type === 'input' && el.props && el.props.placeholder === '注释…') boxes.push(el);
    for (const c of el.children || []) walkBoxes(c);
  };
  walkBoxes(sub);
  const second = boxes.find((el) => String(el.props['data-note-uid']) === '2');
  check(!!second, 'second row note box not found');
  check(!!second && typeof second.props.onFocus === 'function',
    'note box has no onFocus handler, so clicking into it never syncs the selected row');
  if (second && typeof second.props.onFocus === 'function') {
    second.props.onFocus();
    renderApp();
    const r = pressTracked('ArrowDown');
    check(r.uid === 3, `focusing row 2's note box left the selection behind: ArrowDown went to ${r.uid}, expected 3`);
  }
}

// entering from a row's permanent note box (ner/selfne only)
const subtree = view.type(view.props);
const noteInputs = [];
const collect = (el) => {
  if (!el || typeof el !== 'object') return;
  if (el.type === 'input' && el.props && el.props.placeholder === '注释…') noteInputs.push(el);
  for (const c of el.children || []) collect(c);
};
collect(subtree);
check(noteInputs.length > 0, 'ner rows have no permanent note box');
check(noteInputs.every((el) => el.props['data-tree-note'] === '1'), 'note box lost its data-tree-note marker');
if (noteInputs.length) {
  const noteTarget = { tagName: 'INPUT', isContentEditable: false, dataset: { treeNote: '1' } };
  const before = treeOf(renderApp()).props.focusUid;
  const after = press('ArrowDown', noteTarget);
  check(after !== before, 'ArrowDown inside a row note box was swallowed');
}

// mine style keeps focus on the tree container (no permanent note boxes)
{
  const open = renderApp();
  open.find((e) => e.type === 'button' && e.children.includes('⚙️ 树设置')).props.onClick();
  const withPanel = renderApp();
  const p2 = withPanel.find((e) => typeof e.type === 'function' && e.type.name === 'TreeSettings');
  p2.props.onChange({ style: 'mine' });
  p2.props.onClose();
  const back = renderApp();
  const v = treeOf(back);
  v.props.onFocusRow(v.props.treeIndex, v.props.rootList[0]._uid);
  const r = pressTracked('ArrowDown');
  check(r.focused.length === 0, 'mine style must not push the caret into a note box');
}

// collapsed subtrees must stay out of the keyboard order
{
  const parent = view.props.rootList[0];
  const hidden = { expr: parent.expr, low: [[]], subitems: [] };
  parent.subitems.push(hidden);
  parent._collapsed = true;
  view.props.onFocusRow(view.props.treeIndex, parent._uid);
  t = renderApp();
  const nextFocus = press('ArrowDown');
  check(nextFocus !== hidden._uid, 'keyboard selected a node inside a collapsed subtree');
  parent.subitems.pop();
  parent._collapsed = false;
}

if (failures.length) {
  console.log(`❌ ${failures.length} 项失败：`);
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 2;
} else {
  console.log('✅ 树上键盘：容器内 ↑↓ 移动、行内注释框 ↑↓ 不被吞、折叠子树不进入导航');
}
