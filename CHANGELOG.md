# 更新日志

从 v2.2.2 开始记录。

## v2.5.2（2026-10）

这一版把记号体系整体切到 **ne 架构**，并补上自定义记号。

### 记号引擎：默认走 ne，远古实现退为兜底

- `notation/ne/` 里的 **229 个记号**成为正主；`UI` 默认用 **ne 引擎**
  （`core/ne/tree.js` + `expander.js`，与 ne-rewritten 的 `expander.ts` 同源）展开，
  树形与 ne-rewritten 一致。URL 加 `?legacy=1` 可退回纯远古实现对照。
- 新增 `core/ne/uiEngine.js`：把 ne 树**镜像**成 UI 认识的节点形状（每个 UI 节点挂
  `_neNode`），展开后按身份复用旧节点，`_uid/_collapsed/note` 不丢 ——
  **渲染代码一行未改**，只改了 5 处接缝。
- **为什么必须换**：旧引擎需要手写 `low`，而 ne 的边界来自树位置，只能猜一个下界；
  实测树形会不一致（`prss` 3 节点 vs 2、`rcss` 10 vs **59**、`mountain` 5 vs **17**）。
- 只有 **11 个记号**回落远古：TON 家族 9 个 + `upms-partial-8/9`（它们在 ne 引擎里
  本身就会抛错）。此前为旧引擎的下界问题被排除的 30 个记号里，其余 19 个全部恢复。
- 适配层 `uiBridge` 的下界探测补严（拿**基本列项**而不是 init 种子验；∞ 占位式种子
  按引擎的 `isInfinityExpr` 特例处理），并给 `semiable` 加「必须有真前驱」的闸 ——
  后者修掉一整类「展开链无限递归 → 爆栈」。

### 新增：每棵树的「树设置」（`⚙️ 树设置`）+ 家族文件夹

- **每棵树的独立设置**（只作用于那一棵，入口是树标题行右侧 `⚙️ 树设置`）：
  - **跳转到位置**：输入目标显示文本（如 `1,2,3`），先在已有树里找，找不到就从各根沿基本列
    **搜索展开**（`core/ne/targetSearch.js`，带步数/毫秒/深度三重上限），命中后把路径在真树上
    重放并滚动定位。重放被兄弟节点上界挡住时**如实报告**停在哪一步，不假装成功。
  - **显示方式**：切换显示视图；新增「把该记号的**所有等价显示**一并显示出来」（每个节点后面
    附上其它视图文本）。
  - **交互风格**：`更像本工具`（全套快捷键）/ `更像参考版（ner）`（只留方向键 + `Enter` +
    `Backspace` + `Esc`，字母键与数字键都不抢占）。
  - **上下键跟随**：`不跟随` / `仅到边界才跟随` / `始终跟随`（固定到中上 · 中间 · 顶部）
    —— 此前只有硬编码的「刚好可见」，节点跑出视野就看不见了。
- **`/list`：家族成为独立文件夹**：每个带 n 家族包成一个 `🧬 …家族` 文件夹（虚线框 + 底色 +
  「家族」徽章，与普通子类一眼可分），点开才是各档位；计数口径不变（家族算一个，
  `FolderView` 对家族文件夹记 1 而不是对成员求和）。短名撞车时（GMS 的 GBMS/UPMS/LPMS2
  都叫 `n-P`）自动改用完整名。
- **修**：help 里「树标题行右侧『显示为…』**或 ⚙️ 设置里切换**」—— 后半句不实（设置弹窗里
  从来没有视图切换）。现在视图切换确实进了该树的 `⚙️ 树设置`，描述与实现一致。

### 设置现在也会记住（与自定义记号行为一致）

- **修**：自定义记号存了 localStorage，设置却每次恢复默认。现在主题与设置一起持久化
  （`dsh.settings` / `dsh.theme`），刷新后保持上次状态。
- 读取时**逐项校验**（整数 + 上下限），任何一项不合法就用默认值，未知键丢掉；
  主题走白名单；`localStorage` 不可用时静默降级为只在内存里。
