# Notation Explorer v2 — 设计文档

> 记号展开器（googology 序数记号展开工具）。
> 原则：**算法层照搬验证过的实现，UI 层重写为清晰结构**；每一层都要有可复跑的验证脚本。

---

## 1. 项目定位

输入「记号名 + 表达式」（如 `PrSS 0,1,2`），生成一棵**展开树**：
极限表达式按 FS（基本列）展开成子节点，逐层探索大序数记号的展开过程。

---

## 2. 来源与分工

| 层 | 来源 | 说明 |
|---|---|---|
| **远古记号接口与实现** | Hyp cos 的 notation-explorer（未声明 LICENSE，个人学习用） | `register.push({id, name, display, able, semiable, compare, FS, FSalter, init})` |
| **远古展开核心** | 同上 | `FSbounded`（low 边界保证严格递增）、tier 展开、extra FS（`core/engine.js`，去 Vue 化） |
| **ne 记号体系** | SmileLee-lyx/ne-rewritten | `NotationDefinition` 接口、生成器家族、`notation/ne/` 里的移植记号 |
| **ne 展开引擎** | 同上 | `core/ne/tree.js` + `core/ne/expander.js`（与 `expander.ts` 同源） |
| **33 个用户记号** | 参考版「自助版 NE-4.8.1」的 `__BUILTIN_FACTORIES` | 原样抠出，只套 `core/ne/classicNotation.js` 适配器 |
| **UI 层** | 本项目重写 | React 18 CDN 零构建、CLI 风格、键盘导航、主题、注释、导出、记号编辑面板 |

---

## 3. 技术栈

- **零构建**纯前端：React 18 UMD CDN + 原生 ES Modules
- 远古记号文件是**普通 `<script>`**（IIFE + 全局 `register.push`，算法文件不改动）
- ne 记号与 UI 层是 **ES Module**（`type="module"` 注入），入口 `ui/app.js`
- 无 Node 运行时依赖、无打包器；本地起静态服务器即可

---

## 4. 记号架构（v2.5.1）

### 4.1 两套注册表 + 两个引擎

| | ne 侧（默认） | 远古侧（兜底） |
|---|---|---|
| 注册表 | `core/ne/registry.js`（`register_notation` / `register_category` / `ensure_category`） | `window.register`（`core/register.js`） |
| 记号定义 | `{display, is_limit, compare, FS, init}`（`init()` 返回**表达式数组**） | `{display, able, semiable, compare, FS, init}`（`init()` 返回**树节点数组**） |
| 展开 | `core/ne/expander.js#expand_item`：上界由**树位置**决定（`get_bound` = 先根遍历的下一个节点） | `core/engine.js#expandNode`：上界是记号**手写的 low** |
| 分类 | 记号自带 `category_id`，注册表生成分类树 | 无（`ui/notationList.js` 旁挂） |

**为什么两套并存**：远古记号（168 个）只提供 low 式接口，短期内不值得全部改写；
ne 记号（229 个）是记号的正主。适配层 `core/ne/uiBridge.js` 让两者对 UI 长得一样。

### 4.2 ne 记号在 UI 里怎么展开（`core/ne/uiEngine.js`）

**不能**用旧引擎展开 ne 记号。旧引擎需要 `low`，而 ne 的边界来自树结构，只能**猜**一个
下界 —— 猜出来能跑，但树形与 ne 不一致。实测（`.tmp-ne/compare-engines-tree.mjs`，
同一种子同 tier、比先根序列）：

| 记号 | ne 引擎 | 旧引擎 + 适配层 |
|---|---|---|
| prss | 3 节点 | 2（少展一步） |
| rcss | 10 | **59** |
| mountain | 5 | **17** |

所以 ne 记号走**真 ne 引擎**，做法是**镜像**：

```
ne 树（真相） ──rebuild()──▶ UI 根列表（{expr, low:[[]], subitems, _neNode}）
```

- 每个 UI 节点用 `_neNode` 反向指向 ne 节点；展开后按身份**复用**旧 UI 节点，
  `_uid` / `_collapsed` / `note` 不丢；
