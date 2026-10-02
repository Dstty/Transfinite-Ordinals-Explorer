// ============================================================================
//  ui/app.js  Transfinite-Ordinals-Explorer 主应用（React 18 UMD + 原生 ES Modules，零构建！// ============================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染、//  数据模型（远古版）：节点 = { expr, low, subitems }，树 = 节点列表、//  UI 附加字段（核心不感知）：_uid 稳定 id、_collapsed 折叠、note 注释、// ============================================================================

import { THEMES } from './themes.js';
import { TreeNodeView, ensureUids } from './TreeNodeView.js';
import { FolderView } from './FolderView.js';
import { MountainView } from './MountainView.js';
import { parseNotation } from './notationParser.js';
import { parseCommand } from './commandParser.js';
import { analyzeInput } from './completion.js';
import { downloadTreeAsCSV, downloadTreeAsXLSX } from './exportUtils.js';
import { parseImportFile, buildImportTree } from '../core/importer.js';
import { expandNode, deepClone } from '../core/engine.js';
// 记号查找走阶段四适配层（core/ne/uiBridge.js）：它转发旧注册表，并默认让
// notation/ne/ 走 ne 原生记号接管同名 id（URL 带 ?legacy=1 可退回纯远古实现）、
import { getNotation, getAllNotations, NOTATION_META, buildNameMap } from '../core/ne/uiBridge.js';
// ne 记号走 ne 引擎（展开结果同ne-rewritten 一致）；远古记号仍赁core/engine.js
import { is_ne, make_tree, expand_ne, ui_node_of, append_root, navigate_to_target } from '../core/ne/uiEngine.js';
import { with_deadline } from '../core/ne/timeGuard.js';
// 自定义记号（/notation 命令）：注册进 ne 注册表，进 /list 的「自定义记号」文件夹
import {
  add_user_notation,
  get_user_source,
  list_user_notations,
  load_user_notations,
  remove_user_notation,
} from '../core/ne/userNotations.js';
import { convert, listConverterTargets, resolveTreeViews } from '../core/converters.js';
import { parseSequence } from '../core/parseShorthands.js';
import { omegaY_diagram } from '../core/mountainDiagram.js';
import { parseIblpDisplay, iblp_diagram, isIblpDisplay } from '../core/iblpPattern.js';
import { buildNotationList, countNotationsForDisplay } from './notationList.js';
import { NotationEditor } from './NotationEditor.js';
import { load_settings, save_settings, load_theme, save_theme } from './persistedSettings.js';
import { set_max_find_fs } from '../core/ne/expander.js';
import { TreeSettings, DEFAULT_TREE_CFG } from './TreeSettings.js';
import { search_target, find_in_tree, find_expr_in_tree, resolve_from_display } from '../core/ne/targetSearch.js';
import { HELP_LINES } from './helpText.js';

const React = window.React;


// ============================================================================
//  模块级工具函敁// ============================================================================

/**
 * 中文全角标点 → 半角：全角括号逗号自动转英文、 * 注意：替换必须是幂等的（对已是半角的字符无副作用），
 * 这样无论调用几次结果都一致，不会造成字符重复、 */
const normalizePunct = s => s.replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',');

/** IBLP 极限表达式示例（Googology Wiki 上 test_alpha0 规定的极限图案）。 */
const IBLP_LIMIT_EXAMPLE = '(1,0)1(2,1,0)1(3,2,1,0)2(4,3,2)1(5,4,3,2)2(6,5,4)1';

/** 图案缩放钳制！.5x ~ 8x，保留2 位小数、*/
const clampZoom = (z) => Math.min(8, Math.max(0.5, Math.round(z * 100) / 100));

/**
 * 递归查找包含指定节点的列表（父列表）。node 位于根列表时返回 null、 * @param {Array} rootList 树的根列表 * @param {object} node 目标节点
 * @returns {Array|null}
 */
function findParentList(rootList, node) {
  for (const item of rootList) {
    if (item.subitems && item.subitems.length > 0) {
      if (item.subitems.includes(node)) return item.subitems;
      const found = findParentList(item.subitems, node);
      if (found) return found;
    }
    }
  return null;
    }

/**
 * 持_uid 递归查找节点、 * @returns {object|null}
 */
function findNodeByUid(list, uid) {
  for (const item of list) {
    if (item._uid === uid) return item;
    if (item.subitems && item.subitems.length > 0) {
      const found = findNodeByUid(item.subitems, uid);
      if (found) return found;
    }
    }
  return null;
    }

