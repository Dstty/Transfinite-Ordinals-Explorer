# Notation Explorer v2 — 设计文档

> 记号展开器（googology 序数记号展开工具）完全重写版。
> 重写目标：**可维护性**优先；算法层照搬验证过的实现，UI 层重写为清晰结构。

---

## 1. 项目定位

输入「记号名 + 表达式」（如 `PrSS 0,1,2`），生成一棵**展开树**：
极限表达式按 FS（基本列）展开成越来越大的子节点，逐层探索大序数记号的展开过程。

旧版问题（本次重写要解决的）：
- 代码混乱、中文注释乱码（GBK/UTF-8 编码损坏）
- `app.js` 巨型组件，状态/导航/键盘/渲染全塞一个文件
- 手写 `createElement` 可读性差；设置弹窗是占位符
- 残留死代码（`_performTruncation` 直接 return null、被注释掉的逻辑）

---

## 2. 来源与分工

本项目是 **Hyp cos 的 notation-explorer**（https://hypcos.github.io/notation-explorer/，
github.com/hypcos/notation-explorer）的思想重写。仓库未声明 LICENSE，个人使用；
README 已标注来源致谢。

| 层 | 来源 | 说明 |
|---|---|---|
| **记号接口** | 远古版 | `register.push({id, name, display, able, semiable, compare, FS, FSalter, init})`，34 个记号算法全搬（`notation/*.js`） |
| **树管理/展开核心** | 远古版 | `FSbounded`（low 边界保证严格递增）、tier 展开、extra FS 逻辑（`core/engine.js`，去 Vue 化） |
| **UI 层** | 用户旧版 | React 18 CDN 零构建、CLI 风格、键盘导航、5 套主题、注释、CSV 导出、`/set` 设置 |
| **用户自有记号** | 用户旧版 | PrSS、PPS、SPS、DFSS（远古版没有），按远古接口重写进 `notation/` |
| ~~Vue~~ | ❌ | 不使用 |
| ~~序数→PrSS 转换~~ | ❌ | 用户确认不需要，已移除 |

---

## 3. 技术栈

- **零构建**纯前端：React 18 UMD CDN + 原生 ES Modules
- 记号文件为**普通 `<script>`**（远古版是 IIFE + 全局 `register.push`，不改动算法文件本身）
- UI 层为 **ES Module**（`ui/*.js`），入口 `ui/app.js`
- 无 Node、无打包器、无依赖安装；本地起静态服务器即可运行

---

## 4. 目录结构

```
expander-v2/
├── index.html               # 入口：React CDN → register 初始化 → 清单 → 加载器
├── DESIGN.md                # 本文档
├── README.md                # 使用说明 + 来源致谢
├── core/
│   ├── register.js          # 全局 register 数组 + 别名映射 + 示例初始化
│   ├── engine.js            # FSbounded + expandNode（远古版展开核心，纯逻辑无 UI 依赖）
│   ├── parseShorthands.js   # 矩阵/序列简写解析
│   ├── notation-manifest.js # 记号文件清单（v2.4.0 起：加载的唯一依据）
│   └── loader.js            # 清单驱动加载器（拓扑排序 + 动态注入 script）
├── notation/                # 记号文件，按来源分子目录（共 76 个文件 / 81 个记号）
│   ├── legacy/              # 远古版（hypcos/notation-explorer 算法原样，52 个文件）
│   ├── rewritten/           # ne-rewritten 移植（依赖 shared.js 的 window.NEUTILS，19 个文件）
│   └── user/                # 用户自有记号（PrSS/PPS/SPS/DFSS/CNF，5 个文件）
├── ui/
│   ├── app.js               # React 主应用（状态、导航、键盘、命令）
│   ├── TreeNodeView.js      # 树节点渲染组件
│   ├── FolderView.js        # /list 文件夹式分组渲染
│   ├── notationList.js      # 记号分类 / 显示名 / 无穷降链标记
│   ├── themes.js            # 5 套主题
│   ├── helpText.js          # 帮助文本
│   ├── commandParser.js     # /命令 解析
│   ├── notationParser.js    # 「记号名 表达式」输入解析
│   └── exportUtils.js       # CSV 导出
├── scripts/
│   ├── list-notation.mjs    # Node 验证：按清单加载全部记号并核对注册
│   └── verify-loader.mjs    # Node 回归测试：loader 依赖排序与注入顺序
├── docs/
│   └── archive/             # 历史修复笔记归档
└── reference/
    └── framework.original.js  # 远古版框架原稿（参考，不参与运行）
```

