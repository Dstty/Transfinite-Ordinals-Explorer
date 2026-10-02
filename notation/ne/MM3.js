// ============================================================================
//  notation/ne/MM3.js — Mutant matrix 3（硬切改写）
// ============================================================================
//  来源：notation/legacy/MM3.js（远古接口，register.push 形态）。
//  MM3 是**本项目远古独有**记号（ne-rewritten 无对应物）→ 硬切改写，非搬运。
//
//  接口映射（样板：notation/ne/PrSS.js）：
//
//    register.push({...})                  → export const MM3 = {...} + register_notation(MM3)
//    display: matrix_display               → display: { plain: matrix_display }
//    able:    matrix_limit                 → is_limit: matrix_limit
//    compare: matrix_compare               → compare: matrix_compare
//    FSalter                               → FS_alter + 接口层门控（见下）
//    init() → [{expr, low, subitems}, ...] → init() → [表达式, ...]
//    无分类                                 → category_id: 'category-bm-like'
//
//  matrix_display / matrix_limit / matrix_compare 来自 ./legacyMatrixUtils.js
//  （远古原样抽取），**不是** notation/ne/BM.js。工具层三者逐字照搬，未加门控。
//
//  算法本体（vertical_compare / vertical_increase / extract / vertical_cache /
//  get_vertical / parentCheck / parent / expand / FS / FSalter）逐行照搬，
//  一个字未改；IIFE 内的 `vertical_cache`（Map 缓存）与 data/dataalter 一并保留。
//
//  语义变化同 MM.js：semiable 本来就不存在（无需丢弃）；low 边界退役；
//  ne 引擎会对非 limit 节点调 FS(expr, 0)，远古引擎对非 able 表达式根本不调 FS
//  —— 故 FS / FS_alter 字段外层包一层「非 able 返回自身」的门控，对应远古引擎
//  core/engine.js 第 157 行的 able/semiable 短路（与 legacyAdapter 同款）。
//  理由、实测复现与决策记录见文件末注释。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

export const MM3 = (()=>{
   var data={}
   ,dataalter={}
   ,vertical_compare = (a,b)=>{
      if(a.length>b.length) return 1
      if(a.length<b.length) return -1
      for(var i=a.length;i--;){
         if(a[i]>b[i]) return 1
         if(a[i]<b[i]) return -1
      }
      return 0
   }
   ,vertical_increase = (y,d)=>{//go from y=[r0,r1,r2,...,r(d-1),rd #] to [0,0,0,...,0,rd+1 #]
      var c=y.slice()
      c[d]===undefined?(c[d]=1):(c[d]+=1)
      c.fill(0,0,d)
      return c
   }
   ,extract = (A,[x,y])=>A[x][y]||0
   ,vertical_cache = new Map()
   ,get_vertical = (A,[x,y])=>{
      var val
      if(vertical_cache.has(A)) val = vertical_cache.get(A)
      else{
         val = A.map((column,x)=>{
            var res=[],i,y=0
            for(;y<column.length;++y){
               i=y
               while(--i>=0&&extract(A,[x,y])===extract(A,[x,i]));
               res.push(vertical_increase(res[i]??[],y-i-1))
            }
            return res
         })
         vertical_cache.set(A,val)
      }
      if(val[x][y]!==undefined) return val[x][y]
      var ending = val[x].length-1
      return vertical_increase(ending>=0?val[x][ending]:[],y-ending-1)
   }
   ,parentCheck = (A,[x,y])=>{
      if(!y) return [x-1,y]
      var p = parent(A,[x,y-1])[0]
      var i=Math.max(y,A[p].length-1)
      while(extract(A,[p,i])<extract(A,[x,y])-1||vertical_compare(get_vertical(A,[p,i]),get_vertical(A,[x,y]))>0) --i
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
         var reference = [] ,y1=0,y2=0,cmp
         while(y2<=root[1]+height*n){
            cmp=vertical_compare(get_vertical(A,[root[0],y1+1]),get_vertical(A,[root[0]+width*n,y2]))
            if(cmp>0||y1>=root[1]){
               reference[y1]=y2
               ++y2
               continue
            }else{
               ++y1
               continue
            }
         }
         for(var dx=1;dx<=width;++dx){
            var x = root[0]+dx
            var targetColumn = A[x+width*n] = []
            var lastmagma = -1
            A[x].forEach((val,y)=>{
               var asc = ascendingAt([x,y])
               if(~asc){
                  if(asc<=root[1]&&!vertical_compare(get_vertical(A,[root[0],asc]),get_vertical(A,[x,y]))){
                     for(var j=(reference[asc-1]??-1)+1;j<=reference[asc];++j){
                        targetColumn.push(val-extract(A,[root[0],asc])+extract(A,[root[0]+width*n,j]))
                     }
                     lastmagma = asc
                  }else{
                     if(~lastmagma) targetColumn.push(val-extract(A,[root[0],lastmagma])+extract(A,[root[0]+width*n,reference[lastmagma]]))
                     else targetColumn.push(val-extract(A,[root[0],0])+extract(A,[root[0]+width*n,0]))
                  }
               }else{
                  targetColumn.push(val)
               }
            })
         }
         vertical_cache.delete(A)
      }
      A.forEach(column=>{
         var i = column.findLastIndex(e=>e)
         column.splice(i+1)
      })
      return A
   }
   var def = {
      id:'mm3'
      ,name:'Mutant matrix 3'
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
   // ---- 接口层门控（见文件头与文件末决策记录）-------------------------------
   // 远古引擎只把 able（= matrix_limit）为真的表达式递给 FS（core/engine.js:157
   // 的 `!(ableHit || semiableHit)` 短路）；MM3 没有 semiable，故非 able 一律不可展开。
   // FS / FS_alter 的函数体是远古原文，未改一个字；这里只决定「什么时候递过去」。
   var FS_raw = def.FS
   ,FS_alter_raw = def.FS_alter
   def.FS = (m,FSterm)=>matrix_limit(m) ? FS_raw(m,FSterm) : m
   def.FS_alter = (m,FSterm)=>matrix_limit(m) ? FS_alter_raw(m,FSterm) : m
   return def
})()

register_notation(MM3);

// ---------------------------------------------------------------------------
//  为什么有那道门控（决策记录，勿当冗余删掉；与 MM.js 末尾同款）
// ---------------------------------------------------------------------------
//  ne 引擎对**非 limit 节点**一律先调 FS(expr, 0) 探测可展开性；远古引擎先看
//  able / semiable，非 able 的表达式根本不会递给 FS（core/engine.js 第 157 行
//  的 `!(ableHit || semiableHit)` 短路）。MM3 的远古 FS 在退化矩阵上会崩：
//  FS([[]], 0) → expand 里 LNZy = -1 → TypeError。
//
//  加门控前的实测（tier=0 逐次点击）：
//    Limit --点--> ()(1) --点--> () --点--> TypeError: Cannot read properties of
//    undefined (reading '-1')
//  旧引擎在第 3 步只是「不展开」（able=false 且无 semiable），不报错；
//  tier=1 时一次点击就走到该节点，集成冒烟的 mm3 一项因此变红。
//
//  故按「远古引擎的 able 短路」补门控，与 core/ne/legacyAdapter.js 的
//  make_legacy_FS 完全同款。加门控后：
//    Limit --点--> ()(1) --点--> () --点--> 不可展开（返回 undefined），与旧引擎一致。
