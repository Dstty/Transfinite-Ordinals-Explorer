// ============================================================================
//  notation/ne/X-Y.js — X-Y sequence（硬切改写）
// ============================================================================
//  来源：notation/legacy/X-Y.js（远古接口，register.push 形态）。
//  X-Y 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；序列类参考：notation/ne/PPS.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const X_Y = {...} + register_notation(X_Y)
//    display: sequence_display                display: { plain: sequence_display（逐字内联）}
//    able:    Y_limit                         is_limit: Y_limit（逐字内联）
//    compare: sequence_compare                compare: sequence_compare
//    FSalter                                  无（远古版没有 FSalter，故不设 FS_alter）
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    无分类                                    category_id: 'category-y'
//
//  ## 外部依赖怎么接（远古版靠全局，ne 是 ES module）
//
//  远古 X-Y 的 display / able / compare 直接用 notation/legacy/omega-Y.js 暴露的
//  经典脚本全局：
//      sequence_display = expr => ''+expr==='Infinity' ? 'Limit' : ''+expr   （omega-Y.js 第 14 行）
//      Y_limit          = seq => seq[seq.length-1] > 1                       （第 15 行）
//      sequence_compare = 递归字典序比较                                      （第 1–13 行）
//
//  ne 记号是 ES module，不能再依赖经典脚本的加载顺序，故：
//    · sequence_display / Y_limit —— 在本文件内**逐字内联**（与 PPS.js 的做法一致）；
//    · sequence_compare —— 直接 import 自 `./legacyMatrixUtils.js`，该文件里
//      `sequence_compare` 就是 omega-Y.js 第 1–13 行的逐行照搬（同一份实现，
//      不再抄第二遍；MM.js 也 import 该模块）。**不接** ne 的 BM.js
//      （其 compare 会补 Infinity 语义、与远古不等价，证据见 legacyMatrixUtils.js 文件头）。
//
//  算法本体（Gomen 的 FS 代码整段：isDimensionLimited / compareRow / rowAddition /
//  rowDifference / calcFootRow / preprocess / fetchDimensionSequence / drawMountain /
//  expandDimensionSequence / calcMaxCopyrow / copyItem / expand / toSequence，以及
//  FS 的私有 `data` 缓存）逐行照搬，一个字未改；闭包结构保留原 IIFE。
//
//  ## 门控：不需要（依据）
//
//  ne 的 expand_single 对**非 limit 节点**一律调 `FS(expr, 0)`；远古引擎只在
//  able || semiable 为真时碰 FS。X-Y 的远古定义带 **semiable: m => m.length > 0**，
//  而 core/engine.js 第 152–156 行的 semiable 分支对**任何非空且非 Infinity** 的表达式
//  都真的会执行 `FS(it.expr, 0)`：
//
//      semiableHit = semiable(expr) && !isInfinityExpr(expr) && compare(FS(expr, 0), low[0]) > 0
//
//  即：非 limit 且非空 ⟹ 远古引擎同样把该输入递给 `FS(expr, 0)`。
//  ne 的非 limit 分支调用的正是同一个 `FS(expr, 0)`，**没有新增崩溃面**。
//  唯一需要点明的边界：上古那行还有个 `!isInfinityExpr(expr)` 条件；X-Y 里满足
//  `'' + expr === 'Infinity'` 的只有 init 根 `[Infinity]`，而它 `Y_limit` 为真
//  （Infinity > 1）→ 两侧都走极限分支，ne 不会对它额外调 FS。非 limit 的树节点
//  都是 FS 产出的数字数列，不会字符串化成 'Infinity'，故该条件不开新的调用面。
//  实测（.tmp-ne/_probe-misc.mjs）：X-Y 的 FS 对样本集里的非 able 输入要么正常返回
//  （末项为 1 时直接截断，如 `[1,1] → [1]`、`[1,2,1] → [1,2]`），要么抛的是
//  **远古引擎自己也会抛**的错（如 `[2]`、`[2,2]` 抛 TypeError，
//  而 `[2]` 的 able=Y_limit=真，远古引擎同样会走 able 分支调 FS）。
//  X-Y 从 init（`[Infinity] / [1] / []`）出发的可达展开链上不存在崩溃输入：
//      [Infinity] → [1,1] → [1] → []
//  故不门控（套 `Y_limit(m) ? FS_raw : m` 只会把 `[1,1] → [1]` 这类远古本来
//  就会发生的「后继截断」挡掉，反而偏离远古行为）。
//
//  ## low 边界退役
//
//  旧 init 给 `{expr:[Infinity],low:[[1]]}, {expr:[1],low:[[]]}, {expr:[],low:[[]]}`；
//  ne 里上界 = 「先根遍历下一个节点」（core/ne/tree.js get_bound）。旧版展开极限项时
//  把它作为**兄弟**插进根列表，ne 会把它作为**子节点**挂下去——树形不同但展开内容相同。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { sequence_compare } from './legacyMatrixUtils.js';

