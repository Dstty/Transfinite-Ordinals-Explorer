// ============================================================================
//  notation/ne/BHhM.js — Bashicu hyper huge matrix（硬切改写）
// ============================================================================
//  来源：notation/legacy/BHhM.js（远古接口，register.push 形态）。
//  BHhM 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；矩阵参考：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const BHhM = {...} + register_notation(BHhM)
//    display: matrix_display                  display: { plain: matrix_display }
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    semiable: m => m.length > 0              ——（ne 无此概念；见下「不需要门控」）
//    无分类                                    category_id: 'category-bm-like'
//
//  `matrix_display` / `matrix_limit` / `matrix_compare` 来自
//  `./legacyMatrixUtils.js`——**不是** notation/ne/BM.js（两者实测不等价，
//  证据见 legacyMatrixUtils.js 文件头）。BHhM 远古版用的正是全局
//  `matrix_display` / `matrix_limit` / `matrix_compare`（notation/legacy/BM.js 的
//  第 18 / 19 行与第 1–17 行），所以这里接同一份实现，不接 ne 的 BM.js。
//
//  算法本体（`expand`）与 FS 的私有 `data` 缓存逐行照搬，一个字未改；
//  只换外层接口（IIFE 内保留原 `var data` / `expand` 闭包，与远古的模块级私有缓存等价）。
//
//  ## 门控：不需要（依据）
//
//  ne 的 expand_single 对**非 limit 节点**一律调 `FS(expr, 0)`；远古引擎只在
//  able || semiable 为真时才碰 FS。但 BHhM 的远古定义带 **semiable: m => m.length > 0**，
//  而 core/engine.js 第 152–156 行的 semiable 分支对**任何非空且非 Infinity** 的表达式
//  都真的会执行 `FS(it.expr, 0)`：
//
//      semiableHit = semiable(expr) && !isInfinityExpr(expr) && compare(FS(expr, 0), low[0]) > 0
//
//  即：非 limit 且非空 ⟹ 远古引擎同样把该输入递给 `FS(expr, 0)`。
//  ne 的非 limit 分支调用的正是同一个 `FS(expr, 0)`，**没有新增崩溃面**；
//  若再套 `matrix_limit(m) ? FS_raw(m,n) : m`，反而会让「非 limit 但 semiable」的
//  输入与远古行为分叉（远古那边会照常算出更小的项），故不门控。
//
//  唯一需要点明的边界：上古那行还有个 `!isInfinityExpr(expr)` 的条件
//  （`'' + expr === 'Infinity'`）。BHhM 里满足该字符串化的只有 init 根
//  `[[Infinity]]`，而它 `matrix_limit` 为真 → 两侧都走极限分支，ne 不会对它
//  额外调 FS。非 limit 的树节点都是 FS 产出的数字矩阵，不会字符串化成 'Infinity'。
//  所以这个条件不会在 ne 侧开出新的 FS 调用面。
//
//  ## low 边界退役
//
//  旧 init 给 `{expr:[[Infinity]],low:[[]]}, {expr:[],low:[[]]}`；ne 里上界 =
//  「先根遍历下一个节点」（core/ne/tree.js get_bound）。旧版展开极限项时把它作为
//  **兄弟**插进根列表，ne 会把它作为**子节点**挂下去——树形不同但展开内容相同。
//  这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const BHhM = {
   id:'bhhm'
   ,name:'Bashicu hyper huge matrix'
   ,category_id:'category-bm-like'
   ,display:{plain:matrix_display}
   ,is_limit:matrix_limit
   ,compare:matrix_compare
   ,FS:(()=>{
      var data={}
      ,expand = (B,A)=>{
         var D3=B.length-1,D2=B[0].length-1
         ,B2=Array(D3+1).fill(Array(D2+1).fill(0))
         ,C=Array(D2+1).fill(0)
         ,C2=Array(D3+1).fill(0)
         ,C3=Array(D2+1).fill(0)
         ,D6=0,D7=0,D16=0
         for(var D4=0;D4<=D3;++D4){
            for(var D5=0;D5<=D2;++D5){
               if(B[D3-D4][D5]<B[D3][D5]-C[D5] || !B[D3][0]){
                  if(!B[D3][0]){
                     D4=D3;D5=D2;D6=0
                  }else if(!B[D3][D5+1]){
                     if(!D6) D6=D4
                     ;++D7
                     C2[D7]=D4
                     for(var D8=0;D8<=D2;++D8){
                        B2[D3-D4][D8]=D7
                     }
                     for(var D9=0;D9<=D5;++D9){
                        for(var D10=D3-D4;D10<=D3-1;++D10){
                           for(var D11=D10;D11>=D3-D4;--D11){
                              for(var D12=0;D12<=D9;++D12){
                                 if(B[D11][D12]<B[D10][D12]-C3[D12]){
                                    if(D9===D12){
                                       if(0<B2[D11][D9] && !B2[D10][D9]) B2[D10][D9]=D7
                                       D11=D3-D4
                                    }else{
                                       C3[D12]=B[D10][D12]-B[D11][D12]
                                    }
                                 }else{
                                    D12=D9
                                 }
                              }
                           }
                           for(var D13=0;D13<=D5;++D13){
                              C3[D13]=0
                           }
                        }
                     }
                     for(var D14=0;D14<=D6;++D14){
                        for(var D15=0;D15<=D2;++D15){
                           D16=0
                           if(0<B2[D3-D6+D14][D15]){
                              if(D15<D5) D16=B[D3-C2[B2[D3-D6+D14][D15]]][D15]-B[D3-D4][D15]
                           }
                           if(B[D3-D4+D14][D15]<B[D3-D6+D14][D15]-D16){
                              D14=D6;D15=D2;D4=D3
                           }else if(B[D3-D6+D14][D15]-D16<B[D3-D4+D14][D15]){
                              D14=D6;D15=D2
                           }
                        }
                     }
                  }else{
                     C[D5]=B[D3][D5]-B[D3-D4][D5]
                  }
               }else{
                  D5=D2
               }
            }
         }
         for(var D17=0;D17<=D2;++D17){
            if(0<B[D3][D17+1]) C[D17]=B[D3][D17]-B[D3-D6][D17]
         }
         var result = B.slice(0,D3).map(col=>col.slice())
         for(var D18=1;D18<=A*D6;++D18){
            if(!result[D3]) result[D3]=[]
            if(!B2[D3]) B2[D3]=[]
            for(var D19=0;D19<=D2;++D19){
               if(0<B2[D3-D6][D19]){
                  result[D3][D19]=result[D3-D6][D19]+C[D19]
               }else{
                  result[D3][D19]=result[D3-D6][D19]
               }
               B2[D3][D19]=B2[D3-D6][D19]
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

register_notation(BHhM);