- 新增 `.tmp-ne/verify-settings-persist.mjs`（默认值 / 往返 / 坏存档 / 越界与未知键 /
  主题白名单 / 清除 / 无 localStorage 降级），并在启动测试里断言设置确实落盘。

### 修：假的 `[+]`；节点改成参考版的卡片样式

- **修**：`(0)(0)` 这类**点 `[+]` 点不动**的节点，`[+]` 该隐藏却没隐藏。
  根因：显示判据用的是旧引擎的 `canExpandNode`（看 `able`/`semiable`），
  既不看 ne 的 `is_limit`/FS 语义，也**不看树位置带来的上界**；而展开走的是 ne 引擎，
  两者必然对不上。新增 `can_expand_ne()`（与 `expand_single` 同构、含 bound），
  `TreeNodeView` 按记号类型分派判据。
  实测：1140 个节点上新判据 **0 处**不一致，旧判据有 **16 处**「说能、实际不能」。
  新增 `.tmp-ne/verify-plus-button.mjs` 做全量一致性扫描。
- **树样式做成三选一**（`set tree_style=…` 或设置弹窗；**默认 `classic`**，即本工具原本的样式）：
  | 值 | 来源 | 长相 |
  |---|---|---|
  | `classic` | 本工具原有 | 树线 `├─└─` + `[+]`/`[-]`/`[✎]`，注释在行尾、按 `n` 编辑 |
  | `selfne` | 自助版 NE-4.8.1 | 卡片 + 左侧 5px 色条（极限/后继/展不动）+ `⟨`/`➕`（展不动时禁用）+ marginLeft 缩进，**行尾**常驻注释框 |
  | `ner` | ne-rewritten | 无卡片；缩进树线 + `▾/▸` 折叠三角 + 点表达式展开（无独立展开按钮），**行首**常驻注释框 |
- **树样式与交互风格合并成一套「样式」三档**（用户要求两者配套、且都放树设置里）：选一档就**同时**决定外观与键位，不再有两个独立开关；配置从全局 `settings.treeStyle` 移到**按树存**的 `item.treeCfg.style`（每棵树可以不同），`set style=ner` 则把所有树一起换。
  | 值 | 参照 | 键位 |
  |---|---|---|
  | `mine` | 本工具 | 全套：方向键 / `j k h l` / `,` / `Enter` / `0-9` / `n` / `+` / `Esc` |
  | `selfne` | 自助版 NE-4.8.1 | 它树上基本只有鼠标 → 除 `Esc` 外一律不抢占 |
  | `ner` | ne-rewritten | `↑↓` 移动 · `Enter` 单次展开 · `Shift+Enter` 一层展开 · `Ctrl+H` 折叠/展开子项 · `Esc`（它没有 `j k h l` / `0-9` / `n` / `+/-`，故不抢占） |
- 去掉「更像参考版（ner）」这个把两个参考混称的按钮文案（改成「自助版（点击为主）」与「ne-rewritten（行内键位）」）。
- 新增 `note_width` 设置（80-500，默认 200）+ `set note_width=N`（自助版/ner 两种样式的注释框宽度）。
- **术语纠正**：**ner = ne-rewritten**（smilelee-lyx.github.io/ne-rewritten，我移植的 `notation/ne/` 与
  ne 引擎来自它）；**自助版 NE-4.8.1** 是另一个参考版（`classic_*.js` 那 33 个记号与 `selfne`
  样式取自它）。此前把两者混着叫「参考版（ner）」的地方已改准。

- **修**：新建记号的模板会**卡死页面**。原因是模板里 `FS: (e, i) => e - 1` 的结果
  **不随 i 变化**，第一次展开后节点有了子节点，`generate_fs` 里那个
  「试展开次数过多」守卫（只在无子节点时生效）被绕过 → `while` 永远拒绝同一个值。
  模板已换成**参考版（自助版 NE-4.8.1）新建记号用的那份 PrSS 示例**（逐字保留六个方法）。
