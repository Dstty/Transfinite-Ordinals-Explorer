// ============================================================================
//  notation/ne/BTM.js — Bashicu triangular matrix（硬切改写）
// ============================================================================
//  来源：notation/legacy/BTM.js（远古接口，register.push 形态，2024/2/8 版）。
//  BTM 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；同类矩阵类产物：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const BTM = {...} + register_notation(BTM)
//    display: matrix_display                  display: { plain: matrix_display }
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    semiable: m => m.length > 0              ——（ne 无此概念，语义并入 FS 门控，见下）
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    无分类                                    category_id: 'category-bm-like'
//
//  `matrix_display` / `matrix_limit` / `matrix_compare` 来自
//  `./legacyMatrixUtils.js`——**不是** notation/ne/BM.js（两者实测不等价，
//  证据见 legacyMatrixUtils.js 文件头）。
//
//  算法本体（expand 与包它的 FS 闭包）逐行照搬，一个字未改；只把原内联在
//  字段上的 FS 提成具名 `FS_raw`，并在**外层接口字段**加一道门控。
//
//  ## 为什么必须加 FS 门控（MM 任务踩过的坑）
//
//  远古引擎从不把「不可展开」的输入递给 FS：core/engine.js:152-157 先做
//  `ableHit || semiableHit` 短路，两者皆假直接 return。ne 引擎没有这层短路——
//  core/ne/expander.js 的 expand_single 对**非 limit 节点一律**先算 `FS(expr, 0)`
//  试探，于是远古 FS 在退化输入上的抛错/死循环，在 ne 下会变成用户点两下就崩。
//
//  本记号远古侧声明了 `semiable: m => m.length > 0`，因此旧引擎真正会调 FS 的
//  输入集合 = `able(m) || semiable(m)` = `matrix_limit(m) || m.length > 0`。
//  门控条件**逐条等价翻译**这条短路，不自行放宽也不收紧：
//
//      FS: (m, n) => (matrix_limit(m) || m.length > 0) ? FS_raw(m, n) : m
//
//  实际拦到的输入只有两类：
//    · 裸 `Infinity`（`Infinity.length` 是 undefined → 两侧判定皆假）。无门控时
//      FS_raw 会返回具体矩阵，接着 ne 用 matrix_compare 拿它与 Infinity 比较，
//      读 `Infinity[0].length` 即 TypeError（该远古缺陷见 legacyMatrixUtils.js
//      文件头实测记录）。旧引擎对裸 Infinity 同样不展开。
//    · 空矩阵 `[]`（门控返回自身，与 FS_raw 的 `m.length===0 → []` 同值，恒等）。
//  其余非 limit 矩阵（如 `[[0]]`）旧引擎**确实**会调 FS(0) 做 semiable 判定的
//  下界比较，故门控照调 FS_raw，行为与远古一致——本记号不属于 MM 那种
//  「旧引擎永不调 FS」的情形。
//
//  ## 另一处语义变化：low 边界退役
//
//  旧 init 给 `{expr:[[Infinity]],low:[[]]} , {expr:[],low:[[]]}`，上界由记号手写；
//  ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound）。旧版展开极限项
//  时把它作为**兄弟**插进根列表，ne 会把它作为**子节点**挂下去——树形不同但展开
//  内容相同，这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const BTM = (()=>{
   var FS_raw = (()=>{
      var data={}
      ,expand = (B,A)=>{
         var D4=B.length-1,D3=B[0].length-1
         ,B2=Array(D4+1).fill(Array(D3+1).fill(0))
         ,C=Array(D3+1).fill(0)
         ,C2=Array(D4+1).fill(0)
         ,C3=Array(D3+1).fill(0)
         ,D8=0,D9=0,D18=0,D19=0,D20=0
         for(var D5=0;D5<=D3;++D5){
            if(0<B[D4][D5] && !B[D4][D5+1]){
               for(var D6=0;D6<=D4;++D6){
                  for(var D7=0;D7<=D5;++D7){
                     if(B[D4-D6][D7]<B[D4][D7]-C[D7]){
                        if(D7<D5){
                           C[D7]=B[D4][D7]-B[D4-D6][D7]
                        }else{
                           if(!D8) D8=D6
                           ;++D9
                           C2[D9]=D6
                           for(var D10=0;D10<=D5;++D10){
                              B2[D4-D6][D10]=D9
                           }
                           for(var D11=0;D11<=D5;++D11){
                              for(var D12=D4-D6;D12<=D4;++D12){
                                 for(var D13=D12;D13>=D4-D6;--D13){
                                    for(var D14=0;D14<=D11;++D14){
                                       if(B[D13][D14]<B[D12][D14]-C3[D14]){
                                          if(D11===D14){
                                             if(0<B2[D13][D11] && !B2[D12][D11]) B2[D12][D11]=D9
                                             D13=D4-D6
                                          }else{
                                             C3[D14]=B[D12][D14]-B[D13][D14]
                                          }
                                       }else{
                                          D14=D11
                                       }
                                    }
                                 }
                                 for(var D15=0;D15<=D5;++D15){
                                    C3[D15]=0
                                 }
                              }
                           }
                           if(B[D4][D5]===1){
                              for(var D16=0;D16<=D8;++D16){
                                 for(var D17=0;D17<=D3;++D17){
                                    D18=0
                                    if(0<B2[D4-D8+D16][D17]){
                                       if(D17<D5) D18=B[D4-C2[B2[D4-D8+D16][D17]]][D17]-B[D4-D6][D17]
                                    }
                                    if(B[D4-D6+D16][D17]<B[D4-D8+D16][D17]-D18){
                                       D16=D8;D17=D3;D19=1;D6=D4
                                    }else if(B[D4-D8+D16][D17]-D18<B[D4-D6+D16][D17]){
                                       D16=D8;D17=D3
                                    }
                                 }
                              }
                              if(!D19) D20=D6
                              else D19=0
                           }else{
                              D20=D6;D6=D4
                           }
                        }
                     }else{
                        D7=D5
                     }
                  }
               }
               D5=D3
            }
         }
         for(var D21=0;D21<=D3;++D21){
            if(0<B[D4][D21+1]) C[D21]=B[D4][D21]-B[D4-D20][D21]
         }
         var result = B.slice(0,D4).map(col=>col.slice())
         for(var D22=1;D22<=A*D20;++D22){
            if(!result[D4]) result[D4]=[]
            if(!B2[D4]) B2[D4]=[]
            for(var D23=0;D23<=D3;++D23){
               if(0<B2[D4-D20][D23]){
                  result[D4][D23]=result[D4-D20][D23]+C[D23]
               }else{
                  result[D4][D23]=result[D4-D20][D23]
               }
               B2[D4][D23]=B2[D4-D20][D23]
            }
            ++D4
         }
         if(D3>0&&result.every(column=>column[D3]===0)) result = result.map(column=>column.slice(0,D3))
         return result
      }
      return (m,FSterm)=>{
         if(''+m==='Infinity') return FSterm?Array(1+FSterm).fill(0).map((e,i)=>Array(FSterm).fill(0).map((e,j)=>i>j?i-j:0)):[[0]]
         if(m.length===0) return []
         var datakey=matrix_display(m)
         if(!data[datakey]) data[datakey] = []
         else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
         return data[datakey][FSterm] = expand(m,FSterm)
      }
   })()
   return {
      id:'btm'
      ,name:'Bashicu triangular matrix'//Bashicu triangular matrix at 2024/2/8
      ,category_id:'category-bm-like'
      ,display:{plain:matrix_display}
      ,is_limit:matrix_limit
      ,compare:matrix_compare
      ,FS:(m,FSterm)=>(matrix_limit(m)||m.length>0)?FS_raw(m,FSterm):m
      ,init:()=>([
         [[Infinity]]
         ,[]
      ])
   }
})()

register_notation(BTM);
