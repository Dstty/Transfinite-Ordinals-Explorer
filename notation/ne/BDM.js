// ============================================================================
//  notation/ne/BDM.js — Bashicu difference matrix（硬切改写）
// ============================================================================
//  来源：notation/legacy/BDM.js（远古接口，`;register.push({...})` 形态）。
//  BDM 是本项目**远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；同类产物：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    ;register.push({...})                    export const BDM = {...} + register_notation(BDM)
//    display: matrix_display                  display: { plain: matrix_display }
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    FSalter                                  本记号远古侧无 FSalter → 不定义 FS_alter
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    semiable: m => m.length > 0              不移植（理由见「门控判定」）
//    无分类                                    category_id: 'category-bm-like'
//
//  `matrix_display` / `matrix_limit` / `matrix_compare` 取自
//  `./legacyMatrixUtils.js`（远古 notation/legacy/BM.js 的逐行抽出），
//  **不是** notation/ne/BM.js —— 两者实测不等价，证据见该文件头。
//
//  算法本体（`,FS:(()=>{` 到 `})()` 这一段 IIFE：`data` 缓存 + 闭包内的
//  `expand`）**逐字节照搬，一个字未改**；由 .tmp-ne/verify-hardcut-matrix-a.mjs
//  的 A 段做「远古 vs ne」源文本逐字节比对来保证。
//
//  ## 门控判定：**不加** MM 那处 `FS: (m,n) => matrix_limit(m) ? FS_raw(m,n) : m`
//
//  MM 的坑在于它**只有 able、没有 semiable**：远古引擎因此从不把非 limit 矩阵
//  递给 FS；ne 的 expand_single 对非 limit 节点一律先算 FS(expr,0)，远古实现
//  对退化矩阵的边界行为（抛 TypeError）就变成「用户点两下就崩」。
//  BDM 不同，它有
//      semiable: m => m.length > 0
//  而远古 core/engine.js 的可展开判定是 `able || semiable`：
//      {m : m.length > 0}  ⊋  {m : matrix_limit(m)}
//  即**远古引擎本来就会**对「非 limit 但非空」的矩阵调 FS(expr, 0)
//  —— semiableHit 那一支里就写着 `compare(FS(it.expr, 0), it.low[0]) > 0`。
//  所以 ne 相对远古**新增触达的输入只有三类**（实测：样本表里恰好 3 条）：
//      · 空矩阵 `[]`                       → FS 在进入 expand 之前就 `m.length === 0 → []`
//      · `'' + m === 'Infinity'` 的表达式   → FS 的 Infinity 特判分支早返回。
//        （裸 `Infinity` / `[Infinity]` / `[[Infinity]]` …）远古引擎在 semiable 分支上
//        显式短路 `!isInfinityExpr(it.expr)`，所以这些输入它从不递给 FS。
//  三条都既不抛错也不死循环，且与远古 FS 同结果（verify 脚本 B6/B4 段）。
//  反之，若照搬 matrix_limit 门控，会把 `[[]]` / `[[0]]` / `[Infinity]` 这类
//  **远古真的会算**的输入短路成恒等（远古 FS([[]], 0) === []），凭空制造漂移：
//  样本表内每个记号实测有 32 处与远古 FS 不一致（verify 脚本 B6 门控反证段）。
//  故本记号不加门控；实证见 .tmp-ne/verify-hardcut-matrix-a.mjs 的 B6 段
//  （逐条列出「ne 会探测而远古不探测」的输入并验证其安全）。
//
//  ## 两处既定语义变化（与 PrSS / MM 相同）
//
//  1. **semiable 退役**：ne 引擎对非 limit 节点自己算 FS(expr, 0) 并要求结果
//     严格小于自身（core/ne/expander.js expand_single）。对 BDM 而言这正是远古
//     semiableHit 分支要做的事，故该字段不再需要（不是被丢弃，是被引擎吸收）。
//  2. **low 边界退役**：旧 init 给 `{expr:[[Infinity]],low:[[]]}, {expr:[],low:[[]]}`，
//     上界由记号手写（FSbounded(FS, low)）；ne 里上界 = 先根遍历下一个节点
//     （core/ne/tree.js get_bound）。旧版展开极限项时把它作为**兄弟**插进根列表，
//     ne 会把它作为**子节点**挂下去 —— 树形不同但展开内容相同，这是 ne 的既定语义。
//
//  记号名原注释：バシク階差行列数 at 2024/2/8
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const BDM = {
   id:'bdm'
   ,name:'Bashicu difference matrix'//バシク階差行列数 at 2024/2/8
   ,category_id:'category-bm-like'
   ,display:{plain:matrix_display}
   ,is_limit:matrix_limit
   ,compare:matrix_compare
   ,FS:(()=>{
      var data={}
      ,expand = (B0,A)=>{
         var B=B0.slice().map(col=>col.slice())
         ,D3=B.length-1,D2=B[0].length-1
         ,B2=Array(D3+1).fill(Array(D2+1).fill(0))
         ,C=Array(D2+1).fill(0)
         ,C2=Array(D3+1).fill(0)
         ,C3=Array(D2+1).fill(0)
         ,D6=0,D7=0,D17=0,D19=0
         for(var D4=0;D4<=D3;++D4){
            for(var D5=0;D5<=D2;++D5){
               if(B[D3-D4][D5]<B[D3][D5]-C[D5] || !B[D3][0]){
                  if(!B[D3][0]){
                     D4=D3;D5=D2;D6=0
                  }else if(0<B[D3][D5+1]){
                     if(B[D3][D5]-B[D3-D4][D5]+C[D5]===1) C[D5]=B[D3][D5]-B[D3-D4][D5]
                  }else if(B[D3][D5]-B[D3-D4][D5]===2 && 0<B[D3][D5+1]){
                     for(var D8=D5+1;D8<=D2;++D8){
                        if(0<B[D3-D4][D8]) B[D3][D8]=B[D3-D4][D8]
                     }
                     D6=0
                     if(!D19) D19=D5
                  }else if(B[D3][D5]-B[D3-D4][D5]===1){
                     if(!D6) D6=D4
                     if(!D19) D19=D5
                     ;++D7
                     C2[D7]=D4
                     for(var D9=0;D9<=D2;++D9){
                        B2[D3-D4][D9]=D7
                     }
                     for(var D10=0;D10<=D2;++D10){
                        for(var D11=D3-D4;D11<=D3-1;++D11){
                           for(var D12=D11;D12>=D3-D4;--D12){
                              for(var D13=0;D13<=D10;++D13){
                                 if(B[D12][D13]<B[D11][D13]-C3[D13]){
                                    if(D10===D13){
                                       if(0<B2[D12][D10] && !B2[D11][D10]) B2[D11][D10]=D7
                                       D12=D3-D4
                                    }else{
                                       C3[D13]=B[D11][D13]-B[D12][D13]
                                    }
                                 }else{
                                    D13=D10
                                 }
                              }
                           }
                           for(var D14=0;D14<=D2;++D14){
                              C3[D14]=0
                           }
                        }
                     }
                     for(var D15=0;D15<=D6;++D15){
                        for(var D16=0;D16<=D2;++D16){
                           D17=0
                           if(0<B2[D3-D6+D15][D16]){
                              if(D16<D5) D17=B[D3-C2[B2[D3-D6+D15][D16]]][D16]-B[D3-D4][D16]
                           }
                           if(B[D3-D4+D15][D16]<B[D3-D6+D15][D16]-D17){
                              D15=D6;D16=D2;D4=D3;D5=D2
                           }else if(B[D3-D6+D15][D16]-D17<B[D3-D4+D15][D16]){
                              D15=D6;D16=D2
                           }
                        }
                     }
                  }
               }else{
                  D5=D2
               }
            }
         }
         for(var D18=0;D18<=D2;++D18){
            if(D18===D19){
               C[D18]=B[D3][D18]-B[D3-D6][D18]-1
            }else if(0<B[D3][D18]){
               C[D18]=B[D3][D18]-B[D3-D6][D18]
            }
         }
         var result = B.slice(0,D3).map(col=>col.slice())
         for(var D23=1;D23<=A*D6;++D23){
            if(!result[D3]) result[D3]=[]
            if(!B2[D3]) B2[D3]=[]
            for(var D20=0;D20<=D2;++D20){
               if(0<B2[D3-D6][D20] && (0<result[D3-D6][D20] || B2[D3-D6][D20]===D7)){
                  result[D3][D20]=result[D3-D6][D20]+C[D20]
               }else{
                  result[D3][D20]=result[D3-D6][D20]
               }
               B2[D3][D20]=B2[D3-D6][D20]
            }
            ++D3
         }
         if(D2>0&&result.every(column=>column[D2]===0)) result = result.map(column=>column.slice(0,D2))
         return result
      }
      return (m,FSterm)=>{
         if(''+m==='Infinity') return [Array(FSterm+1).fill(0),Array(FSterm+1).fill(1)]
         if(m.length===0) return []
         var datakey=matrix_display(m)
         if(!data[datakey]) data[datakey] = []
         else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
         return data[datakey][FSterm] = expand(m,FSterm)
      }
   })()
   ,init:()=>([
      [[Infinity]]
      ,[]
   ])
}

register_notation(BDM);
