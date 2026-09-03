# 更新日志

从 v2.2.2 开始记录。

## v2.4.2（2026-09-03）

### 新增：分析导入（`import`）+ xlsx 导出

- **`import`**：从 `.xlsx` / `.csv` 还原成一棵树（重建后放进输出流）。
  - `import` 用**最后一棵树的记号**解析；`import <记号名>`（如 `import bm4`）用指定记号。
  - 仅支持「能解析回表达式」的记号（`register.js` 里配了 `parse` 的序列类 PS / 矩阵类 PM，
    以及记号自带 `parse` 的如 PrSS）；其余（OCF/DEN/TON/MN/aSAN 等只支持 limit 建树）
    报「该记号暂不支持导入」，并把无法解析的表达式逐行列出，不静默丢数据。
  - CSV 按现有 `save`(csv) 的输出互读；`Limit` 行（极限根）作为已知边界报「不支持」。
- **`save` 格式参数**：`save xlsx [n]` / `save csv [n]`（默认 csv），与 import 对称。
  - 新增**注释过滤参数**：`save ... True` 连无注释的行一起导出；默认 `False` 只导出有注释的行。
  - xlsx 读写库（`read-excel-file` / `write-excel-file`）按需从 esm.sh 动态加载，保持零构建；
    加载失败（离线）时提示需要联网。
- 实现：`core/importer.js`（读取 + 解析 + 重建树）；`ui/exportUtils.js` 增 `downloadTreeAsXLSX`；
  `ui/commandParser.js` / `ui/app.js` 接线 `import`；帮助文本与 README 同步。

## v2.4.1（2026-09-02）

### 新增：带 n 家族记号移植（ne-rewritten generator 家族，+83 记号 → 共 168）

移植 5 组「带 n 可调」记号家族到 `notation/rewritten/`（算法逐行移植自
ne-rewritten，全部依赖 `shared.js` 的 `window.NEUTILS`）：

| 家族 | 文件 | 注册 id |
|---|---|---|
| n-MN（non triangular nMN） | `n-MN.js` | `1-mn`..`8-mn`（n=1..） |
| nBM-BHM（BMS(n rows)+BHM） | `nBM-BHM.js` | `1-bm-bhm`..`8-bm-bhm` |
| (>n)-UPMS（partial UPMS） | `partial-UPMS.js` | `upms-partial-2`..`9`（官方 n≥2） |
| -1Y-nSS 主系列（M/T/BT） | `minus1Y-nSS.js` / `t-minus1Y-nSS.js` / `bt-minus1Y-nSS.js` | `-1y-1ss`..`6ss` 等 |
| -1Y-nSS star 系列（BT*/v2/v3/BTL） | `btstar-minus1Y-nSS.js` / `-v2` / `-v3` / `btl-minus1Y-nSS.js` | `bt*--1y-2ss`..（v2 带尾撇、v3 带 `-v3`、BTL 用 `btl-` 前缀） |
| GMS（General Matrix System） | `GMS.js` | `BMS-2026…-{GBMS\|UPMS\|LPMS2}-{omega-P\|pQSS\|QSS\|Full\|Weirdly Full}` 15 个 + `-n-{2\|3}-P` 6 个 |

**n 按需生成机制（支持到 100）**：
- 家族文件把工厂注册到 `window.NOTATION_FAMILIES`（`family/label/start/max/match/idFor/ensure`）；
  静态只预注册常用小档（如 n-MN 1..8），输入任意档（如 `30MN`）由
  `core/register.js` 的 `resolveFamilyInput` 命中后**现场实例化并注册**（幂等）。
- 输入解析（`ui/notationParser.js`）家族优先，避免 `-1y` 吃掉 `-1y-30ss` 前缀。
- **n 上限 100**：超过报「不支持超过 100」（如 `101MN`）；低于家族起点报「从 X 开始」
  （UPMS/GMS n-P 从 2 起）。

**基础设施**：`shared.js`(NEUTILS) 补 `bind1`/`bind3`、`BM_compare`/`BM_is_limit`/
`BM_infinity_FS`/`BM_expand`，并导出漏掉的 `BM_parents`。

**接线**：`core/notation-manifest.js` 新增 10 个文件条目（82 条目）；
`ui/notationList.js` 新增 GMS 分类与家族显示名；README / DESIGN 同步。

### 指令与交互迭代

