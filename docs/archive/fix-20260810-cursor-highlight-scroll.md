# 光标高亮整行 + 焦点滚动跟随（2026-08-10）

项目：D:\Dispher\expander-v2

## 现象

用户反馈两个 UI 问题：
1. 光标聚焦在树节点（如数字 `4`）时，只高亮了文本本身，没有高亮一整行。
2. 用键盘导航把光标移出屏幕后，滚动区不跟着滚动。

## 修复（ui/TreeNodeView.js）

1. **高亮整行**：原来 `background: theme.highlight` 在文本 span 的 `textStyle` 上（文本多短高亮就多短）；移到整行 `nodeStyle`（外层 div，含连接线前缀）上。同时把 `borderRadius: 2, padding: "0 2px"` 从 textStyle 挪到 nodeStyle；**去掉**原来 textStyle 的 `margin: "0 -2px"`（那是给 span 用的防位移技巧，放整行 div 上会导致行溢出容器）。textStyle 只保留 `cursor: pointer`。

2. **焦点滚动跟随**：组件内新增
   ```js
   const focusRef = React.useRef(null);
   React.useEffect(() => {
     if (focusRef.current) {
       focusRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
     }
   }, [focusUid]);
   ```
   聚焦行的内层 div 挂 `ref: isFocused ? focusRef : null`。focusUid 变化时把聚焦行滚进可视区（nearest 只滚必要距离，不强制置顶）。

## 验证

- 括号配对检查通过（node 不在 PATH，无法跑语法检查/实测）。
- 浏览器工具本次仍启动失败，需用户 Ctrl+F5 硬刷新后实测：↑↓ 导航时应整行高亮、移出屏幕自动滚动。