### 4.1 清单驱动加载（v2.4.0 引入）

`index.html` 不再手写 70+ 个 `<script>` 标签，只加载两个文件：

1. `core/notation-manifest.js` —— 声明全部记号文件：`{ file, category, ids?, dependsOn?, note? }`；
2. `core/loader.js` —— 读取清单，按 `dependsOn` 做**拓扑排序**，
   同步链式注入记号 `<script>`（保持 `register.push` 的执行顺序），
   全部完成后注入 `<script type="module" src="ui/app.js">`。

跨文件依赖一览（浏览器顶层全局，靠 `dependsOn` 保证顺序）：

| 提供方 | 全局符号 | 消费者 |
|---|---|---|
| `rewritten/shared.js` | `window.NEUTILS` | 全部 rewritten 记号 |
| `legacy/omega-Y.js` | `sequence_display` | omega-Y-magma、1-Y、X-Y、user/PPS |
| `legacy/BM.js` | `matrix_display` / `matrix_limit` | BHM/BSM/BLM/CM/wMM/BHM2/BTM/BIM/BSM2/BDM/BHhM/MM/MM2/MM3/EPM/UPS |
| `legacy/TON-main.js` | `TON_limit` / `TON_main_display` | 其余 8 个 TON 文件 |
| `legacy/aSAN-1.js` | `aSAN_display` | aSAN-2 / aSAN-3 / aSAN-3plus |
| `legacy/LMN.js` | `LMN_display` | LON |
| `rewritten/BTBM.js` | `window.NEBTBM` | BTBM-weak |

> 注意：远古版文件之间的依赖是「浏览器顶层 `<script>` 的 `var`/直接赋值
> 全局可见」语义，Node `require` 无法复现，验证脚本必须用
> `vm.runInThisContext`（见 `scripts/list-notation.mjs`）。

---

## 5. 核心数据模型（远古版）

### 5.1 记号注册表

```js
register.push({
  id: 'den',            // 唯一标识（输入时按 id / name 匹配）
  name: 'Defective embedding notation',
  display: (expr) => string,        // 表达式 → 展示字符串
  able: (expr) => bool,             // 是否可展开（极限）
  semiable: (expr) => bool | 省略,  // 弱可展开（可选）
  compare: (a, b) => -1|0|1,
  FS: (expr, n) => expr',           // 基本列：第 n 项
  FSalter: (expr, n) => expr' | 省略, // 替代基本列（Shift 展开用）
  init: () => [{ expr, low, subitems }, ...],  // 示例列表（点击示例建树）
  // —— 以下为 UI 层可选扩展（远古版没有，不影响核心）——
  parse: (str) => expr | 省略,      // 输入字符串 → 表达式（无 parse 则尝试 JSON.parse）
  aliases: ['...'] | 省略,          // 输入别名
})
```

### 5.2 树节点

```js
{ expr, low, subitems: [ ...节点 ] }
```

- `low`：下界数组，`low[0]` 是当前下界表达式。展开时用 `FSbounded` 找第一个
  `compare(FS(expr, n), low[0]) > 0` 的项，保证展开严格递增。
- `subitems`：子节点列表（按展开顺序，新的插入在触发点之后）。
- 树 = 根列表 `[{expr, low, subitems}]`，`init()` 的返回值即根列表。

