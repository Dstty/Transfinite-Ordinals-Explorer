// ============================================================================
//  ui/TreeNodeView.js — 树节点渲染（递归）
// ============================================================================
//  数据模型是远古版 { expr, low, subitems }。
//  节点上没有稳定 id，UI 层用附加字段 _uid 标识（core 不感知）：
//     ensureUids(rootList) 递归补全 _uid（仅新节点）
//  折叠状态也用附加字段 item._collapsed 控制，不影响核心展开逻辑。
// ============================================================================
import { GUTTER, BRANCH, LAST_B, EMPTY } from './themes.js';
import { canExpandNode } from '../core/engine.js';

let uidCounter = 0;

/**
 * 为树中所有缺少 _uid 的节点补上全局唯一 id。
 * @param {Array} list 节点列表
 */
export function ensureUids(list) {
  for (const item of list) {
    if (item._uid === undefined) item._uid = ++uidCounter;
    if (item.subitems && item.subitems.length > 0) ensureUids(item.subitems);
  }
}

/**
 * 渲染一个节点的文本（display 的容错封装）。
 * @param {object} notation 记号对象（可能为视图切换目标记号）
 */
export function renderDisplay(notation, expr) {
  try {
    return notation.display(expr);
  } catch {
    return String(expr);
  }
}

/**
 * TreeNodeView — 递归渲染一棵树。
 * @param {object} props
 *   rootList  根列表
 *   notation  记号对象（展开逻辑用）
 *   displayFn 可选：节点文本渲染函数（视图切换时用，如 0-Y 显示 BMS 树；
 *                   缺省用 notation.display）
 *   treeIndex 树编号（用于注释编辑定位）
 *   theme     主题
 *   focusUid  当前聚焦节点 uid
 *   onToggle(uid)   展开/折叠
 *   onMore(uid)     加载更多
 *   startNote(treeIndex, uid)
 *   editingNote  {treeIndex, uid, text}
 *   saveNote(treeIndex, uid, text)
 *   cancelNoteEditing()
 *   prefixes   渲染前缀（内部递归用）
 */