- `low` 在 ne 路径上无人读取（旧引擎才用），填 `[[]]` 占位；
- **UI 渲染代码一行未改**，只改了 5 处接缝：建树分流（2 处）、展开分流（1 处）、
  初始展开链（用 `expand_ne` 返回的 `created` 精确定位新节点）。

与 ne 的语义差异（有意为之）：`extra`（additionalExpand，节点前补若干 FS 项）ne 引擎
没有对应概念 → 忽略；`tier` 语义两侧基本对齐。

### 4.3 回落到远古的 11 个

`core/ne/uiBridge.js` 的 `NE_ENGINE_BROKEN`：TON 家族 9 个（`ton-m/dr/drc/drp/drpc/i/ibp/mc/mpc`）
与 `upms-partial-8/9` —— 它们在 ne 引擎里本身就会抛错（与 ne 原版逐字同错）。
判定要跑两个脚本（只看第一个会漏 5 个）：`verify-ne-integration.mjs`（只展开首个根节点）
与 `.tmp-ne/verify-uiengine-all.mjs`（按 UI 真实做法连展两步）。

### 4.4 适配层的下界探测（`probe()`）

只对「同时要喂旧引擎」的场景（导入的树没有 `_neNode` 时）有意义。判据四条：

1. low 与**基本列项**双向可比较（旧引擎的 `FSbounded` 会做 `compare(FS(e,n), low[0])`，
   即 low 当右操作数）；
2. 至少一个前排 FS 项严格大于 low；
3. seed 不是 ∞ 时 low 必须严格小于 seed；
4. seed 是 ∞ 占位式（`Limit`）时跳过 3 —— 与引擎的 `isInfinityExpr` 特例同构。

---

## 5. 数据模型

### 5.1 远古记号（`register.push`）

```js
{
  id, name,
  display: (expr) => string,
  able: (expr) => bool,              // 极限判定
  semiable: (expr) => bool | 省略,    // 弱可展开（旧引擎的「后继展开成前驱」）
  compare: (a, b) => -1|0|1,
  FS: (expr, n) => expr',            // 基本列第 n 项（n 从 0 起）
  FSalter: (expr, n) => expr' | 省略,
  init: () => [{ expr, low, subitems }, ...],
  parse: (str) => expr | 省略,        // UI 扩展
}
```

### 5.2 ne 记号（`NotationDefinition`）

```js
{
  id, name, simple_name, category_id, credit_text_id,
  display: { plain, html?, latex?, from_display? } | fn,
  display_equiv: { viewId: 同上 },     // 等价显示视图
  is_limit: (a) => bool,
  compare: (a, b) => -1|0|1,
  FS: (a, i) => a',                    // i 从 0 起
  FS_alter?, FS_short?,
  init: () => [a, b, ...],             // 表达式数组，树由 core/ne 管
}
```

### 5.3 树节点

```js
// 旧引擎（远古记号）
{ expr, low, subitems: [...] }
// ne 引擎
{ expr, children: [...], parent, index }   // 镜像到 UI 时同时挂 _neNode
```

---

## 6. 展开核心

### 6.1 旧引擎（`core/engine.js`）

```js
FSbounded(FS, compare, expr, low)   // 找 FS(expr,n) 中第一个 > low[0] 的项；不增长则 null
expandNode(notation, parentList, item, tier, extra)
```

1. `able(expr)` 或（有 `semiable` 且满足）→ `newitem = {expr: FSbounded(...), low: 拷贝}`
2. 插入位置：`item` 是父列表最后一个 → 插成**兄弟**；否则插到 `item.subitems` 开头
3. `item.low[0] = newitem.expr`（下界前移）
4. `tier > 0` 沿链递归；`tier > 1` 再对子项展开
5. `extra` 个额外 FS 项前置插入

§4.2 说明的树形差异正来自「下界从记号转移到了树位置」。

### 6.2 ne 引擎（`core/ne/expander.js`）