### 5.3 记号能力扩展（v2.5 规划：山脉图 / 互译 / 标准化）

> 原则：**记号算法文件只读不改**。新能力一律走 `core/register.js` 的
> `NOTATION_META` 补充表（与 aliases/parse 同一模式），UI 层按需消费。
> 记号文件里已有的内部函数（如 `1-Y.js` 的 `calcMountain`、`MM2.js` 的
> `mountain_to_matrix`、`shared.js` 的 BM↔三角 BMS 转换器）是**数据来源**，
> 在补充表条目里包装引用，不复制算法。

`NOTATION_META[id]` 计划新增三个可选字段（都不影响现有核心）：

```js
NOTATION_META[id] = {
  // …… 已有：aliases / parse / examples ……

  // 1) 标准化判定：表达式是否标准形（standard form）
  standard: (expr) => bool | 省略,
  // 2) 互译：本记号表达式 → 其它记号表达式（target 为 register 里的 id）
  //    新建 core/converters.js 提供 convert(notation, expr, target) 统一入口
  converters: [{ target: 'prss', convert: (expr) => expr' }] | 省略,
  // 3) 山脉图数据：表达式 → 可绘制的山脉结构（包装记号文件内部的
  //    calcMountain / compute_*_mountain 等；渲染由 ui/MountainView.js 负责）
  mountainData: (expr) => mountain | 省略,
}
```

落点约定（v2.4.0 已落地部分）：

| 能力 | 数据来源（记号文件内已有） | 新增模块 / 组件 |
|---|---|---|
| 山脉图 | `Omega_Y.ts: compute_y_mountain_diagram`、`draw_mountain_util.ts`（ne-rewritten 移植） | `core/mountainDiagram.js`（Diagram 数据）+ `ui/MountainView.js`（Canvas 渲染） |
| 互译 / 等价显示 | `BM-BOCF.ts`（ne-rewritten 移植）、`MM2.js: mountain_to_matrix`、`shared.js: BM↔三角 BMS` | `core/bmBocf.js` + `core/converters.js`（`convert()` 入口、`/convert` 命令） |
| ω-Y DBMS 显示 | `Omega_Y.ts: to_dbms_display`（ne-rewritten 移植） | `core/omegaYdbms.js` |
| 标准化 | 无（全新） | 补充表 `standard` 字段；`/list` 标记 + 输入校验提示 |

`views` 的 `kind` 已支持（由 `core/converters.js` 解释）：

| kind | 作用 | views 条目附加字段 |
|---|---|---|
| `strip-html` | 剥 HTML 标签 → 纯文本（`<sup>`→`^` 等） | — |
| `bm-simple` / `bm-0y` / `bm-bms` | BMS 矩阵的 simple / 0-Y / 标准矩阵显示 | — |
| `oy-dbms` | ω-Y → DBMS / DBMS' / ADBMS | `type` |
| `bm-ocf` | BMS → BOCF OCN 显示（OCF / full / n.s.） | `type` |
| `mountain` | ω-Y 山脉图（视图标记 `isMountain`，树上方 Canvas 绘制） | `type`（equiv，可选） |

约定：新增能力 = 补充表加字段 + 一个 core 模块 / ui 组件，**不改 index.html、
不改记号算法文件、不新增全局依赖**；能力缺失时 UI 优雅降级（如无 `mountainData`
则不显示山脉图按钮）。

---

## 6. 展开核心（core/engine.js）

移植自远古版 framework.js，去掉 Vue 依赖，导出两个纯函数：

```js
FSbounded(FS, compare, expr, low)  // 找 FS(expr, n) 中第一个 > low[0] 的项
expandNode(notation, parentList, item, tier, extra)
```