export function TreeNodeView(props) {
  const { rootList, notation, displayFn, treeIndex, theme, focusUid,
    onToggle, onMore, startNote, editingNote, saveNote, cancelNoteEditing, onFocusRow, onNoteCommitted } = props;
  // 节点文本：视图切换时用 displayFn（纯显示翻译），展开/折叠逻辑仍用原记号；
  // 视图 display 可能对非法表达式抛错，统一容错回退 String
  const nodeLabel = (expr) => {
    try {
      return displayFn ? displayFn(expr) : renderDisplay(notation, expr);
    } catch {
      return String(expr);
    }
  };

  // 焦点行滚动跟随：focusUid 变化时把聚焦行滚进可视区
  const focusRef = React.useRef(null);
  React.useEffect(() => {
    if (focusRef.current) {
      focusRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [focusUid]);

  // 内部递归组件（列表）
  const renderList = (list, prefixes) => {
    const children = [];
    list.forEach((item, idx) => {
      const isLast = idx === list.length - 1;
      children.push(renderItem(item, prefixes, isLast));
    });
    return children;
  };

  // 递归渲染单个节点
  const renderItem = (item, prefixes, isLast) => {
    const uid = item._uid;
    const label = nodeLabel(item.expr);
    const note = item.note || null;
    const collapsed = !!item._collapsed;
    const hasChildren = item.subitems && item.subitems.length > 0;
    const isFocused = focusUid === uid;
    const isEditing = editingNote && editingNote.treeIndex === treeIndex && editingNote.uid === uid;

    // 双按钮：
    //  - [+]：折叠态 → 展开显示子节点；展开态 → 加载更多（canExpandMore）
    //  - [-]：仅子节点可见（未折叠）时显示，点击折叠
    const canExpandMore = canExpandNode(notation, item);
    const showExpand = canExpandMore || (hasChildren && collapsed);
    const showCollapse = hasChildren && !collapsed;

    const connector = isLast ? LAST_B : BRANCH;
    const prefixStr = prefixes.join("");

    const textStyle = {
      cursor: "pointer",
    };

    const nodeStyle = {
      whiteSpace: "pre",
      color: theme.fg,
      minHeight: 24,
      display: "flex",
      alignItems: "baseline",
      background: isFocused ? theme.highlight : "transparent",
      borderRadius: 2,
      padding: "0 2px",
    };

    // v1（expander）对齐后的点击语义：
    //  - 无子节点：点击 = 展开 1 层（onToggle）
    //  - 有子且折叠：点击 = 展开显示子节点
    //  - 有子且已展开：点击 = 加载更多（再展开 1 层，onMore）
    const onNodeClick = () => {
      if (isEditing) return;
      if (hasChildren) {
        if (collapsed) {
          item._collapsed = false;
          if (props.onRefresh) props.onRefresh();
        } else {
          onMore(uid);
        }
      } else {
        // 无子节点：仅当确实还能展开时才触发展开
        if (canExpandNode(notation, item)) onToggle(uid);
      }
    };

    // [-]：折叠（仅子节点可见时显示）
    const handleCollapseClick = (e) => {
      e.stopPropagation();
      if (hasChildren) {
        item._collapsed = true;
        if (props.onRefresh) props.onRefresh();
      }
    };

    // [+]：折叠态 → 展开显示子节点；展开态 → 加载更多
    const handleExpandClick = (e) => {
      e.stopPropagation();
      if (hasChildren && collapsed) {
        item._collapsed = false;
        if (props.onRefresh) props.onRefresh();
      } else {
        onMore(uid);
      }
    };

    const handleNoteClick = (e) => {
      e.stopPropagation();
      startNote(treeIndex, uid);
    };

    const subContent = [];
    if (hasChildren && !collapsed) {
      subContent.push(renderList(item.subitems, prefixes.concat(isLast ? EMPTY : GUTTER)));
    }

    // 点击行任意位置（含空白）→ 聚焦该行；文本/按钮自身有 stopPropagation 的处理
    const handleRowClick = () => {
      // 正在编辑本行注释时，别把焦点从 input 抢走（点 input 会冒泡到这里）
      if (isEditing) return;
      if (onFocusRow) onFocusRow(treeIndex, uid);
    };

    return React.createElement("div", { key: uid },
      React.createElement("div", { ref: isFocused ? focusRef : null, style: nodeStyle, onClick: handleRowClick },
        React.createElement("span", { style: { color: theme.fgDim, userSelect: "none" } },
          prefixStr + connector
        ),
        React.createElement("span", {
          onClick: onNodeClick,
          style: textStyle,
          dangerouslySetInnerHTML: { __html: label }
        }),
        showExpand && React.createElement("span", {
          style: { color: theme.accent2, marginLeft: 6, fontSize: 15, cursor: "pointer", userSelect: "none" },
          onClick: handleExpandClick
        }, "[+]"),
        showCollapse && React.createElement("span", {
          style: { color: theme.accent2, marginLeft: 4, fontSize: 15, cursor: "pointer", userSelect: "none" },
          onClick: handleCollapseClick
        }, "[-]"),
        !isEditing && React.createElement("span", {
          onClick: handleNoteClick,
          title: "添加注释",
          style: { color: theme.accent2, marginLeft: 4, fontSize: 15, cursor: "pointer", userSelect: "none" }
        }, "[✎]"),
        !isEditing && note && React.createElement("span", {
          onClick: handleNoteClick,
          title: "编辑注释",
          style: { color: theme.noteColor, fontSize: 15, marginLeft: 8, cursor: "pointer" }
        }, note),
        isEditing && React.createElement("input", {
          autoFocus: true,
          defaultValue: note || "",
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              saveNote(treeIndex, uid, e.target.value);
              if (onNoteCommitted) onNoteCommitted();
              e.stopPropagation();
            } else if (e.key === "Escape") {
              cancelNoteEditing();
              if (onNoteCommitted) onNoteCommitted();
              e.stopPropagation();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              // 不 stopPropagation：冒泡给 handleGlobalKey 的 editingNote 分支
              // （保存当前值并移动光标）
            } else {
              e.stopPropagation();
            }
          },
          onBlur: (e) => saveNote(treeIndex, uid, e.target.value),
          style: {
            marginLeft: 8,
            background: theme.inputBg,
            color: theme.fg,
            border: `1px solid ${theme.border}`,
            outline: "none",
            fontFamily: "inherit",
            fontSize: 16,
            padding: "1px 6px",
            borderRadius: 2,
            width: 180
          }
        })
      ),
      subContent
    );
  };

  return React.createElement("div", { style: { fontFamily: "inherit" } }, renderList(rootList, []));
}
