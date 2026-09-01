// ============================================================================
//  ui/FolderView.js — /list 的分类文件夹视图（可点击展开/折叠）
// ============================================================================
//  props:
//    categories: [{ name, rows: [{ text, infiniteDescending }] }]  — 分类名 + 记号行
//    theme: 主题对象
//  每个分类是一个「文件夹」，点击头部切换展开/折叠；默认全部收起。
//  行对象的 infiniteDescending 为 true 时，行尾用 theme.error 醒目显示「已无穷降链」。
// ============================================================================

/**
 * FolderView — 分类记号列表（文件夹式）。
 */
export function FolderView(props) {
  const { categories, theme } = props;

  // 展开的分类下标集合（默认全收起）
  const [expanded, setExpanded] = React.useState(() => new Set());

  const toggle = (idx) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return React.createElement("div", { style: { marginTop: 4 } },
    ...categories.map((cat, idx) => {
      const isOpen = expanded.has(idx);
      return React.createElement("div", {
        key: cat.name,
        style: { marginBottom: 2 }
      },
        // —— 文件夹头：点击切换 ——
        React.createElement("div", {
          onClick: () => toggle(idx),
          title: isOpen ? '点击折叠' : '点击展开',
          style: {
            cursor: "pointer",
            color: theme.fg,
            padding: "3px 0",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }
        },
          React.createElement("span", { style: { color: theme.fgMuted } }, isOpen ? "▾" : "▸"),
          React.createElement("span", null, "📁"),
          React.createElement("span", { style: { fontWeight: 500 } }, cat.name),
          React.createElement("span", { style: { color: theme.fgMuted, fontSize: 13 } }, `(${cat.rows.length})`)
        ),
        // —— 展开后的记号行 ——
        isOpen && React.createElement("div", { style: { paddingLeft: 24 } },
          ...cat.rows.map((row, i) =>
            React.createElement("div", {
              key: i,
              style: { color: theme.logColor, minHeight: 22, whiteSpace: "pre-wrap", wordBreak: "break-all" }
            },
              row.text,
              row.infiniteDescending && React.createElement("span", {
                style: { color: theme.error, fontWeight: 700 }
              }, "〔已无穷降链〕")
            )
          )
        )
      );
    })
  );
}
