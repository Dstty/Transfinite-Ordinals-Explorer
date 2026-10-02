// ============================================================================
//  ui/FolderView.js — /list 的分类文件夹视图（可点击展开/折叠，支持任意层嵌套）
// ============================================================================
//  props:
//    categories: [{ name, rows: [...] }]  — 分类名 + 行列表
//    theme: 主题对象
//    onNotationDoubleClick?: (id) => void  — 双击记号行直接建树（子文件夹内同样生效）
//  行对象支持三种形态：
//    { id, text, infiniteDescending }   普通记号行（双击可建树）
//    { ellipsis: true, text }           省略号/提示行（灰字，非记号）
//    { subfolder: true, name, rows }    子文件夹：点击头展开/收起，其 rows 可再含 subfolder
//  展开状态用「路径键」（`3:1:0` = 第 3 个分类 → 第 1 行 → 第 0 行）记录，
//  与层级深度无关，所以嵌套再深也不会互相串。默认全部收起。
// ============================================================================

/**
 * FolderView — 分类记号列表（文件夹式，嵌套层级不限）。
 */
export function FolderView(props) {
  const { categories, theme, onNotationDoubleClick } = props;

  // 展开项集合：key = 从根到该文件夹的行下标路径，如 "2" / "2:1" / "2:1:0"
  const [expanded, setExpanded] = React.useState(() => new Set());

  const toggle = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const folderHeadStyle = (extra) => ({
    cursor: "pointer",
    color: theme.fg,
    padding: "3px 0",
    userSelect: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
    ...(extra || {}),
  });

  // 渲染一条「叶子」行（普通行或提示行）
  const leafRow = (row, key, depth) => {
    const isEllipsis = row.ellipsis === true;
    const isClickable = !isEllipsis && typeof onNotationDoubleClick === 'function';
    return React.createElement("div", {
      key,
      title: isClickable ? '双击直接建树' : undefined,
      onDoubleClick: isClickable ? () => onNotationDoubleClick(row.id) : undefined,
      style: {
        color: isEllipsis ? theme.fgMuted : theme.logColor,
        fontStyle: isEllipsis ? "italic" : "normal",
        cursor: isClickable ? "pointer" : "default",
        minHeight: 22,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        paddingLeft: 6,
      }
    },
      row.text,
      !isEllipsis && row.infiniteDescending && React.createElement("span", {
        style: { color: theme.error, fontWeight: 700 }
      }, "〔已无穷降链〕")
    );
  };

  // 递归计数：只数记号行，提示行不算；子文件夹里的记号也算进来。
  // 口径与 /list 头部一致（用户指定）：**家族算一个** —— 家族文件夹整体计 1
  // （成员都被标了 uncounted，所以不能对它的 rows 求和）。
  const countDeep = (rows) =>
    rows.reduce((n, r) => {
      if (r.id) return n + (r.uncounted ? 0 : 1);
      if (r.subfolder) return n + (r.family ? 1 : countDeep(r.rows));
      return n;
    }, 0);

  // 渲染一个文件夹（分类 / 子类 / **家族**），其下可再嵌套。
  // 家族用不同图标 + 虚线边框 + 底色 + 「家族」徽章，与普通子类一眼可分（用户要求）。
  const folderBox = (name, rows, key, depth, icon, isFamily = false) => {
    const isOpen = expanded.has(key);
    const count = countDeep(rows);
    const headExtra = isFamily
      ? {
          padding: "2px 8px",
          border: `1px dashed ${theme.border}`,
          borderRadius: 4,
          background: theme.highlight,
        }
      : depth > 0
        ? { padding: "2px 0" }
        : undefined;
    return React.createElement("div", { key, style: { marginBottom: 2 } },
      React.createElement("div", {
        onClick: () => toggle(key),
        title: isOpen ? '点击折叠' : '点击展开',
        style: folderHeadStyle(headExtra)
      },
        React.createElement("span", { style: { color: theme.fgMuted } }, isOpen ? "▾" : "▸"),
        React.createElement("span", null, icon),
        React.createElement("span", { style: depth === 0 ? { fontWeight: 500 } : undefined }, name),
        isFamily && React.createElement("span", {
          style: {
            fontSize: 11,
            color: theme.fgMuted,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: "0 5px",
          }
        }, "家族"),
        React.createElement("span", { style: { color: theme.fgMuted, fontSize: 13 } }, `(${count})`)
      ),
      isOpen && React.createElement("div", { style: { paddingLeft: depth === 0 ? 24 : 18 } },
        ...rows.map((row, i) => {
          const childKey = `${key}:${i}`;
          if (row.subfolder) return folderBox(row.name, row.rows, childKey, depth + 1, row.family ? "🧬" : "📂", !!row.family);
          return leafRow(row, childKey, depth + 1);
        })
      )
    );
  };

  return React.createElement("div", { style: { marginTop: 4 } },
    ...categories.map((cat, idx) => folderBox(cat.name, cat.rows, String(idx), 0, "📁"))
  );
}
