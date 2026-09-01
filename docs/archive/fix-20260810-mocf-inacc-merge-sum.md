# MOCF / OCF(I) display 混入 [object Object] 修复（2026-08-10）

项目：D:\Dispher\expander-v2

## 现象

用户反馈 MOCF（Madore's OCF）和 OCF(I)（Inacc OCF，id `inacc-ocf`）显示时混入"莫名其妙的东西"。

## 根因

`_shared.js` 里有两个名字相近但用途不同的函数：

| 函数 | 输入 | 用途 |
| --- | --- | --- |
| `merge_sum`（240 行） | **字符串数组** | 给 Veblen 等返回字符串的 display 用 |
| `merge_sum_OCN`（319 行） | **IR 对象数组**，返回 IR | 给 OCF 系列 display AST 用（原版 OCN_utils.ts 的 merge_sum） |

`MOCF-EBO.js` 和 `Inacc-OCF.js` 的 `to_OCN_IR` 里 `case 1`（和表达式）误用了字符串版 `merge_sum`：
`merge_sum(e[1].map(to_OCN_IR))` —— 传入的是 IR **对象**数组。字符串版 `merge_sum` 里 `terms[j] === t` 引用比较永远不相等，最后 `result.join('+')` 把对象 toString 成 `[object Object]`，于是显示出现 `[object Object]+ω<sup>...</sup>` 之类。

## 修复

两处解构和调用改为 `merge_sum_OCN`：

- `notation/MOCF-EBO.js`：解构 `merge_sum` → `merge_sum_OCN`；`case 1: return merge_sum_OCN(e[1].map(to_OCN_IR))`
- `notation/Inacc-OCF.js`：同样两处

`BOCF-EBO.js` 本来就用对了 `merge_sum_OCN`；`Veblen.js` 的 `impl` 返回字符串，用字符串版 `merge_sum` 是对的，不用动。

## 验证

用 Python 重写两版 merge_sum 逻辑模拟：修复前（字符串版喂对象）报 TypeError（JS 里即 [object Object]）；修复后 `[1, [ψ(0), ψ(0), ω^ψ(0)]]` 正确显示 `ψ(0)·2+ω<sup>ψ(0)</sup>`，同类项正确合并为 ·2，单一项 ψ(0) 正常。浏览器工具本次启动失败，改动很小（函数换名），语法已人工复核。

## 教训

OCF 系列（MOCF/Inacc/BOCF/NOCF）做 sum 合并时**必须用 `merge_sum_OCN`**（IR 版）；`merge_sum`（字符串版）只给 Veblen 这类自拼字符串的 display 用。以后新增 OCF 记号注意区分。