// ============================================================================
//  展开层级（Expansion tier，与远古版一致：0=small, 1=single, 2=double, ...！// ============================================================================
const TIER_NAMES = ['small', 'single', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple'];

function tierName(n) {
  if (Number.isInteger(n) && n >= 0 && n < TIER_NAMES.length) {
    return `${TIER_NAMES[n]} expansion`;
    }
  return `${n}-fold expansion`;
    }

/** 建树（limit 模式）：直接使用记号走 init() 示例列表、*/
function makeTreeFromInit(notation) {  // ne 记号走 ne 引擎建树（树与展开同 ne-rewritten 一致），（
if (is_ne(notation)) return make_tree(notation, null);
  return notation.init();
    }

/**
 * 建树（表达式模式）：把任意表达式包装成远古版根列表、 * 初始下界 low 取该记号 init() 示例的下界（通常是该记号的最小表达式），
 * 保证 FSbounded 首次展开仁FS[0] 开始（不跳过基本列项）、 */
function makeTreeFromExpr(notation, expr) {
  if (is_ne(notation)) return make_tree(notation, expr);
  let low0 = [[]]; // 兜底：空表达式作为最小下界
try {
    const samples = notation.init();
    const first = samples && samples[0];
    if (first && first.low && first.low[0] !== undefined) low0 = first.low;
  } catch { /* 忽略 init 异常，用兜底 */ }
  return [{ expr, low: [deepClone(low0[0])], subitems: [] }];
    }

// ============================================================================
//  App 组件
// ============================================================================
function App() {
  const [items, setItems] = React.useState([]);          // 输出流：output | tree
  const [nextItemId, setNextItemId] = React.useState(0);
  const [nextTreeIndex, setNextTreeIndex] = React.useState(0);
  const [input, setInput] = React.useState("");
  // timeLimit：单次展开的毫秒上限（0 = 不限制）。默认5000 — 跑不完的循环会把页面冻住）；  // 宁可中止并说明（用户要求「卡死是不允许的」，且要可配置）、  // 设置与主题都**持久匁*（localStorage，键 dsh.*），刷新后保持上次状态—   // 与自定义记号同一套行为（此前只有自定义记号持久化，用户一眼看出不一致）、
const [settings, setSettings] = React.useState(() => load_settings());
  const [themeKey, setThemeKey] = React.useState(() => load_theme(Object.keys(THEMES), "dark"));
  React.useEffect(() => { save_settings(settings); }, [settings]);
  React.useEffect(() => { save_theme(themeKey); }, [themeKey]);
  // 「最大搜索基本列项数、 展开引擎的试展开上限（ne-rewritten 的同名参数），改设置即生敁
React.useEffect(() => { try { set_max_find_fs(settings.maxFindFs); } catch {} }, [settings.maxFindFs]);
  const [focusIdx, setFocusIdx] = React.useState(-1);
  const [editingNote, setEditingNote] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  // — 自定义记号编辑面板（/notation 命令弹出；状态都在 ui/NotationEditor.js 里）—
const [showNotationEditor, setShowNotationEditor] = React.useState(false);
  // 单棵树的设置弹窗（树标题行右侧⚙️ 打开！
const [treeCfgOpenId, setTreeCfgOpenId] = React.useState(null);
  // 工具条「跳转到」（同 ne-rewritten 放在顶部常驻！
const [jumpText, setJumpText] = React.useState('');
  const [jumpMsg, setJumpMsg] = React.useState(null);
  const jumpInputRef = React.useRef(null);
  const [version, setVersion] = React.useState(0);       // 树是可变对象，用它强制重渲染
  // — 命令补全：当前输入的分析结果 + 下拉高亮项（Tab/回车/↑↓ 交互）—
const [selIdx, setSelIdx] = React.useState(0);
  const [dismissed, setDismissed] = React.useState(false); // Esc 收起下拉后，输入变化前不再显示
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);
  // 归一化改冁value 后光标会被重置到末尾；用这个 ref 暂存目标光标位置，渲染后还原
  const pendingCaretRef = React.useRef(null);

  React.useEffect(() => {
    if (pendingCaretRef.current !== null && inputRef.current) {
      const c = pendingCaretRef.current;
      pendingCaretRef.current = null;
      inputRef.current.setSelectionRange(c, c);
    }
  });

  // — 启动时重放持久化的自定义记号！notation add 存进 localStorage 的那些）—   // 放在 mount 阶段跑：此时记号走ES module 都已就绪、ne 注册表可用；
  // 注册会触叁registry 的变更通知，ui/notationParser.js 的输入名索引会自行重建，
  // 所以启动后立刻输入自定义记号的名字也能匹配到、
React.useEffect(() => {
    let r;
  try {
      r = load_user_notations();
    } catch (e) {
      addOutput(`自定义记号重放失贁 ${e.message}`, 'error');
      return;
    }
    if (r.ok.length) addOutput('» 已载入 ' + r.ok.length + ' 个自定义记号：' + r.ok.join(', '), 'info');
    for (const f of r.failed) addOutput(`✁自定义记叁'${f.id}' 载入失败（已跳过）：${f.error}`, 'error');
    // 只在首次挂载时跑一欁    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const theme = THEMES[themeKey];

  // — 命令补全：随输入变化重算（只读幂等），供预览 + 下拉候选使甁—
const analysis = React.useMemo(() => analyzeInput(input), [input]);
  const suggestions = analysis.suggestions;
  const inputFormat = analysis.format;
  // 下拉是否展示：有候选且未被 Esc 收起
  const showSuggestions = suggestions.length > 0 && !dismissed;
  // 下拉高亮项（钳制到有效范围）
  const safeSelIdx = suggestions.length ? Math.min(selIdx, suggestions.length - 1) : 0;

  // 下拉高亮项（钳制到有效范围）
  const acceptSuggestion = React.useCallback((sug) => {
    const s = sug || suggestions[selIdx] || suggestions[0];
    if (!s) return;
    setInput(s.insert);
    setSelIdx(0);
    setDismissed(false);
    inputRef.current?.focus();
  }, [suggestions, selIdx]);

  // 下拉出现时滚动到底部，确保候选可见（输入框位于滚动区末尾！
React.useEffect(() => {
    if (suggestions.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [suggestions.length]);

  // ----- 输出流-----
  const addOutput = React.useCallback((message, type = 'info') => {
    setItems(prev => [...prev, { id: nextItemId, type: 'output', message, outputType: type }]);
    setNextItemId(id => id + 1);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
  }, [nextItemId]);

  /** 树对象被直接修改（展开/折叠/注释）不会触叁React 重渲染，统一走这里、*/
  const refreshUI = React.useCallback(() => setVersion(v => v + 1), []);

  /** 所有树条目（CLI 输出流中 type === 'tree' 的项）。 */
  const treeEntries = React.useMemo(
    () => items.filter(item => item.type === 'tree'),
    [items]
  );

  // ----- 键盘导航：收集所有可聚焦顁-----
  const collectNavItems = React.useCallback(() => {
    const nav = [];
    const walk = (entry, list, ancestors) => {
      for (const node of list) {
        nav.push({ type: 'node', entry, item: node, uid: node._uid, treeIndex: entry.treeIndex, ancestors });
        if (node.subitems && node.subitems.length > 0) {
          walk(entry, node.subitems, ancestors.concat(node._uid));
    }
    }
    };
    for (const entry of treeEntries) {
      ensureUids(entry.rootList);
      walk(entry, entry.rootList, []);
    }
    nav.push({ type: 'input' });
    return nav;
  }, [treeEntries]);

  const navItems = React.useMemo(() => collectNavItems(), [collectNavItems, version]);

  /** focusIdx 钳制到有效范围、*/
  const clampedFocus = React.useMemo(() => {
    if (focusIdx < 0 || navItems.length === 0) return -1;
    return Math.min(focusIdx, navItems.length - 1);
  }, [focusIdx, navItems.length]);

  const focusedItem = clampedFocus >= 0 ? navItems[clampedFocus] : null;

  // ----- 单棵树的配置（树标题表⚙️ / 交互风格 / 滚动跟随 / 等价显示！----
  const getTreeCfg = React.useCallback(
    (item) => ({ ...DEFAULT_TREE_CFG, ...((item && item.treeCfg) || {}) }),
    [],
  );
  const patchTreeCfg = React.useCallback((itemId, patch) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, treeCfg: { ...(it.treeCfg || {}), ...patch } } : it)));
  }, []);
  const jumpInputStyle = {
    background: theme.inputBg, color: theme.fg, border: `1px solid ${theme.border}`,
    borderRadius: 3, padding: '3px 8px', fontFamily: 'inherit', fontSize: 12, boxSizing: 'border-box',
    };
  const jumpBtnStyle = (primary) => ({
    background: primary ? theme.accent : theme.inputBg,
    color: primary ? theme.bg : theme.fg,
    border: `1px solid ${primary ? theme.accent : theme.border}`,
    borderRadius: 3, padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
  });

  /** 工具条「跳转到」的执行入口：用焦点所在树，没有就最后一棵树、*/

  /** 取某棵树当前视图的视图对象（可能有自币from_display 走display spec）、*/
  const activeViewFor = React.useCallback((entry) => {
      const views = resolveTreeViews(item.notation.id);
    const cur = entry.viewId || undefined;
    return views.find((v) => v.id === cur) || views[0] || null;
  }, []);

  /** 当前焦点所在树的配置（焦点不在树上时用默认）、*/
  const focusedTreeCfg = React.useCallback(() => {
    const it = navItems[clampedFocus];
    if (!it || it.treeIndex === undefined) return { ...DEFAULT_TREE_CFG };
    const entry = items.find((x) => x.type === 'tree' && x.treeIndex === it.treeIndex);
    // ⑁树里已有（按显示文本！
const inTree = find_in_tree(entry.rootList, def, want);
    if (inTree && inTree.node) {
      ensureUids(entry.rootList);
      const ok = focusNodeByUid(entry, inTree.node._uid);
      refreshUI();
      return ok
        ? { ok: true, message: `树里已有这个节点（深庁${inTree.depth}），已定位` }
        : { ok: false, message: '找到了节点但定位失败（导航序列里没有它）' };
    }

    // ⑁**解析 + 导航**（ner / ne-rewritten 的做法）：用 display spec 走from_display 把文朁    //    解析回表达式（瞬间），再煁its import_analysis_eager 在树上按 compare 导航、    //    优先用当前视图的 display spec（它可能自带 from_display，比妁BMS 走OCF 视图）、    //    mode === 'search' 时跳过这一步，直接赁⑁的枚举搜索、
const spec = (activeViewFor(entry) || {}).display || def.display;
    const parsed = mode === 'search' ? { ok: false, reason: 'skipped' } : resolve_from_display(spec, want);
    if (parsed.ok) {
      // ner 走ExpandDialog 还带一丁FS 序号（从 1 起）：取该表达式的第 n 个基本列顁
let target = parsed.expr;
      let seqNote = '';
      const seq = Number(fsIndex) || 0;
      if (seq > 0) {
        if (typeof def.is_limit === 'function' && def.is_limit(target)) {
  try {
            target = def.FS(target, seq - 1);
            seqNote = `（取其第 ${seq} 个基本列项）`;
    } catch (e) {
            return { ok: false, message: `解析成功，但取第 ${seq} 个基本列项失败：${e.message}` };
    }
    } else {
          return { ok: false, message: '解析成功，但该表达式不是极限式，没有基本列项可取' };
    }
    }
      // 树上按表达式相等靠
const hit = find_expr_in_tree(entry.rootList, def, target);
      if (hit && hit.node) {
      ensureUids(entry.rootList);
        const ok = focusNodeByUid(entry, hit.node._uid);
      refreshUI();
        return ok
          ? { ok: true, message: `解析到目栁{seqNote}，树里已有（深度 ${hit.depth}），已定位` }
          : { ok: false, message: '找到了节点但定位失败' };
    }
      // 树里没有 ↁ**同 ne-rewritten 导航**：用 compare 在树上走、按需现场展开
      // ！ ner 走import_analysis_eager：相等命丁/ 偏大就展开 / 偏小就往前挪！      //   起点取树末最小项，因丁ne 树的先根序是递减的）
      const nav = navigate_to_target(entry.notation, entry.rootList, target, {
        maxSteps: 4000,
        timeLimitMs: settings.timeLimit,
  });
      ensureUids(entry.rootList);
      if (nav.found && nav.node) {
        const ok = focusNodeByUid(entry, nav.node._uid);
      refreshUI();
        return ok
          ? { ok: true, message: `解析到目栁{seqNote}，导舁${nav.steps} 步命中并定位（过程中按需展开了节点）` }
          : { ok: false, message: '导航命中但定位失败' };
    }
      const whyText = {
        'expand-failed': '中途展开不动了（试展开守卫）—— 目标大概不是标准项',
        'no-prev': '已经走到树的最前面还是比目标小',
        'no-start': '这棵树上没有可用作起点的节点（先在树上展开一次）',
        'max-steps': '走了太多步（4000）仍未命中，目标可能太远',
      }[nav.reason] || nav.reason;
      return {
        ok: false,
        message:
          `解析成功，但导航 ${nav.steps} 步后没命中：${whyText}。\n` +
          '非标准式跳转失败是正常现象（ne-rewritten 的说明里也是这么写的）。' +
          '若确认它是标准项，可以点「搜索兜底」。',
    };
    }

    // ⑁解析不了 / 显式要求搜索 ↁ兜底枚举搜索（BFS 先浅后深），并说明原囁
const seeds = entry.rootList.map((n) => n.expr);
    const r = search_target(def, seeds, want, { maxMs: settings.searchMs, maxNodes: 20000 });
    if (!r.found) {
      return {
        ok: false,
        message:
          (mode === 'search'
            ? '（你点了「搜索兜底」）'
            : parsed.reason === 'no-from-display'
              ? '该记号没有 from_display（无法把显示文本解析回表达式），只能用搜索 —— '
              : `解析失败（${parsed.error || '输入不是该记号的合法显示文本'}），改用搜索 — `) + r.reason,
    };
    }

  // 下拉高亮项（钳制到有效范围）
    let node = entry.rootList[r.seedIndex];
    if (!node) return { ok: false, message: '搜索给了一个不存在的起点（内部错误）' };
    for (let k = 0; k < r.path.length; k++) {
      const res = expand_ne(entry.notation, entry.rootList, node, 0, 0, settings.timeLimit);
      if (!res || !res.changed) {
        return {
          ok: false,
          message: `重放到第 ${k + 1}/${r.path.length} 步就停了（这条路上有更大的兄弟节点挡着）。` +
              '可以先手动把那部分展开几次，再跳一次。',
    };
    }
      const created = ui_node_of(entry.rootList, res.created);
      if (!created) return { ok: false, message: '重放时找不到新建的节点（内部错误）' };
      node = created;
    }
    const got = String(def.display.plain(node.expr));
    if (got !== want) {
      return { ok: false, message: `重放停在、{got}」而不是、{want}」— 树上的上界与搜索路径不一致（该记号在树中的展开受兄弟节点影响）` };
    }
      ensureUids(entry.rootList);
    const ok = focusNodeByUid(entry, node._uid);
      refreshUI();
    return ok
      ? { ok: true, message: `已定位（${r.path.length} 步，访问 ${r.visited} 项，用时 ${r.ms} ms）` }
      : { ok: false, message: '定位失败（导航序列里没有新节点）' };
  }, [settings.timeLimit]);

  // ----- 输出流 -----
  // ne 记号走 ne 引擎（返回非 null 即为已处理）；其余走旧引擎，行为一字未改、  // 任何一侧抛错都**不能把整个交互打斁*：记号是第三方算法（ne 上游就有若干会抛的）！  // 所以这里兜住并变成一条提示。用户要的是「能展开的展开、不能的告诉我为什么」、  // 展开还给一个毫秒上限（settings.timeLimit，默认5000！=不限）：跑不完的循环会把
  // 整个页面冻住，宁可中止并说明。超时时树可能已经展开了一部分 — 提示里如实说明、  //
  // ne 路径的上限做在引擎内部（core/ne/expander.js 的期限）、  // 旧引擎（core/engine.js！*不能攁*（文件头写着严禁修改、需用户确认），
  // 所以走 core/ne/timeGuard.js 的记号包装：引擎每步都会谁FS/compare/able/semiable！  // 包装器每次被调用时查时钟，搜索循环与递归链都能兜住、