```js
expand_item(node, notation, variant, tier)   // tier: 0 单次 / 1 沿链到底 / ≥2 多层
```
边界取 `get_bound(node)`（先根遍历下一个节点）；`max_find_fs` 守卫
「连续产出 ≤ bound 的项过多」（防基本列写错时卡死）——
⚠ 该守卫**只在节点无子节点时生效**，所以另配了毫秒期限（见 §7.5）。

---

## 7. UI 层

- **任何输入都是指令**：`tree 记号名 表达式` 显式建树；裸输入（`记号名 表达式`、
  直接记号名、`limit ...`）是 `tree` 的缩写（`parseCommand` 返回 `unknown` 时按 `tree` 处理）
- 键盘：`↑↓/jk` 导航、`←→/hl` 折叠、`,` 父节点、`0-9` 选第 n 个 FS 项、`Enter/空格` 展开、
  `+=` 加载更多、`n` 注释、`Esc` 回输入框（弹窗里为关闭）
- 设置弹窗（真实现）；5 套主题；每节点可注释（存节点对象的 `note`，核心不感知）
- `/list`：**类 / 子类**两级文件夹（`ui/FolderView.js` 递归渲染）

### 7.1 状态管理（`ui/app.js`）

```
items: [{ type: 'output'|'tree'|'folder'|'draw', ... }]   # 输出流（CLI 风格）
treeEntry: { notation, rootList, name, treeIndex }
settings: { defaultExpand, additionalExpand, tier, fontSize }
themeKey / focusIdx / editingNote / showSettings / showNotationEditor
```

### 7.2 输入解析（`ui/notationParser.js`）

1. 剥 `limit(...)` / `limit ...` 前缀（= 用 init 示例建树）
2. **家族输入**：先试远古家族（`core/register.js#resolveFamilyInput`），
   再试 ne generator（`core/ne/familyInput.js`）
3. 按 id / name / simple_name / alias 最长匹配记号
4. 无匹配 → 按格式推断（纯数字逗号 → ω-Y、括号组 → BMS、含 `w/e/z/h` → CNF）
5. 输入名索引**惰性重建**并订阅 `registry.on_registry_change` —— 否则运行期
   `/notation` 注册的记号匹配不到名字

### 7.3 `/list` 归组（`ui/notationList.js`）

- 参考版「自助版 NE-4.8.1」的「类 / 子类」体系：`DISPLAY_GROUP[category_id] = [类, 子类]`
  + 7 条按记号的例外；实测足以复现参考版的分配（`.tmp-ne/plan-display-groups.mjs`）
- **归属必须查 ne 注册表**的 `category_id`，不能读 `all` 里那个对象的字段 ——
  回落到远古实现的记号没有该字段
- 计数口径**家族算一个**：generator 家族列全部档位，但只计 1。实现上家族是
  **独立的家族文件夹**（`{ subfolder: true, family: true, name, rows }`）：成员全部标
  `uncounted`、文件夹整体计 1 —— `FolderView.countDeep` 对 family 直接记 1 而**不是**对
  rows 求和（否则家族会被算成 0）。标题优先短名，短名撞车时改用完整名（GMS 的
  GBMS/UPMS/LPMS2 三个 `simple_name` 都是 `n-P`）。渲染用 🧬 + 虚线框 + 底色 + 「家族」徽章区分。
- 新增分类忘了登记 → 自检脚本报「有分类落到兜底子类」

### 7.4 自定义记号（`ui/NotationEditor.js` + `core/ne/userNotations.js`）

`/notation` 弹窗（设置弹窗里也有入口）：左列已有记号、「＋ 新建记号」（新建态高亮）、
右侧 id / 显示名 / 短名 + 多行编辑器 + 保存 / **导入 .js** / 删除 / 关闭。
保存后注册进 ne 注册表、强制分类 `category-user`（`/list` 的「自定义记号」），
存 localStorage，启动时重放（逐个 try/catch）。两种接口都收（ne 定义 / 经典 6 方法），
展开走 ne 引擎 —— 所以「ne 里能跑的 JS 在这里展开一致」。

两条容错设计：