- **任何输入都是指令**：新增 `tree`（生成展开树；裸输入 `PrSS 0,1,2` 是它的缩写）、
  `draw`（绘制图案：Y 序列山脉图 + **IBLP/DEN2 点线图**，`(行)L` 结构自动识别；
  IBLP 画法移植自 ne-rewritten `DEN2.ts`，根条目红点、`*` 标记实心、灰字步长）；
  旧名 `mountain` 保留为别名。
- 图案/树输出块可**折叠成一行**（`▾/▸`）；图案可**放大缩小**（`－ 100% ＋`，
  0.5x–8x）；`draw` 图案去内滚动条、完整显示。
- ⚙️ 设置新增 **font_size**（10–28，默认 16）：根容器 `transform: scale` + 尺寸补偿，
  放大无白边、缩小无页面滚动条，始终适配窗口。
- `/list` 中带 n 家族收成**子文件夹**：显示前 3 档 + 省略号（更多档位直接输入即生成）；
  「已注册 N 个记号」每个家族按 1 个计；**双击记号行直接按示例建树**。
- 本条目为 v2.4.0 后的累计开发，随 v2.4.1 发布。

### 验证
- `node scripts/list-notation.mjs`：82/82 条目加载成功，共注册 168 个记号。
- `node scripts/verify-loader.mjs`：71 断言通过；`node scripts/test-convert.mjs`：12 通过。
- 各家族子代理自测：n-MN 220 断言、nBM-BHM/partial-UPMS 732、nSS 主系列 346、
  v3/BTL 212、GMS 693，全部 0 失败；家族动态 n 行为测试 27 项断言通过。

## v2.4.0（2026-09-01）

### 项目整理（深度：目录规范 + 清单驱动加载）

**目录与命名**
- `notation/` 按来源分三子目录：`legacy/`（远古版 52 个文件）、`rewritten/`
  （ne-rewritten 移植 19 个，含 shared.js）、`user/`（用户自有 5 个）。
- 重命名含特殊字符/大小写不一致的文件：
  `Tomega^omegaMN.js` → `Tomega-pow-omegaMN.js`、`aSAN~3+.js` → `aSAN-3plus.js`、
  `cnf.js` → `CNF.js`（id 与别名均不变）。
- 删除死文件：`tri-BM.js`（v2.2.2 已移除 tri-bm4 记号但漏删文件）、
  `Aomega2MN.js`（初版，已被 Aomega2MN2 取代，index.html 从未加载）。

**清单驱动加载（取代 index.html 手写 script 列表）**
- 新增 `core/notation-manifest.js`：全部 70 个记号文件的清单
  （`{ file, category, ids, dependsOn, note }`），附跨文件依赖表。
- 新增 `core/loader.js`：按 `dependsOn` 拓扑排序，同步链式注入记号 script，
  全部完成后注入 `ui/app.js`；单个文件加载失败记录后继续，不中断整页。
- `index.html` 瘦身：78 个 `<script>` → 3 个（register 初始化 + manifest + loader）。

**调试与验证**
- 根目录 `_list_v2.mjs`（已损坏：引用已更名的 `_shared.js`）升级为
  `scripts/list-notation.mjs`：读 manifest、用 `vm.runInThisContext` 模拟浏览器
  顶层 `<script>` 语义（legacy 全局依赖链可正确复现）、核对清单 ids 与实际注册。
- 新增 `scripts/verify-loader.mjs`：mock-DOM 回归测试（依赖排序、失败续载、
  app.js 注入），57 项断言。
- `docs/` 4 篇一次性修复笔记归档到 `docs/archive/`。

**文档**
- README / DESIGN.md 结构图更新为实际目录；新增记号流程改为 manifest 方式；
  DESIGN.md 新增 §4.1 清单驱动加载与跨文件依赖表。

### 验证结果
- `node scripts/list-notation.mjs`：70/70 条目加载成功，共注册 81 个记号，
  清单 ids 与实际注册完全一致。
- `node scripts/verify-loader.mjs`：57/57 断言通过。
- ES Module import 图（ui/ + core/）15 条边全部解析成功。
- 静态服务器 10/10 关键文件可达；页面渲染需在真实浏览器确认
  （本环境进程沙箱阻止 Edge 无头启动）。

### 新增：记号互译（convert）与树显示视图切换