const expand_entry = React.useCallback((entry, parentList, node, tier, extra) => {
  try {
      const neRes = expand_ne(entry.notation, entry.rootList, node, tier, extra, settings.timeLimit);
      if (neRes) return neRes;
      return expandNode(with_deadline(entry.notation, settings.timeLimit), parentList, node, tier, extra);
    } catch (e) {
      if (e && e.name === 'TimeLimitError') {
      addOutput(
          `展开超时已中止：超过 ${settings.timeLimit} ms（可在设置里攁time_limit）。` +
              '该记号的基本列可能不收敛；树里可能已留下这次的部分展开。',
          'error',
  );
    } else {
        addOutput(`展开失败（该记号在此表达式/层级下抛错）：${e.message}`, 'error');
    }
      return { changed: false };
    }
  }, [addOutput, settings.timeLimit]);

  const doExpand = React.useCallback((entry, node, tier, extra) => {
    const parentList = findParentList(entry.rootList, node) || entry.rootList;
    const res = expand_entry(entry, parentList, node, tier, extra);
    if (res.changed) {
      ensureUids(entry.rootList);
      refreshUI();
    }
  }, [expand_entry, refreshUI]);

  /** 节点上的 [+]/点击展开：有子节点折叠展开由TreeNodeView 内部处理、*/
  const onToggle = React.useCallback((uid) => {
    for (const entry of treeEntries) {
      const found = findNodeByUid(entry.rootList, uid);
      if (found) { doExpand(entry, found, settings.tier, 0); return; }
    }
  }, [treeEntries, doExpand, settings.tier]);

  /** 加载更多：对节点再展开，额外补 additionalExpand 个 FS 项。 */
  const onMore = React.useCallback((uid) => {
    for (const entry of treeEntries) {
      const found = findNodeByUid(entry.rootList, uid);
      if (found) { doExpand(entry, found, settings.tier, settings.additionalExpand); return; }
    }
    return entry ? getTreeCfg(entry) : { ...DEFAULT_TREE_CFG };
  }, [navItems, clampedFocus, items, getTreeCfg]);

  // ----- 输出流 -----
  // 实现圁ui/TreeNodeView.js（那边握着聚焦行的 DOM）：按该棵树的策略算滚动增量、  // 这里只负责把策略传下去。用户要求：按上下键时屏幕是否跟隁— 仅到边界 / 始终（中上·中间·顶部）、
  /** 把焦点移到某个节点（跳转用）：先保证 uid 存在，再找它在导航序列里的下标、*/
  const focusNodeByUid = React.useCallback((entry, uid) => {
    const idx = navItems.findIndex((x) => x.type === 'node' && x.treeIndex === entry.treeIndex && x.uid === uid);
      if (idx >= 0) setFocusIdx(idx);
    return idx >= 0;
  }, [navItems]);

/**
   * 跳转到目标显示文本（树设置里的「跳转」）、   *   ⑁先在**已有的树**里找 ↁ直接定位！   *   ⑁没有就从各根出发沿基本列搜索（纯表达式搜索，不改树）！   *   ⑁命中后把路径在真树上重放（逐层 expand_ne），最后核对文本并定位、   * 全程不改动用户的树（除了重放确实要展开的那些步），失败时给明确原因、   */

  // ----- 输出流 -----
  const startNote = React.useCallback((treeIndex, uid) => {
    setEditingNote({ treeIndex, uid });
  }, []);

  const saveNote = React.useCallback((treeIndex, uid, text) => {
    for (const entry of treeEntries) {
      if (entry.treeIndex === treeIndex) {
        const node = findNodeByUid(entry.rootList, uid);
        if (node) {
          if (text && text.trim()) node.note = text.trim();
          else delete node.note;
      refreshUI();
    }
        break;
    }
    }
    setEditingNote(null);
  }, [treeEntries, refreshUI]);

  // 常驻注释框用：只写数据、不退出编辑态、不触发整树重渲染（每敲一个字都重建树会卡！
const setNoteText = React.useCallback((treeIndex, uid, text) => {
    const t = String(text ?? '');
    for (const entry of treeEntries) {
      if (entry.treeIndex !== treeIndex) continue;
        const node = findNodeByUid(entry.rootList, uid);
      if (node) { if (t.trim()) node.note = t; else delete node.note; }
        break;
    }
  }, [treeEntries]);

  const cancelNoteEditing = React.useCallback(() => setEditingNote(null), []);

  // 点击某行（含空白）→ 聚焦该行，键盘导航继续走 container
  const onFocusRow = React.useCallback((treeIndex, uid) => {
    const nav = collectNavItems();
    const idx = nav.findIndex(n => n.type === 'node' && n.uid === uid && n.treeIndex === treeIndex);
    if (idx >= 0) {
      setFocusIdx(idx);
      containerRef.current?.focus();
    }
  }, [collectNavItems]);

  // 注释编辑完成（Enter）或取消（Esc）后，把焦点还给容器！  // 避免 input 卸载后焦点掉刁body 导致 ↑↓ 变成页面滚动
  const onNoteCommitted = React.useCallback(() => {
      containerRef.current?.focus();
  }, []);

  // ==========================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
  // ==========================================================================

  // — 树标题「显示视图」：同一棵树用目标显示函数渲染（纯显示翻译）—
const setTreeView = React.useCallback((itemId, viewId) => {
    setItems(prev => prev.map(it =>
      (it.type === 'tree' && it.id === itemId) ? { ...it, viewId } : it
    ));
  }, []);

  // — tree / draw 输出块折叠：收成一行标题（UI 附加字段 collapsed，核心不感知）—
const toggleItemCollapse = React.useCallback((itemId) => {
    setItems(prev => prev.map(it =>
      (it.type === 'tree' || it.type === 'draw') && it.id === itemId
        ? { ...it, collapsed: !it.collapsed }
        : it
    ));
  }, []);

  // — draw 图案缩放：.5 倍，钳制 0.5x~8x（UI 附加字段 zoom，核心不感知）—
const setItemZoom = React.useCallback((itemId, zoom) => {
    setItems(prev => prev.map(it =>
      it.type === 'draw' && it.id === itemId
        ? { ...it, zoom: clampZoom(zoom) }
        : it
    ));
  }, []);

  // — convert：记号互译（core/converters.js 注册表）—
const handleConvertCommand = React.useCallback((parsed) => {    if (parsed.error) { addOutput(parsed.error, 'error'); return; }
    const map = buildNameMap();
    const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
    const fromId = map.get(norm(parsed.fromName));
    const toId = map.get(norm(parsed.toName));
    if (!fromId) { addOutput(`未找到源记号: ${parsed.fromName}（/list 查看）`, 'error'); return; }
    if (!toId) { addOutput(`未找到目标记号: ${parsed.toName}（/list 查看）`, 'error'); return; }
    if (fromId === toId) { addOutput('源记号与目标记号相同', 'error'); return; }

    const from = getNotation(fromId);
    const meta = NOTATION_META[fromId] || {};
    // 与主输入一致：记号自带 parse > NOTATION_META.parse
    const parser = typeof from.parse === 'function' ? from.parse : meta.parse;
    if (typeof parser !== 'function') {
      addOutput(`记号 ${fromId} 不支持输入表达式（只支持 limit 建树）`, 'error');
      return;
    }
    let expr;
  try {
      expr = parser(parsed.exprStr);
    } catch (e) {
      addOutput(`表达式解析失败（${fromId}）：${e.message}`, 'error');
      return;
    }
    const result = convert(fromId, expr, toId);
    if (!result) {
      const targets = listConverterTargets(fromId);
      addOutput(
        `暂不支持 ${fromId} → ${toId} 的互译` +
        (targets.length ? `（${fromId} 目前可转: ${targets.join(', ')}）` : ''),
        'error'
  );
      return;
    }
    addOutput(`» ${fromId} → ${toId}`, 'info');
    addOutput(`« ${result.display}`, 'output');
  }, [addOutput]);

  const handleSaveCommand = React.useCallback((parsed) => {
    if (treeEntries.length === 0) {
        addOutput('没有可保存的内容', 'error');
      return;
    }
    let target = null;
    if (parsed.num !== undefined) {
      target = treeEntries.find(e => e.treeIndex === parsed.num - 1) || null;
      if (!target) {
        addOutput(`找不到第 ${parsed.num} 棵树`, 'error');
      return;
    }
    } else {
      target = treeEntries[treeEntries.length - 1];
    }
    if (parsed.format === 'xlsx') {
      downloadTreeAsXLSX(target.notation, target.rootList, target.name, addOutput, parsed.includeNoNote);
    } else {
      downloadTreeAsCSV(target.notation, target.rootList, target.name, addOutput, parsed.includeNoNote);
    }
  }, [treeEntries, addOutput]);

  // — import：把导出走xlsx/csv 还原成一棵树（需记号可解析回表达式）—   //
//   import <记号名>   —— 用指定记号解析（如 import bm4）
  const handleImportCommand = React.useCallback((arg) => {
    const text = (arg || '').trim();

    // 确定记号：显弁arg 优先，否则取最后一棵树
    let notation = null;
    let notationName = '';
    if (text) {
    const map = buildNameMap();
    const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
      const id = map.get(norm(text));
      if (!id) { addOutput(`未找到记号: ${text}（/list 查看）`, 'error'); return; }
      notation = getNotation(id);
      notationName = (notation && notation.name) || id;
    } else {
      const last = treeEntries[treeEntries.length - 1];
      if (!last) { addOutput('没有可导入的树：请先建树，或指定记号（如 import bm4）', 'error'); return; }
      notation = last.notation;
      notationName = last.name;
    }
    if (!notation) { addOutput('记号不存在', 'error'); return; }

    // 该记号必须能解析回表达式（有 parse）
    const meta = NOTATION_META[notation.id] || {};
    const hasParser = typeof notation.parse === 'function' || typeof meta.parse === 'function';
    if (!hasParser) {
      addOutput(`记号 ${notationName} 暂不支持导入（没有 parse）——只能 limit 建树，无法把展示文本解析回表达式`, 'error');
      return;
    }

    // 文件选择（xlsx / csv）
const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const lower = file.name.toLowerCase();
      const isXlsx = lower.endsWith('.xlsx') || lower.endsWith('.xls');
      const reader = new FileReader();
      reader.onerror = () => addOutput('读取文件失败', 'error');
      reader.onload = async () => {
        try {
          const data = isXlsx ? reader.result : (typeof reader.result === 'string' ? reader.result : new TextDecoder().decode(reader.result));
          const rows = await parseImportFile(file.name, data);
          if (rows.length === 0) { addOutput('文件为空或没有可读取的行', 'error'); return; }
          const result = buildImportTree(notation, meta, rows);
          if (result.error) { addOutput(result.error, 'error'); return; }
          const treeIndex = nextTreeIndex;
          setNextTreeIndex(i => i + 1);
          setItems(prev => [...prev, {
            id: nextItemId,
            type: 'tree',
            treeIndex,
            notation,
            rootList: result.rootList,
            name: notationName,
          }]);
          setNextItemId(i => i + 1);
          setFocusIdx(-1);
          ensureUids(result.rootList);
          addOutput(`» 导入 ${result.count} 个表达式到「${notationName}」（${file.name}）`, 'info');
          if (result.unsupported && result.unsupported.length > 0) {
            const shown = result.unsupported.slice(0, 10).join('、');
            addOutput(`⚠️ 有 ${result.unsupported.length} 行无法解析为表达式（未导入）：${shown}${result.unsupported.length > 10 ? ' …' : ''}`, 'error');
          }
          refreshUI();
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 0);
        } catch (err) {
          addOutput(`导入失败: ${err && err.message ? err.message : err}`, 'error');
        }
      };
      if (isXlsx) reader.readAsArrayBuffer(file);
      else reader.readAsText(file, 'utf-8');
      // 清理 DOM
      document.body.removeChild(fileInput);
    };
    document.body.appendChild(fileInput);
    fileInput.click();
  }, [treeEntries, nextItemId, nextTreeIndex, addOutput, refreshUI]);

  // — tree：生成记号展开树（主体指令；裸输入是它的缩写，见handleSubmit）—   //   tree <记号名 <表达式  妁tree PrSS 0,1,2
  //   tree <记号名           用该记号 init() 示例建树（tree DEN！  //   tree limit <记号名     同上（tree limit DEN / tree limit(DEN)！