- **id 可留空**：`add_user_notation` 依次取 `meta.id` → 源码里的 `id: '…'` → **导入文件名**（编辑器负责）
  → `next_default_id()`（`user1`、`user2`…，跳过已占用的）；显示名回落到 id。
  否则「新建 → 保存」这条最短路径会被一个必填项挡住。
- **导入 .js 走 `normalize_source()`**：剥 `export default` / `export const X =` /
  `export function` 三种 module 外壳，顺带把源码里的 `id` / `name` 提出来预填表单；
  带 `import` 的文件直接报明确错误（浏览器里没有依赖可解析，剥掉它只会跑到后面才炸）。
  导入只填进编辑器、不直接注册 —— 留一步复核。

`evaluate()` 认**三种**记号写法（两条路都试，不靠正则猜）：

| 形态 | 例子 | 求值方式 |
|---|---|---|
| 表达式 | `({...})` / `function(){...}` / IIFE | `return (源码)` |
| 声明式 | `const Notation = {...}` | `源码; return Notation;`（参考版约定） |
| **自注册式** | `(() => { … if (typeof register_notation === 'function') register_notation(notation); })();` | 注入**只捕获不注册**的 `register_notation` shim，取捕获到的定义 |

自注册式是 **ne-rewritten 内置记号的形态**（从那边下载的 CTN2 就是），它没有返回值 ——
在 ne-rewritten 里 `register_notation` 是全局函数所以能直接用；这边注入 shim 后同样能用，
且注册仍走 `add_user_notation`（分类强制、持久化、UI 桥接一处不少）。
求值前会去掉源码末尾分号：`(() => {…})();` 直接包进 `return ( … )` 会语法错误，
而那样 IIFE 根本不执行、也就捕获不到定义（踩过）。

### 7.5 展开的「不许卡死」防护

JS 单线程：一个跑不完的循环就冻住整个页面。**实测踩到过** —— 自定义记号的
`FS(e, i)` 结果不随 `i` 变化时（`FS: (e,i) => e-1`），`generate_fs` 的
`while` 会永远拒绝同一个值；那个「试展开次数过多」守卫只在节点**没有子节点**时生效，
而第一次展开之后节点就有子节点了 → 死循环。

两道防线：

| 路径 | 做法 | 位置 |
|---|---|---|
| ne 引擎 | 引擎内置**期限**（环境变量式：`set_expand_deadline` / `clear_expand_deadline`，`expand_ne` 用 try/finally 兜住） | `core/ne/expander.js`，检查点在 `generate_fs` 的 while（每 64 次查一次时钟）与 `expand_tier_impl` 入口 |
| 旧引擎 | **不改引擎**（`core/engine.js` 文件头写着严禁修改、需用户确认），改为**包装记号**：`with_deadline()` 把 `able/semiable/compare/FS/FSalter` 各包一层，每次调用查时钟 | `core/ne/timeGuard.js` |

为什么包装能兜住旧引擎：引擎每走一步都要调那几个函数，所以搜索循环与递归链的每一步
都会经过检查点。实测：病态记号在 802ms 中止（FS 调用 ~1.1 万次），不包装则 2.4s 后爆栈。
代价是每次调用多一次 `Date.now()`（几十 ns）。

三层语义：

- `settings.timeLimit`（默认 **5000**，`0` = 不限制）→ `expand_entry` 传入；
  `set timeout=N` 与设置弹窗（±500 步进）都能改。
- 超时抛 `TimeLimitError`，`expand_entry` 捕获后给**专用提示**（区别于普通抛错），
  并说明「树里可能已留下这次的部分展开」—— ne 展开是原地改树的，不做事后回滚。
- **穿透范围**：记号自己的函数内部若死循环（如 `FS` 里 `while(true)`），同线程无法抢占。
  真正的隔离需要把展开放进 Worker（记号模块、用户记号源码、树结构都要能进去），
  属于后续工作；当前 doc/help 里都写明了这一条。

### 7.6 设置持久化（`ui/persistedSettings.js`）

