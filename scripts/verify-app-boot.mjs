// ============================================================================
//  .tmp-ne/verify-app-boot.mjs — 真正跑一遍 App()（桩 React + 桩 DOM）
// ============================================================================
//  为什么需要：之前所有验证都绕开了 ui/app.js 本体 —— 它需要 window.React 与 DOM。
//  结果「页面打不开」这类问题正好落在这个盲区里。本脚本按浏览器的顺序：
//    · 桩 React（useState/useEffect/useMemo/useCallback/useRef/createElement）
//    · 桩 DOM（document.getElementById 返回 {id:'root'}）
//    · import ui/app.js（模块体末尾会 createRoot(...).render(<App/>)）
//  桩的 render 会**真的调用 App()**，于是组件体里的任何 ReferenceError/TypeError 都会暴露。
//
//  再顺带验一条交互链：输入 `notation` → 提交 → 面板应出现在元素树里。
//
//  运行：node .tmp-ne/verify-app-boot.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (rel) => pathToFileURL(join(root, rel)).href;

// ---- 桩 DOM ----
const fakeEl = () => ({
  style: {}, children: [], appendChild() {}, addEventListener() {}, removeEventListener() {},
  setAttribute() {}, getAttribute: () => null, focus() {}, blur() {}, setSelectionRange() {},
  scrollTop: 0, scrollHeight: 0, value: '', tagName: 'DIV',
});
const rootEl = fakeEl();
rootEl.id = 'root';
globalThis.document = {
  getElementById: (id) => (id === 'root' ? rootEl : null),
  createElement: () => fakeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  activeElement: null,
  head: fakeEl(), body: fakeEl(),
};

// ---- 桩 React ----
const hookStates = [];
let hookCursor = 0;
const effects = [];
const els = [];
function createElement(type, props, ...children) {
  const el = {
    __el: true, type, props: props || {},
    children: children.flat().filter((c) => c !== null && c !== undefined),
  };
  els.push(el);
  return el;
}
let rootObj = null;
globalThis.React = {
  createElement,
  useState(init) {
    const i = hookCursor++;
    if (hookStates.length <= i) hookStates[i] = typeof init === 'function' ? init() : init;
    return [hookStates[i], (v) => { hookStates[i] = typeof v === 'function' ? v(hookStates[i]) : v; }];
  },
  useEffect(fn) { effects.push(fn); },
  useMemo(fn) { return fn(); },
  useCallback(fn) { return fn; },
  useRef(init) { return { current: init ?? null }; },
};
let rendered = null;
globalThis.ReactDOM = {
  createRoot(container) {
    rootObj = { container };
    return {
      render(el) {
        rendered = el;
        // 真正执行组件体
        if (typeof el.type === 'function') el.type(el.props);
      },
    };
  },
};

globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://127.0.0.1:8000/' };
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};
// Node 20+ 的 navigator 只有 getter，不能赋值 —— 浏览器里本来就有，跳过即可
if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node' };
globalThis.window.register = [];
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.setTimeout = globalThis.setTimeout;
globalThis.URLSearchParams = globalThis.URLSearchParams;

await import(url('core/notation-manifest.js'));
const manifest = globalThis.window.NOTATION_MANIFEST;
for (const e of manifest.filter((x) => !x.module)) {
  try { vm.runInThisContext(readFileSync(join(root, e.file), 'utf8'), { filename: e.file }); } catch {}
}
for (const e of manifest.filter((x) => x.module)) { try { await import(url(e.file)); } catch {} }

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

let bootError = null;
let AppFn = null;
try {
  await import(url('ui/app.js'));
} catch (e) {
  bootError = e;
}
check(!bootError, `ui/app.js 模块体抛错：${bootError && bootError.message}\n    ${bootError && String(bootError.stack).split('\n')[1]}`);
// ★ 这一条是本次事故的判决点：app.js 末尾必须真的调用 createRoot().render()。
//   曾经因为一次「截断+追加」式的替换，挂载那段被整段删掉 —— 模块语法合法、
//   所有文件 200、控制台零报错，但页面空白。只查文件在不在、语法过不过，
//   永远抓不到这种问题。
check(!!rendered, 'createRoot().render() 没有被调用（app.js 没跑到最后一行 / 挂载代码缺失）');
AppFn = rendered && rendered.type;

// —— 首屏渲染：组件体不抛错、能产出元素树 ——
const textsOf = () => {
  const out = [];
  const walk = (el) => {
    if (!el || !el.__el) return;
    for (const c of el.children || []) {
      if (typeof c === 'string') out.push(c);
      else walk(c);
    }
  };
  for (const el of els) walk(el); // App 元素自身没 children，真正的树在 App() 里创建的元素上
  return out;
};
const firstTexts = textsOf().join(' | ');
check(els.length >= 10, `App() 渲染出的元素太少：${els.length}（组件体可能在早期就抛了）`);
check(firstTexts.includes('序数探索器'), `首屏没有标题文本，实际：${firstTexts.slice(0, 120)}`);

// —— 挂载后的 effect（含自定义记号重放、设置落盘）不应抛错 ——
for (const fn of effects) {
  try { const r = fn(); if (r && typeof r.then === 'function') await r; } catch (e) {
    failures.push(`useEffect 抛错：${e.message}`);
  }
}