const handleTreeCommand = React.useCallback((arg) => {
    const text = (arg || '').trim();
    if (!text) {
      addOutput('用法: tree <记号名> <表达式>（如 tree PrSS 0,1,2；tree DEN 用示例建树）', 'error');
      return;
    }
  try {
      const parsed = parseNotation(text);
      // 家族名（如 rel BnSS）会带一句提示，说明取了第几档、怎么写指定档位
      if (parsed.notice) addOutput(parsed.notice, 'info');
      const notation = getNotation(parsed.notationId);
      if (!notation) throw new Error(`记号不存在: ${parsed.notationId}`);

      let rootList;
      if (parsed.kind === 'limit') {
        rootList = makeTreeFromInit(notation);
    } else {
        // 解析表达式：记号自带 parse > NOTATION_META.parse；都没有则明确报
const meta = NOTATION_META[parsed.notationId] || {};
        const parser = typeof notation.parse === 'function' ? notation.parse : meta.parse;
    if (typeof parser !== 'function') {
          throw new Error('该记号暂不支持输入特定表达式（只支持 limit 建树）');
    }
        const expr = parser(parsed.expr);
        rootList = makeTreeFromExpr(notation, expr);
        ensureUids(rootList);
    }

          const treeIndex = nextTreeIndex;
          setNextTreeIndex(i => i + 1);
          setItems(prev => [...prev, {
            id: nextItemId,
            type: 'tree',
            treeIndex,
            notation,
        rootList,
        name: parsed.notationName,
          }]);
          setNextItemId(i => i + 1);
          setFocusIdx(-1);

      // 初始展开（defaultExpand 次，对第一个可展开节点！
let remaining = settings.defaultExpand;
      let guard = 0;
      let anchor = rootList[0];
      // entry 还没允items，这里先造一个只吁notation/rootList 的壳给展开分发器用
      const entryShell = { notation, rootList };
      while (remaining > 0 && guard < 50) {
        const parentList = findParentList(rootList, anchor) || rootList;
        const res = expand_entry(entryShell, parentList, anchor, settings.tier, 0);
        if (!res.changed) break;
        ensureUids(rootList);
        if (res.created) {
          // ne 引擎会告诉我们新建了哪个节点，直接接着展开它（比旧引擎的「猜末尾」准！
const nu = ui_node_of(rootList, res.created);
          if (nu) anchor = nu;
    } else {
          // 继续展开刚生成的新节点（树末尾，同一条链！
const tail = rootList[rootList.length - 1];
        anchor = tail && tail.subitems && tail.subitems.length > 0 ? tail : anchor;
    }
        remaining--;
        guard++;
    }
      refreshUI();
        } catch (err) {
      addOutput(`错误: ${err.message}`, 'error');
    }
  }, [settings, nextItemId, nextTreeIndex, refreshUI, addOutput]);

  // — draw：绘制图案（独立指令，不经过 tree / 视图按钮）—   //   draw <Y序列> [模式]                  Y 序列山脉图（模式: DBMS / DBMS' / ADBMS！  //   draw <Y序列> [模式]     Y 序列山脉图（模式: DBMS / DBMS' / ADBMS！  //   draw <IBLP表达式       IBLP（DEN2）图桁— 结构自动识别，无需显式声明！  //                           也可 draw iblp <表达式 显式前缀（不带表达式画极限示例）
  const handleDrawCommand = React.useCallback((arg) => {
    const text = (arg || '').trim();
    if (!text) {
      addOutput("用法: draw <Y序列> [DBMS|DBMS'|ADBMS] 或 draw <IBLP表达式>", 'error');
      return;
    }

    // — IBLP：显式前缀（den2/iblp）或结构自动识别！表L(表L…）—
const first = text.split(/\s+/)[0].toLowerCase();
    let exprStr, isIblp;
    if (buildNameMap().get(first) === 'den2') {
      isIblp = true;
      exprStr = text.slice(first.length).trim();
      if (!exprStr) exprStr = IBLP_LIMIT_EXAMPLE; // 极限示例
    } else if (isIblpDisplay(text)) {
      isIblp = true;
      exprStr = text;
    } else if (/^limit$/i.test(text)) {
        addOutput('Limit 是 IBLP 极限表达式，没有具体图案可绘制', 'error');
      return;
    } else {
      isIblp = false;
      exprStr = text;
    }

    if (isIblp) {
      let rows;
  try {
        rows = parseIblpDisplay(exprStr);
    } catch (e) {
        addOutput(`IBLP 解析失败: ${e.message}`, 'error');
      return;
    }
      const diagram = iblp_diagram(rows);
      if (!diagram) {
          addOutput('无法为该表达式绘制图案', 'error');
      return;
    }
      const itemId = nextItemId;
          setNextItemId(i => i + 1);
          setItems(prev => [...prev, {
        id: itemId,
        type: 'draw',
        label: 'IBLP 图案',
        diagram,
        exprText: exprStr,
        equiv: undefined,
          }]);
          setFocusIdx(-1);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
      return;
    }

    // — Y 序列山脉图分支（厁mountain 逻辑）—     // 尾部可选显示模式；其余部分作为 Y 序列表达式（exprStr 已在上面声明！
let equiv;
    const modeMatch = text.match(/\s+(dbms'|adbms|dbms)\s*$/i);
    if (modeMatch) {
      equiv = modeMatch[1].toUpperCase() === "DBMS'" ? "DBMS'" : modeMatch[1].toUpperCase();
      exprStr = text.slice(0, modeMatch.index).trim();
    }
    if (!exprStr) {
        addOutput('缺少 Y 序列表达式', 'error');
      return;
    }
    let seq;
  try {
      seq = parseSequence(exprStr);
    } catch (e) {
      addOutput(`序列解析失败: ${e.message}`, 'error');
      return;
    }
    if (!Array.isArray(seq)) {
      addOutput('山脉图需要 Y 序列表达式（如 1,2,4,8）', 'error');
      return;
    }
    const diagram = omegaY_diagram(seq, { equiv });
      if (!diagram) {
      addOutput('没有可保存的树', 'error');
      return;
    }
      const itemId = nextItemId;
          setNextItemId(i => i + 1);
          setItems(prev => [...prev, {
        id: itemId,
        type: 'draw',
        label: '山脉图',
        diagram,
        exprText: exprStr,
      equiv,
          }]);
          setFocusIdx(-1);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
  }, [addOutput, nextItemId, setItems, setFocusIdx]);

  // ==========================================================================
  //  notation：自定义记号（注册到「自定义记号」文件夹！  // ==========================================================================
  const handleNotationCommand = React.useCallback((parsed) => {
    const sub = parsed.sub || 'list';

    if (sub === 'add') {
      if (!parsed.source) {
        addOutput('用法: /notation add <JS 记号定义>（两种接口都认：ne 定义 / 经典 6 方法对象或工厂）', 'error');
      return;
    }
      const res = add_user_notation(parsed.source, parsed.id ? { id: parsed.id } : {});
      if (!res.ok) {
        addOutput(`✁${res.error}`, 'error');
      return;
    }
      const n = getNotation(res.id);
      addOutput(`✓ 已注册自定义记号 ${res.id}：${res.kind === 'classic' ? '经典 6 方法接口' : 'ne 定义'}（${n ? n.name : ''}）`, 'info');
        addOutput('  已放进 /list 的「自定义记号」文件夹；用 /list 或直接输入它的名字建树。', 'info');
      if (is_ne(n)) {
          addOutput('  展开走 ne 引擎，结果与 ne-rewritten 一致。', 'info');
    }
      return;
    }

    if (sub === 'del') {
      if (!parsed.id) {
        addOutput('用法: /notation del <id>', 'error');
      return;
    }
      const res = remove_user_notation(parsed.id);
      addOutput(res.ok ? `✁已删陁${res.id}` : `✁${res.error}`, res.ok ? 'info' : 'error');
      return;
    }

    if (sub === 'show') {
      if (!parsed.id) {
        addOutput('用法: /notation show <id>', 'error');
      return;
    }
      const src = get_user_source(parsed.id);
      if (!src) {
        addOutput(`✁没有名为 '${parsed.id}' 的自定义记号`, 'error');
      return;
    }
      addOutput(src, 'info');
      return;
    }

    // list（或裸写 /notation！    // 裸写 /notation ↁ打开编辑面板（带多行编辑器，能改旧记号、也能加新的！
if (!parsed.sub) {
      setShowNotationEditor(true);
      return;
    }
    const list = list_user_notations();
    addOutput('自定义记号（注册后会出现在 /list 的「自定义记号」文件夹里）:', 'info');
    if (list.length === 0) addOutput('  （暂无）', 'info');
    for (const u of list) addOutput(`  ${u.id.padEnd(18)} ${u.kind === 'classic' ? '经典接口' : 'ne 定义'}  ${u.name || ''}`, 'info');
    addOutput('', 'info');
    addOutput('  /notation add <JS 记号定义>    注册（JS 里写 id / name，两种接口都认）', 'info');
    addOutput('  /notation del <id>             删除', 'info');
    addOutput('  /notation show <id>            查看源码', 'info');
    addOutput('  例：/notation add ({ id:"my", name:"我的记号", display:(e)=>String(e), is_limit:(e)=>false, compare:(a,b)=>a<b?-1:a>b?1:0, FS:(e,i)=>e, init:()=>["0"] })', 'info');
  }, [addOutput]);

  // ==========================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
  // ==========================================================================
  const handleSubmit = React.useCallback(async () => {
    // 兜底归一化：粘贴/拖入等未赁composition 事件的中文标点，提交时也转半见
const raw = normalizePunct(input.trim());
    if (!raw) return;
    setInput("");
    addOutput(`> ${raw}`, 'input');

    // — 命令（可币/ 前缀，也可不带，妁help / set tier=0）—
const parsed = parseCommand(raw);
    if (parsed.command !== 'unknown') {
      switch (parsed.command) {
        case 'clear':
          setItems([]);
          setNextItemId(0);
          setNextTreeIndex(0);
          setFocusIdx(-1);
      return;
        case 'list': {
          const all = getAllNotations();
          const categories = buildNotationList(all);
          addOutput(`» 已注册${countNotationsForDisplay(all)} 个记号（点击分类展开，双击记号直接建树）:`, 'info');
          setItems(prev => [...prev, { id: nextItemId + 1, type: 'folder', categories }]);
          setNextItemId(i => i + 1);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
      return;
    }
        case 'help': {
          for (const line of HELP_LINES) addOutput(line, 'info');
      return;
    }
        case 'save': {
          handleSaveCommand(parsed);
      return;
    }
        case 'import': {
          handleImportCommand(parsed.arg);
      return;
    }
        case 'convert': {
          handleConvertCommand(parsed);
      return;
    }
        case 'tree': {
          handleTreeCommand(parsed.arg);
      return;
    }
        case 'draw': {
          handleDrawCommand(parsed.arg);
      return;
    }
        case 'notation': {
          handleNotationCommand(parsed);
      return;
    }
        case 'set': {
          const key = parsed.key;
          const valStr = parsed.value;          if (key === 'theme') {
            const themeMap = {
              dark: "dark", light: "light", paper: "paper",
              solarizedlight: "solarizedLight", sollight: "solarizedLight", sl: "solarizedLight",
              solarizeddark: "solarizedDark", soldark: "solarizedDark", sd: "solarizedDark"
    };
            const tk = themeMap[valStr.toLowerCase().replace(/[\s.]+/g, "")];
            if (tk) {
              setThemeKey(tk);
              addOutput(`» Theme: ${THEMES[tk].name}`, 'info');
    } else {
              addOutput(`未知主题: ${valStr}`, 'error');
    }
    } else {
            const val = parseInt(valStr, 10);
            if (isNaN(val) || val < 0) {
              addOutput(`无效数字: ${valStr}`, 'error');
      return;
    }
            if (key === 'default_expand' || key === 'default') {
              if (val < 1) { addOutput('default_expand 至少为 1', 'error'); return; }
              setSettings(s => ({ ...s, defaultExpand: val }));
              addOutput(`» default expand = ${val}`, 'info');
            } else if (key === 'additional_expand' || key === 'additional') {
              if (val < 0) { addOutput('additional_expand 至少为 0', 'error'); return; }
              setSettings(s => ({ ...s, additionalExpand: val }));
              addOutput(`» additional expand = ${val}`, 'info');
            } else if (key === 'tier') {
              if (val > 9) { addOutput('tier 范围 0-9（与远古版一致）', 'error'); return; }
              setSettings(s => ({ ...s, tier: val }));
              addOutput(`» expansion tier = ${val} (${tierName(val)})`, 'info');
            } else if (key === 'font' || key === 'font_size') {
              if (val < 10 || val > 28) { addOutput('font 范围 10-28（默认 16）', 'error'); return; }
              setSettings(s => ({ ...s, fontSize: val }));
              addOutput(`» font size = ${val} (${Math.round((val / 16) * 100)}%)`, 'info');
            } else if (key === 'search_ms' || key === 'searchms') {
                if (val < 500 || val > 120000) { addOutput('search_ms 范围 500-120000（默认 8000）', 'error'); return; }
              setSettings(s => ({ ...s, searchMs: val }));
                addOutput('» 跳转兜底搜索上限 = ' + val + ' ms（只有在记号没有 from_display 时才用到）', 'info');
            } else if (key === 'wrap' || key === 'wrap_long' || key === 'wraplong') {
              const on = ['1', 'on', 'true', 'yes', '换行'].includes(String(value || '').trim().toLowerCase());
                const off = ['0', 'off', 'false', 'no', '不换行'].includes(String(value || '').trim().toLowerCase());
              if (!on && !off) { addOutput('wrap 用法：set wrap=on / set wrap=off', 'error'); return; }
              setSettings(s => ({ ...s, wrapLong: on }));
              addOutput('» 长行' + (on ? '换行' : '不换行（超出部分可横向滚动）'), 'info');
            } else if (key === 'style' || key === 'tree_style') {
              // 样式是「外见+ 键盘」配套的，且按树存；命令行没朁当前栁的概忁ↁ改所有树
              const alias = { classic: 'mine', mine: 'mine', selfne: 'selfne', ner: 'ner' };
              const v = String(value || '').trim().toLowerCase();
              const pick = alias[v] || null;
                if (!pick) { addOutput('style 取值：mine / selfne / ner（或 classic = mine）', 'error'); return; }
              setItems((prev) => prev.map((it) => (it.type === 'tree' ? { ...it, treeCfg: { ...(it.treeCfg || {}), style: pick } } : it)));
                addOutput('» 所有树的样式 = ' + pick + '（外观与键盘一起换；单棵树的在树标题行 ⚙️ 里改）', 'info');
            } else if (key === 'note_width' || key === 'notewidth') {
                if (val < 80 || val > 500) { addOutput('note_width 范围 80-500（默认 200）', 'error'); return; }
              setSettings(s => ({ ...s, noteWidth: val }));
              addOutput('» 注释框宽庁= ' + val + ' px', 'info');
            } else if (key === 'timeout' || key === 'time_limit' || key === 'timelimit') {
              if (val < 0 || val > 600000) { addOutput('timeout 范围 0-600000 ms（0 = 不限制）', 'error'); return; }
              setSettings(s => ({ ...s, timeLimit: val }));
      addOutput(
                val > 0
                  ? `» 展开上限 = ${val} ms（超时中止并提示）`
                  : '» 展开上限 = 不限制（基本列不收敛的记号会把页面卡住，慎用）',
                'info',
  );
    } else {
              addOutput(`未知设置: ${key}`, 'error');
    }
    }
      return;
    }
        default:
          addOutput(`未知命令: ${raw}`, 'error');
      return;
    }
    }

    // — 其余输入：一律视丁tree 指令的缩写（任何输入都是指令）—
handleTreeCommand(raw);
  }, [input, addOutput, handleSaveCommand, handleTreeCommand, handleDrawCommand, handleImportCommand]);

  // ==========================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
  // ==========================================================================
  const handleGlobalKey = React.useCallback((e) => {
    // — 在「非主输入框」的表单控件里打字时，不要被导航快捷键抢赁—     //   弹窗里的 textarea/input 最怕这个：'n' 会去开注释、数字会去送FS 项、    //   方向键会去导航。主输入框（inputRef）不在此列，它的既有行为要保持、
const t = e.target;
    const inForm = t && t !== inputRef.current &&
      (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (inForm && e.key !== 'Escape') return;

    // — 注释编辑中：↑↓ 保存并导航，Esc 取消 —
if (editingNote) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') {
          saveNote(editingNote.treeIndex, editingNote.uid, active.value);
    }
    const nav = collectNavItems();
        const total = nav.length;
        const cur = clampedFocus;
        let next;
        if (e.key === 'ArrowUp') next = cur > 0 ? cur - 1 : 0;
        else next = cur < total - 1 ? cur + 1 : total - 1;
        setFocusIdx(next);
        if (nav[next]?.type === 'input') inputRef.current?.focus();
        else containerRef.current?.focus();
    }
      return;
    }

    const nav = collectNavItems();
        const total = nav.length;
        const cur = clampedFocus;
    const item = cur >= 0 ? nav[cur] : null;

    // Esc ↁ回输入框
    if (e.key === 'Escape') {
      setFocusIdx(total - 1);
    inputRef.current?.focus();
        e.preventDefault();
      return;
    }

    // 输入框聚焦时：↑ 回到最后一个节炁
if (document.activeElement === inputRef.current) {
      if (e.key === 'ArrowUp' && total > 1) {
        setFocusIdx(total - 2);
        inputRef.current?.blur();
      containerRef.current?.focus();
        e.preventDefault();
    }
      return;
    }

    // — 交互风格：按焦点所在树的设置过滤按键（三档，键位各自照源码来）—     //   selfne（自助版 NE-4.8.1）：树上基本只有鼠标 ↁ陁Esc 外都不抢十    //   ner（ne-rewritten）：↑↓ 移动 · Enter 单次展开 · Shift+Enter 一层展开 · Ctrl+H 折叠/展开子项 · Esc
    //   mine（本工具）：下面全部快捷锁
const kbdStyle = focusedTreeCfg().style;
    if (kbdStyle === 'selfne' && e.key !== 'Escape') return;
    if (kbdStyle === 'ner') {
      const ctrlH = e.ctrlKey && (e.key === 'h' || e.key === 'H');
      const allowed = e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape' || ctrlH;
      if (!allowed) return;
      if (ctrlH) {
        // Ctrl+H：折叁展开子项（ne-rewritten 的同名快捷键！
if (item?.type === 'node' && item.item && item.item.subitems && item.item.subitems.length) {
          item.item._collapsed = !item.item._collapsed;
      refreshUI();
    }
        e.preventDefault();
      return;
    }
    }
    // Enter 的展开层级：ner 档按 ne-rewritten 的约定（Enter = 单次、Shift+Enter = 一层）
    const enterTier = kbdStyle === 'ner' ? (e.shiftKey ? 1 : 0) : 1;

    // n ↁ注释
    if ((e.key === 'n' || e.key === 'N') && item?.type === 'node') {
      startNote(item.treeIndex, item.uid);
        e.preventDefault();
      return;
    }

    const goParent = () => {
      if (item?.type !== 'node') return;
      const parentUid = item.ancestors[item.ancestors.length - 1];
      if (parentUid === undefined) return;
      const idx = nav.findIndex(n => n.type === 'node' && n.uid === parentUid && n.treeIndex === item.treeIndex);
      if (idx >= 0) setFocusIdx(idx);
    };

    const goSibling = (n) => {
      if (item?.type !== 'node') return false;
      const { entry, item: node } = item;
    const parentList = findParentList(entry.rootList, node) || entry.rootList;
      if (n >= 0 && n < parentList.length) {
        const target = parentList[n];
        const idx = nav.findIndex(ni => ni.type === 'node' && ni.uid === target._uid && ni.treeIndex === item.treeIndex);
        if (idx >= 0) { setFocusIdx(idx); return true; }
    }
      return false;
    };

    const doToggleFocused = (tier = 1) => {
      if (item?.type !== 'node') return;
      const { entry, item: node } = item;
        if (node.subitems && node.subitems.length > 0) {
        node._collapsed = !node._collapsed;
      refreshUI();
    } else {
        doExpand(entry, node, tier, 0);
    }
    };

    if (e.key === 'ArrowDown' || e.key === 'j') {
      const next = cur < 0 ? 0 : Math.min(cur + 1, total - 1);
        setFocusIdx(next);
        if (nav[next]?.type === 'input') inputRef.current?.focus();
        e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      const next = cur <= 0 ? 0 : cur - 1;
        setFocusIdx(next);
        if (nav[next]?.type === 'input') inputRef.current?.focus();
      else { inputRef.current?.blur(); containerRef.current?.focus(); }
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      if (item?.type === 'node') {
        const { item: node } = item;
        if (node.subitems && node.subitems.length > 0 && node._collapsed) {
          node._collapsed = false;
      refreshUI();
    } else {
          // ↁ始终是展开：有子已展开 ↁ加载更多；无孁ↁ展开一屁
onMore(item.uid);
    }
    }
        e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'h') {
      if (item?.type === 'node') {
        const { item: node } = item;
        if (node.subitems && node.subitems.length > 0 && !node._collapsed) {
          node._collapsed = true;
      refreshUI();
    } else {
          goParent();
    }
      } else if (item?.type === 'input') {
        // no-op
    }
        e.preventDefault();
    } else if (e.key === ',' || e.key === 'Backspace') {
          goParent();
        e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (item?.type === 'node') doToggleFocused(enterTier);
        e.preventDefault();
    } else if (e.key === '-' || e.key === '_') {
      // - 折叠：有子且未折叁ↁ折叠；否则回父节炁
if (item?.type === 'node') {
        const { item: node } = item;
        if (node.subitems && node.subitems.length > 0 && !node._collapsed) {
          node._collapsed = true;
      refreshUI();
    } else {
          goParent();
    }
    }
        e.preventDefault();
    } else if (e.key === '+' || e.key === '=') {
      if (item?.type === 'node') onMore(item.uid);
        e.preventDefault();
    } else if (/^[0-9]$/.test(e.key)) {
      if (goSibling(parseInt(e.key, 10))) e.preventDefault();
    }
  }, [editingNote, collectNavItems, clampedFocus, refreshUI, doExpand, startNote, onMore, saveNote, findParentList]);

  // ==========================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
  // ==========================================================================
  //  折叠按钮样式（tree / draw 标题行左侧，▁展开 / ▁折叠！