// 逐字内联自 notation/legacy/omega-Y.js 第 14–15 行（远古版全局依赖）
const sequence_display = expr=>''+expr==='Infinity'?'Limit':''+expr;
const Y_limit = seq=>seq[seq.length-1]>1;

export const X_Y = {
  id:'x-y'
  ,name:'X-Y sequence'
  ,category_id:'category-y'
  ,display:{plain:sequence_display}
  ,is_limit:Y_limit
  ,compare:sequence_compare
  ,FS:(()=>{
    //FS code by Gomen
    function isDimensionLimited(it,d){ // n-Y
      if (d.length==1&&it.row.length==d[0]&&(it.parent.row.length<d[0]||it.row[0]>it.parent.row[0])) return true
      return false
    }
    function compareRow(r1,r2){
      if (r1.length<r2.length) return -1
      if (r1.length>r2.length) return 1
      for (var k=0;k<r1.length;k++){
        if (r1[k]<r2[k]) return -1
        if (r1[k]>r2[k]) return 1
      }
      return 0
    }
    function rowAddition(r1,r2){
      if (r1.length<r2.length) return r2
      if (r2.length==0) return r1
      var f=r1.slice(0,r1.length-r2.length),b=r2.slice()
      b[0]+=r1[r1.length-r2.length]
      return f.concat(b)
    }
    function rowDifference(r1,r2){
      if (r1.length>r2.length) return r1
      if (compareRow(r1,r2)<=0) return []
      var i=0,row=[]
      while (r1[i]==r2[i]) i++
      row.push(r1[i]-r2[i])
      for (++i;i<r1.length;i++) row.push(r1[i])
      return row
    }
    function calcFootRow(it,d){
      var row=[1],diff=rowDifference(it.row,it.parent.row).length
      if (compareRow(d,[0])>0) while (diff--) row.push(0)
      return rowAddition(it.row,row)
    }
    function preprocess(m,b){
      for (var i=0;i<m[b.cloumn].length;) m[b.cloumn][i].no=++i
      for (var i=b.cloumn+1;i<m.length;i++){
        for (var j=0;j<m[i].length;j++){
          if (m[i][j].parent.cloumn<b.cloumn) m[i][j].no=0
          else m[i][j].no=m[i][j].parent.no
        }
      }
    }
    function fetchDimensionSequence(m,it){
      var seq=[it.parent.row.length,it.row.length+1]
      for (it=it.parent;it.row.length>1;it=it.head.parent) if (it.head.parent.row.length<seq[0]) seq.unshift(it.head.parent.row.length)
      return seq
    }
    function drawMountain(m,d){
      var o=[]
      for (var i=0;i<m.length;i++){
        var it=m[i][0]
        while (it.value>1){
          if (isDimensionLimited(it,d)) break
          it.foot={value:it.value-it.parent.value,row:calcFootRow(it,d),cloumn:it.cloumn,head:it}
          m[i].push(it.foot)
          var p=it.parent
          if ('foot' in p&&compareRow(p.foot.row,it.foot.row)<=0) p=p.foot
          while (p.value>=it.foot.value) p=p.parent
          it.foot.parent=p
          it=it.foot
        }
        o.push(it)
      }
      return o
    }
    function expandDimensionSequence(s,n,d){
      if (s[s.length-1]-s[s.length-2]==1){
        var p=--s[s.length-1]
        while (n--) s.push(p)
        return s
      }
      if (d.length==2&&d[0]==0){ // [0,a] mean ω^a-Y, [0,0] mean ω^ω-Y
        var p=--s[s.length-1],b=p-s[s.length-2]
        if (d[1]) b=Math.min(b,d[1]-1)
        while (n--){
          p+=b
          s.push(p)
        }
        return s
      }
      if (compareRow(d,[1,0,1])==0) return expand(toSequence(s),n,d) // X-Y
      if (compareRow(d,[1,0,2])==0) return expand(toSequence(s),n,[1]) // dimension sequence expands as 1-Y
      if (d.length>2&&d[0]==0&&d[1]==0) return expand(toSequence(s),n,d.slice(2))
      // default expand as ω-Y
      var p=--s[s.length-1]
      while (n--) s.push(p)
      return s
    }
    function calcMaxCopyrow(m,b,t,it,dim_seq,index,i,d){
      if (compareRow(d,[0])==0||it.no==0) return it.row
      var diff=rowDifference(it.row,m[b.cloumn][it.no-1].row).slice()
      if (it.no==b.no&&diff.length>=t.row.length){
        var l=dim_seq[index+i+1]-t.row.length
        while (l-->0) diff.splice(1,0,0)
      }
      var p=m[t.cloumn+(t.cloumn-b.cloumn)*i][m[t.cloumn+(t.cloumn-b.cloumn)*i].length-1]
      while (p.no>it.no) p=p.head
      return rowAddition(p.row,diff)
    }
    function copyItem(op,head,max_row,d){
      if (head.parent.cloumn<0) return
      while (true){
        var row=calcFootRow(head,d)
        if (compareRow(row,max_row)>0) return
        head.foot={value:head.value,row:row,cloumn:head.cloumn,no:head.no,head:head,parent:head.parent}
        if ('foot' in head.parent&&compareRow(head.parent.foot.row,head.foot.row)<=0) head.foot.parent=head.foot.parent.foot
        op.push(head.foot)
        head=head.foot
      }
    }
    function expand(s,n,d){
      if (s[s.length-1].value<=1) return s.slice(0,-1).map(e=>{return e.value})
      var m=[],ex=[]
      s.forEach(e=>{m.push([e])})
      var o=drawMountain(m,d)
      var t=o[o.length-1].head,b=t.parent,len=t.cloumn-b.cloumn
      var dim_seq=fetchDimensionSequence(m,t),index=dim_seq.length-1
      dim_seq=expandDimensionSequence(dim_seq,n,d)
      if (o[o.length-1].value>1){
        o.forEach(e=>{ex.push({value:e.value,row:[0],cloumn:e.cloumn,parent:e.parent.cloumn==-1?{row:[0],cloumn:-1,no:0}:ex[e.parent.cloumn]})})
        ex=expand(ex,n,d)
        if (n){
          len=(ex.length-o.length)/n
          b=o[t.cloumn-len]
        }
      }
      else {
        delete t.foot
        m[t.cloumn].pop()
      }
      preprocess(m,b)
      for (var i=0;i<m[t.cloumn].length;i++) m[t.cloumn][i].value--
      for (var i=0;i<n;i++){
        for (var j=b.cloumn+1;j<=t.cloumn;j++){
          var l=m.length,op=[]
          m.push(op)
          for (var k=0;k<m[j].length;k++){
            var max_row=calcMaxCopyrow(m,b,t,m[j][k],dim_seq,index,i,d),head={row:[0],cloumn:l,no:m[j][0].no,parent:m[j][0].parent}
            if (op.length){
              head={row:calcFootRow(op[op.length-1],d),cloumn:l,no:m[j][k].no,parent:m[j][k].parent,head:op[op.length-1]}
              op[op.length-1].foot=head
            }
            op.push(head)
            if (head.parent.cloumn>=b.cloumn) head.parent=m[head.parent.cloumn+len*i+len][m[head.parent.cloumn+len*i+len].length-1]
            while (compareRow(head.parent.row,head.row)>0) head.parent=head.parent.head
            copyItem(op,op[op.length-1],max_row,d)
          }
          op[op.length-1].value=ex.length?ex[j+len*i+len]:m[j][m[j].length-1].value
          for (var k=m[l].length-1;k>0;k--) m[l][k-1].value=m[l][k].value+m[l][k-1].parent.value
        }
      }
      var ret=[]
      for (var i=0;i<m.length;i++) ret.push(m[i][0].value)
      return ret
    }
    function toSequence(s){
      var seq=[]
      for (var i=0;i<s.length;i++){
        if (s[i]<=1) {seq.push({value:s[i],row:[0],cloumn:i,parent:{row:[0],cloumn:-1}});continue}
        for (var j=i-1;j>=0;j--) if (s[j]<s[i]) {seq.push({value:s[i],row:[0],cloumn:i,parent:seq[j]});break}
      }
      return seq
    }
    //Gomen's code ends here
    var data={}
    return (seq,FSterm)=>{
      if(!seq.length) return []
      var datakey=''+seq
      if(datakey==='Infinity') return [1,1+FSterm]
      if(seq[seq.length-1]===1) return seq.slice(0,seq.length-1)
      if(!data[datakey]) data[datakey] = []
      else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
      return data[datakey][FSterm] = expand(toSequence(seq),FSterm,[1,0,1])
    }
  })()
  ,init:()=>([
    [Infinity]
    ,[1]
    ,[]
  ])
}

register_notation(X_Y);
