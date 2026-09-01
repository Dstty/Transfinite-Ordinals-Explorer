// ============================================================================
//  ui/app.js — Transfinite-Ordinals-Explorer 主应用（React 18 UMD + 原生 ES Modules，零构建）
// ============================================================================
//  职责：状态管理、输入处理、键盘导航、命令分发、主渲染。
//  数据模型（远古版）：节点 = { expr, low, subitems }，树 = 节点列表。
//  UI 附加字段（核心不感知）：_uid 稳定 id、_collapsed 折叠、note 注释。
// ============================================================================

import { THEMES } from './themes.js';
import { TreeNodeView, ensureUids } from './TreeNodeView.js';
import { FolderView } from './FolderView.js';
import { parseNotation } from './notationParser.js';
import { parseCommand } from './commandParser.js';
import { downloadTreeAsCSV } from './exportUtils.js';
import { expandNode, deepClone } from '../core/engine.js';
import { getNotation, getAllNotations, NOTATION_META, buildNameMap } from '../core/register.js';
import { convert, listConverterTargets, resolveTreeViews } from '../core/converters.js';
import { buildNotationList } from './notationList.js';
import { HELP_LINES } from './helpText.js';

const React = window.React;

// ============================================================================
//  模块级工具函数
// ============================================================================

/**
 * 中文全角标点 → 半角：全角括号/逗号自动转英文。
 * 注意：替换必须是幂等的（对已是半角的字符无副作用），
 * 这样无论调用几次结果都一致，不会造成字符重复。
 */
const normalizePunct = s => s.replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',');

/**
 * 递归查找包含指定节点的列表（父列表）。node 位于根列表时返回 null。
 * @param {Array} rootList 树的根列表
 * @param {object} node 目标节点
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
 * 按 _uid 递归查找节点。
 * @returns {object|null}
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
//  展开层级（Expansion tier，与远古版一致：0=small, 1=single, 2=double, ...）
// ============================================================================
const TIER_NAMES = ['small', 'single', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple'];

function tierName(n) {
  if (Number.isInteger(n) && n >= 0 && n < TIER_NAMES.length) {
    return `${TIER_NAMES[n]} expansion`;
  }
  return `${n}-fold expansion`;
}

/** 建树（limit 模式）：直接使用记号的 init() 示例列表。 */
function makeTreeFromInit(notation) {
  return notation.init();
}

/**
 * 建树（表达式模式）：把任意表达式包装成远古版根列表。
 * 初始下界 low 取该记号 init() 示例的下界（通常是该记号的最小表达式），
 * 保证 FSbounded 首次展开从 FS[0] 开始（不跳过基本列项）。
 */
