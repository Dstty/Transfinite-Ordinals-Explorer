// ============================================================================
//  notation/ne/omegaY.js — ω-Y sequence（硬切改写，注册 id 仍是 `omega-y`）
// ============================================================================
//  ⚠⚠ 本文件与同目录的 **Omega_Y.js** 是两个不同的东西，勿混：
//
//    · notation/ne/Omega_Y.js（ne 原生搬运，**不要动它**）
//        移植自 ne-rewritten 的 src/notations/Y/Omega_Y.ts。它是 Y 系的
//        **共享基础模块**：注册 omega-y-weak / omega-y-actual / omega-y-medium /
//        omega-y-strong 四个 **magma 变体**（id 都带 `-后缀`，属分类
//        category-y-omega），并向 Y.js / weak-omega-Y.js / omegaY-variants.js
//        导出 sequence_display / is_limit / seq_compare / expand_weak_magma 等工具。
//
//    · notation/ne/omegaY.js（本文件，**注意文件名没有连字符、Y 大写**）
//        是远古记号 notation/legacy/omega-Y.js 的硬切改写，注册 id `omega-y`
//        （无后缀，属分类 category-y），算法是远古那套 mountain/magma 实现
//        （from_sequence / draw_mountain / collect / collect1D / omega_Y_limit）。
//        Windows 文件名大小写不敏感，所以文件名必须叫 `omegaY.js`，叫
//        `omega-Y.js` / `Omega-Y.js` 都会撞上已有的 Omega_Y.js。
//
//  ## 不等价证据（实测；脚本 .tmp-ne/verify-omega-y-hardcut.mjs 第 8 节）
//
//    样本：远古 init（[Infinity]/[1]/[]）+ 远古 FS/FSalter 连续展开派生的 136 个序列
//    （其中 able 130 个，即「可达域」），另加 [0]/[1,0]/[0,0]/[2,3]/裸 Infinity 等
//    13 个退化输入。display / compare 在两边本来就同源（都走 `''+expr` 与字典序），
//    真正的判据是 FS：
//
//      (a) 可达域（可达 130 个输入 × index 0..3）：
//            omega-y-weak/actual/medium/strong  520/520 **数值全同**
//            weak-omega-y  457/520   y-seq  518/520    ← 明确不等价
//          即四个 magma 变体只是在可达域上恰好与远古同值（它们同属 Ω-Y 家族），
//          weak-omega-y / y-seq 则在常规输入上就分叉（如 FS([1,2],1)：远古 [1,1] vs
//          weak-omega-y [1]；FS([1,4],2)：远古 [1,3,10] vs y-seq [1,3,9]）。
//      (b) 非 able 域（末项 = 0，如 [0] / [1,0] / [0,0]）：
//            远古 FS 抛 TypeError（`from_sequence` 后 BR 为 undefined），
//            四个变体走 `Y_FS_variants` 的 `!is_limit → slice(0,-1)` 返回截断
//            （[0]→[]、[1,0]→[1]、[0,0]→[0]）→ **接口层不等价**。
//    ⇒ 综合 (a)(b)：本记号与 Omega_Y.js 的四个变体既不是同一个 id、也不是同一套
//      magma 分派（它们是 `expand_weak/actual/medium/strong_magma` 参数化的同一个
//      create_magma_notation），更与 weak-omega-y / y-seq 在常规输入上就不同。
//      故按**硬切改写**处理：算法从远古源文件逐行搬，接口层单独改写。
//
//    文本漂移核对（verify 脚本第 1.5 节）：远古 19–233 行（from_sequence …
//    omega_Y_limit，215 行）与 240–257 行（FS / FSalter 函数体，18 行）与本文件
//    逐行 diff = 0（仅字段名 `FSalter` → `FS_alter`，以及源文件 CRLF → 本文件 LF）。
//
//  ## 接口映射（样板：notation/ne/PrSS.js；同类远古独有序列记号：notation/ne/X-Y.js）
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const OmegaY = {...} + register_notation(OmegaY)
//    display: sequence_display                display: { plain: sequence_display（逐字内联）}
//    able:    Y_limit                         is_limit: Y_limit（逐字内联）
//    compare: sequence_compare                compare: sequence_compare（import，不重抄）
//    FSalter                                  FS_alter + 接口层门控（见下）
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr，旧 init 是三项）
//    无分类                                    category_id: 'category-y'
//
//  ## 外部依赖怎么接
//
//  远古 omega-Y.js 第 1–13 行定义全局 `sequence_compare`，第 14–15 行定义全局
//  `sequence_display` / `Y_limit`；ne 记号是 ES module，不能再依赖经典脚本的加载顺序，故：
//    · sequence_display / Y_limit —— 本文件内**逐字内联**（与 X-Y.js 第 74–75 行同款写法）；
//    · sequence_compare —— import 自 `./legacyMatrixUtils.js`，那里就是 omega-Y.js
//      第 1–13 行的逐行照搬（同一份实现，不抄第二遍；MM.js / X-Y.js 也 import 它）。
//      **不接** ne 的 Omega_Y.js 的 seq_compare（它走 lex_compare，与本记号的递归字典序
//      在 Infinity 与稀疏输入上不等价）。
//
//  ## 门控：**需要**（决策记录 + 实测依据，勿当冗余删掉）
//
//  远古引擎 `core/engine.js` 第 152–157 行先算 able/semiable，`!(ableHit || semiableHit)`
//  就直接 return —— **非 able 表达式根本不会递给 FS**。本记号在远古侧**没有 semiable**
//  （X-Y.js 有，所以 X-Y 不加门控；这里情况不同），即：非 able 输入是一条
//  **ne 引擎新开出来的调用面**（ne 的 expand_single 对非 limit 节点一律先试 `FS(expr, 0)`）。
//
//  实测（.tmp-ne/_probe-omega-y-gate.mjs，worker + 超时，worker 里跑远古 raw FS）：
//    非 able 且末项为 0：FS([0],n) / FS([1,0],n) / FS([0,0],n) / FS([2,0],n) /
//      FS([1,1,0],n) / FS([1,2,0],n)  全部抛
//      `TypeError: Cannot read properties of undefined (reading 'rightleg_up')`
//      （omega_Y_limit → 自减末项后 draw_mountain 找不到左腿），FSalter 同样。
//    非 able 且末项为 1（如 [1,1] / [1,2,1]）：不抛，返回删掉末项的结果。
//    可达域 136 个样本里非 able 的只有 6 个（末项全是 1，没有末项 0）；但「可达域
//    恰好没崩」不构成不门控的理由：非 able 调用面是 ne 新开的，raw 会崩的输入只是
//    当前不可达，何况 raw 在末项 1 上还会做出远古引擎从不发生的截断（见下）。
//
//  故 FS / FS_alter 外层包一层 `Y_limit(m) ? FS_raw(m, n) : m`：
//    · 非 able → 返回自身 → ne 引擎判定 `compare(m, m) >= 0` → 不可展开，链终止，
//      与远古引擎的短路**逐项等价**，也与 core/ne/legacyAdapter.js 的 make_legacy_FS
//      对 `omega-y` 现在做的事完全一样（非 able 短路，见该文件第 97–110 行）。
//      实测：门控版 FS/FS_alter 与 adapter 在 147 个输入 × index 0..3 上 1176/1176 一致。
//    · 不门控的差异面：`FS([1,1],0)` 远古 raw 返回 `[1]`（截断）→ ne 引擎会判定
//      「可展开」并建子节点；门控版返回 `[1,1]` → 不可展开。在**从 init 出发的树上**
//      这道差异恰好被 ne 的下界（core/ne/tree.js get_bound）挡住：`[1,1]` 节点的下界
//      就是下一项 `[1]`，`compare([1],[1]) <= 0` → expand_single 直接 return undefined；
//      实测（.tmp-ne/_probe-omega-y-tree-gate.mjs，逐节点点击扫描）门控前后**树形相同、
//      无异常**。也就是说门控在此处是**保险**而不是可见行为差异：它把「远古 raw FS 在
//      非 able 输入上的两类行为（末项 0 时崩、末项 1 时截断）」整体挡在调用面之外，
//      与远古引擎 / 线上 adapter 的语义对齐，同时不改变当前可观测的展开结果。
//    · **FS_raw / FS_alter_raw 是远古原文，一个字未改**；被舍弃的只是
//      「直接调 FS(非 able 输入)」这个远古引擎不可观测的调用结果（其中一部分还会崩）。
//
//  ## low 边界退役
//
//  旧 init 是三项 `{expr:[Infinity],low:[[1]]}, {expr:[1],low:[[]]}, {expr:[],low:[[]]}`；
//  ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound），记号的 low 字段整体退役。
//  实测：从 init 出发、tier ≤ 2 的展开树与线上 adapter 形态**逐节点相同**
//  （verify 脚本第 7 节），因为本记号展开链很短（[Infinity] → [1,1] → 被下界挡住）。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { sequence_compare } from './legacyMatrixUtils.js';

