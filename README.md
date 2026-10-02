# 序数探索器 · Transfinite-Ordinals-Explorer

googology 超限序数记号探索工具（**v2.5.1**）：输入「记号名 + 表达式」，生成**展开树**，
逐层探索大序数记号的基本列（FS）展开过程。

零构建纯前端（React 18 UMD + 原生 ES Module），不需要打包器。

## 运行

任意静态服务器即可：

```bash
# 方式一：Python
python -m http.server 8000
# 方式二：Node
npx serve .
# 方式三：自带（禁用缓存，改完刷新即生效）
node scripts/serve-nocache.mjs
```

然后浏览器打开对应地址。**必须走 HTTP** —— ES Module 结构，直接双击 `index.html`
会被浏览器的 CORS 拦掉。

## 记号架构（v2.5.1 起）

记号有**两套注册表**，UI 通过适配层统一取用：

| | ne 注册表（正主） | 远古注册表（兜底） |
|---|---|---|
| 位置 | `notation/ne/`（126 个文件，229 个记号） | `notation/legacy` `rewritten` `user`（88 文件，168 记号） |
| 接口 | `NotationDefinition`：`{display, is_limit, compare, FS, init}` | `register.push({display, able, semiable, compare, FS, init})` |
| 展开引擎 | `core/ne/`（`tree.js` + `expander.js`，与 ne-rewritten 的 `expander.ts` 同源） | `core/engine.js`（远古 `FSbounded`） |
| 何时用 | **默认** | `?legacy=1`；以及 ne 引擎自己就崩的 11 个记号 |

