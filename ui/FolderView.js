// ============================================================================
//  ui/FolderView.js — /list 的分类文件夹视图（可点击展开/折叠）
// ============================================================================
//  props:
//    categories: [{ name, rows: [...] }]  — 分类名 + 行列表
//    theme: 主题对象
//    onNotationDoubleClick?: (id) => void  — 双击记号行直接建树（子文件夹内同样生效）
//  行对象支持三种形态：
//    { id, text, infiniteDescending }   普通记号行（双击可建树）
//    { ellipsis: true, text }           省略号提示行（灰字，非记号）
//    { subfolder: true, name, rows }    子文件夹（如带 n 家族）：点击头展开/收起
//  每个分类是一个「文件夹」，点击头部切换展开/折叠；默认全部收起。
// ============================================================================

/**
 * FolderView — 分类记号列表（文件夹式，支持一层子文件夹）。
 */
export function FolderView(props) {
  const { categories, theme, onNotationDoubleClick } = props;

  // 展开项集合：key = 分类下标（分类层）或 "分类下标:行下标"（子文件夹层）
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

  // 渲染一条「叶子」行（普通行或省略行）
  const leafRow = (row, i) => {
    const isEllipsis = row.ellipsis === true;
    const isClickable = !isEllipsis && typeof onNotationDoubleClick === 'function';
    return React.createElement("div", {
      key: i,
      title: isClickable ? '双击直接建树' : undefined,
      onDoubleClick: isClickable ? () => onNotationDoubleClick(row.id) : undefined,
      style: {
        color: isEllipsis ? theme.fgMuted : theme.logColor,
        fontStyle: isEllipsis ? "italic" : "normal",
        cursor: isClickable ? "pointer" : "default",
        minHeight: 22,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }
    },
      row.text,
      !isEllipsis && row.infiniteDescending && React.createElement("span", {
        style: { color: theme.error, fontWeight: 700 }
      }, "〔已无穷降链〕")
    );
  };

  // 渲染子文件夹（可展开/收起），subKey 为其唯一展开键
  const subFolder = (row, i, subKey) => {
    const isOpen = expanded.has(subKey);
    return React.createElement("div", { key: i, style: { marginBottom: 2 } },
      React.createElement("div", {
        onClick: () => toggle(subKey),
        title: isOpen ? '点击折叠' : '点击展开',
        style: folderHeadStyle({ padding: "2px 0" })
      },
        React.createElement("span", { style: { color: theme.fgMuted } }, isOpen ? "▾" : "▸"),
        React.createElement("span", null, "📂"),
        React.createElement("span", { style: { fontWeight: 500 } }, row.name),
        React.createElement("span", { style: { color: theme.fgMuted, fontSize: 13 } }, `(${row.rows.length})`)
      ),
      isOpen && React.createElement("div", { style: { paddingLeft: 22 } },
        ...row.rows.map(leafRow)
      )
    );
  };

  return React.createElement("div", { style: { marginTop: 4 } },
    ...categories.map((cat, idx) => {
      const isOpen = expanded.has(idx);
      return React.createElement("div", {
        key: cat.name,
        style: { marginBottom: 2 }
      },
        // —— 分类文件夹头：点击切换 ——
        React.createElement("div", {
          onClick: () => toggle(idx),
          title: isOpen ? '点击折叠' : '点击展开',
          style: folderHeadStyle()
        },
          React.createElement("span", { style: { color: theme.fgMuted } }, isOpen ? "▾" : "▸"),
          React.createElement("span", null, "📁"),
          React.createElement("span", { style: { fontWeight: 500 } }, cat.name),
          React.createElement("span", { style: { color: theme.fgMuted, fontSize: 13 } }, `(${cat.rows.length})`)
        ),
        // —— 展开后的行：普通行 / 省略行 / 子文件夹 ——
        isOpen && React.createElement("div", { style: { paddingLeft: 24 } },
          ...cat.rows.map((row, i) => {
            if (row.subfolder) return subFolder(row, i, `${idx}:${i}`);
            return leafRow(row, i);
          })
        )
      );
    })
  );
}
