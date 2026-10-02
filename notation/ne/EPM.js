// ============================================================================
//  notation/ne/EPM.js — Enjambment parented matrix（硬切改写）
// ============================================================================
//  来源：notation/legacy/EPM.js（远古接口，register.push 形态）。
//  EPM 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；同类矩阵类产物：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const EPM = {...} + register_notation(EPM)
//    display: matrix_display                  display: { plain: matrix_display }
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    FSalter                                  FS_alter
//    （无 semiable）                           ——
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    无分类                                    category_id: 'category-bm-like'
//
//  `matrix_display` / `matrix_limit` / `matrix_compare` 来自
//  `./legacyMatrixUtils.js`——**不是** notation/ne/BM.js（两者实测不等价，
//  证据见 legacyMatrixUtils.js 文件头）。
//
//  算法本体（extract / amount / Parent / expand / Limit，以及 FS、FSalter 两段
//  包装）逐行照搬，一个字未改；只把两个 FS 提成具名 `FS_raw` / `FS_alter_raw`，
//  并在**外层接口字段**加门控。
//
//  ## 为什么必须加 FS 门控（MM 任务踩过的坑）
//
//  远古引擎从不把「不可展开」的输入递给 FS：core/engine.js:224-233 只认
//  `able`（本记号**没有** semiable，semiable 分支永不成立），非 able 输入直接
//  return，FS 一次都不会被调。ne 引擎没有这层短路——core/ne/expander.js 的
//  expand_single 对**非 limit 节点一律**先算 `FS(expr, 0)` 试探。
//
//  而 EPM 的远古 FS 在非 limit 矩阵上会直接崩，实测两条路径：
//    · `FS([], 0)`：expand 里 LNZx = -1，`M[-1].findLastIndex` → TypeError。
//    · `FS([[0]], 0)`：LNZy = findLastIndex(e=>e) = -1（末列元素为 0 是 falsy），
//      root = Parent(M,[0,-1]) = [-1,0] → `M[-1].slice` → TypeError。
//  `[]` 正是本记号 init 的第三个表达式、`[[0]]` 是最常见后继形态：不门控的话，
//  用户把展开变体切到 alter 后**一点 init 项就崩**，FS 侧同理。
//
//  门控条件与旧引擎的 able 短路**逐条等价**（无 semiable 就只写 able）：
//
//      FS:       (m, n) => matrix_limit(m) ? FS_raw(m, n) : m
//      FS_alter: (m, n) => matrix_limit(m) ? FS_alter_raw(m, n) : m
//
//  门控只拦截「旧引擎不可能调 FS」的输入，非 able 输入一律返回自身 → ne 的
//  `compare(result, expr) >= 0` 判定为不可展开、链终止，与旧引擎「不展开」等价。
//
//  ⚠ FS_alter 也门控，与 core/ne/legacyAdapter.js 的处理**不同**（该层把旧记号
//  的 FSalter 原样透传、不加门控，是适配层的遗漏）。这里以「旧引擎真实调用语义」
//  为准：非 able 输入下远古 FSalter 的结果是崩溃，而旧引擎永远不会走到那里，
//  保留原始崩溃对 ne 用户只是纯粹的退化。验证脚本中两套参照都会打印。
//
//  ## 另一处语义变化：low 边界退役
//
//  旧 init 给三项 `{expr,low,subitems}`（low 分别为 `[[[],[1]]]` / `[[]]` / `[[]]`），
//  上界由记号手写；ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound）。
//  旧版展开极限项时把它作为**兄弟**插进根列表，ne 会把它作为**子节点**挂下去——
//  树形不同但展开内容相同，这是 ne 架构的既定语义。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const EPM = (()=>{
   var data={}
   ,dataalter={}
   var extract = (A,[x,y])=>A[x][y]||0
   ,amount = (A,x,val)=>{
      if(!val) return Infinity
      if(!A[x]) return 0
      var s=0
      A[x].forEach(e=>(e===val)&&(++s))
      return s
   }
   ,Parent = (A,[x0,y0])=>{
      var val = extract(A,[x0,y0])
      if(!val) return [-1,0]
      var x = x0
      if(!y0){
         while(extract(A,[x,y0])!==val-1 && x>=0) --x;
         return [x,y0]
      }
      var except = []
      var working = [x0,y0-1]
      var amt = amount(A,x,extract(A,working))
      while((working = Parent(A,working))[0]>=0){
         x = working[0]
         for(var y=Math.max(working[1]-amt,0);y<=y0;++y){
            if(y>working[1]+amt) break
            if(except.includes(y)) continue
            if(extract(A,[x,y])===val-1) return [x,y]
            if(extract(A,[x,y])<val) except.push(y)
         }
      }
      return [-1,0]//normally we should not reach this
   }
   ,expand = (M,FSterm,shorter=false)=>{
      var LNZx = M.length-1
      var LNZy = M[LNZx].findLastIndex(e=>e)
      var root = Parent(M,[LNZx,LNZy])
      var width = LNZx-root[0]
      var height = LNZy-root[1]
      var A = M.map(column=>column.slice())
      for(var dx=1;dx<=width*FSterm-shorter;++dx) A[LNZx+dx]=[]
      ;--A[LNZx][LNZy]
      M[root[0]].slice(root[1]).forEach((val,dy)=>A[LNZx][LNZy+dy]=val)
      var ascending_cache = {}
      var ascendingAt = (cur)=>{//falsy means not ascending; otherwise the xy of the BR column entry it corresponds
         var str=''+cur
         if(ascending_cache[str]!==undefined) return ascending_cache[str]
         if(cur[0]<root[0]) return ascending_cache[str] = false
         if(cur[0]===root[0]) return ascending_cache[str] = cur
         return ascending_cache[str] = ascendingAt(Parent(A,cur))
      }
      //upper rows
      for(var y=0;y<height;++y){
         var rootAt = ascendingAt([LNZx,y])
         var offset = [rootAt[0]-LNZx,rootAt[1]-y]
         for(dx=1;dx<=width*FSterm-shorter;++dx){
            var x=LNZx+dx
            var cor = [x+offset[0],y+offset[1]]
            A[x][y] = ascendingAt(cor)?extract(A,cor)+extract(A,[LNZx,y])-extract(A,rootAt):extract(A,cor)
         }
      }
      //lower rows
      var upleft = [root[0],0]
      var upright = [LNZx,height]
      for(dx=1;dx<=width*FSterm-shorter;++dx){
         x=root[0]+dx
         for(y=0;true;++y){
            var offsetXY = [x-upleft[0],y-upleft[1]]
            if(ascendingAt([x,y])){
               var P = Parent(A,[x,y])
               var offsetP = [P[0]-upleft[0],P[1]-upleft[1]]
               A[upright[0]+offsetXY[0]][upright[1]+offsetXY[1]] = extract(A,[upright[0]+offsetP[0],upright[1]+offsetP[1]])+1
            }else{
               if(!extract(A,[x,y])) break
               A[upright[0]+offsetXY[0]][upright[1]+offsetXY[1]] = extract(A,[x,y])
            }
         }
      }
      if(width*FSterm-shorter<0) A.splice(A.length+width*FSterm-shorter)
      A.forEach(column=>{
         var i = column.findLastIndex(e=>e)
         column.splice(i+1)
      })
      return A
   }
   ,Limit = n=>[[],[1],Array(n).fill(2)]
   ,FS_raw = (m,FSterm)=>{
      if(''+m==='Infinity') return Limit(FSterm)
      if(m.length===0) return []
      var datakey=matrix_display(m)
      if(!data[datakey]) data[datakey] = []
      else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
      return data[datakey][FSterm] = expand(m,FSterm,true)
   }
   ,FS_alter_raw = (m,FSterm)=>{
      if(''+m==='Infinity') return Limit(FSterm)
      if(m.length===0) return []
      var datakey=matrix_display(m)
      if(!dataalter[datakey]) dataalter[datakey] = []
      else if(dataalter[datakey][FSterm]!==undefined) return dataalter[datakey][FSterm]
      return dataalter[datakey][FSterm] = expand(m,FSterm)
   }
   return {
      id:'epm'
      ,name:'Enjambment parented matrix'
      ,category_id:'category-bm-like'
      ,display:{plain:matrix_display}
      ,is_limit:matrix_limit
      ,compare:matrix_compare
      ,FS:(m,FSterm)=>matrix_limit(m)?FS_raw(m,FSterm):m
      ,FS_alter:(m,FSterm)=>matrix_limit(m)?FS_alter_raw(m,FSterm):m
      ,init:()=>([
         [[Infinity]]
         ,[[],[1]]
         ,[]
      ])
   }
})()

register_notation(EPM);