// 逐字内联自 notation/legacy/omega-Y.js 第 14–15 行（远古版全局依赖）
const sequence_display = expr=>''+expr==='Infinity'?'Limit':''+expr;
const Y_limit = seq=>seq[seq.length-1]>1;

export const OmegaY = (()=>{
   var data={}
   ,dataalter={}
   ,from_sequence = seq=>{
      var bottom,phantom,i,mountain=[]
      for(i=0;i<seq.length;++i){
         bottom={value:seq[i],x:i,y:[1],leftleg_up:[]}
         phantom={x:i,y:[],leftleg_up:[]}
         //define default edges below the bottom row
         bottom.rightleg_down = phantom
         phantom.rightleg_up = bottom
         if(i>0){
            bottom.leftleg_down = mountain[i-1][1]
            mountain[i-1][1].leftleg_up.push(bottom)
         }
         mountain[i]=[bottom,phantom]
      }
      return mountain
   }
   ,to_sequence = mountain=>mountain.map(column=>column[column.length-2].value)
   ,vertical_compare = (a,b)=>{
      if(a.length>b.length) return 1
      if(a.length<b.length) return -1
      for(var i=a.length;i--;){
         if(a[i]>b[i]) return 1
         if(a[i]<b[i]) return -1
      }
      return 0
   }
   ,same_row = (entry1,entry2)=>!vertical_compare(entry1.y,entry2.y)
   ,vertical_increase = (y,d)=>{//go from y=[r0,r1,r2,...,r(d-1),rd #] to [0,0,0,...,0,rd+1 #]
      var c=y.slice()
      c[d]===undefined?(c[d]=1):(c[d]+=1)
      c.fill(0,0,d)
      return c
   }
   ,dimension_difference = (c1,c2)=>{
      var d=Math.max(c1.length,c2.length)
      while(d--){
         if(c1[d]!==c2[d]) return d
      }
      return d//identical coordinate means dimension difference -1
   }
   ,create_entry = function(parent,entry){
      var newentry={
         value:entry.value-parent.value
         ,x:entry.x
         ,y:vertical_increase(entry.y,dimension_difference(parent.y,entry.y)+1)
         ,leftleg_up:[]
      }
      newentry.rightleg_down = entry
      entry.rightleg_up = newentry
      newentry.leftleg_down = parent
      parent.leftleg_up.push(newentry)
      return newentry
   }
   ,draw_mountain = mountain=>{
      mountain.forEach(column=>{
         var parent,entry,up
         while(true){
            entry = column[0]
            if(entry.value===1) return;
            for(parent=entry;true;){
               up=parent.leftleg_down
               while(up.rightleg_up&& vertical_compare(up.rightleg_up.y,parent.y)<=0) up=up.rightleg_up
               parent=up
               if(parent.value<entry.value) break
            }
            column.unshift(create_entry(parent,entry))
         }
      })
      return mountain
   }
   ,find_lower = (column,y)=>{
      var i1=0,i2=column.length-1,i
      while(i1<i2){
         i=Math.floor((i1+i2)/2)
         if(vertical_compare(column[i].y,y)<0) i2=i
         else i1=i+1
      }
      return column[i2]
   }
   ,find_higherequal = (column,y)=>{
      var i1=0,i2=column.length-1,i
      while(i1<i2){
         i=Math.ceil((i1+i2)/2)
         if(vertical_compare(column[i].y,y)>=0) i1=i
         else i2=i-1
      }
      return column[i1]
   }
   ,yslice = (column,lowequal,high)=>{
      var i1,i2,i
      i1=0,i2=column.length-1
      while(i1<i2){
         i=Math.floor((i1+i2)/2)
         if(vertical_compare(column[i].y,high)<0) i2=i
         else i1=i+1
      }
      var start=i2
      i1=start,i2=column.length-1
      while(i1<i2){
         i=Math.floor((i1+i2)/2)
         if(vertical_compare(column[i].y,lowequal)<0) i2=i
         else i1=i+1
      }
      return column.slice(start,i2)
   }
   ,collect_usual = (working_entry,collection=[])=>{
      working_entry.leftleg_up.forEach(e=>{
         var child=e.rightleg_down
         if(collection.includes(child)) return;
         if(same_row(working_entry,child)){
            collection.push(child)
            collect_usual(child,collection)
         }
      })
      return collection
   }
   ,collect1D = (working_entry,collection=[])=>{
      working_entry.rightleg_down.leftleg_up.forEach(child=>{
         if(collection.includes(child)) return;
         if(same_row(working_entry,child)){
            collection.push(child)
            collect1D(child,collection)
         }
      })
      return collection
   }
   ,collect = working_entry=>
      vertical_compare(working_entry.y,[1])>0 && dimension_difference(working_entry.y,working_entry.rightleg_down.y)===0 
      ?collect1D(working_entry) :collect_usual(working_entry)
   ,fill_magma_edge = (mountain,source_entry,leftleg_entry)=>{
      var newentry,d
      ,targetx = source_entry.x-source_entry.leftleg_down.x+leftleg_entry.x
      for(d=dimension_difference(leftleg_entry.y,leftleg_entry.rightleg_up.y);d>=0;--d){
         newentry={
            x:targetx
            ,y:vertical_increase(leftleg_entry.y,d)
            ,leftleg_up:[]
         }
         newentry.leftleg_down = leftleg_entry
         leftleg_entry.leftleg_up.push(newentry)
         mountain[targetx].push(newentry)
      }
   }
   ,copy_single_edge = (mountain,source_entry,x_offset,BR_x,targety)=>{
      if(targety===undefined) targety = source_entry.y
      var leftleg_entry
      ,newentry={
         x:source_entry.x+x_offset
         ,y:targety.slice()
         ,leftleg_up:[]
      }
      if(source_entry.y.length>0){//underground doesn't have this
         if(source_entry.leftleg_down.x>=BR_x){//ascend
            leftleg_entry = find_lower(mountain[source_entry.leftleg_down.x+x_offset],newentry.y)
         }else{//not ascend
            leftleg_entry = source_entry.leftleg_down
         }
         newentry.leftleg_down = leftleg_entry
         leftleg_entry.leftleg_up.push(newentry)
      }
      mountain[source_entry.x+x_offset].push(newentry)
   }
   ,omega_Y_limit = (seq,FSterm)=>{
      var mountain = draw_mountain(from_sequence(seq))
      ,child = mountain[mountain.length-1]
      ,BR = child[0].leftleg_down
      ,width=mountain.length-1-BR.x
      ,top=mountain[BR.x]
      top = top.slice(top.findIndex(entry=>entry===BR),top.length-1)
      top.unshift(child[0])
      var s=seq.slice()
      --s[s.length-1]
      mountain = draw_mountain(from_sequence(s))
      BR = mountain[BR.x].find(entry=>same_row(entry,BR))//restore in the new mountain
      var magma_entries=[]
      for(var BR1=BR;true;BR1=BR1.rightleg_down){
         collect(BR1).forEach(entry=>{
            var dx=entry.x-BR.x
            if(magma_entries[dx]===undefined) magma_entries[dx]=[]
            magma_entries[dx].push(entry)
         })
         if(!BR1.y.length) break
      }
      for(var n=1;n<=FSterm;++n){
         var ref = top.map(topentry=>find_lower(mountain[mountain.length-1],topentry.y))
         for(var dx=1;dx<=width;++dx){
            var column=[]
            mountain[BR.x+n*width+dx]=column
            magma_entries[dx].forEach(magma_entry=>{
               copy_single_edge(mountain,magma_entry,n*width,BR.x)
               var source_entry = magma_entry
               ,targety = find_higherequal(ref,magma_entry.y).y
               ,targety0 = targety
               while(!(source_entry.value<=1||magma_entries[dx].includes(source_entry.rightleg_up))){
                  targety = vertical_increase(targety,dimension_difference(source_entry.y,source_entry.rightleg_up.y))
                  source_entry = source_entry.rightleg_up
                  copy_single_edge(mountain,source_entry,n*width,BR.x,targety)
               }
               if(!magma_entry.y.length) return;
               var leftlegx = magma_entry.leftleg_down.x+n*width//strong magma
               yslice(mountain[leftlegx],magma_entry.y,targety0).forEach(
                  leftleg_entry=>fill_magma_edge(mountain,magma_entry,leftleg_entry)
               )
            })
            column.sort((entry1,entry2)=>-vertical_compare(entry1.y,entry2.y))
            for(var i=0;i<column.length-1;++i){
               column[i].rightleg_down = column[i+1]
               column[i+1].rightleg_up = column[i]
            }
            column[0].value = 1
            column.slice(1,column.length-1).forEach(entry=>entry.value=entry.rightleg_up.value+entry.rightleg_up.leftleg_down.value)
         }
      }
      return to_sequence(mountain)
   }
   ,def = {
      id:'omega-y'
      ,name:'ω-Y sequence'
      ,category_id:'category-y'
      ,display:{plain:sequence_display}
      ,is_limit:Y_limit
      ,compare:sequence_compare
      ,FS:(seq,FSterm)=>{
         if(!seq.length) return []
         var datakey=''+seq
         if(datakey==='Infinity') return [1,1+FSterm]
         if(seq[seq.length-1]===1) return seq.slice(0,seq.length-1)
         if(!data[datakey]) data[datakey] = []
         else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
         return data[datakey][FSterm] = omega_Y_limit(seq,FSterm).slice(0,-1)
      }
      ,FS_alter:(seq,FSterm)=>{
         if(!seq.length) return []
         var datakey=''+seq
         if(datakey==='Infinity') return [1,1+FSterm]
         if(seq[seq.length-1]===1) return seq.slice(0,seq.length-1)
         if(!dataalter[datakey]) dataalter[datakey] = []
         else if(dataalter[datakey][FSterm]!==undefined) return dataalter[datakey][FSterm]
         return dataalter[datakey][FSterm] = omega_Y_limit(seq,FSterm)
      }
      ,init:()=>([
         [Infinity]
         ,[1]
         ,[]
      ])
   }
   // ---- 接口层门控（见文件头「门控」一节）-------------------------------------
   // 远古引擎只把 able（= Y_limit）为真的表达式递给 FS（core/engine.js:157 的
   // `!(ableHit || semiableHit)` 短路），而 omega-y 没有 semiable；非 able 输入
   // 在远古 raw FS 上会抛 TypeError（末项为 0 时）或做出远古引擎不会发生的展开
   // （末项为 1 时）。故 FS / FS_alter 外层按 able 门控。
   // FS_raw / FS_alter_raw 的函数体是远古原文，未改一个字。
   var FS_raw = def.FS
   ,FS_alter_raw = def.FS_alter
   def.FS = (seq,FSterm)=>Y_limit(seq) ? FS_raw(seq,FSterm) : seq
   def.FS_alter = (seq,FSterm)=>Y_limit(seq) ? FS_alter_raw(seq,FSterm) : seq
   return def
})()

register_notation(OmegaY);
