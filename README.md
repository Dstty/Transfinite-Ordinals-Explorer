# 序数探索器 · Transfinite-Ordinals-Explorer

googology 超限序数记号探索工具（v2.4.3）：输入「记号名 + 表达式」，生成**展开树**，
逐层探索大序数记号的 FS（基本列）展开过程。

## 运行

零构建纯前端，任意静态服务器即可：

```bash
# 方式一：Python
python -m http.server 8000
# 然后浏览器打开 http://localhost:8000

# 方式二：Node
npx serve .
```

> 注意：ES Module 结构，直接双击 index.html 会被浏览器 CORS 拦截，
> 必须通过 HTTP 访问。

## 使用

任何输入都是指令：`tree <记号名> <表达式>` 生成展开树，**裸输入**是它的缩写，二者等价。

- 输入 `PrSS 0,1,2`（= `tree PrSS 0,1,2`）→ 用 PrSS 展开该表达式
- 输入记号名（如 `DEN`，= `tree DEN`）→ 用该记号的 init() 示例建树
- `limit DEN` / `limit(DEN)` / `tree limit DEN` → 同上（示例建树）

> 输入提示：`Tab` 补全命令/记号，`↑↓` 选择候选（下拉展示）；输入时**浅灰文字**实时预览本条指令将做什么，如「用 PrSS 展开 0,1,2」。

### 显示视图切换（多种显示形式的记号）

支持多种显示形式的记号，其树标题行右侧显示当前视图名（如 `视图: OCF`），
点击或打开 **⚙️ 设置** 弹窗，在「视图」下拉中切换（展开树不变，仅翻译文本）：

| 记号 | 可切换视图 |
|---|---|
| BMS (`bm4`) | simple、0-Y、OCF / OCF full / n.s. OCF / n.s. OCF full（移植自 ne-rewritten BM-BOCF） |
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
| `Esc` | 回输入框 |

### 命令

命令可不带 `/`（`help` 与 `/help` 等价），命令词不区分大小写。

| 命令 | 功能 |
|---|---|
| `tree` | 生成展开树：`tree <记号名> <表达式>`（裸输入是它的缩写，见「使用」） |
| `draw` | 绘制图案：`draw <Y序列> [DBMS\|DBMS'\|ADBMS]`（Y 序列山脉图，如 `draw 1,2,4,8`）；或 `draw <IBLP表达式>`（`(行)L` 结构自动识别为 IBLP/DEN2 图案，如 `draw (1,0)1(2,1,0)1`；也可 `draw iblp` 显式前缀，不带表达式画极限示例）。旧名 `mountain` 仍可用 |
| `list` | 按分类（文件夹式）列出所有已注册记号，点击分类名展开/折叠 |
| `convert` | 记号互译：`convert <源记号> <表达式> to <目标记号>`（如 `convert bm4 (0,0)(1,1,1) to 0y`） |
| `clear` | 清屏 |
| `save [n] [True\|False]` | 导出第 n 棵树（默认最后一棵）；可选格式 `save xlsx 2` / `save csv 2`（默认 csv）；`True` 连无注释的行一起导出，`False`（默认）只导出有注释的行 |
| `import [记号名]` | 导入 xlsx / csv 还原成一棵树（默认用最后一棵树的记号；仅支持能解析回表达式的记号，如序列/矩阵类） |
| `set theme=dark` | 切换主题（dark/light/paper/solarizedlight/solarizeddark） |
| `set default=N` | 初始展开层数（默认 2） |
| `set additional=N` | 「加载更多」额外 FS 项数（默认 1） |
| `set tier=N` | 展开层级 0-9（0=small, 1=single, 2=double, ...，默认 1，与远古版一致） |
| `set font=N` | 整体字体大小 10-28（默认 16，界面按比例缩放；⚙️ 设置里也可调） |
| `help` | 显示帮助 |

## 记号清单

当前共 **168 个记号（静态注册）、88 个记号文件**，`/list` 按文件夹分类展示：
Y 序列 / Bashicu 矩阵系 / OCF 序数折叠函数 / aSAN 数列 / TON / DEN /
ω 山记号 (MN) / GMS（通用矩阵系统）/ 基础序列系统。