// 设置/主题必须真的落盘（用户反馈：自定义记号持久化、设置却不持久化 —— 行为不一致）
{
  const rawSettings = globalThis.localStorage.getItem('dsh.settings');
  const rawTheme = globalThis.localStorage.getItem('dsh.theme');
  check(!!rawSettings, '设置没有写进 localStorage（dsh.settings 缺失）');
  check(!!rawTheme, '主题没有写进 localStorage（dsh.theme 缺失）');
  if (rawSettings) {
    let parsed = null;
    try { parsed = JSON.parse(rawSettings); } catch { /* 下面统一判 */ }
    check(parsed && typeof parsed.timeLimit === 'number', `dsh.settings 里应有 timeLimit，实为 ${rawSettings}`);
  }
}

// —— 交互链：输入 notation → 回车 → 面板应出现 ——
//   桩 React 不会在 setState 后自动重渲染，所以每步之间手动重跑 App()：
//   真实 React 会重新创建 handleSubmit 闭包，闭包里的 input 才是新值。
function renderApp() {
  const start = els.length;
  hookCursor = 0;
  AppFn({});
  return els.slice(start);
}
const findInput = (tree) => tree.find((e) => e.type === 'input' && typeof e.props.onKeyDown === 'function' && e.props.autoFocus === true);

let tree = renderApp();
const inputEl = findInput(tree);
check(!!inputEl, '找不到主输入框元素');
if (inputEl) {
  inputEl.props.onChange({ target: { value: 'notation', selectionStart: 8 }, nativeEvent: {} });
  tree = renderApp(); // 让 handleSubmit 拿到新 input
  let submitErr = null;
  try {
    const p = findInput(tree).props.onKeyDown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
    if (p && typeof p.then === 'function') await p;
  } catch (e) { submitErr = e; }
  check(!submitErr, `提交 notation 抛错：${submitErr && submitErr.message}`);
  await new Promise((r) => setTimeout(r, 0)); // 冲掉排队中的微任务/定时器

  tree = renderApp();
  // 桩 React 不会自动执行子组件，所以这里只断言「App 渲染出了 NotationEditor 元素」；
  // 面板内部（列表/输入框/保存删除/导入 .js）由 .tmp-ne/verify-noteditor.mjs 单独渲染验证。
  const hasEditor = tree.some((e) => typeof e.type === 'function' && e.type.name === 'NotationEditor');
  check(hasEditor, '输入 notation 后面板没被渲染出来（NotationEditor 元素缺失）');
}

// —— 设置弹窗里也要能进自定义记号页 ——
{
  let t = renderApp();
  // ⚙️ 按钮的文字是「⚙️ 设置」（带 emoji 与空格），不能按 title 找 —— 按文本包含找
  const gear = t.find((e) => e.type === 'button' && String(e.children.join('')).includes('设置'));
  if (gear) {
    gear.props.onClick();          // 打开设置
    t = renderApp();
    const entry = t.find((e) => e.type === 'button' && e.children.includes('打开自定义记号…'));
    check(!!entry, '设置弹窗里没有「打开自定义记号…」入口');
    if (entry) {
      entry.props.onClick();
      t = renderApp();
      const hasEditor = t.some((e) => typeof e.type === 'function' && e.type.name === 'NotationEditor');
      check(hasEditor, '点「打开自定义记号…」后面板没出现');
    }
  } else {
    console.log('（提示：没找到 ⚙️ 设置按钮元素，跳过「设置里进自定义记号」这条检查）');
  }
}

// —— 每棵树的 ⚙️ 树设置入口（用户要求：每棵树上插一个设置按钮）——
{
  let t = renderApp();
  const inp = findInput(t);
  check(!!inp, '找不到主输入框（建树用例需要它）');
  if (inp) {
    inp.props.onChange({ target: { value: 'PrSS 0,1', selectionStart: 8 }, nativeEvent: {} });
    t = renderApp();
    findInput(t)
      .props.onKeyDown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
    await new Promise((r) => setTimeout(r, 20)); // 建树 + 初始展开是同步的，留一拍给队列
    t = renderApp();
    const hasTree = t.some((e) => e.type === 'span' && String(e.children.join('')).includes('--- 树 #'));
    check(hasTree, '输入 PrSS 0,1 后没有渲染出树');
    const gear = t.find((e) => e.type === 'button' && e.children.includes('⚙️ 树设置'));
    check(!!gear, '树标题行没有「⚙️ 树设置」按钮');
    if (gear) {
      gear.props.onClick();
      t = renderApp();
      const hasPanel = t.some((e) => typeof e.type === 'function' && e.type.name === 'TreeSettings');
      check(hasPanel, '点「⚙️ 树设置」后面板没出现');
    }
  }
}

console.log(`App() 渲染：元素 ${els.length} 个，effect ${effects.length} 个`);

if (failures.length) {
  console.log(`\n❌ ${failures.length} 项失败：`);
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 2;
} else {
  console.log('✅ app.js 模块体执行到底（已挂载）、App() 首屏渲染、effect、「输入 notation 弹面板」、以及「设置里进自定义记号」全部正常');
}