function makeTreeFromExpr(notation, expr) {
  let low0 = [[]]; // 兜底：空表达式作为最小下界
  try {
    const samples = notation.init();
    const first = samples && samples[0];
    if (first && first.low && first.low[0] !== undefined) low0 = first.low;
  } catch { /* 忽略 init 异常，用兜底值 */ }
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
  const [settings, setSettings] = React.useState({ defaultExpand: 2, additionalExpand: 0, tier: 0 });
  const [themeKey, setThemeKey] = React.useState("dark");
  const [focusIdx, setFocusIdx] = React.useState(-1);
  const [editingNote, setEditingNote] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [version, setVersion] = React.useState(0);       // 树是可变对象，用它强制重渲染

  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const theme = THEMES[themeKey];

  // ----- 输出流 -----
  const addOutput = React.useCallback((message, type = 'info') => {
    setItems(prev => [...prev, { id: nextItemId, type: 'output', message, outputType: type }]);
    setNextItemId(id => id + 1);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);
  }, [nextItemId]);

  /** 树对象被直接修改（展开/折叠/注释）不会触发 React 重渲染，统一走这里。 */
  const refreshUI = React.useCallback(() => setVersion(v => v + 1), []);

  /** 所有树条目（CLI 输出流中 type === 'tree' 的项）。 */
  const treeEntries = React.useMemo(
    () => items.filter(item => item.type === 'tree'),
    [items]
  );

  // ----- 键盘导航：收集所有可聚焦项 -----
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

  /** focusIdx 钳制到有效范围。 */
  const clampedFocus = React.useMemo(() => {
    if (focusIdx < 0 || navItems.length === 0) return -1;
    return Math.min(focusIdx, navItems.length - 1);
  }, [focusIdx, navItems.length]);

  const focusedItem = clampedFocus >= 0 ? navItems[clampedFocus] : null;

  // ----- 展开操作 -----
  const doExpand = React.useCallback((entry, node, tier, extra) => {
    const parentList = findParentList(entry.rootList, node) || entry.rootList;
    const res = expandNode(entry.notation, parentList, node, tier, extra);
    if (res.changed) {
      ensureUids(entry.rootList);
      refreshUI();
    }
  }, [refreshUI]);

  /** 节点上的 [+]/点击展开：有子节点折叠/展开由 TreeNodeView 内部处理。 */
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
  }, [treeEntries, doExpand, settings.tier, settings.additionalExpand]);

  // ----- 节点注释 -----
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

  // 注释编辑完成（Enter）或取消（Esc）后，把焦点还给容器，
  // 避免 input 卸载后焦点掉到 body 导致 ↑↓ 变成页面滚动
  const onNoteCommitted = React.useCallback(() => {
    containerRef.current?.focus();
  }, []);

  // ==========================================================================
  //  命令处理
  // ==========================================================================

  // —— 树标题「显示视图」：同一棵树用目标显示函数渲染（纯显示翻译）——
  const setTreeView = React.useCallback((itemId, viewId) => {
    setItems(prev => prev.map(it =>
      (it.type === 'tree' && it.id === itemId) ? { ...it, viewId } : it
    ));
  }, []);

  // —— convert：记号互译（core/converters.js 注册表）——
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
      addOutput(`表达式解析失败（${fromId}）: ${e.message}`, 'error');
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

  const handleSaveCommand = React.useCallback((parsedNum) => {
    if (treeEntries.length === 0) {
      addOutput('没有可保存的树', 'error');
      return;
    }
    let target = null;
    if (parsedNum !== undefined) {
      target = treeEntries.find(e => e.treeIndex === parsedNum - 1) || null;
      if (!target) {
        addOutput(`找不到第 ${parsedNum} 棵树`, 'error');
        return;
      }
    } else {
      target = treeEntries[treeEntries.length - 1];
    }
    downloadTreeAsCSV(target.notation, target.rootList, target.name, addOutput);
  }, [treeEntries, addOutput]);

  // ==========================================================================
  //  提交输入
  // ==========================================================================
  const handleSubmit = React.useCallback(async () => {
    // 兜底归一化：粘贴/拖入等未走 composition 事件的中文标点，提交时也转半角
    const raw = normalizePunct(input.trim());
    if (!raw) return;
    setInput("");
    addOutput(`▸ ${raw}`, 'input');

    // —— 命令（可带 / 前缀，也可不带，如 help / set tier=0）——
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
          addOutput(`» 已注册 ${all.length} 个记号（点击分类展开）:`, 'info');
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
          handleSaveCommand(parsed.num);
          return;
        }
        case 'convert': {
          handleConvertCommand(parsed);
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
              addOutput(`无效数值: ${valStr}`, 'error');
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

    // —— 记号表达式 ——
    try {
      const parsed = parseNotation(raw);
      const notation = getNotation(parsed.notationId);
      if (!notation) throw new Error(`记号不存在: ${parsed.notationId}`);

      let rootList;
      if (parsed.kind === 'limit') {
        rootList = makeTreeFromInit(notation);
      } else {
        // 解析表达式：记号自带 parse > NOTATION_META.parse；都没有则明确报错
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

      // 初始展开（defaultExpand 次，对第一个可展开节点）
      let remaining = settings.defaultExpand;
      let guard = 0;
      let anchor = rootList[0];
      while (remaining > 0 && guard < 50) {
        const parentList = findParentList(rootList, anchor) || rootList;
        const res = expandNode(notation, parentList, anchor, settings.tier, 0);
        if (!res.changed) break;
        ensureUids(rootList);
        // 继续展开刚生成的新节点（树末尾，同一条链）
        const tail = rootList[rootList.length - 1];
        anchor = tail && tail.subitems && tail.subitems.length > 0 ? tail : anchor;
        remaining--;
        guard++;
      }
      refreshUI();
    } catch (err) {
      addOutput(`错误: ${err.message}`, 'error');
    }
  }, [input, settings, addOutput, nextItemId, nextTreeIndex, refreshUI, handleSaveCommand]);

  // ==========================================================================
  //  键盘事件
  // ==========================================================================
  const handleGlobalKey = React.useCallback((e) => {
    // —— 注释编辑中：↑↓ 保存并导航，Esc 取消 ——
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

    // Esc → 回输入框
    if (e.key === 'Escape') {
      setFocusIdx(total - 1);
      inputRef.current?.focus();
      e.preventDefault();
      return;
    }

    // 输入框聚焦时：↑ 回到最后一个节点
    if (document.activeElement === inputRef.current) {
      if (e.key === 'ArrowUp' && total > 1) {
        setFocusIdx(total - 2);
        inputRef.current?.blur();
        containerRef.current?.focus();
        e.preventDefault();
      }
      return;
    }

    // n → 注释
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

    const doToggleFocused = () => {
      if (item?.type !== 'node') return;
      const { entry, item: node } = item;
      if (node.subitems && node.subitems.length > 0) {
        node._collapsed = !node._collapsed;
        refreshUI();
      } else {
        doExpand(entry, node, 1, 0);
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
          // → 始终是展开：有子已展开 → 加载更多；无子 → 展开一层
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
      if (item?.type === 'node') doToggleFocused();
      e.preventDefault();
    } else if (e.key === '-' || e.key === '_') {
      // - 折叠：有子且未折叠 → 折叠；否则回父节点
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
  //  渲染
  // ==========================================================================
  const renderItems = items.map((item) => {
    if (item.type === 'output') {
      let color = theme.logColor;
      if (item.outputType === 'error') color = theme.error;
      else if (item.outputType === 'input') color = theme.fg;
      return React.createElement("div", {
        key: `output-${item.id}`,
        style: { color, minHeight: 26, display: "flex", alignItems: "baseline" }
      },
        React.createElement("span", null, item.message)
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
        style: { marginTop: 4 }
      },
        React.createElement("div", {
          style: {
            color: theme.fgMuted, fontSize: 13, marginBottom: 2,
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
          }
        },
          React.createElement("span", null, `--- 树 #${item.treeIndex + 1} (${item.name}) ---`),
          views.length > 1 && views.map((v) => React.createElement("button", {
            key: v.id === undefined ? 'native' : v.id,
            onClick: () => setTreeView(item.id, v.id),
            disabled: v.id === currentView,
            title: `把整棵树显示为 ${v.label}（展开树不变，仅翻译文本）`,
            style: btnStyle(v.id === currentView),
          }, `显示为${v.label}`))
        ),
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
        })
      );
    }
    return null;
  });

  // ==========================================================================
  //  主渲染
  // ==========================================================================
  return React.createElement(
    "div", {
      ref: containerRef,
      tabIndex: 0,
      onKeyDown: handleGlobalKey,
      style: {
        background: theme.bg,
        color: theme.fg,
        height: "100vh",
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
    // —— 顶栏 ——
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
        "序数探索器 · Transfinite-Ordinals-Explorer · v2.4.0"
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
    // —— 滚动区 ——
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
            "▸"
          ),
          React.createElement(
            "input", {
              ref: inputRef,
              value: input,
              onChange: (e) => {
                // 输入法组合(composition)进行中绝不改写 value：
                // 此时修改受控值会和 IME 的内部文本状态打架，导致字符重复/丢失
                if (e.nativeEvent.isComposing) return;
                setInput(normalizePunct(e.target.value));
              },
              onCompositionEnd: (e) => {
                // 组合结束：把这次由输入法提交进来的中文标点归一半角
                setInput(normalizePunct(e.target.value));
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") { handleSubmit(); e.stopPropagation(); }
              },
              onFocus: () => setFocusIdx(navItems.length - 1),
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
        )
      )
    ),
    // —— 底栏 ——
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
      "↑↓导航 · →展开/+=更多 · ←/-折叠 · , 父节点 · 0-9 选中 FS[n] · n 注释 · Esc 取消 · help 帮助 · list 记号 · save 导出"
    ),
    // —— 设置弹窗 ——
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
            { key: 'default_expand', label: 'default_expand', get: s => s.defaultExpand, set: (s, v) => ({ ...s, defaultExpand: v }), min: 1, max: 100, stepper: true },
            { key: 'additional_expand', label: 'additional_expand', get: s => s.additionalExpand, set: (s, v) => ({ ...s, additionalExpand: v }), min: 0, max: 100, stepper: true },
            { key: 'tier', label: 'tier', get: s => s.tier, set: (s, v) => ({ ...s, tier: v }), min: 0, max: 9, stepper: true, named: true },
          ].map(cfg => {
            const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
            const labelEl = React.createElement("span", { style: { color: theme.fgDim, fontSize: 14 } }, cfg.label);
            if (cfg.stepper) {
              // 远古版调节方式：- 值/名称 +（点击加减）
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
              const valueStr = cfg.named ? tierName(settings.tier) : String(cfg.get(settings));
              return React.createElement("div", { key: cfg.key, style: rowStyle },
                labelEl,
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  React.createElement("button", stepBtn(-1), "-"),
                  React.createElement("span", {
                    style: { color: theme.fg, fontSize: 14, minWidth: 110, textAlign: "center" }
                  }, valueStr),
                  React.createElement("button", stepBtn(1), "+")
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
        // —— 主题 ——
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
        }, "关闭")
      )
    )
  );
}

// ============================================================================
//  挂载
// ============================================================================
window.ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));