**树标题「显示视图」按钮组**（用户需求，仿 ne-rewritten 呈现）：
- 在 `--- 树 #N (记号名) ---` 标题行右侧渲染一组**独立按钮**
  `显示为X`（原生视图 + 附加视图各一个），点击直接切换，当前视图高亮禁用。
- 同一棵展开树仅换文本渲染（`TreeNodeView` 新增 `displayFn` prop），
  展开/折叠逻辑不变。
- 视图来源（`NOTATION_META` 补充表声明，算法文件只读）：
  - `converters` → 目标记号视图（如 bm4 的 0-Y、0y 的 BMS）
  - `views` → 同记号显示变体，`kind` 由 `core/converters.js` 解释：
    `bm-simple`（BMS 简单式）、`bm-0y`（BMS→0-Y 序列）、
    `strip-html`（剥 HTML 标签 → 纯文本，`<sup>`→`^` 等）

首批接入的记号与视图：

| 记号 | 视图 |
|---|---|
| bm4 | BMS（原生）/ simple / 0-Y |
| 0y | 0-Y（原生）/ BMS |
| lpms / lptss | 矩阵（原生）/ simple / 0-Y |
| btbm / btbm-weak / tbm / veblen-phi | HTML（原生）/ 纯文本 |
| omega-y / omega-y-weak / actual / medium / strong | 序列（原生）/ DBMS / DBMS' / ADBMS |

**ω-Y 的 DBMS 系列显示**（用户提供 ne-rewritten-master.zip 后移植）：
- 新增 `core/omegaYdbms.js`：移植 ne-rewritten `src/notations/Y/Omega_Y.ts`
  的 `to_dbms_display`（含 from_sequence / draw_mountain / draw_dbms_mountain，
  去 TS 类型，算法逐行保留）。
- `converters.js` 新增 view kind `oy-dbms`（views 条目带 `type`）；
  ω-Y 及 4 个 magma 变体注册 DBMS / DBMS' / ADBMS 视图。
  例：`1,2,4,8` → DBMS `(0)(1,0)(2,1,0)(3,2,1,0)`。
- `TreeNodeView` 的 `nodeLabel` 对视图 display 统一容错（非法表达式回退 String）。

### 新增：ne-rewritten 记号移植（weak ω-Y 与 limit variants）

- 新增 `notation/rewritten/omegaY-variants.js`：移植 ne-rewritten
  `src/notations/Y/weak-omega-Y.ts` 与 `variants.ts`，注册 4 个新记号：
  `weak-omega-y`（Weak ω-Y）、`omega-y-12omega`（ω-Y (1,2,ω)）、
  `omega-y-1257omega`（ω-Y (1,2,5,7,ω)）、`omega-y-skew`（Skew ω-Y）。
- 表达式 = Y 序列（number[]），依赖 shared.js 的 `Y_FS_variants`/`deepcopy`，
  magma 展开 `expand_weak_magma` 算法逐行保留。
- `manifest` / `NOTATION_META` / `/list` 分类（Y 序列）全部接线。

### 新增：BMS → BOCF 互译显示（ne-rewritten BM-BOCF）

- 新增 `core/bmBocf.js`：移植 ne-rewritten `src/notations/translators/BM-BOCF.ts`
  （solarzone 算法：OCF 算术 + BMS 矩阵 → ψ 折叠函数），输出 OCNDisplayIR
  （与本地 shared.js `display_OCN_IR` 兼容）。
- `bm4` 新增 4 个视图：OCF / OCF full / n.s. OCF / n.s. OCF full；
  EBO 极限矩阵特判显示 `EBO`。
  例：`(0,0)(1,1,1)(2,1)(1,1,1)` → `ψ(ω<sup>Ω<sub>ω</sub>·2</sup>)`。

### 新增：ω-Y 山脉图

- 新增 `core/mountainDiagram.js`：移植 ne-rewritten
  `src/notations/Y/Omega_Y.ts`（compute_y_mountain_diagram）与
  `src/notations/draw_mountain_util.ts`（draw_mountain_diagram），
  产出通用 Diagram（line/text + extra_text），纯数据层无 DOM。
- 新增 `ui/MountainView.js`：移植 ne-rewritten `DiagramViewer.vue`
  （Canvas 2D 画元素 + HTML span 叠文本，支持 ω<sup> 行标），主题色适配。