- **新增 `time_limit`**：单次展开的毫秒上限，默认 **5000**，`set timeout=N` 或设置弹窗
  （±500 步进）可改，`0` = 不限制。超时抛 `TimeLimitError` 并给专用提示
  （说明树里可能已留下这次的部分展开），不再冻住页面。
  - ne 引擎：期限做在引擎内部（`generate_fs` 的搜索循环 + `expand_tier_impl` 递归链）。
  - 旧引擎：`core/engine.js` 文件头写着严禁修改，所以走 `core/ne/timeGuard.js` 的
    **记号包装** —— 引擎每步都要调 `able/semiable/compare/FS`，包装器每次查时钟即可兜住。
  - 穿透范围写明：记号自己的函数内部若死循环（同线程无法抢占），需要 Worker 隔离。
- **修**：`evaluate` 两条路都试（表达式 → `const Notation = {...}` 声明式）。
  参考版工厂的真实形态是 `function(){ var Notation = {…}; return Notation; }`，
  按文本猜会误判成声明式 → `Function statements require a function name`。
- 新增 `scripts/verify-expand-timeout.mjs`：worker 里跑（能超时强杀），验模板各 tier 正常、
  坏记号被上限中止，并留「关掉上限确实会卡死 / 旧引擎不包装会爆栈」的对照。

### 自定义记号（`/notation`）

- **修**：导入 ne-rewritten 那种**自注册式**记号（例如从那边下载的 CTN2）会报
  「求值结果不是记号对象」。它们形如
  `(() => { … const notation = {…}; if (typeof register_notation === 'function') register_notation(notation); })();`
  —— **没有返回值**，靠调用 `register_notation` 注册（在 ne-rewritten 里那是全局函数）。
  现在求值时注入一个「只捕获、不真注册」的 shim 接住定义，注册仍走正常流程
  （分类强制 `category-user`、持久化、UI 桥接一处不少）。实测 CTN2 导入后
  输入 `CTN2 2` / `CTN2` 均可建树并展开。
- 导入时的 **id 兜底顺序**：源码里的 `id` → **文件名**（`CTN2.ne-rewritten.js` → `CTN2`）→
  自动分配 `user1`…；显示名同样兜底。
- 求值前去掉源码末尾分号（`(() => {…})();` 直接包进 `return ( … )` 会语法错误，
  而那样 IIFE 不执行、也就捕获不到自注册定义）。
- 新增「自注册式」常驻回归用例（`verify-usernotations.mjs`）。

- 输入 `notation` **弹出编辑面板**（设置弹窗里也有入口「打开自定义记号…」）：左列已有记号
  （点选载入源码）、右侧 id / 显示名 / 短名 + 多行编辑器，保存 / 删除 / 关闭。
  存 localStorage，刷新自动重载。
- **「导入 .js」**：读入一份记号 JS 填进编辑器（不直接注册）。支持裸对象/工厂、
  `export default <expr>`、`export const X = <expr>` 三种外壳，并尽量自动识别 id / 显示名；
  带 `import` 的模块文件给出明确错误（浏览器里没有依赖可解析）。
- **id 可留空**：JS 里没写就自动分配 `user1`、`user2`…，显示名回落到 id ——
  「新建 → 保存」这条最短路径不再被必填项挡住。
- 新建态的「＋ 新建记号」按钮会高亮（此前点了看不出当前处于哪个状态）。
- 接口与 ne 相同，两种都认：ne 定义 `{display, is_limit, compare, FS, init}`、
  经典 6 方法 `{parse, format, isSuccessor, generateLimit, expand, compare}`
  （后者是参考版「自助版 NE-4.8.1」的接口，可整段贴工厂）。