const collapseBtnStyle = {
    background: "transparent",
    border: `1px solid ${theme.border}`,
    color: theme.fg,
    borderRadius: 3,
    padding: "0 5px",
    fontSize: 12,
    lineHeight: "1.3",
    cursor: "pointer",
    fontFamily: "inherit",
    };

  const renderItems = items.map((item) => {
    if (item.type === 'output') {
      let color = theme.logColor;
      if (item.outputType === 'error') color = theme.error;
      else if (item.outputType === 'input') color = theme.fg;
      return React.createElement("div", {
        key: `output-${item.id}`,
        style: { color, minHeight: 26, display: "flex", alignItems: "baseline" }
      },
                  React.createElement("span", {
          style: settings.wrapLong
            ? { whiteSpace: "pre-wrap", wordBreak: "break-all", minWidth: 0 }
            : { whiteSpace: "pre", display: "block", maxWidth: "100%", minWidth: 0, overflowX: "auto" },
        }, item.message)
  );
    }
    if (item.type === 'folder') {
      return React.createElement("div", {
        key: `folder-${item.id}`,
        style: { marginTop: 4, marginBottom: 6 }
      },
        React.createElement(FolderView, {
          categories: item.categories,
          theme,
  // 下拉高亮项（钳制到有效范围）
          onNotationDoubleClick: (nid) => {
            handleTreeCommand(nid);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
      },
        })
  );
    }
    if (item.type === 'tree') {
      ensureUids(item.rootList);
      // 显示视图按钮组：原生 + NOTATION_META.views 变体 + converters 目标
      const views = resolveTreeViews(item.notation.id);
      const currentView = item.viewId || undefined;
      const activeView = views.find(v => v.id === currentView) || views[0];
      const displayFn = activeView && activeView.display ? activeView.display : undefined;
      const btnStyle = (isActive) => ({
        background: isActive ? theme.accent2 : "transparent",
    border: `1px solid ${theme.border}`,
        color: isActive ? theme.bg : theme.fg,
    borderRadius: 3,
        padding: "0 8px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  });
      return React.createElement("div", {
        key: `tree-wrapper-${item.id}`,
        style: { marginTop: 4, border: `1px solid ${theme.border}`, borderRadius: 4, overflow: "hidden" }
      },
        React.createElement("div", {
          style: {
            color: theme.fgMuted, fontSize: 13,
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            background: theme.highlight, padding: "3px 8px", borderBottom: `1px solid ${theme.border}`
    }
      },
          React.createElement("button", {
            onClick: () => toggleItemCollapse(item.id),
            title: item.collapsed ? '展开这棵树' : '把树收成一行',
            style: collapseBtnStyle,
          }, item.collapsed ? '▶' : '▼'),
          React.createElement("span", null, `--- 树 #${item.treeIndex + 1} (${item.name}) ---`),
          views.length > 1 && views.map((v) => React.createElement("button", {
            key: v.id === undefined ? 'native' : v.id,
            onClick: () => setTreeView(item.id, v.id),
            disabled: v.id === currentView,
            title: `把整棵树显示为 ${v.label}（展开树不变，仅翻译文本）`,
            style: btnStyle(v.id === currentView),
          }, `显示为 ${v.label}`)),
          // 这棵树的设置（跳轁/ 显示方式 / 交互风格 / 滚动跟随！
React.createElement("button", {
            onClick: () => setTreeCfgOpenId(item.id),
            title: '这棵树的设置（跳转 / 显示方式 / 交互风格 / 滚动跟随）',
            style: { ...btnStyle(false), marginLeft: 'auto' },
        }, '⚙️ 树设置')
        ),
        // 树体与上方标题栏（标颁+ 视图切换按钮）留出呼吸空间：2px 太贴，改 10px
        item.collapsed ? null : React.createElement("div", { style: { padding: "2px 8px 6px" } },
          React.createElement(TreeNodeView, {
            key: `tree-${item.id}`,
            rootList: item.rootList,
            notation: item.notation,
            displayFn,
            treeIndex: item.treeIndex,
          theme,
            focusUid: focusedItem?.type === 'node' && focusedItem.treeIndex === item.treeIndex ? focusedItem.uid : null,
            onToggle,
            onMore,
            startNote,
            editingNote,
            saveNote,
            cancelNoteEditing,
            onFocusRow,
            onNoteCommitted,
            onRefresh: refreshUI,
            // — 单棵树的配置 —             // 滚动跟随策略（不跁/ 仅到边界 / 始终·中上·中间·顶部）由 TreeNodeView 执行
            scrollMode: getTreeCfg(item).scrollFollow,
            noteWidth: settings.noteWidth,
            onNoteWidth: (w) => setSettings((s2) => ({ ...s2, noteWidth: w })),
            compareDisplay: (() => {
              const cid = getTreeCfg(item).compareView;
              if (!cid) return null;
              const v = resolveTreeViews(item.notation.id).find((x) => String(x.id) === String(cid));
              return v && typeof v.display === 'function' ? v.display : null;
            })(),
            treeStyle: getTreeCfg(item).style,
            wrapLong: settings.wrapLong,
            onNoteChange: setNoteText,
  // 下拉高亮项（钳制到有效范围）
            extraViews: getTreeCfg(item).showAllViews
              ? views.filter((v) => v.id !== (activeView && activeView.id)).map((v) => ({ label: v.label, display: v.display }))
              : null,
        })
        )
  );
    }
    if (item.type === 'draw') {
      // 独立指令 draw 产出的图案（Y 山脉囁/ IBLP 图案；Canvas + HTML 叠文本）
      const equivLabel = item.equiv ? ` · ${item.equiv}` : '';
      const zoom = item.zoom || 1;
      return React.createElement("div", {
        key: `draw-wrapper-${item.id}`,
        style: { marginTop: 4, border: `1px solid ${theme.border}`, borderRadius: 4, overflow: "hidden" }
      },
        React.createElement("div", {
          style: {
            color: theme.fgMuted, fontSize: 13,
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            background: theme.highlight, padding: "3px 8px", borderBottom: `1px solid ${theme.border}`
    }
      },
          React.createElement("button", {
            onClick: () => toggleItemCollapse(item.id),
            title: item.collapsed ? '展开这棵树' : '把树收成一行',
            style: collapseBtnStyle,
          }, item.collapsed ? '▶' : '▼'),
          React.createElement("span", null, `--- ${item.label} (${item.exprText}${equivLabel}) ---`),
          // 放大 / 缩小（Á.5 步进，钳制 0.5x~8x！
React.createElement("button", {
            onClick: () => setItemZoom(item.id, zoom / 1.5),
            title: '缩小',
            style: { ...collapseBtnStyle, minWidth: 22, padding: "0 3px" },
          }, "−"),
          React.createElement("span", { style: { fontSize: 12 } }, `${Math.round(zoom * 100)}%`),
          React.createElement("button", {
            onClick: () => setItemZoom(item.id, zoom * 1.5),
            title: '放大',
            style: { ...collapseBtnStyle, minWidth: 22, padding: "0 3px" },
          }, "+")
        ),
        item.collapsed ? null : React.createElement(MountainView, {
          diagram: item.diagram,
          theme,
          scale: zoom,
        })
  );
    }
  return null;
  });

  // ==========================================================================
  //  主渲柁  // ==========================================================================
  // 整体字体缩放系数（设置里走font_size，默认16 ↁzoom=1 不缩放）
  const fontZoom = settings.fontSize / 16;

  /**
   * 导出某一棵树（树设置里的「导出」用）。kind: 'csv' | 'xlsx'。
   * 第 5 个参数 includeNoNote=true：连没注释的节点一起导出 —— 传 false 时新树
   * （没有任何注释）会被判成「没有带注释的节点」而拒绝导出，表现就是按钮点了没反应。
   */
  const doExportTree = React.useCallback((entry, kind) => {
    if (!entry || !entry.notation || !entry.rootList) return { ok: false, message: '这棵树没有可导出的内容' };
    try {
      if (String(kind).toLowerCase() === 'csv') {
        downloadTreeAsCSV(entry.notation, entry.rootList, entry.name, addOutput, true);
      } else {
        downloadTreeAsXLSX(entry.notation, entry.rootList, entry.name, addOutput, true);
      }
      return { ok: true, message: '已开始下载 ' + String(kind).toUpperCase() };
    } catch (e) {
      return { ok: false, message: '导出失败：' + (e && e.message) };
    }
  }, [addOutput]);

  const jumpToTarget = React.useCallback((entry, text, fsIndex, mode) => {
    const def = entry.notation && entry.notation._def;
    if (!def) return { ok: false, message: '这棵树不是 ne 记号，跳转暂不支持（只有 ne 记号能解析/搜索）' };
    const want = String(text || '').trim();

    // ① 树里已有（按显示文本）
    const inTree = find_in_tree(entry.rootList, def, want);
    if (inTree && inTree.node) {
      ensureUids(entry.rootList);
      const ok = focusNodeByUid(entry, inTree.node._uid);
      refreshUI();
      return ok
        ? { ok: true, message: `树里已有这个节点（深度 ${inTree.depth}），已定位` }
        : { ok: false, message: '找到了节点但定位失败（导航序列里没有它）' };
    }

    // ② 反解析 + 导航（ner / ne-rewritten 的做法）：from_display 解析 → compare 导航
    // 反解析用的 display：依次尝试「当前视图 → 记号主 display → 其余视图」，
    // 因为不同视图的 from_display 只认自己那种写法（BMS 文本要用 BMS 视图来解）。
    let parsed = { ok: false, reason: 'skipped' };
    if (mode !== 'search') {
      const specs = [];
      const cur = activeViewFor(entry);
      if (cur && cur.display) specs.push(cur.display);
      if (def.display) specs.push(def.display);
      for (const v of resolveTreeViews(entry.notation.id)) if (v.display) specs.push(v.display);
      for (const sp of specs) {
        const r = resolve_from_display(sp, want);
        if (r.ok) { parsed = r; break; }
        parsed = r; // 记住最后一次的失败原因
      }
    }
    if (parsed.ok) {
      let target = parsed.expr;
      let seqNote = '';
      const seq = Number(fsIndex) || 0;
      if (seq > 0) {
        if (typeof def.is_limit === 'function' && def.is_limit(target)) {
          try {
            target = def.FS(target, seq - 1);
            seqNote = `（取其第 ${seq} 个基本列项）`;
          } catch (e) {
            return { ok: false, message: `解析成功，但取第 ${seq} 个基本列项失败：${e.message}` };
          }
        } else {
          return { ok: false, message: '解析成功，但该表达式不是极限式，没有基本列项可取' };
        }
      }
      const hit = find_expr_in_tree(entry.rootList, def, target);
      if (hit && hit.node) {
        ensureUids(entry.rootList);
        const ok = focusNodeByUid(entry, hit.node._uid);
        refreshUI();
        return ok
          ? { ok: true, message: `解析到目标${seqNote}，树里已有（深度 ${hit.depth}），已定位` }
          : { ok: false, message: '找到了节点但定位失败' };
      }
      const nav = navigate_to_target(entry.notation, entry.rootList, target, {
        maxSteps: 4000,
        timeLimitMs: settings.timeLimit,
      });
      ensureUids(entry.rootList);
      if (nav.found && nav.node) {
        const ok = focusNodeByUid(entry, nav.node._uid);
        refreshUI();
        return ok
          ? { ok: true, message: `解析到目标${seqNote}，导航 ${nav.steps} 步命中并定位（过程中按需展开了节点）` }
          : { ok: false, message: '导航命中但定位失败' };
      }
      const whyText = {
        'expand-failed': '中途展开不动了（试展开守卫）—— 目标大概不是标准项',
        'no-prev': '已经走到树的最前面还是比目标小',
        'no-start': '这棵树上没有可用作起点的节点（先在树上展开一次）',
        'max-steps': '走了太多步（4000）仍未命中，目标可能太远',
      }[nav.reason] || nav.reason;
      return {
        ok: false,
        message:
          `解析成功，但导航 ${nav.steps} 步后没命中：${whyText}。\n` +
          '非标准式跳转失败是正常现象（ne-rewritten 的说明里也是这么写的）。' +
          '若确认它是标准项，可以点「搜索兜底」。',
      };
    }

    // ③ 解析不了 / 显式要求搜索 → 兜底枚举搜索（BFS 先浅后深）
    const seeds = entry.rootList.map((n) => n.expr);
    const r = search_target(def, seeds, want, { maxMs: settings.searchMs, maxNodes: 20000 });
    if (!r.found) {
      return {
        ok: false,
        message:
          (mode === 'search'
            ? '（你点了「搜索兜底」）'
            : parsed.reason === 'no-from-display'
              ? '该记号没有 from_display（无法把显示文本解析回表达式），只能用搜索 —— '
              : `解析失败（${parsed.error || '输入不是该记号的合法显示文本'}），改用搜索 —— `) + r.reason,
      };
    }

    // 在真树上重放路径
    let node = entry.rootList[r.seedIndex];
    if (!node) return { ok: false, message: '搜索给了一个不存在的起点（内部错误）' };
    for (let k = 0; k < r.path.length; k++) {
      const res = expand_ne(entry.notation, entry.rootList, node, 0, 0, settings.timeLimit);
      if (!res || !res.changed) {
        return {
          ok: false,
          message: `重放到第 ${k + 1}/${r.path.length} 步就停了（这条路上有更大的兄弟节点挡着）。` +
            '可以先手动把那部分展开几次，再跳一次。',
        };
      }
      const created = ui_node_of(entry.rootList, res.created);
      if (!created) return { ok: false, message: '重放时找不到新建的节点（内部错误）' };
      node = created;
    }
    ensureUids(entry.rootList);
    const ok = focusNodeByUid(entry, node._uid);
    refreshUI();
    return ok
      ? { ok: true, message: `搜索到目标（重放 ${r.path.length} 步完成），已定位` }
      : { ok: false, message: '搜索命中但定位失败' };
  }, [settings.timeLimit, settings.searchMs]);

  const doJumpFocusedTree = React.useCallback((mode) => {
    const text = String(jumpText || '').trim();
    if (!text) { setJumpMsg({ ok: false, text: '请先填目标表达式（例如 (0)(1,1,1)(2,1)(1,1,1)）' }); return; }
    const it = navItems[clampedFocus];
    let entry = it && it.treeIndex !== undefined
      ? items.find((x) => x.type === 'tree' && x.treeIndex === it.treeIndex)
      : null;
    if (!entry) entry = [...items].reverse().find((x) => x.type === 'tree');
    if (!entry) { setJumpMsg({ ok: false, text: '还没有树 —— 先输入记号名建树（如 bm4 (0)(1,2)）' }); return; }
    let res;
  try {
      res = jumpToTarget(entry, text, 0, mode);
    } catch (e) {
      res = { ok: false, message: '跳转出错：' + e.message };
    }
    setJumpMsg({ ok: !!(res && res.ok), text: (res && res.message) || '' });
    if (res && res.ok) { ensureUids(entry.rootList); refreshUI(); }
  }, [jumpText, navItems, clampedFocus, items]);

  return React.createElement(
    "div", {
      ref: containerRef,
      tabIndex: 0,
      onKeyDown: handleGlobalKey,
          style: {
        background: theme.bg,
    color: theme.fg,
        // 整体字体缩放（设置里走font_size）：transform scale 从左上角缩放、        // 布局尺寸补偿丁100vw/fontZoom × 100vh/fontZoom，渲染后恰好等于视口 —         // 放大无白边、缩小无页面滚动条，始终适配窗口、        // 默认 16 ↁfontZoom=1 ↁscale(1) 无变化、
width: `calc(100vw / ${fontZoom})`,
        height: `calc(100vh / ${fontZoom})`,
        transform: `scale(${fontZoom})`,
        transformOrigin: "0 0",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        fontSize: 16,
        display: "flex",
        flexDirection: "column",
        outline: "none"
    }
      },
    React.createElement("link", {
      href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
      rel: "stylesheet"
    }),
    // 视图标注样式（如 BMS→OCF「超出范围」，颜色随主题）
    React.createElement("style", null, `.dsh-warn{color:${theme.error}}`),
    // — 顶栏 —
React.createElement("div", {
          style: {
        padding: "8px 16px",
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: theme.headerBg,
        flexWrap: "wrap",
        gap: 4,
        flexShrink: 0
    }
      },
      React.createElement("span", { style: { fontWeight: 700, fontSize: 18, color: theme.accent } },
        "序数探索器· Transfinite-Ordinals-Explorer · v2.5.1"
        ),
      React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("span", { style: { fontSize: 12, color: theme.settingColor } },
          "+", settings.additionalExpand,
          " · tier=", settings.tier, " (", tierName(settings.tier), ")"
        ),
          React.createElement("button", {
          onClick: () => setShowSettings(true),
          style: {
    background: "transparent",
            color: theme.fgDim,
    border: `1px solid ${theme.border}`,
    borderRadius: 3,
            padding: "2px 8px",
    fontSize: 12,
    cursor: "pointer",
            fontFamily: "inherit"
    }
        }, "⚙️ 设置")
        )
        ),
    // — 滚动区 ——
React.createElement(
    "div", {
        ref: scrollRef,
        className: "scroll-area",
        style: { flex: 1, overflow: "auto", padding: "8px 16px" },
        onClick: (e) => { if (e.target === e.currentTarget) inputRef.current?.focus(); }
      },
      renderItems,
      React.createElement("div", { style: { display: "flex", flexDirection: "column" } },
        React.createElement("div", {
          style: {
        display: "flex",
            alignItems: "baseline",
            minHeight: 32,
            background: focusedItem?.type === "input" ? theme.highlight : "transparent",
            margin: "0 -4px",
            padding: "0 4px",
            borderRadius: 2
    }
      },
          React.createElement("span", { style: { color: theme.accent, userSelect: "none", marginRight: 6, fontSize: 18 } },
            "❯"
        ),
    React.createElement(
            "input", {
              ref: inputRef,
              value: input,
              onChange: (e) => {
                const raw = e.target.value;
                // 输入法组吁composition)进行中：只同歁state（原始值）刁DOM，不归一化、不改写！                // 否则受控值跟 DOM 不同步会把输入法组合中的文字当成退格清掉、
if (e.nativeEvent.isComposing) {
                  setInput(raw);
    setSelIdx(0);
    setDismissed(false);
      return;
    }
                // 非组合：把全角标点归一化为半角，并保持光标（改冁value 会把光标重置到末尾）
                const norm = normalizePunct(raw);
                if (norm !== raw) {
                  pendingCaretRef.current = e.target.selectionStart ?? norm.length;
                  setInput(norm);
    } else {
                  setInput(raw);
    }
    setSelIdx(0);
    setDismissed(false);
      },
              onCompositionEnd: (e) => {
  // 下拉高亮项（钳制到有效范围）
                const raw = e.target.value;
                const norm = normalizePunct(raw);
                if (norm !== raw) {
                  pendingCaretRef.current = e.target.selectionStart ?? norm.length;
                  setInput(norm);
    } else {
                  setInput(raw);
    }
    setSelIdx(0);
    setDismissed(false);
      },
              onKeyDown: (e) => {
                // — 补全下拉打开时的键控：↑ↁ选择、Tab 补全、Esc 收起；回车始终执表—
if (showSuggestions) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setSelIdx(i => (i + 1) % suggestions.length); return; }
                  if (e.key === 'ArrowUp')   { e.preventDefault(); e.stopPropagation(); setSelIdx(i => (i - 1 + suggestions.length) % suggestions.length); return; }
                  if (e.key === 'Tab')       { e.preventDefault(); e.stopPropagation(); acceptSuggestion(); return; }
                  if (e.key === 'Escape')    { e.preventDefault(); e.stopPropagation(); setSelIdx(0); setDismissed(true); return; }
    }
                // 回车始终执行当前输入（与「任何输入都是指令」一致）；补全靠 Tab
                if (e.key === 'Enter') { handleSubmit(); e.stopPropagation(); }
      },
              onFocus: () => { setFocusIdx(navItems.length - 1); setDismissed(false); },
              onBlur: () => setDismissed(true),
              placeholder: `输入 记号名 表达式，如 PrSS 0,1,2；或直接输入记号名用示例建树`,
              autoFocus: true,
          style: {
                flex: 1,
    background: "transparent",
                border: "none",
                outline: "none",
    color: theme.fg,
    fontFamily: "inherit",
        fontSize: 16,
                caretColor: theme.accent
    }
    }
        )
        ),
        // — 命令补全下拉 —
showSuggestions && React.createElement("div", {
          style: {
    border: `1px solid ${theme.border}`,
            borderRadius: 4,
        background: theme.bg,
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            maxHeight: 220,
            overflowY: "auto",
            marginTop: 4
    }
      },
          // 面板内的格式说明（例妁save [csv|xlsx] [n] [True|False]），并非独立预览表
inputFormat && React.createElement("div", {
          style: {
              padding: "3px 8px",
    fontSize: 12,
            color: theme.fgDim,
        borderBottom: `1px solid ${theme.border}`,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
    }
          }, inputFormat),
          suggestions.map((s, i) => {
            const active = i === safeSelIdx;
            // 悬停/选中用更亮的 noteColor + 加粗 + 高亮；平时指令用主题蓁accent、记号名甁fg、识别结果用灁
const labelColor = active
              ? theme.noteColor
              : (s.type === 'notation' ? theme.fg : (s.type === 'info' ? theme.fgDim : theme.accent));
      return React.createElement("div", {
              key: `${s.type}-${s.label}-${i}`,
              onMouseDown: (e) => { e.preventDefault(); acceptSuggestion(s); },
              onMouseEnter: () => setSelIdx(i),
          style: {
        display: "flex",
            alignItems: "baseline",
                gap: 10,
            padding: "2px 8px",
                fontSize: 14,
    cursor: "pointer",
                background: active ? theme.highlight : "transparent",
    color: theme.fg,
                fontWeight: active ? 700 : 400
    }
      },
              React.createElement("span", { style: { color: labelColor, whiteSpace: "nowrap" } }, s.label),
              React.createElement("span", { style: { color: theme.fgDim, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 } }, s.hint)
  );
        })
        )
        )
        ),
    // — 底栏 —
