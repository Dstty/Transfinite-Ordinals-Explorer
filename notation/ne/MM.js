// ============================================================================
//  notation/ne/MM.js — Mutant matrix（硬切改写）
// ============================================================================
//  来源：notation/legacy/MM.js（远古接口，register.push 形态）。
//  MM 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const MM = {...} + register_notation(MM)
//    display: matrix_display                  display: { plain: matrix_display }
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    FSalter                                  FS_alter + 接口层门控（见第 3 条）
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    无分类                                    category_id: 'category-bm-like'
//
//  `matrix_display` / `matrix_limit` / `matrix_compare` 来自
//  `./legacyMatrixUtils.js`——**不是** notation/ne/BM.js（两者实测不等价，
//  证据见 legacyMatrixUtils.js 文件头）。工具层三者逐字照搬，未加任何门控。
//
//  算法本体（extract / parentCheck / parent / expand / FS / FSalter）逐行照搬，
//  一个字未改；只换外层接口（IIFE 内保留原 `var data / dataalter` 闭包，
//  与远古的模块级私有缓存等价）。
//
//  ## 三处必须知道的语义变化
//
//  1. **semiable 不移植**：MM 在远古侧**没有** semiable 字段（它只有 able），
//     所以这里没有任何语义被丢弃。旧引擎对「非 able 表达式」不展开；
//     ne 引擎对非 limit 节点会算 `FS(expr, 0)` 并要求结果严格小于自身，
//     因此对**非 limit 矩阵**（末列首项为 0，如 `[[0]]`、`[[]]`）ne 会真的去调 FS。
//     实测：`FS([[]], 0)` 在远古实现里抛 TypeError（`expand` 的 LNZy = -1 分支）
//     —— 这是远古实现本身对「退化矩阵」的边界行为。**第 3 条的门控**就是为此而加。
//
//  2. **low 边界退役**：旧 init 给 `{expr:[[Infinity]],low:[[]]}, {expr:[],low:[[]]}`，
//     上界由记号手写；ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound）。
//     旧版展开极限项时把它作为**兄弟**插进根列表，ne 会把它作为**子节点**挂下去
//     —— 树形不同但展开内容相同，这是 ne 架构的既定语义。
//
//  3. **接口层门控：非 able 表达式不递给 FS**（对应远古引擎 `core/engine.js`
//     第 157 行的 `!(ableHit || semiableHit)` 短路）。远古引擎从不把
//     `able === matrix_limit` 为假的表达式递给 FS；ne 引擎对非 limit 节点
//     一律先试 `FS(expr, 0)`，而远古 FS 在退化矩阵上会抛 TypeError
//     （`FS([[]], 0)` → expand 的 LNZy = -1 分支）。因此 FS / FS_alter 字段
//     外层包一层 `matrix_limit(m) ? FS_raw(m, n) : m`：
//     非 able → 返回自身 → 引擎判定 `compare(m, m) >= 0` → 不可展开，
//     与远古引擎的短路**逐项等价**。
//     ⚠ 这不是新增特例：core/ne/legacyAdapter.js 的 make_legacy_FS 对所有远古
//     记号做的就是同一件事（不可展开输入返回自身），CNF.js 的同类接口层修补亦然。
//     **FS / FS_alter 的函数体仍是远古原文，一个字未改**；被舍弃的只是
//     「直接调 FS(非 able 输入)」这个远古引擎不可观测的调用结果。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const MM = (()=>{
   var data={}
   ,dataalter={}
   ,extract = (A,[x,y])=>A[x][y]||0
   ,parentCheck = (A,[x,y])=>{
      if(!y) return [x-1,y]
      var p = parent(A,[x,y-1])[0]
      var i=y
      while(extract(A,[p,i])<extract(A,[x,y])-1) --i
      return [p,i]
   }
   ,parent = (A,cur)=>{
      if(!extract(A,cur)) return [-1,cur[1]]
      var p = cur
      do{
         p = parentCheck(A,p)
      }while(extract(A,p)!==extract(A,cur)-1);
      return p
   }
   ,expand = (M,FSterm)=>{
      var LNZx = M.length-1
      var LNZy = M[LNZx].findLastIndex(e=>e)
      var LNZ = M[LNZx][LNZy]
      var collection = []
      var working = [LNZx,LNZy]
      do{
         while(extract(M,working)!==LNZ-1) working = parent(M,working)
         if(!collection[working[0]]) collection[working[0]] = []
         collection[working[0]].unshift(working[1])
      }while(--working[1]>=0);
      var counts = collection.filter(()=>true).map(e=>e.length)
      var columns = collection.map((e,i)=>i).filter(()=>true)
      counts.unshift(1)
      var root
      var r=counts.length-1
      if(counts[r]===1){
         root = parent(M,[LNZx,LNZy])
      }else{
         while(counts[r]>=counts[counts.length-1]) --r
         root = [columns[r],collection[columns[r]][0]]
      }
      var width = LNZx-root[0]
      var height = LNZy-root[1]
      var A = M.map(column=>column.slice())
      ;--A[LNZx][LNZy]
      M[root[0]].slice(root[1]).forEach((val,dy)=>A[LNZx][LNZy+dy]=val)
      var ascending_cache = {}
      var ascendingAt = (cur)=>{//-1 means not ascending; otherwise row index of the BR column entry it corresponds
         var str=''+cur
         if(ascending_cache[str]!==undefined) return ascending_cache[str]
         if(cur[0]<root[0]) return ascending_cache[str] = -1
         if(cur[0]===root[0]) return ascending_cache[str] = cur[1]
         return ascending_cache[str] = ascendingAt(parent(A,cur))
      }
      //actual expand
      for(var n=1;n<=FSterm;++n){
         var reference = [root[0]+width*n,root[1]+height*n]
         for(var dx=1;dx<=width;++dx){
            var x = root[0]+dx
            var targetColumn = A[x+width*n] = []
            var pastmagma = false
            A[x].forEach((val,y)=>{
               var asc = ascendingAt([x,y])
               if(~asc){
                  if(asc===root[1]&&y===root[1]){
                     for(var j=0;j<=height*n;++j){
                        targetColumn[y+j] = val-extract(A,root)+extract(A,[root[0]+width*n,y+j])
                     }
                     pastmagma = true
                  }else{
                     if(pastmagma) targetColumn[y+height*n] = val-extract(A,root)+extract(A,reference)
                     else targetColumn[y] = val-extract(A,[root[0],asc])+extract(A,[root[0]+width*n,asc])
                  }
               }else{
                  if(pastmagma) targetColumn[y+height*n] = val
                  else targetColumn[y] = val
               }
            })
         }
      }
      A.forEach(column=>{
         var i = column.findLastIndex(e=>e)
         column.splice(i+1)
      })
      return A
   }
   var def = {
      id:'mm'
      ,name:'Mutant matrix'
      ,category_id:'category-bm-like'
      ,display:{plain:matrix_display}
      ,is_limit:matrix_limit
      ,compare:matrix_compare
      ,FS:(m,FSterm)=>{
         if(''+m==='Infinity') return [[],Array(FSterm+1).fill(1)]
         if(m.length===0) return []
         var datakey=matrix_display(m)
         if(!data[datakey]) data[datakey] = []
         else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
         return data[datakey][FSterm] = expand(m,FSterm).slice(0,-1)
      }
      ,FS_alter:(m,FSterm)=>{
         if(''+m==='Infinity') return [[],Array(FSterm+1).fill(1)]
         if(m.length===0) return []
         var datakey=matrix_display(m)
         if(!dataalter[datakey]) dataalter[datakey] = []
         else if(dataalter[datakey][FSterm]!==undefined) return dataalter[datakey][FSterm]
         return dataalter[datakey][FSterm] = expand(m,FSterm)
      }
      ,init:()=>([
         [[Infinity]]
         ,[]
      ])
   }
   // ---- 接口层门控（见文件头第 3 条）----------------------------------------
   // 远古引擎只把 able（= matrix_limit）为真的表达式递给 FS（core/engine.js:157
   // 的 `!(ableHit || semiableHit)` 短路）；MM 没有 semiable，故非 able 一律不可展开。
   // FS / FS_alter 的函数体是远古原文，未改一个字；这里只决定「什么时候递过去」。
   var FS_raw = def.FS
   ,FS_alter_raw = def.FS_alter
   def.FS = (m,FSterm)=>matrix_limit(m) ? FS_raw(m,FSterm) : m
   def.FS_alter = (m,FSterm)=>matrix_limit(m) ? FS_alter_raw(m,FSterm) : m
   return def
})()

register_notation(MM);

// ---------------------------------------------------------------------------
//  为什么有那道门控（决策记录，勿当冗余删掉）
// ---------------------------------------------------------------------------
//  ne 引擎对**非 limit 节点**一律先调 FS(expr, 0) 做可展开性探测；远古引擎先看
//  able / semiable，非 able 的表达式根本不会递给 FS（core/engine.js 第 157 行
//  的 `!(ableHit || semiableHit)` 短路）。MM 的远古 FS 在退化矩阵上会崩：
//  FS([[]], 0) → expand 里 LNZy = -1 → TypeError。
//
//  加门控前的实测（tier=0 逐次点击）：
//    Limit --点--> ()(1) --点--> () --点--> TypeError: Cannot read properties of
//    undefined (reading '-1')
//  而旧引擎在第 3 步只是「不展开」（able=false 且无 semiable），不报错；
//  tier=1 时一次点击就走到该节点，集成冒烟的 mm 一项因此变红。
//
//  故按「远古引擎的 able 短路」补门控（core/engine.js:157 的语义），
//  与 core/ne/legacyAdapter.js 的 make_legacy_FS 完全同款。加门控后：
//    Limit --点--> ()(1) --点--> () --点--> 不可展开（返回 undefined），与旧引擎一致。
