# 注释字号 + tier 默认值 + → 展开 + 按钮逻辑调整（2026-08-10）

项目：D:\Dispher\expander-v2

## 用户反馈（5 项）

1. 编辑注释时字有点小。
2. tier 初始设置为 small expansion。
3. → 按键始终是展开（之前对有子已展开节点按 → 会折叠，因为走 doToggleFocused）。
4. 节点按了 [-] 之后 [-] 按钮还在（折叠后应消失）。
5. 节点同时有 [+] 和 [-] 时，先显示 [+] 再显示 [-]。

## 修改

### ui/app.js

- `settings` 初始值 `tier: 1` → `tier: 0`（TIER_NAMES[0] = 'small'，即 small expansion）。
- handleGlobalKey 的 ArrowRight/`l` 分支：折叠态 → 展开显示子节点；否则直接 `onMore(item.uid)`（始终展开，不再走 doToggleFocused 折叠）。

### ui/TreeNodeView.js

- 注释 input `fontSize: 14` → `16`。
- 按钮显示逻辑重构：
  ```js
  const showExpand = canExpandMore || (hasChildren && collapsed);
  const showCollapse = hasChildren && !collapsed;
  ```
  即 [-] 只在子节点可见（未折叠）时显示；折叠后 [-] 消失、[+] 出现。
- `handleCollapseClick`：只折叠（不再 toggle 展开）。
- `handleExpandClick`：折叠态 → 展开显示子节点；展开态 → onMore 加载更多。
- 渲染顺序：`[+]` 在前、`[-]` 在后。

## 按钮状态矩阵

| 节点状态 | [+] | [-] |
| --- | --- | --- |
| 有子 + 未折叠 + 能展开更多（BMS Limit） | ✓ 加载更多 | ✓ 折叠 |
| 有子 + 未折叠 + 不能展开（PrSS 后继） | ✗ | ✓ 折叠 |
| 有子 + 折叠 | ✓ 展开子节点 | ✗ |
| 无子 + 能展开 | ✓ 加载更多 | ✗ |
| 无子 + 不能展开 | ✗ | ✗ |

## 验证

括号配对通过；需 Ctrl+F5 硬刷新实测。
