// ============================================================================
//  notation/ne/BHM2.js — BHM2（硬切改写）
// ============================================================================
//  来源：notation/legacy/BHM2.js（远古接口，`;register.push({...})` 形态）。
//  BHM2 是本项目**远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；同类产物：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    ;register.push({...})                    export const BHM2 = {...} + register_notation(BHM2)
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
//  BHM2 不同，它有
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
//     严格小于自身（core/ne/expander.js expand_single）。对 BHM2 而言这正是远古
//     semiableHit 分支要做的事，故该字段不再需要（不是被丢弃，是被引擎吸收）。
//  2. **low 边界退役**：旧 init 给 `{expr:[[Infinity]],low:[[]]}, {expr:[],low:[[]]}`，
//     上界由记号手写（FSbounded(FS, low)）；ne 里上界 = 先根遍历下一个节点
//     （core/ne/tree.js get_bound）。旧版展开极限项时把它作为**兄弟**插进根列表，
//     ne 会把它作为**子节点**挂下去 —— 树形不同但展开内容相同，这是 ne 的既定语义。
//
//  记号名原注释：Bashicu hyper matrix at 2024/2/8, different from the BHM I coded
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const BHM2 = {
   id:'bhm2'
   ,name:'BHM2'//Bashicu hyper matrix at 2024/2/8, different from the BHM I coded
   ,category_id:'category-bm-like'
   ,display:{plain:matrix_display}
   ,is_limit:matrix_limit
   ,compare:matrix_compare
   ,FS:(()=>{
      var data={}
      ,expand = (b,a)=>{
         var d3=b.length-1,d2=b[0].length-1
         ,b2=Array(d3+1).fill(Array(d2+1).fill(0))
         ,c=Array(d2+1).fill(0)
         ,c2=Array(d3+1).fill(0)
         ,c3=Array(d2+1).fill(0)
         ,d7=0,d8=0,d17=0,d18=0,d19=0
         for(var d4=0;d4<=d2;++d4){
            if(0<b[d3][d4]&&!b[d3][d4+1]){
               for(var d5=0;d5<=d3;++d5){
                  for(var d6=0;d6<=d4;++d6){
                     if(b[d3-d5][d6]<b[d3][d6]-c[d6]){//remove the buggy 0<B[D3-D5,D6]
                        if(d6<d4){
                           c[d6]=b[d3][d6]-b[d3-d5][d6]
                        }else{
                           if(!d7) d7=d5
                           ;++d8
                           c2[d8]=d5
                           for(var d9=0;d9<=d6;++d9){
                              b2[d3-d5][d9]=d8
                           }
                           for(var d10=0;d10<=d4;++d10){
                              for(var d11=d3-d5;d11<=d3;++d11){
                                 for(var d12=d11;d12>=d3-d5;--d12){
                                    for(var d13=0;d13<=d10;++d13){
                                       if(b[d12][d13]<b[d11][d13]-c3[d13]){
                                          if(d10===d13){
                                             if(0<b2[d12][d10]&&!b2[d11][d10]) b2[d11][d10]=d8
                                             d12=d3-d5
                                          }else{
                                             c3[d13]=b[d11][d13]-b[d12][d13]
                                          }
                                       }else{
                                          d13=d10
                                       }
                                    }
                                 }
                                 for(var d14=0;d14<=d2;++d14){
                                    c3[d14]=0
                                 }
                              }
                           }
                           for(var d15=0;d15<=d7;++d15){
                              for(var d16=0;d16<=d2;++d16){
                                 d17=0
                                 if(0<b2[d3-d7+d15][d16]){
                                    if(d16<d4) d17=b[d3-c2[b2[d3-d7+d15][d16]]][d16]-b[d3-d5][d16]
                                 }
                                 if(b[d3-d5+d15][d16]<b[d3-d7+d15][d16]-d17){
                                    d15=d7;d16=d2;d18=1;d5=d3
                                 }else if(b[d3-d7][d16]-d17<b[d3-d5][d16]){
                                    d15=d7;d16=d2
                                 }
                              }
                           }
                           if(!d18) d19=d5
                           else d18=0
                        }
                     }else{
                        d6=d4
                     }
                  }
               }
               d4=d2
            }
         }
         for(var d20=0;d20<=d2;++d20){
            if(0<b[d3][d20+1]) c[d20]=b[d3][d20]-b[d3-d19][d20]
         }
         var result = b.slice(0,d3).map(col=>col.slice())
         for(var d21=1;d21<=a*d19;++d21){
            if(!result[d3]) result[d3]=[]
            if(!b2[d3]) b2[d3]=[]
            for(var d22=0;d22<=d2;++d22){
               if(0<b2[d3-d19][d22]){
                  result[d3][d22]=result[d3-d19][d22]+c[d22]
               }else{
                  result[d3][d22]=result[d3-d19][d22]
               }
               b2[d3][d22]=b2[d3-d19][d22]
            }
            ++d3
         }
         if(d2>0&&result.every(column=>column[d2]===0)) result = result.map(column=>column.slice(0,d2))
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

register_notation(BHM2);