- 自定义记号进 `/list` 的「**自定义记号**」文件夹；展开走 ne 引擎，与 ne-rewritten 一致。
- 另有单行快捷方式 `notation add <JS>`、`notation list` / `del` / `show`。
- 顺带修：输入名索引改为惰性重建并订阅注册表变更（否则运行期注册的记号匹配不到名字）；
  全局快捷键不再抢弹窗里表单的按键。

### `/list`：改成参考版的两级分类 + 「家族算一个」

- 从「手写 9 组约 150 个 id」改为 **类 / 子类** 两级（序列类 / 矩阵类 / 山脉类 /
  函数类 / 转换器），归属由记号的 `category_id` 经 `DISPLAY_GROUP` 换算；
  实测「分类众数 + 7 条例外」即可完全复现参考版的分配。
- 计数口径按要求改为**家族算一个**（带 n 的家族列全部档位，但只计 1）。
- `FolderView` 支持任意层嵌套，文件夹计数改为递归。
- 顺手修掉：`notation/ne/Aw2MN3.js` 文件在、manifest 里没有（浏览器从不加载）；
  两个分类的 `name` 是未解析的 i18n 键对象（会让 React 抛错）；
  显示名优先级（ne 的 `simple_name` 直查注册表，不再被旧 meta 挡住）。

### 移植：从参考版「自助版 NE-4.8.1」搬来 33 个用户记号

- HPrSS/LPrSS 系 7、祖先·基本列序列 8、虫/三角序列 3、SSS 系 5、差序列 2、
  L0-Y 矩阵 2、降下矩阵 2、sudden 矩阵 2、山脉系 2。
- 新增 `core/ne/classicNotation.js` 适配器（处理两处语义差异：基本列下标基数
  参考版从 1 起 / ne 从 0 起；后继式参考版返回 null、适配器返回自身）。
- 每个记号都与参考版工厂**逐项比对**（`verify-classic-parity.mjs`：33/33 一致）。

### 移除

- 转换器**记号** `translator-bm-bocf` 暂时从清单摘掉（文件保留）。BMS→BOCF 能力没丢 ——
  它是 `bm4` 的一个显示视图。恢复 = 放回 manifest 里那一行注释。

### 文档

- README / DESIGN / help 全面重写；版本号 v2.4.3 → **v2.5.2**。

### 验证

`verify-loader` 71/71 · `verify-ne-integration` 224/230（6 个文档例外）·
`verify-uibridge` 17/17（默认冒烟 219/219、`--legacy` 217/217）·
`verify-uiengine-all` 218 个记号镜像逐项一致 · `verify-classic-parity` 33/33 ·
`verify-usernotations` / `verify-noteditor` 0 失败 · `/list` 自检两种模式全过。

## v2.4.3（2026-09-03）

### 新增：命令补全（含灰色功能说明）

- **补全**：输入 `/` 补全命令词；输入首词（命令或记号前缀）同时补全**命令 + 记号名**，
  候选以下拉列出（命令/参数项与记号名用不同颜色区分；悬停/选中高亮 + 加粗）。
  `↑↓` 选择、`Tab` 填入、`Esc` 收起；**回车始终执行**（任何输入都是指令）。
- **参数命令**：`tree / limit / import / convert` 补全记号名；`save / set / draw` 按**位置感知**
  补全参数——`save` 依次给出 `csv / xlsx / [n] / True|False`（已用的同类参数不再重复），
  `set` 给出设置键、`set theme=` 给出主题值，`draw` 给出 `iblp`。下拉顶部显示该命令的**格式说明**
  （如 `save [csv|xlsx] [n] [True|False]`），让用户看到可填的语法与可否加数字。
- 仅当命令参数是记号名（tree/limit/import/convert）才做记号补全，避免 `save 2` 误匹配记号。
- 实现：`ui/completion.js`（命令目录 + 输入分析 + 位置感知参数补全）；`ui/app.js` 接线输入框
  （键控 / 下拉 / 格式头 / 悬停高亮 / 回车执行）；`ui/helpText.js` 与 README 补 `Tab` 说明。

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

### 展开防护：不许卡死 + 模板换成参考版那份