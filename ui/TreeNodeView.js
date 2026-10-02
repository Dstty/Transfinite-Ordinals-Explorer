import { compute_scroll_delta } from './scrollFollow.js';
// ============================================================================
//  ui/TreeNodeView.js — 树节点渲染（递归）
// ============================================================================
//  数据模型是远古版 { expr, low, subitems }。
//  节点上没有稳定 id，UI 层用附加字段 _uid 标识（core 不感知）：
//     ensureUids(rootList) 递归补全 _uid（仅新节点）
//  折叠状态也用附加字段 item._collapsed 控制，不影响核心展开逻辑。
// ============================================================================
import { GUTTER, BRANCH, LAST_B, EMPTY } from './themes.js';
import { resolve_display } from '../core/ne/notationDef.js';
import { canExpandNode } from '../core/engine.js';
import { is_ne, can_expand_ne } from '../core/ne/uiEngine.js';

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
    // 兼容两套接口：
    //   远古记号的 display 是函数（返回 HTML 字符串）；
    //   ne 原生记号（notation/ne/）的 display 是 { plain, html, from_display } 规格对象，
    //   直接当函数调用会抛 TypeError，被下面的 catch 吞成 String(expr)，
    //   于是界面上显示成 [object Object] 之类。
    const spec = notation.display;
    if (typeof spec === 'function') return spec(expr);
    return resolve_display(spec).plain(expr);
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
    onToggle, onMore, startNote, editingNote, saveNote, cancelNoteEditing, onFocusRow, onNoteCommitted,
    scrollMode, extraViews, noteWidth, onNoteChange, onNoteWidth, treeStyle, wrapLong, compareDisplay } = props;
  // 节点文本：视图切换时用 displayFn（纯显示翻译），展开/折叠逻辑仍用原记号；
  // 视图 display 可能对非法表达式抛错，统一容错回退 String
  const nodeLabel = (expr) => {
    try {
      return displayFn ? displayFn(expr) : renderDisplay(notation, expr);
    } catch {
      return String(expr);
    }
  };
  /** 其它等价显示（「所有等价显示一并显示」开启时才有）——每个视图单独容错。 */
  const extraLabels = (expr) => {
    if (!extraViews || extraViews.length === 0) return [];
    const out = [];
    for (const v of extraViews) {
      try {
        const text = v.display ? v.display(expr) : null;
        if (text !== null && text !== undefined && String(text) !== '') out.push({ label: v.label, text: String(text) });
      } catch {
        /* 该视图对这条表达式不适用，跳过 */
      }
    }
    return out;
  };

  // 焦点行滚动跟随：策略由该棵树的设置决定（不跟 / 仅到边界 / 始终·中上·中间·顶部）。
  // 这里算增量而不是用 scrollIntoView —— 后者只能"刚好可见"，做不到固定位置。
  const focusRef = React.useRef(null);
  React.useEffect(() => {
    const el = focusRef.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const box = typeof el.closest === 'function' ? el.closest('.scroll-area') : null;
    if (!box) {
      // 兜底（找不到滚动容器时退回浏览器默认的"刚好可见"）
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    const delta = compute_scroll_delta(
      { top: box.getBoundingClientRect().top, height: box.clientHeight },
      { top: el.getBoundingClientRect().top, height: el.offsetHeight || 20 },
      scrollMode,
    );
    if (delta) box.scrollTop += delta;
  }, [focusUid, scrollMode]);

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

    // 可展开性判据分派：ne 记号走 ne 引擎同构的判据（含树位置的上界），
    // 旧记号走 canExpandNode。混用会出「显示 [+ ] 却点不动」（用户反馈过）。
    const neVerdict = is_ne(notation) ? can_expand_ne(notation, item) : null;
    const canExpandMore = neVerdict === null ? canExpandNode(notation, item) : neVerdict;
    //  - [+]：折叠态 → 展开显示子节点；展开态 → 加载更多（canExpandMore）
    //  - [-]：仅子节点可见（未折叠）时显示，点击折叠
    const showExpand = canExpandMore || (hasChildren && collapsed);
    const showCollapse = hasChildren && !collapsed;


    // 长行换行策略（统一设置）：换行 → pre-wrap 并可断词；不换行 → pre + 容器横向滚动**看得见**
    // （此前是不换行且不滚动，超出部分直接被裁掉，用户反馈「完全看不到」）
    const textStyle = {
      cursor: "pointer",
      ...(wrapLong
        ? { whiteSpace: "pre-wrap", wordBreak: "break-all", minWidth: 0 }
        : { whiteSpace: "pre", flexShrink: 0 }),
    };
    const rowOverflow = wrapLong ? { overflowX: "hidden" } : { overflowX: "auto" };


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
        // 无子节点：仅当确实还能展开时才触发展开（判据与 [+] 一致，别一个说能一个说不能）
        if (canExpandMore) onToggle(uid);
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

    const subContent = [];
    if (hasChildren && !collapsed) {
      subContent.push(renderList(item.subitems, prefixes.concat(isLast ? EMPTY : GUTTER)));
    }

    // 经典样式用的树线与前缀（其余两种样式不用）
    const connector = isLast ? LAST_B : BRANCH;
    const prefixStr = prefixes.join('');
    const nodeStyle = {
      color: theme.fg,
      minHeight: 24,
      display: 'flex',
      alignItems: 'baseline',
      background: isFocused ? theme.highlight : 'transparent',
      borderRadius: 2,
      padding: '0 2px',
      ...rowOverflow,
    };
    const handleNoteClick = (e) => { e.stopPropagation(); startNote(treeIndex, uid); };

    // 缩进层级（自助版用 clickIndex*24px 缩进，没有树线；这里用前缀长度=层深）
    const depth = prefixes.length;
    /** 是不是极限式（决定卡片左侧色条的颜色：极限 / 后继 / 展不动）。 */
    const isLimitNode = (expr) => {
      try {
        return is_ne(notation) ? !!notation._def.is_limit(expr) : !!(notation.able && notation.able(expr));
      } catch {
        return false;
      }
    };
    // 卡片底色跟随主题（参考版是白底；这里不硬编码亮色，免得在暗色主题下刺眼）
    const cardBg = 'transparent';

    // 点击行任意位置（含空白）→ 聚焦该行；文本/按钮自身有 stopPropagation 的处理
    const handleRowClick = () => {
      // 正在编辑本行注释时，别把焦点从 input 抢走（点 input 会冒泡到这里）
      if (isEditing) return;
      if (onFocusRow) onFocusRow(treeIndex, uid);
    };

    // 节点种类（照参考版：按类型给左侧色条 + 底色）：
    //   limit    极限式（能展开）
    //   successor 后继（非极限，但能展开出前驱）
    //   normal   其余（展不动）
    let kind = "normal";
    if (isLimitNode(item.expr)) kind = "limit";
    else if (canExpandMore) kind = "successor";
    const kindColor = kind === "limit" ? theme.accent : kind === "successor" ? theme.accent2 : theme.fgMuted;

    // 照参考版的「卡片」节点：圆角 + 左侧 5px 色条 + 内边距（缩进用 marginLeft）
    const cardStyle = {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: isFocused ? theme.highlight : cardBg,
      border: `1px solid ${theme.border}`,
      borderLeft: `5px solid ${kindColor}`,
      borderRadius: 6,
      padding: "3px 10px",
      marginLeft: depth * 20, // 参考版：按展开层级缩进（没有树线）
      marginBottom: 3,
      minHeight: 26,
      color: theme.fg,
      ...rowOverflow,
    };
    // 小按钮（参考版是圆角小方块；disabled 时半透明）
    const miniBtn = (enabled, extra) => ({
      border: "none",
      borderRadius: 6,
      width: 24,
      height: 22,
      lineHeight: "18px",
      textAlign: "center",
      cursor: enabled ? "pointer" : "default",
      opacity: enabled ? 1 : 0.35,
      fontFamily: "inherit",
      fontSize: 13,
      padding: 0,
      userSelect: "none",
      ...(extra || {}),
    });

    // 共用件：表达式本体（点击语义三种样式一致）
    const exprEl = (extra) => React.createElement("span", {
      onClick: onNodeClick,
      title: canExpandMore ? '点击展开一层' : hasChildren ? '点击折叠/展开子节点' : '已展不动',
      style: textStyle,
      dangerouslySetInnerHTML: { __html: label },
      ...(extra || {}),
    });

    // 等价显示：把所有视图都摆出来（主行之外的都是次级小字，带视图名）——ner 就是这个做法
    const equivRowsEl = () => {
      const rows = extraLabels(item.expr);
      if (!rows.length) return null;
      return React.createElement("div", { style: { display: "inline-flex", flexDirection: "column", verticalAlign: "top" } },
        rows.map((v, vi) => React.createElement("div", {
          key: `xv-${vi}`,
          style: { display: "flex", alignItems: "center", gap: 4, ...(wrapLong ? { whiteSpace: "pre-wrap", wordBreak: "break-all" } : { whiteSpace: "nowrap" }) },
        },
          React.createElement("span", { style: { color: theme.fgMuted, fontSize: 11, flexShrink: 0 } }, `${v.label}:`),
          React.createElement("span", { style: { color: theme.fgMuted, fontSize: 12, minWidth: 0 } }, v.text),
        )),
      );
    };

    // 注释输入框（自助版/ner 都是常驻的；区别只在位置：自助版行尾、ner 行首）
    /**
     * 拖拽调宽：按住注释框右边那条把手横向拖动。
     * 拖动过程实时写回 noteWidth（由 app.js 落到设置里持久化），所以松手后仍是这个宽度。
     */
    const beginNoteResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
      const startW = Number(noteWidth) || 200;
      const move = (ev) => {
        const x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
        const w = Math.max(60, Math.min(700, startW + (x - startX)));
        if (typeof onNoteWidth === 'function') onNoteWidth(Math.round(w));
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        window.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', up);
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      window.addEventListener('touchmove', move, { passive: true });
      window.addEventListener('touchend', up);
    };

    /** 对比视图：在注释位置显示「另一种表示」的文本（主位置仍是当前视图）。 */
    const compareEl = () => {
      if (typeof compareDisplay !== 'function') return null;
      let t = null;
      try { t = compareDisplay(item.expr); } catch { return null; }
      if (t === null || t === undefined || String(t) === '') return null;
      return React.createElement('span', {
        title: '对比视图',
        style: {
          color: theme.fgMuted, fontSize: 'inherit', marginLeft: 10,
          whiteSpace: wrapLong ? 'pre-wrap' : 'nowrap',
          ...(wrapLong ? {} : { flexShrink: 0 }),
        },
      }, String(t));
    };

    const noteInputEl = (place) => React.createElement("input", {
      key: `note-${uid}-${note || ""}`,
      ref: (el) => { if (isEditing && el && document.activeElement !== el) el.focus(); },
      defaultValue: note || "",
      placeholder: "注释…",
      title: "注释（直接输入即可，树里会保存）",
      onClick: (e) => e.stopPropagation(),
      onChange: (e) => { if (onNoteChange) onNoteChange(treeIndex, uid, e.target.value); },
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          if (e.key === "Escape" && cancelNoteEditing) cancelNoteEditing();
          e.target.blur();
          e.stopPropagation();
        }
      },
      style: {
        // 紧贴表达式（自助版就是紧跟其后）—— 不要用 marginLeft:auto 推到行尾，
        // 宽屏下那样会和表达式隔开一大段（用户反馈）。
        marginLeft: 8,
        flexShrink: 0,
        width: noteWidth || 200,
        minWidth: 80,
        background: theme.inputBg,
        color: theme.fg,
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        padding: "1px 8px",
        fontFamily: "inherit",
        fontSize: 'inherit',
      },
    });

    // ===== 样式 ③ ner（ne-rewritten）：无卡片、▾/▸ 折叠三角（无子时占位）、
    //        行首常驻输入框、无独立展开按钮（点表达式即展开）、等价显示多行 =====
    if (treeStyle === "ner") {
      return React.createElement("div", { key: uid, style: { position: "relative" } },
        React.createElement("div", {
          ref: isFocused ? focusRef : null,
          onClick: handleRowClick,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 4,
            minHeight: "1.25em",
            cursor: "pointer",
            background: isFocused ? theme.highlight : "transparent",
            ...rowOverflow,
          },
        },
          hasChildren
            ? React.createElement("span", {
                onClick: (e) => { e.stopPropagation(); handleCollapseClick(e); },
                title: collapsed ? "展开子节点" : "折叠子节点",
                style: { display: "inline-block", width: "1em", fontSize: "0.75em", color: theme.fgMuted, userSelect: "none", textAlign: "center" },
              }, collapsed ? "▸" : "▾")
            : React.createElement("span", { style: { display: "inline-block", width: "1em" } }),
          React.createElement("span", { style: { display: "inline-flex", alignItems: "center", flexShrink: 0 } },

            noteInputEl("leading"),

            React.createElement("span", {

              onMouseDown: beginNoteResize,

              onTouchStart: beginNoteResize,

              title: "拖动调节注释框宽度",

              style: {

                width: 6, alignSelf: "stretch", minHeight: 18, cursor: "col-resize",

                background: theme.border, borderRadius: 3, marginLeft: 2,

              },

            })

          ),
          exprEl(),
          compareEl(),
          equivRowsEl(),
        ),
        // 子层：padding-left + 竖线（对应 ner 的 .tree-children / .tree-item::before 树线）
        hasChildren && !collapsed && React.createElement("div", {
          style: { paddingLeft: 24, borderLeft: `1px solid ${theme.border}`, marginLeft: "0.5em" },
        }, renderList(item.subitems, prefixes.concat(EMPTY))),
      );
    }

    // ===== 样式 ② 自助 NE（自助版 NE-4.8.1）：卡片 + 左边框着色 + ⟨/⟩ + ➕ + marginLeft 缩进 =====
    if (treeStyle === "selfne") {
      return React.createElement("div", { key: uid },
        React.createElement("div", { ref: isFocused ? focusRef : null, style: cardStyle, onClick: handleRowClick },
          React.createElement("button", {
            onClick: (e) => { e.stopPropagation(); handleCollapseClick(e); },
            disabled: !hasChildren,
            title: collapsed ? "展开显示子节点" : "折叠",
            style: miniBtn(hasChildren, { background: theme.inputBg, color: theme.fgDim }),
          }, collapsed ? "⟩" : "⟨"),
          React.createElement("button", {
            onClick: (e) => { e.stopPropagation(); handleExpandClick(e); },
            disabled: !showExpand && !(hasChildren && collapsed),
            title: canExpandMore ? "展开一层" : hasChildren ? "先展开子节点" : "已展不动（没有更大的基本列项）",
            style: miniBtn(showExpand, { background: theme.accent, color: theme.bg }),
          }, "➕"),
          exprEl(),
          compareEl(),
          equivRowsEl(),
          noteInputEl("trailing"),
        ),
        ...subContent,
      );
    }

    // ===== 样式 ① 我的（经典）：树线前缀 + [+]/[-]/[✎] + 注释显示在行尾，按 n 编辑 =====
    return React.createElement("div", { key: uid },
      React.createElement("div", { ref: isFocused ? focusRef : null, style: nodeStyle, onClick: handleRowClick },
        React.createElement("span", { style: { color: theme.fgDim, userSelect: "none" } },
          prefixStr + connector
        ),
        exprEl(),
        compareEl(),
        extraLabels(item.expr).map((v, vi) => React.createElement("span", {
          key: `xv-${vi}`,
          title: `视图：${v.label}`,
          style: { color: theme.fgMuted, fontSize: 12, marginLeft: 6, userSelect: "text" }
        }, `${v.label}: ${v.text}`)),
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
            fontSize: 'inherit',
            padding: "1px 6px",
            borderRadius: 2,
            width: 180,
          },
        })
      ),
      ...subContent,
    );
  };

  return React.createElement("div", { style: { fontFamily: "inherit" } }, renderList(rootList, []));
}