自定义记号存了 localStorage，设置却每次恢复默认 —— 同一应用里两套行为，用户一眼看出不一致
（反馈原话：「自制记号刷新了之后依然是导入状态，那设置里的其他项为啥不是恢复之前的状态」）。
现在设置与主题一起持久化：

- 键名统一 `dsh.*`（`dsh.settings` / `dsh.theme` / `dsh.userNotations`）。
- **逐项校验**：读取时按 schema（整数 + 上下限 1..100 / 0..100 / 0..9 / 10..28 / 0..600000）判，
  任何一项不合法就用默认值 —— 存档可能来自旧版本或被人手改过，坏值不该把界面带崩；未知键直接丢。
- 主题走**白名单**（`THEMES` 的键），非法值回退默认。
- `localStorage` 不可用（隐私模式等）时静默降级为只在内存里，`save_settings` 返回 `false`。
- App 里两个 `useEffect` 分别写设置与主题，启动用惰性 `useState(() => load_settings())`。

### 7.7 单棵树的设置（`ui/TreeSettings.js` + `ui/scrollFollow.js` + `core/ne/targetSearch.js`）

每棵树有独立配置 `item.treeCfg`（默认 `{ style:'mine', scrollFollow:'edge', showAllViews:false }`），
入口是树标题行右侧的 `⚙️ 树设置`（只作用于那一棵树）：

| 项 | 实现要点 |
|---|---|
| **跳转到位置** | `core/ne/targetSearch.js`：① 先在**已有树**里按显示文本找（`find_in_tree`）→ 直接定位；② 否则 `search_target` 从各根出发做**纯表达式** DFS（沿基本列枚举、`seen` 去重、不再严格下降即止），带 `maxMs`/`maxSteps`/`maxDepth` 三重上限；③ 命中后把**路径**在真树上逐层 `expand_ne` 重放，最后核对显示文本并聚焦 |
| **显示方式** | 视图切换复用 `resolveTreeViews`；「所有等价显示一并显示」把其余视图的 `display` 传给 `TreeNodeView`，逐节点追加灰字文本（每个视图单独 try/catch） |
| **交互风格** | `handleGlobalKey` 按**焦点所在树**的 `style` 过滤：`ner` 只放行方向键 / `Enter` / 空格 / `Esc` / `Backspace`，其余（`j k h l`、`0-9`、`n`、`+/-`、`,`）不抢占 |
| **上下键跟随** | `ui/scrollFollow.js#compute_scroll_delta`（纯函数）算 `scrollTop` 增量：`off` 不动；`edge` 仅在越界时补到可见；`center`/`upper`/`top` 始终把节点放到中间 / 中上 / 顶部（差 <1px 就不动，避免抖动）。执行在 `TreeNodeView` —— 它握着聚焦行的 DOM，用 `el.closest('.scroll-area')` 找滚动容器 |

**树样式与键位配套的三档**（`item.treeCfg.style`，**按树存**、默认 `mine`）：一个开关同时决定外观与键盘，`TreeNodeView` 按它走三条渲染分支，
共用同一套交互语义（`onNodeClick` / 展开 / 折叠 / 焦点 / 注释）与同一份数据：

| 值 | 参照 | 渲染要点 |
|---|---|---|
| `mine` | 本工具原有 | `themjs` 的树线字符（`prefixes` 递归拼接）+ `[+]`/`[-]`/`[✎]` 文本按钮；注释点 `n`/`[✎]` 才出现 |
| `selfne` | 自助版 NE-4.8.1 | `borderLeft: 5px solid 取色` + `borderRadius` 的卡片、`marginLeft = depth*20` 缩进、`⟨`/`➕` 按钮、行尾常驻 `input` |
| `ner` | ne-rewritten | 无卡片；子层用 `paddingLeft:24 + borderLeft:1px` 画树线（对应它的 `.tree-children` / `.tree-item::before`）、`▾/▸` 折叠三角（无子节点时空占位 `1em`）、**没有独立展开按钮**（点表达式展开）、行首常驻 `input`（宽度 `noteWidth`）、等价显示排成多行 |