`expandNode` 语义（远古版原逻辑）：
1. 若 `able(expr)` 或（有 semiable 且满足条件），生成 `newitem = {expr: FSbounded(...), low: 拷贝, subitems: []}`
2. 插入位置：若 `item` 是父列表最后一个 → 插到父列表 `item` 之后（**兄弟**）；
   否则插到 `item.subitems` 开头（**子**）—— 与旧版「后继节点插入为兄弟」语义一致
3. `item.low[0] = newitem.expr`（下界前移）
4. `tier > 0` 时对新项递归展开（tier 控制展开深度）
5. 所有被展开的 item 进入 `extras`，最后按 `extra` 数量额外补 FS 项

UI 每次「展开一次」= `expandNode(notation, parentList, item, 1, 0)`；
「加载更多」= 重复调用或 `extra` 加大。

---

## 7. UI 层设计

保留用户旧版全部交互：

- CLI 输入框：`记号名 表达式`（如 `PrSS 0,1,2`）、`/命令`、直接记号名（用示例建树）
- 键盘导航：`↑↓/jk` 导航、`←→/hl` 折叠、`,` 父节点、`0-9` 选中第 n 个 FS 项、
  `Enter/空格` 展开、`+=` 加载更多、`n` 注释、`Esc` 取消、`Shift+点击` 用 FSalter
- `/set theme=...` 切换主题；`/set default=N` 初始展开层数；`/set additional=N` 加载更多数量；
  `/set tier=N` 展开层级（0=small, 1=single, 2=double, ..., 9，与远古版一致）
- `/list` 列出记号；`/clear` 清屏；`/save` 导出当前树为 CSV
- 5 套主题（dark/light/paper/solarizedLight/solarizedDark）
- 设置弹窗（真正实现，非占位符）
- 每节点可加注释（存于节点对象的 `note` 字段，UI 层附加，核心不感知）

### 7.1 状态管理（ui/app.js）

```
items: [{ type: 'output'|'tree', ... }]      # 输出流（CLI 风格）
treeEntry: { notation, rootList, name, index } # 每棵树
settings: { defaultExpand, additionalExpand }
themeKey / focusIdx / editingNote
```

树渲染：`TreeNodeView` 递归渲染 `subitems`；折叠状态用节点上 UI 附加字段
（如 `_collapsed`）控制，不污染核心数据。

### 7.2 输入解析（ui/notationParser.js）

1. 剥离 `limit(...)` / `limit ...` 前缀（= 用记号 init 示例建树）
2. 按 id / name / alias 匹配记号（最长匹配、无括号优先）
3. 剩余部分作为表达式：有 `parse` 用 parse；否则 JSON.parse（`Infinity` 预处理）
4. 无匹配 → 报错提示 `/list`

---

## 8. 可维护性约定

- 记号文件（远古版）**只读不改**；需要扩展信息（alias/parse）写在 `core/register.js`
  的补充表中，避免动算法
- 核心引擎不依赖 React / DOM，可独立单测
- UI 组件拆分：app（状态+导航）/ TreeNodeView（渲染）/ themes / parser / export
- 中文注释统一 UTF-8；旧版乱码注释不保留
- 新增记号 = 按 5.1 接口写一个 `register.push` 文件放入 `notation/` 对应子目录
  + 在 `core/notation-manifest.js` 加一条（含 `dependsOn`），**不再改 index.html**；
  可选在 `core/register.js` / `ui/notationList.js` 补别名与显示名
- 改动加载相关代码后跑 `node scripts/verify-loader.mjs`；新增/移动记号后跑
  `node scripts/list-notation.mjs` 核对注册与清单 ids 一致

---

## 9. 验证方式

本地静态服务器 + 浏览器：
- `python -m http.server 8000`（或任意静态服务器）
- 输入 `PrSS 0,1,2` → 应生成展开树
- 输入记号名（如 `DEN`）→ 用示例建树
- 逐项回归：展开 / 折叠 / 导航 / 注释 / 导出 / 主题 / 设置