React.createElement("div", {
          style: {
        padding: "6px 16px",
        borderTop: `1px solid ${theme.border}`,
        fontSize: 13,
        color: theme.settingColor,
        display: "flex",
        flexWrap: "wrap",
        gap: "0 12px",
        flexShrink: 0
    }
      },
      "Tab 补全 · ↑↓导航 · →展开/+=更多 · ←-折叠 · , 父节点 · 0-9 选中 FS[n] · n 注释 · Esc 取消 · help 帮助 · list 记号 · save 导出"
        ),
    // — 设置弹窗 —
showSettings && React.createElement("div", {
          style: {
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      },
      onClick: (e) => { if (e.target === e.currentTarget) setShowSettings(false); }
      },
        React.createElement("div", {
          style: {
        background: theme.bg,
    color: theme.fg,
          padding: 24,
          borderRadius: 8,
          minWidth: 320,
          border: `1px solid ${theme.border}`
    }
      },
        React.createElement("h2", { style: { margin: "0 0 16px", fontSize: 20 } }, "设置"),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 } },
          [
            { key: 'default_expand', label: '默认展开层数', get: s => s.defaultExpand, set: (s, v) => ({ ...s, defaultExpand: v }), min: 1, max: 100, stepper: true },
            { key: 'additional_expand', label: '额外展开层数', get: s => s.additionalExpand, set: (s, v) => ({ ...s, additionalExpand: v }), min: 0, max: 100, stepper: true },
            { key: 'tier', label: '展开层级', get: s => s.tier, set: (s, v) => ({ ...s, tier: v }), min: 0, max: 9, stepper: true, named: true },
            { key: 'font', label: '字号', get: s => s.fontSize, set: (s, v) => ({ ...s, fontSize: v }), min: 10, max: 28, stepper: true },
            // 单次展开的毫秒上限（0 = 不限制）。持500 步进 — 持1 走没意义、
{ key: 'search_ms', label: '搜索兜底超时 (ms)', get: s => s.searchMs, set: (s, v) => ({ ...s, searchMs: v }), min: 500, max: 120000, stepper: true, step: 1000 },
            { key: 'wrap_long', label: '长行换行', get: s => s.wrapLong, set: (s, v) => ({ ...s, wrapLong: v }), options: [[false, '不换行（可横向滚动）'], [true, '换行']] },
            { key: 'time_limit', label: '展开超时 (ms)', get: s => s.timeLimit, set: (s, v) => ({ ...s, timeLimit: v }), min: 0, max: 60000, stepper: true, step: 500, fmt: v => (v === 0 ? '不限制 ⚠' : v + ' ms') },
          ].map(cfg => {
            const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
            const labelEl = React.createElement("span", { style: { color: theme.fgDim, fontSize: 14 } }, cfg.label);
            // 枚举项（如 wrap_long）：一排 chip，点哪个就是哪个
            if (cfg.options) {
              return React.createElement("div", { key: cfg.key, style: { ...rowStyle, flexWrap: "wrap" } },
                labelEl,
          React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                  cfg.options.map(([val, label]) => React.createElement("button", {
                    key: val,
                    onClick: () => setSettings(s => cfg.set(s, val)),
                    title: label,
          style: {
                      background: cfg.get(settings) === val ? theme.accent : theme.inputBg,
                      color: cfg.get(settings) === val ? theme.bg : theme.fg,
                      border: `1px solid ${cfg.get(settings) === val ? theme.accent : theme.border}`,
    borderRadius: 3,
                padding: "2px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
      },
                  }, label))
        )
  );
    }
            if (cfg.stepper) {
              // 远古版调节方式：- 倁名称 +（点击加减）；cfg.step 可放大步进（妁ms 甁500！
const stepSize = cfg.step || 1;
              const stepBtn = (delta) => ({
                onClick: () => setSettings(s => cfg.set(s, Math.min(cfg.max, Math.max(cfg.min, cfg.get(s) + delta)))),
          style: {
                  width: 30,
                  background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "inherit",
        fontSize: 16,
                  lineHeight: 1.2
    }
  });
              const valueStr = cfg.named
                ? tierName(settings.tier)
                : cfg.fmt ? cfg.fmt(cfg.get(settings)) : String(cfg.get(settings));
              return React.createElement("div", { key: cfg.key, style: rowStyle },
                labelEl,
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  React.createElement("button", stepBtn(-stepSize), "-"),
                  React.createElement("span", {
                    style: { color: theme.fg, fontSize: 14, minWidth: 110, textAlign: "center" }
                  }, valueStr),
                  React.createElement("button", stepBtn(stepSize), "+")
        )
  );
    }
              return React.createElement("div", { key: cfg.key, style: rowStyle },
                labelEl,
              React.createElement("input", {
                type: "number",
                min: cfg.min,
                max: cfg.max,
                defaultValue: cfg.get(settings),
              onChange: (e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < cfg.min) return;
                  if (cfg.max !== undefined && val > cfg.max) return;
                  setSettings(s => cfg.set(s, val));
      },
          style: {
                  width: 70,
                  background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 3,
                  padding: "3px 6px",
    fontFamily: "inherit",
                  fontSize: 14
    }
        })
  );
        })
        ),
        // — 主题 —