- ⚠ 2026-09-01 用户要求**暂时移除 UI 接入**（山脉图不与显示视图按钮并列）：
  `register.js` 的 OY_VIEWS 去掉山脉图条目、`converters.js` 移除 mountain kind、
  `app.js` 移除渲染；`core/mountainDiagram.js` 与 `ui/MountainView.js`
  代码保留（头部标注「暂未启用」，启用步骤见文件注释）。

### 修复：BMS→OCF 超出范围误显示为 0

- BOCF 表示范围小于 BMS：4 行以上矩阵（如 `(0)(1,1,1,1)(2,1,1,1)`）
  此前转换结果为 `0`。
- `core/bmBocf.js` 的 `bm_to_ocf_IR` 增加超范围检测（转换抛错 / 非零矩阵
  得 0）→ 返回 `null`；`converters.js` 的 `bm-ocf` 显示层把 null 渲染为
  **BMS 原样 +「（超出范围）」**（如 `(0)(1,1,1,1)(2,1,1,1)（超出范围）`）。

### 修复：超 EBO 的矩阵也判为超范围

- BOCF 表示范围只到 EBO（`(0)(1,1,1)(2,1,1)(3,1)(2)`）；此前 `(0)(1,1,1)(2,2,2)`
  等超过 EBO 的矩阵虽不显示 0，但仍"成功"转换出错误结果。
- `bm_to_ocf_IR` 增加 EBO 上界比较（移植 ne-rewritten `BM.ts` 的 `compare`：
  逐列 normalize 后字典序）：`矩阵 > LIMIT` → 返回 `null` → 显示
  **BMS 原样 +「（超出范围）」**；`= LIMIT` 仍显示 `EBO`。

### 界面：超范围标红 + 主题按钮移入设置

- 超范围标注改为**主题色高亮**：`converters.js` 输出
  `<span class="dsh-warn">（超出范围）</span>`，`app.js` 按当前主题注入
  `.dsh-warn{color:theme.error}`（红色，随主题切换）。
- 顶栏的 5 个**主题切换按钮移入 ⚙️ 设置弹窗**（「主题」下拉，作用于全局主题；
  `/set theme=...` 命令保留）；顶栏只留「+N · tier」指示与 ⚙️ 设置按钮。
- 树的显示视图保持标题行「显示为X」按钮组（用户确认不移入设置）。

### 新增：记号互译（convert）

- 新增 `core/converters.js`：互译注册表与统一入口（`convert` / `findConverter` /
  `listConverterTargets`），转换器声明在 `NOTATION_META[id].converters`，
  记号算法文件保持只读（符合 DESIGN.md §5.3 约定）。
- **BMS ↔ 0-Y 互译**（用户需求）：`bm4` 与 `0y` 相互注册转换器。
  原理：0-Y 记号内部表达式就是 BMS 矩阵（`0-Y.js` 的 parse 把序列解析成矩阵、
  display 把矩阵显示成 0-Y 序列，来自 ne-rewritten 移植），因此互译是表达式
  同构直传，结果由目标记号的 display 呈现为对应语法。
- 新命令 `/convert <源记号> <表达式> to <目标记号>`（可省略 `/`），
  例：`convert bm4 (0,0)(1,1,1) to 0y` → `1,4,6,4`；
  `convert 0y 1,4,6,4 to bm4` → `()(1,1,1)(2,1)(1,1,1)`。
- `ui/helpText.js` / README 命令表补充 convert 用法。

### 验证
- 新增 `scripts/test-convert.mjs`：注册表、双向转换、往返一致性、非法目标，
  12 项断言全部通过。
- 语法检查：`ui/app.js`、`ui/commandParser.js`、`ui/helpText.js` 全部通过；
  `parseCommand` 的 convert 分支 5 组用例通过。

> 说明：ne-rewritten 网站（https://smilelee-lyx.github.io/ne-rewritten/）
> 在本环境无法直接访问（沙箱出站 TLS 被拦），互译实现基于本地移植源码
> （`shared.js` 的 `BM_convert_to_0Y` / `BM_compute_0Y_mountain`）推断其机制；
> 如需复刻其页面级展示（目标下拉、并排显示等）可后续按 DESIGN.md §5.3 扩展。

## v2.3.0（2026-08-12）

### 新增：12 个记号全部移植完成
从 ne-rewritten 移植 12 个记号并接线、验证通过。

**新建文件：**