- 远古版（来自 hypcos/notation-explorer，算法原样保留）→ `notation/legacy/`
- ne-rewritten 移植（依赖 `shared.js` 的 `window.NEUTILS`）→ `notation/rewritten/`
- 用户自有（按远古接口重写）→ `notation/user/`

### 带 n 家族记号

移植自 ne-rewritten 的 generator 家族，每族静态注册常用档，**输入任意档位即按需生成**：

| 家族 | 起点 | 输入示例 |
|---|---|---|
| n-MN（non triangular nMN，`n-mn`） | 1 | `30MN` / `30-mn` |
| nBM-BHM（`n-bm-bhm`） | 1 | `40BM-BHM` / `40bmbhm` |
| (>n)-UPMS（`upms-partial-n`） | 2 | `(>50)-UPMS` / `upms8` |
| -1Y-nSS / T / BT / BT* / BT*' / wBT*-v3 / BTL（`*-1y-Kss…`） | 1 或 2 | `-1y-30ss` / `btl--1y-40ss` |
| GMS n-P（GBMS / UPMS / LPMS2） | 2 | `GBMS 30-P` / `gbms30-p` |

n 上限 **100**，超过会提示「不支持超过 100」；低于家族起点也会提示（如 UPMS 从 2 开始）。
实现：各家族文件把自己的工厂注册到 `window.NOTATION_FAMILIES`，输入解析
（`ui/notationParser.js` → `core/register.js` 的 `resolveFamilyInput`）命中后现场实例化并注册。

用户自有：PrSS、PPS、SPS、DFSS、CNF（Cantor normal form，第一步：输入解析 + 内部表达式）。

### CNF（Cantor normal form）

输入示例：`CNF 2^(w^2+w*3*w+2)`、`cnf 2^{w+1}`、`cantor w^w`、`cnf e0`。

- 表达式用 `w` 表示 ω，支持 `+` `*` `^` 与括号；`{ }` 与 `( )` 等价（`2^{w+1}` 可输入）；全角 `ω×·＋` 自动转换
- ε 数（varepsilon）写作 `e`，**必须带下标**（单独 `e` 报错）：`e0` = ε₀、`e1`、`e2`；`ew` / `e_w` = ε_ω；`ee0` = ε_{e0}（= `e_e0`）；`e(w+1)` / `e_(w+1)` = ε_{ω+1}；下标是任意表达式
- 隐式乘法：`w`/数字后紧跟 `w`/数字/`(` 自动补乘号（`ww`=ω·ω、`w2`=ω·2、`2w`=2·ω、`w(w+1)`=ω·(ω+1)）；`e` 后跟数字/`e`/`w`/`(`/`_` 是下标连接不是乘法（`2e0`=2·ε₀、`ee0`=ε_{ε₀}）
- 优先级（高→低）：**隐式乘法 > 幂 `^` > 显式乘法 `*` > 加法 `+`**，因此 `w^w2` = ω^(ω·2)、`w2^3` = (ω·2)³、`w^w*2` = ω^ω·2
- 内部表达式为语法树：数字 → `number`，ω → `'w'`，`ε_a` → `['e',a]`，`ζ_a` → `['z',a]`，`α^β` → `['^',α,β]`，`α*β` → `['*',α,β]`，`α+β` → `['+',α,β]`（`^` 右结合，`+`/`*` 左结合）
- **不做序数算术化简**：非标准式子（如 `2^(w+1)`、`w*3*w`）原样保留
- 树内用 HTML 数学公式显示（与 cOCF 一致）：`ω`、`<sup>` 上标、`·` 乘法；输入用 `e`/`z` 打 ε/ζ，显示为 `ε<sub>下标</sub>`/`ζ<sub>下标</sub>`（如 `e0` → ε₀、`z0` → ζ₀）
- ε/ζ 必须带下标：单独 `e`/`z` 报错；`ee0` = e_e0、`zz0` = z_z0；`e_(w+1)`/`z_(w+1)` 可输入
- 展开规则：ε₀[n] = ω 塔（n 层）；ε_{a+1}[0] = ε_a+1，ε_{a+1}[n≥1] = ω 塔底 (ε_a+1)；ζ₀[n] = ε 叠 n 层在 0；ζ_{a+1}[0] = ζ_a+1，ζ_{a+1}[n≥1] = ε 叠 n 层在 (ζ_a+1)；下标是极限时 ε_λ[n]=ε_{λ[n]}、ζ_λ[n]=ζ_{λ[n]}；特判 `e_(z_a+1)`：第 0 项 z_a+1（e_{z_a}=z_a 不动点，不产生 e 层），n≥1 → ω 塔底 z_a+1
- 极限判定：`ε_a`/`ζ_a` 永远极限（下标是后继也极限，按塔规则展开）
- 展开（FS）规则：极限式走基本列（`2·w` → `2·n`、`w·2` → `ω+n`、`w^w` → `w^n`…）；后继式减 1 保持结构（`2·2` → `2+1`、`2·3` → `2·2+1`、`(w+1)^2` → `(w+1)·w+w`）；幂的尾项带数字时先降 1 再拆（`2^(w+1)` → `2^w·2`）；展开到头的后继节点自动隐藏 [+]（与 PrSS 一致）
- ε 的 FS：`e0[n]` = n 层 ω 幂塔（`e0[1]`=ω、`e0[2]`=ω^ω、`e0[3]`=ω^ω^ω）；`e_{a+1}` 第 0 项 = `e_a`，`e_{a+1}[n]`（n≥1）= n 层塔、塔底 `e_a+1`（`e1[1]`=ω^(e₀+1)、`e1[2]`=ω^ω^(e₀+1)）；下标是极限时 `e_λ[n]` = `e_{λ[n]}`（`e_w[2]`=e₂）
- ε 的判定：`e_a` 永远是极限（[+] 常亮），下标是后继（`e_{a+1}`、`e_k`）时展开把整个 e 按塔规则展开，不展开下标；比较时按不动点 `ω^e_a = e_a` 处理
- 当前状态：解析 + 公式显示 + FS 展开已完成