React.createElement("div", {
          style: {
            display: "flex", flexDirection: "column", gap: 10, marginBottom: 16,
            borderTop: `1px solid ${theme.border}`, paddingTop: 12
    }
      },
          React.createElement("span", { style: { color: theme.fgDim, fontSize: 14 } }, "主题"),
          React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            Object.keys(THEMES).map(k => React.createElement("button", {
              key: k,
              onClick: () => setThemeKey(k),
              title: "切换主题",
          style: {
                background: k === themeKey ? theme.accent : "transparent",
                color: k === themeKey ? theme.bg : theme.fgDim,
                border: `1px solid ${k === themeKey ? theme.accent : theme.border}`,
    borderRadius: 3,
                padding: "2px 10px",
        fontSize: 13,
    cursor: "pointer",
            fontFamily: "inherit"
    }
            }, THEMES[k].name))
        )
        ),
        // — 自定义记号入叁—
React.createElement("div", {
          style: {
            display: "flex", flexDirection: "column", gap: 10, marginBottom: 16,
            borderTop: `1px solid ${theme.border}`, paddingTop: 12
    }
      },
          React.createElement("span", { style: { color: theme.fgDim, fontSize: 14 } }, "主题"),
          React.createElement("span", { style: { color: theme.fgDim, fontSize: 14 } }, "自定义记号"),
            "编辑已有的自定义记号，或导入 .js 新建（与 ne 接口一致，展开走 ne 引擎）",
          React.createElement("button", {
            onClick: () => { setShowSettings(false); setShowNotationEditor(true); },
          style: {
              alignSelf: "flex-start",
                  background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
            borderRadius: 4,
              padding: "5px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
                  fontSize: 14
    }
          }, "打开自定义记号…")
        ),
          React.createElement("button", {
          onClick: () => setShowSettings(false),
          style: {
            background: theme.accent,
            color: theme.bg,
                border: "none",
        padding: "6px 16px",
            borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
                  fontSize: 14
    }
          }, "＋")
        )
        ),
    // — 单棵树的设置弹窗（树标题表⚙️）—
