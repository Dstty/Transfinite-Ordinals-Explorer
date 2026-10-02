// ============================================================================
//  core/notation-manifest.js — 记号文件清单（深度整理：清单驱动加载）
// ============================================================================
//  这是 index.html 加载记号文件的唯一依据：core/loader.js 按本清单
//  动态创建 <script> 标签，并按 dependsOn 自动调整加载顺序。
//
//  新增记号流程（替代旧版「在 index.html 手写一行 <script>」）：
//    1. 把记号文件放进 notation/ 对应子目录（legacy / user / rewritten）；
//    2. 在本清单末尾加一条 { file, category, ids?, dependsOn?, note? }；
//    3. 需要别名/parse 时，在 core/register.js 的 NOTATION_META 补条目；
//    4. 需要 /list 分类与显示名时，在 ui/notationList.js 补条目。
//
//  字段说明：
//    file      — 相对页面根目录的脚本路径
//    category  — /list 显示分类（与 ui/notationList.js 的 NOTATION_CATEGORIES 一致）
//    ids       — 该文件注册的记号 id（可读性用途，加载器不依赖）
//    dependsOn — 必须先于本文件加载的 file 路径（加载器做拓扑排序）
//    note      — 可选说明
//
//  子目录按来源分：legacy（远古版）/ user（用户自有）/ rewritten（ne-rewritten 移植）
//
//  跨文件依赖（浏览器顶层全局，加载器靠 dependsOn 保证顺序）：
//    - rewritten 系列全部依赖 shared.js（window.NEUTILS）；BTBM-weak 另依赖 BTBM.js
//    - legacy：sequence_display 由 omega-Y.js 提供；matrix_display / matrix_limit
//      由 BM.js 提供；TON_limit / TON_main_display 由 TON-main.js 提供；
//      aSAN_display 由 aSAN-1.js 提供；LMN_display 由 LMN.js 提供
// ============================================================================