- **默认走 ne**：`notation/ne/` 是记号的正主，展开树形与
  [ne-rewritten](https://github.com/SmileLee-lyx/ne-rewritten) 一致。
  想对照远古实现，URL 加 `?legacy=1`。
- **适配层** `core/ne/uiBridge.js` 把 ne 记号伪装成旧式对象，供旧引擎与输入解析使用；
  展开则走 `core/ne/uiEngine.js`（真 ne 引擎 + 把 ne 树**镜像**成 UI 认识的节点形状，
  UI 渲染代码一行未改）。
- **回落的 11 个**：TON 家族 9 个（`ton-m/dr/drc/drp/drpc/i/ibp/mc/mpc`）与
  `upms-partial-8/9` —— 这些在 ne 里本身就会抛错（与 ne 原版逐字同错），只能用远古实现。

记号清单：`notation/ne/` 里 229 个；`/list` 按 **类 / 子类** 两级展示 ——
序列类 / 矩阵类 / 山脉类 / 函数类（+ 有自定义记号时才出现的「自定义记号」）。
**带 n 家族各自是一个独立的「🧬 …家族」文件夹**（虚线框 + 「家族」徽章，与普通子类一眼可分），
点开才列出各档位；计数口径：**家族算一个**（列全部档位，但只计 1）。

## 使用

任何输入都是指令：`tree <记号名> <表达式>` 生成展开树，**裸输入**是它的缩写。

- `PrSS 0,1,2`（= `tree PrSS 0,1,2`）→ 用 PrSS 展开该表达式
- `DEN`（= `tree DEN`）→ 用该记号的 `init()` 示例建树
- `limit DEN` / `limit(DEN)` → 同上（示例建树）
- 免写记号名也能识别：`1,2,4,8` → ω-Y · `()(1,1,1)(2,1)` → BMS · `w^w+w` → CNF

> 输入时**浅灰文字**实时预览本条指令将做什么；`Tab` 补全命令/记号，`↑↓` 选候选。
>
> **设置与主题会记住**：改过的主题 / `tier` / `font` / `time_limit` 等存在 localStorage
> （`dsh.settings`、`dsh.theme`），刷新后保持 —— 与自定义记号同一套行为。存档损坏或越界时
> 逐项回落到默认值，不会把界面带崩。

### 自定义记号（`/notation` 或设置弹窗）

输入 `notation` **弹出编辑面板**（设置弹窗里也有入口「打开自定义记号…」）：左边列出已有自定义记号
（点选即载入源码）、底部「＋ 新建记号」（新建态会高亮）；右边是 id / 显示名 / 短名 + 多行编辑器，
保存 / 导入 .js / 删除 / 关闭。

- **id 可以留空** —— JS 里写了 `id` 就用它，都没有就按导入的**文件名**兜底，再没有才自动分配
  `user1`、`user2`…；显示名回落到 id。所以「新建 → 直接保存」也能得到一个可用记号。
- **「导入 .js」**：读入一份记号 JS 填进编辑器（不直接注册，留一步复核）。三种形态都认：
  1. 裸对象 / 工厂函数（`({...})` 或 `function(){ return {...} }`）
  2. ES module 外壳：`export default <expr>`、`export const X = <expr>`、`export function X(){}`
  3. **自注册式**（ne-rewritten 内置记号的形态，例如从那边下载的 CTN2）：
     `(() => { … const notation = {…}; if (typeof register_notation === 'function') register_notation(notation); })();`
     —— 它没有返回值，靠调用 `register_notation` 注册；导入时会注入一个只捕获的 shim 接住它。
     带 `import` 的模块文件仍会给出明确错误（浏览器里没有依赖可解析，请改成自包含形式）。
- 保存后出现在 `/list` 的「**自定义记号**」文件夹，存 localStorage（`dsh.userNotations`），刷新自动载入。
  导入后按 `name` / `simple_name` 即可输入，如 `CTN2 2`。
- **接口与 ne 相同**，两种都认：
  1. ne 定义 `{display, is_limit, compare, FS, init}`
  2. 经典 6 方法 `{parse, format, isSuccessor, generateLimit, expand, compare}`
     （参考版「自助版 NE-4.8.1」的接口，可整段贴工厂函数；`expand(m,n)` 的 `n` 从 1 起，
     适配层自动换算成 ne 的 0 基）
- **展开走 ne 引擎**，与 ne-rewritten 的结果一致。
- 不想开窗时也可单行注册：`notation add <JS 记号定义>`；
  另有 `notation list` / `notation del <id>` / `notation show <id>`。

### 每棵树的设置（树标题行右侧 `⚙️ 树设置`）

每棵树都有**自己的**设置（只影响那一棵，点标题行的 `⚙️ 树设置` 打开）：

| 项 | 作用 |
|---|---|
| **跳转到位置** | **照 ne-rewritten 用「解析」而不是搜索**：先用记号的 `from_display` 把输入文本解析回表达式（**瞬间**，229 个 ne 记号里 197 个支持）→ 树上按表达式相等找 → 没有就作为新的根接进去。可另填 **FS 序号 n** 取它的第 n 个基本列项（同 ner 的 ExpandDialog）。只有记号没有 `from_display` 时才退回搜索（BFS 先浅后深，上限 `set search_ms=N`） |
| **显示方式** | 切换显示视图；或开关「把该记号的**所有等价显示**一并显示出来」（每个节点后面附上其它视图的文本，便于对照） |
| **样式（外观+键盘配套）** | 三档一起换外观与键位，见下面「树样式」一节 |
| **上下键跟随** | `不跟随` / `仅到边界才跟随` / `始终跟随`（把当前节点固定到 **中上 · 中间 · 顶部**） |

### 树样式（外观与键盘**配套**，在每棵树的 `⚙️ 树设置` 里切）

同一种树有三种画法，**外观与键位一起换**（不是两个独立开关），**默认 `mine`（本工具原本的样式）**：

| 档位 | 来源 | 外观 | 键盘（配套） |
|---|---|---|---|
| `mine` | 本工具原有 | 树线 `├─└─` + `[+]` / `[-]` / `[✎]`；注释显示在行尾，按 `n` 或点 `[✎]` 编辑 | 全套：方向键 / `j k h l` / `,` 回父 / `Enter` 展开一层 / `0-9` 选 FS 项 / `n` / `+` 加载更多 / `Esc` |
| `selfne` | **自助版 NE-4.8.1** | 卡片：左侧 5px 色条（极限 / 后继 / 展不动）+ `⟨` 折叠 + `➕` 展开（**展不动时禁用**）+ marginLeft 缩进；**行尾**常驻注释框 | 它树上只有鼠标（只有 `Esc` 与「展开到」框的 `Enter`）→ 除 `Esc` 外**不抢占** |
| `ner` | **ne-rewritten** | 无卡片；缩进树线 + `▾/▸` 折叠三角（无子节点时空占位）+ **点表达式本身展开**（没有独立展开按钮）；**行首**常驻注释框 | `↑↓` 移动 · `Enter` 单次展开 · `Shift+Enter` 一层展开 · `Ctrl+H` 折叠/展开子项 · `Esc`（没有 `j k h l` / `0-9` / `n` / `+-`，故不抢占） |

样式**按树存**（每棵树可以不一样），在树标题行右侧的 `⚙️ 树设置` 里选；`set style=ner` 会把**所有树**一起换。

`selfne` / `ner` 的注释框宽度用 `set note_width=N` 或设置弹窗调（80-500，默认 200）。

> 术语：**ner = ne-rewritten**（[在线站点](https://smilelee-lyx.github.io/ne-rewritten/)，我移植的
> `notation/ne/` 记号与 ne 引擎都来自它）；**自助版 NE-4.8.1** 是另一个参考版，
> `classic_*.js` 那 33 个用户记号与 `selfne` 样式取自它。两者不是一回事。

> 跳转搜索的边界：搜索本身是纯表达式的（不受树形影响），但**在树上重放**时可能
> 被兄弟节点的上界挡住 —— 那种情况会如实告诉你停在哪一步，而不是假装成功。

### 显示视图切换（多种显示形式的记号）

树标题行右侧有「显示为…」按钮组（该树的 `⚙️ 树设置` 里也有一份，外加"全部显示"开关）：

| 记号 | 可切换视图 |
|---|---|
| BMS (`bm4`) | simple、0-Y、OCF / OCF full / n.s. OCF / n.s. OCF full |
| 0-Y (`0y`) | BMS |
| LPMS / LPTSS | simple、0-Y |
| ω-Y / ω-Y magma / weak ω-Y / 12ωY / 1257ωY / Skew ωY | DBMS、DBMS'、ADBMS |
| BTBM / BTBM-weak / TBM / BHO φ (Veblen) | 纯文本（剥 HTML 标签） |

> BMS 的 OCF 视图：BOCF 表示范围小于 BMS，超出范围（>EBO，如 `(0)(1,1,1)(2,2,2)`、
> 4 行以上矩阵）的表达式显示为 **BMS 原样 + 红色的「（超出范围）」**。

### 键盘

| 按键 | 功能 |
|---|---|
| `Tab` | 命令/记号补全（下拉候选，`↑↓` 选择，`Tab`/`Enter`/点击填入） |
| `↑` `↓` / `j` `k` | 导航 |
| `→` / `l` | 展开 / 折叠 |
| `←` / `h` | 折叠 / 回父节点 |
| `,` / `Backspace` | 回父节点 |
| `0-9` | 选中父节点的第 n 个 FS 项 |
| `Enter` / `空格` | 展开当前节点 |
| `+` `=` | 加载更多（额外 FS 项） |
| `n` | 添加注释 |
| `Esc` | 回输入框（弹窗里为关闭弹窗） |

### 命令

命令可不带 `/`（`help` 与 `/help` 等价），命令词不区分大小写。

| 命令 | 功能 |
|---|---|
| `tree` | 生成展开树：`tree <记号名> <表达式>`（裸输入是它的缩写） |
| `draw` | 图案：`draw <Y序列> [DBMS\|DBMS'\|ADBMS]`（如 `draw 1,2,4,8`）；或 `draw <IBLP表达式>`（`(行)L` 结构自动识别，如 `draw (1,0)1(2,1,0)1`）。旧名 `mountain` 仍可用 |
| `list` | 按「类 / 子类」两级列出全部记号，点击展开/折叠；双击记号行直接建树 |
| `notation` | **弹出自定义记号编辑面板**（见上）。`notation list` 纯文本列出；`notation add/del/show` 单行快捷方式 |
| `convert` | 记号互译：`convert <源记号> <表达式> to <目标记号>`（如 `convert bm4 (0,0)(1,1,1) to 0y`） |
| `clear` | 清屏 |
| `save [csv\|xlsx] [n] [True\|False]` | 导出第 n 棵树（默认最后一棵）；`True` 连无注释的行一起导出，默认只导出有注释的 |
| `import [记号名]` | 导入 xlsx / csv 还原成一棵树（默认用最后一棵树的记号） |
| `set theme=dark` | 主题（dark/light/paper/solarizedlight/solarizeddark） |
| `set default=N` | 初始展开层数（默认 2） |
| `set additional=N` | 「加载更多」额外 FS 项数（默认 1；ne 引擎没有对应概念，ne 记号上会被忽略） |
| `set tier=N` | 展开层级 0-9（默认 0） |
| `set timeout=N` | 单次展开的毫秒上限（默认 **5000**；`0` = 不限制）。超时中止并提示，而不是把页面冻住 |
| `set search_ms=N` | 跳转**兜底搜索**的毫秒上限（默认 8000；只有记号没有 `from_display` 时才用到） |
| `set wrap=on\|off` | 长行是否换行（**默认 off**：不换行，超出部分横向滚动看得见）。树节点 / 等价显示 / 输出流统一走它 |
| `set font=N` | 整体字体大小 10-28（默认 16） |
| `set note_width=N` | 节点行尾注释框宽度 80-500（默认 200） |
| `help` | 显示帮助 |

## 记号来源

| 目录 | 内容 | 数量 |
|---|---|---|
| `notation/ne/` | ne-rewritten 原样搬运 + 本项目硬切改写 + **从参考版移植的用户记号** | 126 文件 / 229 记号 |
| `notation/legacy/` | 远古版（hypcos/notation-explorer，算法原样保留） | 52 文件 |
| `notation/rewritten/` | 早期 ne-rewritten 移植（走远古接口，`window.NEUTILS`） | 31 文件 |
| `notation/user/` | 用户自有（PrSS/PPS/SPS/DFSS/CNF） | 5 文件 |

`notation/ne/` 的三类：

- **ne 原生**：与 ne-rewritten 逐行对齐（`BM.js`、`LPMS.js`、`BHO φ`、`TON_*`、`DEN*`、
  `aSAN*`、MN 各系、SDBMS、UPMN、GMS …）
- **硬切改写**：ne 里没有对应物、由远古接口改写成 ne 风格（`PrSS/PPS/SPS/DFSS/CNF/PPS4系/
  MM/MM2/MM3/BSM2/BTM/EPM/BHhM/BDM/BHM2/BIM/UPS/X-Y/wmms/omegaY` …）
- **经典接口移植**（v2.5.1 新增，`classic_*.js`）：从参考版
  「自助版 NE-4.8.1」抠出工厂、由 `core/ne/classicNotation.js` 接到 ne 接口，共 **33 个**：
  HPrSS/LPrSS 系 7、祖先·基本列序列 8、虫/三角序列 3、SSS 系 5、差序列 2、
  L0-Y 矩阵 2、降下矩阵 2、sudden 矩阵 2、山脉系 2。

### 带 n 家族

每个家族静态注册常用档，**输入任意档位即按需生成**（上限 100）：

| 家族 | 起点 | 输入示例 |
|---|---|---|
| n-MN（`n-mn`） | 1 | `30MN` / `30-mn` |
| nBM-BHM（`n-bm-bhm`） | 1 | `40BM-BHM` / `40bmbhm` |
| (>n)-UPMS（`upms-partial-n`） | 2 | `(>50)-UPMS` / `upms8` |
| -1Y-nSS / T / BT / BT* / BT*' / wBT*-v3 / BTL | 1 或 2 | `-1y-30ss` / `btl--1y-40ss` |
| GMS n-P（GBMS / UPMS / LPMS2） | 2 | `GBMS 30-P` / `gbms30-p` |

实现：远古家族注册到 `window.NOTATION_FAMILIES`（`core/register.js#resolveFamilyInput`），
ne generator 家族由 `core/ne/familyInput.js` 按注册表当前档位逐档水合；
`ui/notationParser.js` 依次尝试两者。

### CNF（Cantor normal form）

输入示例：`CNF 2^(w^2+w*3+2)`、`cnf 2^{w+1}`、`cantor w^w`、`cnf e0`。

- 表达式用 `w` 表示 ω，支持 `+` `*` `^` 与括号；`{ }` 与 `( )` 等价；全角 `ω×·＋` 自动转换
- ε 数写作 `e`，**必须带下标**（单独 `e` 报错）：`e0`=ε₀、`e1`、`ew`/`e_w`=ε_ω、
  `ee0`=ε_{ε₀}、`e(w+1)`=ε_{ω+1}
- 隐式乘法：`ww`=ω·ω、`w2`=ω·2、`2w`=2·ω；`e` 后跟数字/`e`/`w`/`(`/`_` 是下标连接
- 优先级（高→低）：**隐式乘法 > 幂 `^` > 显式乘法 `*` > 加法 `+`**
- **不做序数算术化简**：非标准式子（如 `2^(w+1)`）原样保留
- 内部表达式为语法树；树内用 HTML 数学公式显示（`ε<sub>下标</sub>`、上标等）
- FS：`e0[n]` = n 层 ω 幂塔；`e_{a+1}[0]` = `e_a`，`e_{a+1}[n≥1]` = n 层塔、塔底 `e_a+1`；
  下标是极限时 `e_λ[n]` = `e_{λ[n]}`；`ζ` 规则见 `notation/ne/CNF.js` 注释

## 已知限制（非缺陷，勿重复排查）

- **展开有 5000ms 上限**（`set timeout=N` 可改，`0` = 不限制）：引擎内部的搜索循环与
  递归链都受它约束，跑不完就中止并提示，不会把页面冻住。**唯一穿透的情况**是记号自己的
  函数（如 `FS`）内部死循环 —— 同线程无法抢占，需要把展开放进 Worker 才能真正隔离。
- **自定义记号的 `FS` / `expand` 必须随 n 增长**：第 n 项恒定（例如 `FS: (e, i) => e - 1`）
  会让引擎一直试展开。这类记号现在会被上限中止，模板已换成参考版那份 PrSS 示例。
- **TON 家族 9 个 + `upms-partial-8/9`**：ne 引擎下会抛错（与 ne 原版逐字同错），
  已回落远古实现。判定脚本见下。
- **`t-omega-mn`（TωMN）对非标准山形死循环**、**BBM 的 display 无递归深度保护**、
  **TUPMS 对单列有限矩阵抛 TypeError**、**`upms-partial-8/9` 的试展开守卫** ——
  均已在 ne 原版复现，属上游行为。
- **FS 变体缓存以 display 字符串为键**：写回归测试时每个深度用例要新起进程。
- `convert` 的 BMS→BOCF 转换范围有限，超出范围会标注「（超出范围）」。
- 转换器**记号** `translator-bm-bocf` 暂时从清单摘掉（BMS→BOCF 仍可作为 `bm4` 的显示视图）；
  要恢复把 `core/notation-manifest.js` 里那一行注释放回即可。

## 结构

```
index.html              入口（React CDN → register 初始化 → 清单 → 加载器 → app.js）
core/
  register.js           远古全局 register + 别名/parse 补充表（NOTATION_META）
  engine.js             远古展开核心（FSbounded + expandNode）
  loader.js             清单驱动加载器（按 dependsOn 拓扑排序，动态注入 script）
  notation-manifest.js  记号文件清单（新增记号在此加一条，无需改 index.html）
  parseShorthands.js    矩阵/序列简写解析
  converters.js         记号互译 / 显示视图
  importer.js           xlsx/csv 导入还原
  ne/                   ne 架构运行时
    registry.js         记号/分类注册表（generator 家族、初始变体）
    tree.js expander.js ne 展开引擎（与 ne-rewritten expander.ts 同源）
    uiEngine.js         ne 记号在 UI 里走 ne 引擎（把 ne 树镜像成 UI 节点形状）
    uiBridge.js         把 ne 记号伪装成旧式对象（供旧引擎/输入解析兜底）
    userNotations.js    自定义记号注册/删除/持久化（/notation 的后端）
    classicNotation.js  经典 6 方法接口 → ne 定义（参考版移植用）
    notationDef.js fsVariants.js notationUtils.js familyInput.js errors.js i18n.js
    legacyAdapter.js drawMountainDiagram.js
notation/
  ne/                   记号正主（126 文件 / 229 记号，含 classic_*.js 移植批次）
  legacy/ rewritten/ user/   远古实现（?legacy=1 与 11 个回落的记号在用）
ui/
  app.js                主应用（状态、导航、键盘、命令）
  NotationEditor.js     自定义记号编辑弹窗（/notation）
  TreeSettings.js       单棵树的设置弹窗（跳转 / 显示方式 / 交互风格 / 滚动跟随）
  scrollFollow.js       滚动跟随的几何计算（纯函数，可单测）
  TreeNodeView.js       树渲染
  FolderView.js         /list 两级文件夹渲染
  notationList.js       类/子类归组、显示名、计数
  notationParser.js  commandParser.js  completion.js  exportUtils.js
  helpText.js  themes.js  MountainView.js
scripts/
  serve-nocache.mjs     本地静态服务器（禁缓存）
  verify-app-boot.mjs   ★ 应用启动：桩 React+DOM 跑一遍 App()（能抓「空白页」类回归）
  verify-expand-timeout.mjs  ★ 卡死防护：worker 里跑，超时强杀，能真正抓死循环
  verify-loader.mjs     loader 依赖排序与注入顺序
  verify-ne-integration.mjs  ne 注册表全量装载 + 冒烟
  verify-uibridge.mjs   适配层 + 全量冒烟（走 ne 引擎）
  list-notation.mjs     按清单加载并核对注册
docs/archive/           历史修复笔记归档
```

## 新增记号

**只想临时加一个**：用 `/notation` 面板或 `notation add`（见上），存 localStorage。

**想进仓库**：

1. 记号文件放入 `notation/ne/`（ne 接口）或 `notation/legacy|user/`（远古接口）；
2. `core/notation-manifest.js` 加一条 `{ file, category, ids?, dependsOn?, note?, module? }`
   —— ne 记号要写 `module: true`；跨文件依赖用 `dependsOn` 声明，加载器自动排序；
3. ne 记号自带 `category_id`，`/list` 自动归类；若是**新分类**，在
   `notation/ne/categories.js` 注册，并在 `ui/notationList.js` 的 `DISPLAY_GROUP`
   里映射到「类 / 子类」（忘了映射，自检脚本会报「有分类落到兜底子类」）；
4. 远古记号需要别名/parse 时补 `core/register.js` 的 `NOTATION_META`；
   需要显示名时补 `ui/notationList.js` 的 `SIMPLE_NAMES`。

从参考版（自助版 NE-4.8.1 / ne-rewritten）批量移植的管线：
`.tmp-ne/extract-factories2.mjs`（抠工厂）→ `.tmp-ne/gen-classic-ports.mjs`（生成文件），
落地后用 `.tmp-ne/verify-classic-parity.mjs` 与参考版逐项比对。

## 验证

```bash
node scripts/verify-app-boot.mjs         # ★ 应用能否启动：跑一遍 App()（桩 React+DOM）
node scripts/verify-expand-timeout.mjs   # ★ 展开不许卡死：模板各 tier + 坏记号被上限中止
node scripts/verify-loader.mjs          # 加载器：依赖排序 / 注入顺序 / 失败续载
node scripts/verify-ne-integration.mjs  # ne 注册表全量装载 + 冒烟
node scripts/verify-uibridge.mjs        # 适配层（默认 ne 引擎路径）
node scripts/verify-uibridge.mjs --legacy   # 同上，走远古实现
node scripts/list-notation.mjs          # 按清单加载并核对注册
```

> `verify-app-boot.mjs` 值得单独跑：它用桩 React + 桩 DOM 真的执行 `ui/app.js` 的模块体
> 并调用 `App()`，能抓到「文件都在、语法没错、控制台零报错，但页面就是空白」这类问题
> （挂载代码缺失就属于这一类，踩过一次）。

纯逻辑（无浏览器依赖）的扩展自检脚本在 `.tmp-ne/`：
`verify-notation-list.mjs`（/list 归组与计数，含家族文件夹）、`verify-folderview.mjs`（渲染递归）、
`verify-uiengine-all.mjs`（218 个记号逐个核对「镜像树 == ne 树」）、
`verify-target-search.mjs`（跳转搜索内核：路径 / 上限 / 无副作用）、
`verify-tree-ui.mjs`（树设置面板 + 滚动跟随策略）、
`verify-usernotations.mjs`（自定义记号端到端，含自注册式）、`verify-noteditor.mjs`（编辑面板，桩 React）、
`verify-settings-persist.mjs`（设置/主题持久化）、
`verify-classic-parity.mjs`（33 个移植记号 vs 参考版工厂）、
`compare-engines-tree.mjs`（两条引擎路径的树形差异）。

## 致谢与来源

- **记号算法与展开框架核心**来自 **Hyp cos 的 notation-explorer**
  （https://hypcos.github.io/notation-explorer/ ，github.com/hypcos/notation-explorer）。
  该仓库未声明 LICENSE，本项目仅作个人学习使用，特此标注致谢。
- **ne 记号体系**（`NotationDefinition` 接口、生成器家族、`notation/ne/` 里的移植记号）
  来自 **SmileLee-lyx/ne-rewritten**。
- **`classic_*.js` 里 33 个用户记号**（HPrSS/LPrSS 系、SSS 系、虫/三角序列、降下矩阵等）
  由参考版「**自助版 NE-4.8.1**」的 `__BUILTIN_FACTORIES` 原样抠出，
  作者是 googology 社区的各位；算法一字未改，只套了 `core/ne/classicNotation.js` 适配器。
- UI 层（React CLI 风格、键盘导航、主题、注释、CSV/xlsx 导出、记号编辑面板）为本项目重写。