treeCfgOpenId != null && (() => {
      const entry = items.find((x) => x.type === 'tree' && x.id === treeCfgOpenId);
      if (!entry) return null;
      const cfg = getTreeCfg(entry);
      const views = resolveTreeViews(entry.notation.id).map((v) => ({ id: v.id, label: v.label }));
      return React.createElement(TreeSettings, {
          theme,
        notationId: entry.notation.id,
        notationName: entry.name,
        views,
        currentViewId: entry.viewId,
        cfg,
        onChange: (patch) => patchTreeCfg(entry.id, patch),
        onSetView: (vid) => setTreeView(entry.id, vid),
        onJump: (text, fsIndex, mode) => jumpToTarget(entry, text, fsIndex, mode),
        onExport: (kind) => doExportTree(entry, kind),
        onImport: () => handleImportCommand(entry.notation.id),
        maxFindFs: settings.maxFindFs,
        noteWidth: settings.noteWidth,
        onSetNoteWidth: (v) => setSettings((s2) => ({ ...s2, noteWidth: v })),
        onSetMaxFindFs: (v) => setSettings((s2) => ({ ...s2, maxFindFs: v })),
        onClose: () => setTreeCfgOpenId(null),
  });
    })(),
    // — 自定义记号编辑弹窗（/notation）—
showNotationEditor && React.createElement(NotationEditor, {
          theme,
      onClose: () => setShowNotationEditor(false),
        })
  );
    }

// ============================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
// ============================================================================
window.ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));