## 结构

```
index.html            入口（React CDN → register 初始化 → 清单 → 加载器）
core/
  register.js         全局 register + 别名/parse 补充表（NOTATION_META）
  engine.js           展开核心（FSbounded + expandNode，纯逻辑）
  parseShorthands.js  矩阵/序列简写解析
  notation-manifest.js  记号文件清单（新增记号在此加一条，无需改 index.html）
  loader.js           清单驱动加载器（按 dependsOn 拓扑排序，动态注入 script）
notation/
  legacy/             远古版记号（hypcos/notation-explorer，算法原样）
  rewritten/          ne-rewritten 移植记号（依赖 shared.js）
  user/               用户自有记号（PrSS/PPS/SPS/DFSS/CNF）
ui/
  app.js              主应用（状态、导航、键盘、命令）
  TreeNodeView.js     树渲染
  FolderView.js       /list 文件夹式分组渲染
  notationList.js     记号分类 / 显示名 / 无穷降链标记
  themes.js           主题
  helpText.js         帮助文本
  commandParser.js / notationParser.js / exportUtils.js
scripts/
  list-notation.mjs   Node 验证：按清单加载全部记号并核对注册
  verify-loader.mjs   Node 回归测试：loader 依赖排序与注入顺序
docs/
  archive/            历史修复笔记归档
reference/            远古版框架原稿（参考）
```

## 致谢与来源

- **记号算法与展开框架核心**来自 **Hyp cos 的 notation-explorer**
  （https://hypcos.github.io/notation-explorer/ ，github.com/hypcos/notation-explorer）。
  该仓库未声明 LICENSE，本项目仅作个人学习使用，特此标注致谢。
- UI 层（React CLI 风格、键盘导航、主题、注释、CSV 导出）为本项目重写。

## 新增记号

1. 记号文件放入 `notation/` 对应子目录（legacy / user / rewritten）；
2. 在 `core/notation-manifest.js` 末尾加一条
   `{ file, category, ids?, dependsOn?, note? }`；
   跨文件依赖（`shared.js`、`BTBM.js`、`omega-Y.js` 提供的全局符号等）
   用 `dependsOn` 声明，加载器会自动排序，无需关心顺序；
3. 需要别名 / parse 时，在 `core/register.js` 的 `NOTATION_META` 补条目；
4. 需要 /list 分类与显示名时，在 `ui/notationList.js` 补条目。

验证：`node scripts/list-notation.mjs`（全量加载 + 注册核对）、
`node scripts/verify-loader.mjs`（加载器回归）。
