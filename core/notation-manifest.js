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
];