window.NOTATION_MANIFEST = [
  // --------------------------------------------------------------------------
  //  rewritten —— ne-rewritten 移植（shared.js 先行，全部依赖它）
  // --------------------------------------------------------------------------
  { file: 'notation/rewritten/shared.js',      category: '(共享工具)', note: '定义 window.NEUTILS' },
  { file: 'notation/rewritten/0-Y.js',         category: 'Y 序列',   ids: ['0y'],            dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/minus1-Y.js',    category: 'Y 序列',   ids: ['-1y'],           dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/T-minus1-Y.js',  category: 'Y 序列',   ids: ['t--1y'],         dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/TBM.js',         category: 'Bashicu 矩阵系', ids: ['tbm'],     dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/DSM.js',         category: 'Bashicu 矩阵系', ids: ['dsm'],     dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/Veblen.js',      category: 'OCF 序数折叠函数', ids: ['veblen-phi'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/UPS1-1r5.js',    category: '基础序列系统', ids: ['ups1.1r5'],  dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/BOCF-EBO.js',    category: 'OCF 序数折叠函数', ids: ['bocf-ebo'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/MOCF-EBO.js',    category: 'OCF 序数折叠函数', ids: ['mocf-ebo'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/NOCF-EBO.js',    category: 'OCF 序数折叠函数', ids: ['nocf-ebo'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/Inacc-OCF.js',   category: 'OCF 序数折叠函数', ids: ['inacc-ocf'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/BTBM.js',        category: 'Bashicu 矩阵系', ids: ['btbm'],    dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/BTBM-weak.js',   category: 'Bashicu 矩阵系', ids: ['btbm-weak'], dependsOn: ['notation/rewritten/BTBM.js', 'notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/PPS4.js',        category: '基础序列系统', ids: ['pps4','wpps4','ewpps4','spps4','tpps4'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/finite-Mahlo-OCF.js', category: 'OCF 序数折叠函数', ids: ['finite-mahlo-ocf'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/omega-MN.js',    category: 'ω 山记号 (MN)', ids: ['omega-mn'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/SMN.js',         category: 'ω 山记号 (MN)', ids: ['sa-omega2-mn','s-omega2-mn','s-omega-pow-omega-mn'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/LPMS.js',        category: 'Bashicu 矩阵系', ids: ['lpms','lptss'], dependsOn: ['notation/rewritten/shared.js'] },
  { file: 'notation/rewritten/omegaY-variants.js', category: 'Y 序列', ids: ['weak-omega-y','omega-y-12omega','omega-y-1257omega','omega-y-skew'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：weak ω-Y 与 limit variants' },
  { file: 'notation/rewritten/n-MN.js',       category: 'ω 山记号 (MN)', ids: ['1-mn','2-mn','3-mn','4-mn','5-mn','6-mn','7-mn','8-mn'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：n-MN（non triangular nMN）家族，n=1..8' },
  { file: 'notation/rewritten/nBM-BHM.js',    category: 'Bashicu 矩阵系', ids: ['1-bm-bhm','2-bm-bhm','3-bm-bhm','4-bm-bhm','5-bm-bhm','6-bm-bhm','7-bm-bhm','8-bm-bhm'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：nBM-BHM（BMS(n rows)+BHM）家族，n=1..8' },
  { file: 'notation/rewritten/partial-UPMS.js', category: 'Bashicu 矩阵系', ids: ['upms-partial-2','upms-partial-3','upms-partial-4','upms-partial-5','upms-partial-6','upms-partial-7','upms-partial-8','upms-partial-9'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：(>n)-UPMS（partial UPMS）家族，n=2..9' },
  { file: 'notation/rewritten/GMS.js',       category: 'GMS', ids: ['BMS-20260721-v10-weirdfull-display-GBMS-n-2-P','BMS-20260721-v10-weirdfull-display-GBMS-n-3-P','BMS-20260721-v10-weirdfull-display-UPMS-n-2-P','BMS-20260721-v10-weirdfull-display-UPMS-n-3-P','BMS-20260721-v10-weirdfull-display-LPMS2-n-2-P','BMS-20260721-v10-weirdfull-display-LPMS2-n-3-P','BMS-20260721-v10-weirdfull-display-GBMS-omega-P','BMS-20260721-v10-weirdfull-display-GBMS-pQSS','BMS-20260721-v10-weirdfull-display-GBMS-QSS','BMS-20260721-v10-weirdfull-display-GBMS-Full','BMS-20260721-v10-weirdfull-display-GBMS-Weirdly Full','BMS-20260721-v10-weirdfull-display-UPMS-omega-P','BMS-20260721-v10-weirdfull-display-UPMS-pQSS','BMS-20260721-v10-weirdfull-display-UPMS-QSS','BMS-20260721-v10-weirdfull-display-UPMS-Full','BMS-20260721-v10-weirdfull-display-UPMS-Weirdly Full','BMS-20260721-v10-weirdfull-display-LPMS2-omega-P','BMS-20260721-v10-weirdfull-display-LPMS2-pQSS','BMS-20260721-v10-weirdfull-display-LPMS2-QSS','BMS-20260721-v10-weirdfull-display-LPMS2-Full','BMS-20260721-v10-weirdfull-display-LPMS2-Weirdly Full'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：GMS（General Matrix System：GBMS/UPMS/LPMS2 × 投影 + n-P 族）' },
  { file: 'notation/rewritten/minus1Y-nSS.js',   category: 'Y 序列', ids: ['-1y-1ss','-1y-2ss','-1y-3ss','-1y-4ss','-1y-5ss','-1y-6ss'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：-1Y-nSS 家族（Minus1_Y_nSS），档位 1..6 静态，家族表支持到 100' },
  // 注：notation/ne/Minus1_Y_nSS.js 是同一批记号的 ne 原生版（注册进 core/ne registry）。
  //     两套注册表当前并存：UI 仍读旧的 window.register，所以这里**不能**停用旧条目，
  //     否则界面会少 6 个记号。等 UI 切到 core/ne registry（阶段四）后统一停用。
  { file: 'notation/rewritten/t-minus1Y-nSS.js', category: 'Y 序列', ids: ['t--1y-1ss','t--1y-2ss','t--1y-3ss','t--1y-4ss','t--1y-5ss','t--1y-6ss'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：T(-1)Y-nSS 家族（T_Minus1_Y_nSS）' },
  { file: 'notation/rewritten/bt-minus1Y-nSS.js', category: 'Y 序列', ids: ['bt--1y-1ss','bt--1y-2ss','bt--1y-3ss','bt--1y-4ss','bt--1y-5ss','bt--1y-6ss'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：BT(-1)Y-nSS 家族（BT_Minus1_Y_nSS）' },
  { file: 'notation/rewritten/btstar-minus1Y-nSS.js', category: 'Y 序列', ids: ["bt*--1y-2ss","bt*--1y-3ss","bt*--1y-4ss","bt*--1y-5ss","bt*--1y-6ss"], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：BT*(-1)Y-nSS v1（BT_star_Minus1_Y_nSS）' },
  { file: 'notation/rewritten/btstar-minus1Y-nSS-v2.js', category: 'Y 序列', ids: ["bt*--1y-2ss'","bt*--1y-3ss'","bt*--1y-4ss'","bt*--1y-5ss'","bt*--1y-6ss'"], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：strong BT*(-1)Y-nSS（v2，id 带尾撇号）' },
  { file: 'notation/rewritten/btstar-minus1Y-nSS-v3.js', category: 'Y 序列', ids: ['bt*--1y-2ss-v3','bt*--1y-3ss-v3','bt*--1y-4ss-v3','bt*--1y-5ss-v3','bt*--1y-6ss-v3'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：weak BT*(-1)Y-nSS（v3）' },
  { file: 'notation/rewritten/btl-minus1Y-nSS.js',       category: 'Y 序列', ids: ['btl--1y-2ss','btl--1y-3ss','btl--1y-4ss','btl--1y-5ss','btl--1y-6ss'], dependsOn: ['notation/rewritten/shared.js'], note: 'ne-rewritten 移植：BTL(-1)Y-nSS（ATnSS）' },

  // --------------------------------------------------------------------------
  //  legacy —— 远古版（hypcos/notation-explorer，算法原样）
  //  依赖锚点：omega-Y.js（sequence_display）、BM.js（matrix_display/limit）、
  //           TON-main.js（TON_limit/TON_main_display）、aSAN-1.js、LMN.js
  // --------------------------------------------------------------------------
  { file: 'notation/legacy/omega-Y.js',        category: 'Y 序列',   ids: ['omega-y'] },
  { file: 'notation/legacy/BM.js',             category: 'Bashicu 矩阵系', ids: ['bm4'] },

  { file: 'notation/legacy/omega-Y-magma.js',  category: 'Y 序列',   ids: ['omega-y-weak','omega-y-actual','omega-y-medium','omega-y-strong'], dependsOn: ['notation/legacy/omega-Y.js'] },
  { file: 'notation/legacy/1-Y.js',            category: 'Y 序列',   ids: ['y-seq'],         dependsOn: ['notation/legacy/omega-Y.js'] },
  { file: 'notation/legacy/X-Y.js',            category: 'Y 序列',   ids: ['x-y'],           dependsOn: ['notation/legacy/omega-Y.js'] },

  { file: 'notation/legacy/BHM.js',            category: 'Bashicu 矩阵系', ids: ['bhm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BSM.js',            category: 'Bashicu 矩阵系', ids: ['bsm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BLM.js',            category: 'Bashicu 矩阵系', ids: ['blm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/CM.js',             category: 'Bashicu 矩阵系', ids: ['cms'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/wMM.js',            category: 'Bashicu 矩阵系', ids: ['wmms'],    dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/UPMS.js',           category: 'Bashicu 矩阵系', ids: ['upms'] },
  { file: 'notation/legacy/BHM2.js',           category: 'Bashicu 矩阵系', ids: ['bhm2'],    dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BTM.js',            category: 'Bashicu 矩阵系', ids: ['btm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BIM.js',            category: 'Bashicu 矩阵系', ids: ['bim'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BSM2.js',           category: 'Bashicu 矩阵系', ids: ['bsm2'],    dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BDM.js',            category: 'Bashicu 矩阵系', ids: ['bdm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/BHhM.js',           category: 'Bashicu 矩阵系', ids: ['bhhm'],    dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/MM.js',             category: 'Bashicu 矩阵系', ids: ['mm'],      dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/MM2.js',            category: 'Bashicu 矩阵系', ids: ['mm2'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/MM3.js',            category: 'Bashicu 矩阵系', ids: ['mm3'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/EPM.js',            category: 'Bashicu 矩阵系', ids: ['epm'],     dependsOn: ['notation/legacy/BM.js'] },
  { file: 'notation/legacy/UPS.js',            category: '基础序列系统', ids: ['ups'],       dependsOn: ['notation/legacy/BM.js'] },

  { file: 'notation/legacy/TomegaMN.js',       category: 'ω 山记号 (MN)', ids: ['t-omega-mn'] },
  { file: 'notation/legacy/BomegaMN.js',       category: 'ω 山记号 (MN)', ids: ['b-omega-mn'] },
  { file: 'notation/legacy/Aomega2MN2.js',     category: 'ω 山记号 (MN)', ids: ['a-omega2-mn-2','weak-a-omega2-mn-2'] },
  { file: 'notation/legacy/Aomega2MN3.js',     category: 'ω 山记号 (MN)', ids: ['a-omega2-mn-3','weak-a-omega2-mn-3'] },
  { file: 'notation/legacy/DEN.js',            category: 'DEN',      ids: ['den'] },
  { file: 'notation/legacy/DEN2.js',           category: 'DEN',      ids: ['den2'] },
  { file: 'notation/legacy/DEN3.js',           category: 'DEN',      ids: ['den3'] },

  { file: 'notation/legacy/TON-main.js',       category: 'TON',      ids: ['ton-m'] },
  { file: 'notation/legacy/TON-DoR.js',        category: 'TON',      ids: ['ton-dr'],        dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-DRP.js',        category: 'TON',      ids: ['ton-drp'],       dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-I.js',          category: 'TON',      ids: ['ton-i'],         dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-IBP.js',        category: 'TON',      ids: ['ton-ibp'],       dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-MC.js',         category: 'TON',      ids: ['ton-mc'],        dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-MPC.js',        category: 'TON',      ids: ['ton-mpc'],       dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-DRC.js',        category: 'TON',      ids: ['ton-drc'],       dependsOn: ['notation/legacy/TON-main.js'] },
  { file: 'notation/legacy/TON-DRPC.js',       category: 'TON',      ids: ['ton-drpc'],      dependsOn: ['notation/legacy/TON-main.js'] },

  { file: 'notation/legacy/aSAN-1.js',         category: 'aSAN 数列', ids: ['asan-1'] },
  { file: 'notation/legacy/aSAN-2.js',         category: 'aSAN 数列', ids: ['asan-2'],       dependsOn: ['notation/legacy/aSAN-1.js'] },
  { file: 'notation/legacy/aSAN-3.js',         category: 'aSAN 数列', ids: ['asan-3'],       dependsOn: ['notation/legacy/aSAN-1.js'] },
  { file: 'notation/legacy/aSAN-3plus.js',     category: 'aSAN 数列', ids: ['asan-tilde3plus'], dependsOn: ['notation/legacy/aSAN-1.js'], note: '原文件名 aSAN~3+.js（含特殊字符，已更名）' },

  { file: 'notation/legacy/LMN.js',            category: 'OCF 序数折叠函数', ids: ['lmn'] },
  { file: 'notation/legacy/LON.js',            category: 'OCF 序数折叠函数', ids: ['lon'],     dependsOn: ['notation/legacy/LMN.js'] },
  { file: 'notation/legacy/HSPN.js',           category: 'OCF 序数折叠函数', ids: ['hspn'] },
  { file: 'notation/legacy/cOCF.js',           category: 'OCF 序数折叠函数', ids: ['cocf'] },

  // --------------------------------------------------------------------------
  //  user —— 用户自有记号（按远古接口重写；PPS 复用 omega-Y.js 的 sequence_display）
  // --------------------------------------------------------------------------
  { file: 'notation/user/PrSS.js',            category: '基础序列系统', ids: ['prss'] },
  { file: 'notation/user/PPS.js',             category: '基础序列系统', ids: ['pps'],        dependsOn: ['notation/legacy/omega-Y.js'] },
  { file: 'notation/user/SPS.js',             category: '基础序列系统', ids: ['sps'] },
  { file: 'notation/user/DFSS.js',            category: '基础序列系统', ids: ['dfss'] },
  { file: 'notation/user/CNF.js',             category: '基础序列系统', ids: ['cnf'],        note: '原文件名 cnf.js（已统一大写）；/list 隐藏但可输入' },

  // --------------------------------------------------------------------------
  //  ne —— ne-rewritten 原生风格记号（ES module + NotationDefinition）
  //  与上面 rewritten/ 的区别：不再走远古 register.push 接口，直接 import
  //  core/ne 的运行时；init() 只返回表达式数组，树结构（含展开上界）由 core 拥有。
  //  条目需带 module: true，loader 会以 <script type="module"> 注入。
  //
  //  ⚠ 迁移期两套注册表并存：这些记号注册进 core/ne registry，而 UI 目前仍读
  //    window.register（远古接口）。所以同一 id 会同时存在于两边——暂不冲突，
  //    UI 切到新注册表（阶段四）时再停用上面 rewritten/ 里的旧条目。
  // --------------------------------------------------------------------------
  { file: 'notation/ne/categories.js',       category: '(ne 分类骨架)', ids: [], module: true, note: 'ne 分类树（纯容器分类）' },
  { file: 'notation/ne/Omega.js',            category: '基础序列系统', ids: ['omega'], module: true, note: 'ne 原生：自然数 ω' },
  { file: 'notation/ne/Minus1_Y_nSS.js',     category: 'Y 序列', ids: ['-1y-1ss'], module: true, note: 'ne 原生：(-1)Y-nSS 家族（-1y-1ss..6ss，generator start=0）' },
  { file: 'notation/ne/T_Minus1_Y_nSS.js',   category: 'Y 序列', ids: ['t--1y-1ss'], module: true, note: 'ne 原生：T(-1)Y-nSS 家族（t--1y-1ss..6ss）' },
  { file: 'notation/ne/partial-UPMS.js',     category: 'Bashicu 矩阵系', ids: ['upms-partial-2'], module: true, note: 'ne 原生：(>n)-UPMS 家族（2..9 档）' },
  { file: 'notation/ne/nBM-BHM.js',          category: 'Bashicu 矩阵系', ids: ['1-bm-bhm'], module: true, note: 'ne 原生：nBM-BHM 家族（1..8 档）' },
  { file: 'notation/ne/BHM.js',              category: 'Bashicu 矩阵系', ids: ['bhm'], module: true, note: 'ne 原生：Bashicu hyper matrix（导出 BHM_expand 供 nBM-BHM 复用）' },
  { file: 'notation/ne/BM_converter.js',     category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：BMS 三角转换等工具（被 BM.js import）' },
  { file: 'notation/ne/BM.js',               category: 'Bashicu 矩阵系', ids: ['bm4', 'tri-bm4', '0y'], module: true, note: 'ne 原生：BMS / 三角 BMS / 0-Y' },
  { file: 'notation/ne/LPMS.js',             category: 'Bashicu 矩阵系', ids: ['lpms', 'lptss'], module: true, note: 'ne 原生：Lifting projection matrix system（含 LPTSS）' },
  { file: 'notation/ne/BTBM.js',             category: 'Bashicu 矩阵系', ids: ['btbm'], module: true, note: "ne 原生：Bubby3's Transfinite BMS" },
  { file: 'notation/ne/BTBM-weak.js',        category: 'Bashicu 矩阵系', ids: ['btbm-weak'], module: true, note: 'ne 原生：weak BTBMS（import ./BTBM.js）' },
  { file: 'notation/ne/legacyMatrixUtils.js', category: '(ne 工具)', ids: [], module: true, note: '硬切基础设施：远古矩阵工具（matrix_display / matrix_limit / matrix_compare + sequence_compare）。与 ne BM.js 的导出**不等价**（display 不去尾零、is_limit(Infinity) 等），故单独抽取' },
  { file: 'notation/ne/UPMS_utils.js',       category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：UPMS 本体与 (>n)-UPMS 族共享算法层（expand + 8 个内部工具）' },
  { file: 'notation/ne/UPMS.js',             category: 'Bashicu 矩阵系', ids: ['upms'], module: true, note: 'ne 原生：Unupgrading projection matrix system（UP0Y / simple 视图）' },
  { file: 'notation/ne/asan_helpers.js',     category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：aSAN 系列共享工具' },
  { file: 'notation/ne/aSAN.js',             category: '强数组记号 (aSAN)', ids: ['asan-1'], module: true, note: "ne 原生：Aarex's superstrong array notation" },
  { file: 'notation/ne/aSAN2.js',            category: '强数组记号 (aSAN)', ids: ['asan-2'], module: true, note: 'ne 原生：aSAN 2' },
  { file: 'notation/ne/aSAN3.js',            category: '强数组记号 (aSAN)', ids: ['asan-3'], module: true, note: 'ne 原生：aSAN 3' },
  { file: 'notation/ne/aSAN_tilde3plus.js',  category: '强数组记号 (aSAN)', ids: ['asan-tilde3plus'], module: true, note: 'ne 原生：aSAN~3+' },
  { file: 'notation/ne/MM.js',               category: 'Bashicu 矩阵系', ids: ['mm'], module: true, note: '硬切改写：Mutant matrix（FS 外层有不可展开门控）' },
  { file: 'notation/ne/MM2.js',              category: 'Bashicu 矩阵系', ids: ['mm2'], module: true, note: '硬切改写：Mutant matrix 2' },
  { file: 'notation/ne/MM3.js',              category: 'Bashicu 矩阵系', ids: ['mm3'], module: true, note: '硬切改写：Mutant matrix 3（FS 外层有不可展开门控）' },
  { file: 'notation/ne/BSM2.js',             category: 'Bashicu 矩阵系', ids: ['bsm2'], module: true, note: '硬切改写：Bashicu sudden matrix 2（门控 = 旧引擎 able||semiable）' },
  { file: 'notation/ne/BTM.js',              category: 'Bashicu 矩阵系', ids: ['btm'], module: true, note: '硬切改写：Bashicu triple matrix（门控 = 旧引擎 able||semiable）' },
  { file: 'notation/ne/EPM.js',              category: 'Bashicu 矩阵系', ids: ['epm'], module: true, note: '硬切改写：EPM（门控 = matrix_limit）' },
  { file: 'notation/ne/BHhM.js',             category: 'Bashicu 矩阵系', ids: ['bhhm'], module: true, note: '硬切改写：BHhM（无门控：远古 semiable 让调用面重合）' },
  { file: 'notation/ne/BDM.js',              category: 'Bashicu 矩阵系', ids: ['bdm'], module: true, note: '硬切改写：Bashicu difference matrix（无门控：远古 semiable 让调用面重合）' },
  { file: 'notation/ne/BHM2.js',             category: 'Bashicu 矩阵系', ids: ['bhm2'], module: true, note: '硬切改写：Bashicu hyper matrix 2（无门控）' },
  { file: 'notation/ne/BIM.js',              category: 'Bashicu 矩阵系', ids: ['bim'], module: true, note: '硬切改写：Bashicu intermediate matrix（无门控）' },
  { file: 'notation/ne/UPS.js',              category: 'Bashicu 矩阵系', ids: ['ups'], module: true, note: '硬切改写：Upward Projection Sequence（门控 = matrix_limit）' },
  { file: 'notation/ne/X-Y.js',              category: 'Y 序列', ids: ['x-y'], module: true, note: '硬切改写：X-Y 序列（无门控：远古 semiable 让调用面重合）' },
  { file: 'notation/ne/wmms.js',             category: 'Bashicu 矩阵系', ids: ['wmms'], module: true, note: '硬切改写：远古版 wMM（id `wmms`）。⚠ 与 notation/ne/wMM.js（ne 原版 wMM，id `wmm`）是两个不同记号：接口层实测分叉（display 保留列宽、is_limit(Infinity)、compare(·,Infinity) 行为都不同），勿当重复文件删掉其一' },
  { file: 'notation/ne/BBM.js',              category: 'Bashicu 矩阵系', ids: ['bbm'], module: true, note: 'ne 原生：Branching BMS（本地新增记号）' },
  { file: 'notation/ne/TBM.js',              category: 'Bashicu 矩阵系', ids: ['tbm'], module: true, note: 'ne 原生：Transfinite Bashicu matrix' },
  { file: 'notation/ne/TUPMS.js',            category: 'Bashicu 矩阵系', ids: ['tupms'], module: true, note: 'ne 原生：Transfinite UPMS（本地新增记号，依赖 TBM.js）' },
  { file: 'notation/ne/Abs_B_Minus1_Y_nSS.js', category: 'Y 序列', ids: ['bt--1y-1ss'], module: true, note: 'ne 原生：abs B(-1)Y-nSS 家族（bt--1y-1ss..4ss）' },
  { file: 'notation/ne/Rel_B_Minus1_Y_nSS.js', category: 'Y 序列', ids: ['rel-bt--1y-1ss'], module: true, note: 'ne 原生：rel B(-1)Y-nSS 家族（本地新增记号）' },
  { file: 'notation/ne/BT_star_Minus1_Y_nSS.js',    category: 'Y 序列', ids: ['bt*--1y-2ss'], module: true, note: 'ne 原生：BT*(-1)Y-nSS v1（2ss..6ss）' },
  { file: 'notation/ne/BT_star_Minus1_Y_nSS_v2.js', category: 'Y 序列', ids: ["bt*--1y-2ss'"], module: true, note: "ne 原生：strong BT*(-1)Y-nSS v2（id 带尾撇）" },
  { file: 'notation/ne/BT_star_Minus1_Y_nSS_v3.js', category: 'Y 序列', ids: ['bt*--1y-2ss-v3'], module: true, note: 'ne 原生：weak BT*(-1)Y-nSS v3' },
  { file: 'notation/ne/BTL_Minus1_Y_nSS.js',        category: 'Y 序列', ids: ['btl--1y-2ss'], module: true, note: 'ne 原生：BTL(-1)Y-nSS ATnSS（combined 视图）' },
  { file: 'notation/ne/Omega_MN.js',         category: 'ω 山记号 (MN)', ids: ['omega-mn'], module: true, note: 'ne 原生：ω 山记号' },
  { file: 'notation/ne/T_omega_MN.js',       category: 'ω 山记号 (MN)', ids: ['t-omega-mn'], module: true, note: 'ne 原生：Transfinite ωMN' },
  { file: 'notation/ne/n_shifted_psi.js',    category: 'OCF 序数折叠函数', ids: ['hspn'], module: true, note: 'ne 原生：n-shifted psi' },
  { file: 'notation/ne/BomegaMN.js',         category: 'ω 山记号 (MN)', ids: ['b-omega-mn'], module: true, note: '硬切改写：BωMN（门控 = is_limit；Entry 结构与其他 MN 族不同，故不接 MN_FS_variants）' },
  { file: 'notation/ne/ton_helpers.js',      category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：TON 系共享工具（被 TON_main 等 import）' },
  { file: 'notation/ne/TON_main.js',         category: 'TON', ids: ['ton-m'], module: true, note: 'ne 原生：Taranovsky 序数记号' },
  { file: 'notation/ne/DEN.js',              category: 'DEN', ids: ['den'], module: true, note: 'ne 原生：Defective embedding notation' },
  { file: 'notation/ne/DEN2.js',             category: 'DEN', ids: ['den2', 'weak-den2'], module: true, note: 'ne 原生：DEN2（IBLP）+ weak IBLP' },
  { file: 'notation/ne/DEN3.js',             category: 'DEN', ids: ['den3'], module: true, note: 'ne 原生：DEN3' },
  { file: 'notation/ne/cOCF.js',             category: 'OCF 序数折叠函数', ids: ['cocf'], module: true, note: 'ne 原生：cOCF' },
  { file: 'notation/ne/LMN.js',              category: 'OCF 序数折叠函数', ids: ['lmn'], module: true, note: 'ne 原生：lifting M-notation' },
  { file: 'notation/ne/LON.js',              category: 'OCF 序数折叠函数', ids: ['lon'], module: true, note: 'ne 原生：lifting Omega notation' },
  { file: 'notation/ne/OCN_utils.js',        category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：OCN 显示 IR 与渲染（被 BOCF/MOCF/NOCF 等 import）' },
  { file: 'notation/ne/BOCF_EBO.js',         category: 'OCF 序数折叠函数', ids: ['bocf-ebo'], module: true, note: "ne 原生：Buchholz's OCF" },
  { file: 'notation/ne/TON_DoR.js',          category: 'TON', ids: ['ton-dr'], module: true, note: 'ne 原生：Degrees of Reflection' },
  { file: 'notation/ne/TON_DRC.js',          category: 'TON', ids: ['ton-drc'], module: true, note: 'ne 原生：DoR (reflection configuration)' },
  { file: 'notation/ne/TON_DRP.js',          category: 'TON', ids: ['ton-drp'], module: true, note: 'ne 原生：DoR with Passthrough' },
  { file: 'notation/ne/TON_DRPC.js',         category: 'TON', ids: ['ton-drpc'], module: true, note: 'ne 原生：DoR with Passthrough (reflection configuration)' },
  { file: 'notation/ne/TON_I.js',            category: 'TON', ids: ['ton-i'], module: true, note: 'ne 原生：Iteration of n-built from below' },
  { file: 'notation/ne/TON_IBP.js',          category: 'TON', ids: ['ton-ibp'], module: true, note: 'ne 原生：Iteration of n-built from below (with passthrough)' },
  { file: 'notation/ne/TON_MC.js',           category: 'TON', ids: ['ton-mc'], module: true, note: 'ne 原生：TON (reflection configuration)' },
  { file: 'notation/ne/TON_MPC.js',          category: 'TON', ids: ['ton-mpc'], module: true, note: 'ne 原生：TON with passthrough (reflection configuration)' },
  { file: 'notation/ne/MOCF_EBO.js',         category: 'OCF 序数折叠函数', ids: ['mocf-ebo'], module: true, note: "ne 原生：Madore's OCF" },
  { file: 'notation/ne/NOCF_EBO.js',         category: 'OCF 序数折叠函数', ids: ['nocf-ebo'], module: true, note: 'ne 原生：Nothing OCF' },
  { file: 'notation/ne/Inacc_OCF.js',        category: 'OCF 序数折叠函数', ids: ['inacc-ocf'], module: true, note: 'ne 原生：Inaccessible ordinal OCF' },
  { file: 'notation/ne/UPS1_1r5.js',         category: '基础序列系统', ids: ['ups1.1r5'], module: true, note: 'ne 原生：Upward Projection Sequence 1.1r5' },
  { file: 'notation/ne/finite_Mahlo_OCF.js', category: 'OCF 序数折叠函数', ids: ['finite-mahlo-ocf'], module: true, note: 'ne 原生：finite Mahlo OCF（ne 的 main.ts 未注册，本项目保留）' },
  { file: 'notation/ne/CMS.js',              category: 'Bashicu 矩阵系', ids: ['cms'], module: true, note: 'ne 原生：Crane matrix system' },
  { file: 'notation/ne/BSM.js',              category: 'Bashicu 矩阵系', ids: ['bsm'], module: true, note: 'ne 原生：Bashicu sudden matrix' },
  { file: 'notation/ne/BLM.js',              category: 'Bashicu 矩阵系', ids: ['blm'], module: true, note: 'ne 原生：Bashicu large matrix' },
  { file: 'notation/ne/wMM.js',              category: 'Bashicu 矩阵系', ids: ['wmm'], module: true, note: 'ne 原生：Weak mutant matrix' },
  { file: 'notation/ne/DSM.js',              category: 'Bashicu 矩阵系', ids: ['dsm'], module: true, note: 'ne 原生：Diagonal Sudden Matrix' },
  { file: 'notation/ne/e0MN.js',             category: 'ω 山记号 (MN)', ids: ['e0mn'], module: true, note: 'ne 原生：e0 山记号' },
  { file: 'notation/ne/strong_e0MN.js',      category: 'ω 山记号 (MN)', ids: ['strong-e0mn'], module: true, note: 'ne 原生：strong e0 山记号' },
  { file: 'notation/ne/Aw2MN2.js',           category: 'ω 山记号 (MN)', ids: ['a-omega2-mn-2', 'weak-a-omega2-mn-2'], module: true, note: 'ne 原生：Astral ω·2 山记号 2（含 weak 变体）' },
  { file: 'notation/ne/Aw2MN3.js',           category: 'ω 山记号 (MN)', ids: ['a-omega2-mn-3', 'weak-a-omega2-mn-3'], module: true, note: 'ne 原生：Astral ω·2 山记号 3（含 weak 变体）。原先漏在本清单之外，靠 /list 重构才发现：文件在、浏览器不加载，只能落到远古版本' },
  // ⚠ 转换器记号（translator-bm-bocf）**暂时摘掉**（用户 2026-10 要求）：
  //   BMS→BOCF 的转换能力并没有丢 —— 它是 bm4 的一个**显示视图**（NOTATION_META.bm4
  //   的 converters → core/converters.js 的 'bm-ocf' → core/bmBocf.js），走视图按钮即可。
  //   这里摘掉的只是「把它本身当一个记号列进 /list」这一条。文件保留在
  //   notation/ne/BM-BOCF.js，要恢复就把下面一行放回来。
  // { file: 'notation/ne/BM-BOCF.js',          category: 'OCF 序数折叠函数', ids: ['translator-bm-bocf'], module: true, note: 'ne 原生：BMS→BOCF 转换器记号（OCF / OCF full / n.s. OCF / n.s. OCF full 四视图）' },
  { file: 'notation/ne/Omega_Y.js',          category: 'Y 序列', ids: ['omega-y-weak', 'omega-y-actual', 'omega-y-medium', 'omega-y-strong'], module: true, note: 'ne 原生：Y 系基础模块（四个 magma 变体 + ω-Y 工具导出，被 Y/variants 等 import）' },
  { file: 'notation/ne/weak-omega-Y.js',     category: 'Y 序列', ids: ['weak-omega-y'], module: true, note: 'ne 原生：Weak ω-Y (weak magma)' },
  { file: 'notation/ne/omegaY-variants.js',  category: 'Y 序列', ids: ['omega-y-12omega', 'omega-y-1257omega', 'omega-y-skew'], module: true, note: 'ne 原生：ω-Y 的 limit 变体（12ωY / 1257ωY / Skew ωY）' },
  { file: 'notation/ne/minus1_Y.js',         category: 'Y 序列', ids: ['-1y'], module: true, note: 'ne 原生：(-1)Y 序列' },
  { file: 'notation/ne/T_minus1_Y.js',       category: 'Y 序列', ids: ['t--1y'], module: true, note: 'ne 原生：T(-1)Y 序列' },
  { file: 'notation/ne/Y.js',                category: 'Y 序列', ids: ['y-seq'], module: true, note: 'ne 原生：Y sequence' },
  { file: 'notation/ne/omegaY.js',           category: 'Y 序列', ids: ['omega-y'], module: true, note: '硬切改写：远古 ω-Y sequence（门控 = Y_limit）。⚠ 与 notation/ne/Omega_Y.js 的四个 magma 变体不是同一记号（可达域上 FS 与远古全同，分叉在非 able 域）。另：notation/legacy/omega-Y.js **必须保留**——它是全局 sequence_display / Y_limit / sequence_compare 的锚点，X-Y.js / 1-Y.js / user/PPS.js 都 dependsOn 它' },
  { file: 'notation/ne/GMS.js',              category: 'GMS', ids: ['BMS-20260721-v10-weirdfull-display-GBMS-omega-P'],
    module: true, note: 'ne 原生：GMS（GBMS/UPMS/LPMS2 × 5 投影 + 3 个 n-P generator，共 21 个记号）' },
  // —— 硬切改写：ne 里没有对应物、由远古接口改写成 ne 风格的自有记号 ——
  { file: 'notation/ne/PrSS.js',             category: '基础序列系统', ids: ['prss'], module: true, note: '硬切改写：PrSS 原始数列系统（算法零漂移，树形按 ne 语义）' },
  { file: 'notation/ne/PPS.js',              category: '基础序列系统', ids: ['pps'], module: true, note: '硬切改写：PPS（display/compare 已内联，模块自足）' },
  { file: 'notation/ne/SPS.js',              category: '基础序列系统', ids: ['sps'], module: true, note: '硬切改写：SPS（源无 semiable，ne 激活了旧的不可达截断分支）' },
  { file: 'notation/ne/DFSS.js',             category: '基础序列系统', ids: ['dfss'], module: true, note: '硬切改写：DFSS' },
  { file: 'notation/ne/CNF.js',              category: '基础序列系统', ids: ['cnf'], module: true, note: '硬切改写：Cantor normal form（display 按 legacyAdapter 映射为 plain=html，FS 顶部有 1 行不可展开保护）' },
  { file: 'notation/ne/PPS4.js',             category: '基础序列系统', ids: ['pps4', 'wpps4', 'ewpps4', 'spps4', 'tpps4'], module: true, note: '硬切改写：PPS4 系列五个（算法零漂移，树形也相同）' },
  { file: 'notation/ne/Veblen.js',           category: 'OCF 序数折叠函数', ids: ['veblen-phi'], module: true, note: "ne 原生：Extended Veblen's φ Function（separate 视图）" },
  // —— SDBMS 族（补验：.tmp-ne/verify-ne-batch.mjs 17/17 一致）——
  { file: 'notation/ne/SDBMS_utils.js',      category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：SDBMS 族共享工具' },
  { file: 'notation/ne/S_omega_DBMS-v1.js',  category: 'ω 山记号 (MN)', ids: ['s-omega-dbms'], module: true, note: 'ne 原生：S ω DBMS v1' },
  { file: 'notation/ne/S_omega_DBMS-v2.js',  category: 'ω 山记号 (MN)', ids: ['s-omega-dbms-v2'], module: true, note: 'ne 原生：S ω DBMS v2' },
  { file: 'notation/ne/S_omega_DBMS-v3.js',  category: 'ω 山记号 (MN)', ids: ['s-omega-dbms-v3'], module: true, note: 'ne 原生：S ω DBMS v3' },
  { file: 'notation/ne/S1DBMS.js',           category: 'ω 山记号 (MN)', ids: ['s1dbms'], module: true, note: 'ne 原生：S1DBMS' },
  { file: 'notation/ne/S_omega_p1_DBMS.js',  category: 'ω 山记号 (MN)', ids: ['s-omega+1-dbms'], module: true, note: 'ne 原生：S ω+1 DBMS' },
  { file: 'notation/ne/S_omega2_DBMS.js',    category: 'ω 山记号 (MN)', ids: ['s-omega2-dbms'], module: true, note: 'ne 原生：S ω2 DBMS' },
  { file: 'notation/ne/S_omega_square_DBMS.js', category: 'ω 山记号 (MN)', ids: ['s-omega^2-dbms'], module: true, note: 'ne 原生：S ω^2 DBMS（源文件 S_omega^2_DBMS.ts，文件名把 ^ 写成 square）' },
  // —— SMN 族 ——
  { file: 'notation/ne/SMN_common.js',       category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：SMN 族共享工具' },
  { file: 'notation/ne/n_MN.js',             category: 'ω 山记号 (MN)', ids: ['1-mn'], module: true, note: 'ne 原生：n-MN 家族（1-mn..8-mn，generator start=1）' },
  { file: 'notation/ne/SA_omega2_MN.js',     category: 'ω 山记号 (MN)', ids: ['sa-omega2-mn'], module: true, note: 'ne 原生：Smile Astral ω2 MN（ne 原 id 为 SA-omega2-MN，本项目沿用旧 id）' },
  { file: 'notation/ne/S_omega2_MN.js',      category: 'ω 山记号 (MN)', ids: ['s-omega2-mn'], module: true, note: 'ne 原生：Smile ω2 MN（ne 原 id 为 S-omega2-MN）' },
  { file: 'notation/ne/S_omega_pow_omega_MN.js', category: 'ω 山记号 (MN)', ids: ['s-omega-pow-omega-mn'], module: true, note: 'ne 原生：Smile ω^ω MN（ne 原 id 为 S-omega^omega-MN）' },
  // —— UPMN 族（9 个）——
  { file: 'notation/ne/UPMN_utils.js',       category: '(ne 工具)', ids: [], module: true, note: 'ne 原生：UPMN 族共享工具' },
  { file: 'notation/ne/UP1MN.js',            category: 'ω 山记号 (MN)', ids: ['up1mn'], module: true, note: 'ne 原生：UP1MN' },
  { file: 'notation/ne/UP1DBMS.js',          category: 'ω 山记号 (MN)', ids: ['up1dbms'], module: true, note: 'ne 原生：UP1DBMS' },
  { file: 'notation/ne/UP2MN-v1a.js',        category: 'ω 山记号 (MN)', ids: ['up2mn-v1a'], module: true, note: 'ne 原生：UP2MN v1A' },
  { file: 'notation/ne/UP2MN-v1b.js',        category: 'ω 山记号 (MN)', ids: ['up2mn-v1b'], module: true, note: 'ne 原生：UP2MN v1B' },
  { file: 'notation/ne/UP2MN-v1b-plus.js',   category: 'ω 山记号 (MN)', ids: ['up2mn-v1b+'], module: true, note: 'ne 原生：UP2MN v1B+' },
  { file: 'notation/ne/UP2DBMS-v1.js',       category: 'ω 山记号 (MN)', ids: ['up2dbms-v1'], module: true, note: 'ne 原生：UP2DBMS v1' },
  { file: 'notation/ne/UP2DBMS-v1b-plus.js', category: 'ω 山记号 (MN)', ids: ['up2dbms-v1b+'], module: true, note: 'ne 原生：UP2DBMS v1B+' },
  { file: 'notation/ne/UP2DBMS-v1c.js',      category: 'ω 山记号 (MN)', ids: ['up2dbms-v1c'], module: true, note: 'ne 原生：UP2DBMS v1C' },
  { file: 'notation/ne/UP2DBMS-v2.js',       category: 'ω 山记号 (MN)', ids: ['up2dbms-v2'], module: true, note: 'ne 原生：UP2DBMS v2' },

  // --------------------------------------------------------------------------
  //  从参考版「自助版 NE-4.8.1」移植的用户记号（经典 6 方法接口 + 适配器）
  //  这些不是 ne-rewritten 原版记号，算法来自参考版的 __BUILTIN_FACTORIES，
  //  由 core/ne/classicNotation.js 接到 ne 接口后注册。/list 的类/子类归组见
  //  ui/notationList.js 的 DISPLAY_GROUP。
  // --------------------------------------------------------------------------
  { file: 'notation/ne/classic_Primitive.js', category: 'Primitive 序列', ids: ['LPrSS', 'HPrSS', 'plprss', 'slprss', 'shprss', 'ilprss', 'w3z-LPrSS'], module: true, note: '移植：HPrSS / LPrSS 系（7 个）' },
  { file: 'notation/ne/classic_Ancestral.js', category: '祖先/基本列序列', ids: ['rcss', 'wrcss', 'gss', 'wfss', 'swfss', 'rfss', 'fss', 'ham2sss'], module: true, note: '移植：RCSS / FSS 系（8 个）' },
  { file: 'notation/ne/classic_Worm.js',      category: '虫/三角序列', ids: ['trss', 'trssw', 'ndpworm'], module: true, note: '移植：三角序列 / 虫（3 个）' },
  { file: 'notation/ne/classic_SSS.js',       category: 'SSS 系', ids: ['SSSS', 'ISSSS', 'IUSSS', 'LHSS', 'SSSHydra'], module: true, note: '移植：SSS 系（5 个）' },
  { file: 'notation/ne/classic_DiffSeq.js',   category: '差序列', ids: ['buchholzSeq', 'SPrDSS'], module: true, note: '移植：差序列（2 个）' },
  { file: 'notation/ne/classic_L0Y.js',       category: 'L0-Y 矩阵', ids: ['L0Y', 'lbms'], module: true, note: '移植：L0-Y 矩阵（2 个）' },
  { file: 'notation/ne/classic_Descending.js', category: '降下矩阵', ids: ['ldms', 'DDMS'], module: true, note: '移植：降下矩阵（2 个）' },
  { file: 'notation/ne/classic_Sudden.js',    category: 'sudden 矩阵', ids: ['zsm', 'usm'], module: true, note: '移植：sudden 矩阵（2 个）' },
  { file: 'notation/ne/classic_Mountain.js',  category: '山脉系', ids: ['mountain', 'wam'], module: true, note: '移植：山脉系（2 个）' },
  // 注意：参考版还有一个 translator-multi（互译器），**没有搬** —— 它的 parse 对任何
  // 输入都返回 null（靠别的入口做互译，不是「可输入表达式的记号」），放进 /list 只会
  // 让人点进去却输不进去。实测见 .tmp-ne/probe-classic-bad.js.mjs。
];