| 文件 | 记号 id |
| --- | --- |
| notation/PPS4.js | pps4 / wpps4 / ewpps4 / spps4 / tpps4 |
| notation/finite-Mahlo-OCF.js | finite-mahlo-ocf |
| notation/omega-MN.js | omega-mn |
| notation/SMN.js | sa-omega2-mn / s-omega2-mn / s-omega-pow-omega-mn |
| notation/LPMS.js | lpms / lptss |

**接线：**
- `index.html`：在 `shared.js` 之后追加 5 个新 `<script>` 标签。
- `core/register.js`：新增 `NOTATION_META` 条目（12 个 id）。
- `ui/notationList.js`：为全部 12 个记号加入分类与 `SIMPLE_NAMES`（缩写显示名）。

**验证结果（Edge 无头模式 + harness 页面）：**
- 12 个记号全部能正常注册，`display` / `compare` / `FS` / `FSalter` / `init` / `parse` 均不报错。
- `SA_omega2_MN.extend` 与 `A_Omega2_MN.test.ts` 里的两个参考用例结果完全一致。
- 所有带 `parse` 的记号，解析往返（`display → parse → display`）全部通过。
- 重读全部源文件（`LPMS.ts`、`PPS.ts`、`Omega_MN.ts`、3 个 SMN、`finite_Mahlo_OCF.ts`），确认移植版本与源码逐行一致。
- 通过 HTTP 服务器完整启动应用，`/list` 把 12 个记号正确归入各自分类。

> 移植约定：与 ne-rewritten 不同，本项目里 `FS` 与 `FSalter` 是互换的（项目的 `FS` 是「较短的」展开形式），与之前的移植（如 0-Y.js 等）保持一致，所有文件均正确使用 `variants.FS` / `variants.FSalter`。

### 修复
- PPS4 系列：补齐 `semiable` 声明，修复以 0 结尾的后继式（如 `0,1,0,3,0`）无法展开的问题。此前仅声明 `able: is_limit`（末项 > 0），非极限表达式被引擎判定为不可展开。

### 界面
- 新增自制 favicon（`favicon.svg`，深蓝渐变底 + 斜体 ω），`index.html` 接入 `<link rel="icon">`，消除 favicon.ico 404。

## v2.2.2（2026-08-11）

### 记号列表
- SPS：名称去掉「已降链」后缀，改为在 `/list` 行尾以「已无穷降链」醒目标记（与其它非终止记号一致）。
- LMN / LON / HSPN：移入「OCF 序数折叠函数」分类。
- CNF：从 `/list` 隐藏，但输入 `cnf` 仍可正常建树。
- 移除 1Y-BMS（tri-bm4）记号：`index.html`、注册表、列表分类与显示名一并清理。

### 缩写规则
- omega 不再被缩写成 O：大写缩写时 `OMEGA` 统一还原为 `ω`（如 `TDω^ωMN`），不再出现 `TD-OMEGA`、`MOMN` 之类。
- 所有 omega 记号支持 w 缩写输入别名：`mwmn`、`mtwmn`、`dw2mn`、`fw2mn`、`tdw^wmn` 等（同时移除含 O 的旧别名）。
- weak 支持缩写为 w：`btbm-weak` 新增 `wbtbms` / `wbtb` 别名，显示名改为 `wBTBMS`。
- `/list` 中 w 缩写与 ω 主名显示为同一串时自动去重。

### CNF 记号
- Limit 从 ω^ω 改为 ε₀：`init` 根节点改为 `['e', 0]`，基本列按标准 ω 幂塔展开（ω、ω^ω、ω^(ω^ω)…）。

## v2.2.2（GitHub Pages 修复，补丁）

### 修复 GitHub Pages 部署报错
- 根因：GitHub Pages 默认用 Jekyll 构建，会忽略**下划线开头**的文件，导致 `notation/_shared.js` 线上 404，依赖它的 0-Y、TBM、DSM、Veblen、BOCF/MOCF/NOCF/Inacc-OCF、BTBM、BTBM-weak、minus1-Y、T-minus1-Y、UPS1-1r5 等记号全部报 `U is undefined`。
- 修复：`notation/_shared.js` 改名 `notation/shared.js`（去掉下划线），`index.html` 引用同步更新；仓库根目录新增空 `.nojekyll` 文件，让 Pages 跳过 Jekyll 直接发布文件。
