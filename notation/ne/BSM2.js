// ============================================================================
//  notation/ne/BSM2.js — Bashicu sudden matrix number 2（硬切改写）
// ============================================================================
//  来源：notation/legacy/BSM2.js（远古接口，register.push 形态）。
//  BSM2 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；同类矩阵类产物：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const BSM2 = {...} + register_notation(BSM2)
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

export const BSM2 = (()=>{
   var FS_raw = (()=>{
      var data={}
      ,expand = (B0,A)=>{
         var B = B0.slice().map(col=>col.slice())
         ,D3=B.length-1,D2=B[0].length-1
         ,B2=Array(D3+1).fill(Array(D2+1).fill(0))
         ,C=Array(D2+1).fill(0)
         ,C2=Array(D3+1).fill(0)
         ,C3=Array(D2+1).fill(0)
         ,D7=0,D8=0,D9=0,D17=0,D21=0
         for(var D4=0;D4<=D2;++D4){
            if(0<B[D3][D4]&&!B[D3][D4+1]){
               var D28=D4
               for(var D5=0;D5<=D3;++D5){
                  for(var D6=0;D6<=D4;++D6){
                     if(B[D3-D5][D6]<B[D3][D6]-C[D6]&&(C[D6]+1===B[D3][D6]-B[D3-D5][D6]||D28<=D6)){
                        if(D6<D4){
                           C[D6]=B[D3][D6]-B[D3-D5][D6]
                        }else{
                           if(!D7) D8=D5
                           ;++D9
                           C2[D9]=D5
                           for(var D10=0;D10<=D2;++D10){
                              B2[D3-D5][D10]=D9
                           }
                           for(var D11=1;D11<=D5;++D11){
                              for(var D12=0;D12<=D2;++D12){
                                 for(var D13=D11;D13>=0;--D13){
                                    for(var D14=0;D14<=D12;++D14){
                                       if(!B2[D3-D5+D11][D12]){
                                          if(B[D3-D5+D13][D14]<B[D3-D5+D11][D14]-C3[D14]&&C3[D14]+1===B[D3-D5+D11][D14]-B[D3-D5+D13][D14]){
                                             if(D12===D14&&0<B2[D3-D5+D13][D14]&&(0<B[D3-D5+D13][D14]||B2[D3-D5+D13][D14]===D9)){
                                                B2[D3-D5+D11][D14]=D9
                                             }else if(1<B[D3-D5+D11][D14]-C3[D14]){
                                                C3[D14]=B[D3-D5+D11][D14]-B[D3-D5+D13][D14]
                                             }
                                          }else{
                                             D14=D12
                                          }
                                       }
                                    }
                                 }
                                 for(var D15=0;D15<=D2;++D15){
                                    C3[D15]=0
                                 }
                              }
                           }
                           if(C[D4]+1<B[D3][D6]-B[D3-D5][D6]&&!B[D3-D5][D4+1]){
                              ++C[D4]
                              for(var D16=D4;D16<=D2;++D16){
                                 if(B[D3-D5][D16]===B[D3-D8][D16]-C[D16]){
                                    D17=1
                                 }else{
                                    D17=2;D16=D2
                                 }
                              }
                           }
                           if(0<B[D3-D5][D4+1]){
                              for(var D29=D4+1;D29<=D2;++D29){
                                 if(0<B[D3-D5][D29]){
                                    B[D3][D29]=B[D3-D5][D29]+1;++D4;D17=1
                                 }else{
                                    D29=D2
                                 }
                              }
                           }
                           if(D17===1){
                              D17=0;D7=D5
                           }else if(!D17){
                              for(var D18=0;D18<=D8;++D18){
                                 for(var D19=0;D19<=D2;++D19){
                                    var D20=0
                                    if(0<B2[D3-D8+D18][D19]){
                                       if(D19<D4+1) D20=B[D3-C2[B2[D3-D8+D18][D19]]][D19]-B[D3-D5][D19]
                                    }
                                    if(B[D3-D5+D18][D19]<B[D3-D8+D18][D19]-D20){
                                       D18=D8;D19=D2;D21=1;D5=D3;--D9
                                    }else if(B[D3-D8+D18][D19]-D20<B[D3-D5+D18][D19]){
                                       D18=D8;D19=D2
                                    }
                                 }
                              }
                              if(!D21) D7=D5
                              else D21=0
                           }else{
                              D17=0;D5=D3;D6=D4
                           }
                        }
                     }else{
                        D6=D4
                     }
                  }
               }
               D4=D2
            }
         }
         for(var D22=0;D22<=D2;++D22){
            if(D22<D28){
               C[D22]=B[D3][D22]-B[D3-D7][D22]
            }else if(0<B[D3][D22]){
               C[D22]=B[D3][D22]-B[D3-D7][D22]-1
            }else{
               D22=D2
            }
         }
         var result = B.slice(0,D3).map(col=>col.slice())
         for(var D23=1;D23<=A*D7;++D23){
            if(!result[D3]) result[D3]=[]
            if(!B2[D3]) B2[D3]=[]
            for(var D24=0;D24<=D2;++D24){
               if(0<B2[D3-D7][D24] && B2[D3-D7][D24]<D9+1 && (0<result[D3-D7][D24] || B2[D3-D7][D24]===D9)){
                  result[D3][D24]=result[D3-D7][D24]+C[D24]
               }else{
                  result[D3][D24]=result[D3-D7][D24]
               }
               B2[D3][D24]=B2[D3-D7][D24]
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
   return {
      id:'bsm2'
      ,name:'BSM2'//https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:BashicuHyudora/BAAN?oldid=59140#%E3%83%90%E3%82%B7%E3%82%AF%E6%80%A5%E8%A1%8C%E5%88%97%E6%95%B0(Bashicu_sudden_matrix_number)
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

register_notation(BSM2);