节点类型（极限 / 后继 / 展不动）由 `can_expand_ne` + `is_limit` 判定，`selfne` 用它上色。
三种样式共享 `can_expand_ne` 的判据 —— 所以任何样式下都不会出现「显示 `[+]` 却点不动」。

跳转搜索有两个如实的边界（提示与文档里都写了）：搜索本身是纯表达式的、不受树形影响，
但**在树上重放**时可能被兄弟节点的上界挡住 —— 那时报「重放到第 k 步就停了」而不是假装成功；
重放后显示文本不符也会明说。

### 7.8 全局快捷键与表单

`handleGlobalKey` 对「非主输入框」的 INPUT/TEXTAREA/contentEditable 直接放行，
否则弹窗里打字会被导航快捷键抢走（`n` 开注释、数字选 FS 项）。弹窗自己处理 `Esc`
并 `stopPropagation`。

---

## 8. 可维护性约定

- 记号算法文件**只读不改**；扩展信息走 `core/register.js#NOTATION_META`
  （aliases / parse / converters / views）
- 核心引擎不依赖 React / DOM，可独立单测
- 新增记号：文件放进 `notation/ne/`（ne 接口）或 `notation/legacy|user/`（远古接口）→
  `core/notation-manifest.js` 加一条（ne 的写 `module: true`，依赖写 `dependsOn`）→
  需要分类映射时补 `ui/notationList.js` 的 `DISPLAY_GROUP`；**不改 index.html**
- 临时加记号不必进仓库：`/notation` 面板即可
- 改动后跑：`verify-loader.mjs`、`verify-ne-integration.mjs`、`verify-uibridge.mjs`
  （架构级）；`.tmp-ne/` 下还有针对列表归组、镜像保真、自定义记号、编辑面板的自检

---

## 9. 验证方式

**浏览器**（本地静态服务器）：`PrSS 0,1,2` → 展开树；`DEN` → 示例建树；
逐项回归展开 / 折叠 / 导航 / 注释 / 导出 / 主题 / 设置 / `/notation` 面板。

**脚本**（都能在无浏览器环境下跑）：

| 脚本 | 覆盖 |
|---|---|
| `scripts/verify-app-boot.mjs` | **应用能否启动**：桩 React+DOM 执行 `ui/app.js` 模块体、调用 `App()`、跑 effect、「输入 `notation` 弹面板」、「设置里进自定义记号」、以及**建树后点 ⚙️ 树设置弹面板** |
| `.tmp-ne/verify-target-search.mjs` | 跳转搜索：起点命中 / 按路径搜到 / 上限与失败原因 / 无副作用 / 真实记号（PrSS）/ 树内直查 |
| `.tmp-ne/verify-tree-ui.mjs` | 树设置面板（视图切换、等价显示开关、交互风格、滚动 5 模式、跳转成败反馈）+ `compute_scroll_delta` 各模式的几何断言 |
| `scripts/verify-expand-timeout.mjs` | **展开不许卡死**：worker 里跑（能超时强杀），验模板各 tier 正常、坏记号被上限中止、并留「不限制就会卡死」的对照 |
| `scripts/verify-loader.mjs` | 清单驱动加载：依赖排序、注入顺序、失败续载 |
| `scripts/verify-ne-integration.mjs` | ne 注册表全量装载 + 冒烟 |
| `scripts/verify-uibridge.mjs [--legacy]` | 适配层 + 全量冒烟（默认走 ne 引擎） |
| `scripts/list-notation.mjs` | 按清单加载并核对注册 |
| `.tmp-ne/verify-uiengine-all.mjs` | 218 个记号逐个核对「镜像树 == ne 树」 |
| `.tmp-ne/verify-classic-parity.mjs` | 33 个移植记号 vs 参考版工厂 |
| `.tmp-ne/verify-notation-list.mjs` | /list 归组、计数、分类覆盖 |
| `.tmp-ne/verify-usernotations.mjs` / `verify-noteditor.mjs` | 自定义记号后端 / 编辑面板 |
| `.tmp-ne/compare-engines-tree.mjs` | 两条引擎路径的树形差异（历史依据） |
