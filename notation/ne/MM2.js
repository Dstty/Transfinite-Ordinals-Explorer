// ============================================================================
//  notation/ne/MM2.js — MM2（mountain 形式，硬切改写）
// ============================================================================
//  来源：notation/legacy/MM2.js（远古接口，register.push 形态）。
//  MM2 是**本项目远古独有**记号（ne-rewritten 无对应物）→ 硬切改写，非搬运。
//
//  接口映射（样板：notation/ne/PrSS.js）：
//
//    register.push({...})                  → export const MM2 = {...} + register_notation(MM2)
//    display: x=>matrix_display(...)       → display: { plain: ... }
//    able:    x=>matrix_limit(...)         → is_limit: ...
//    compare: (x1,x2)=>matrix_compare(...) → compare: ...
//    FSalter                               → FS_alter
//    init() → [{expr, low, subitems}, ...] → init() → [表达式, ...]
//    无分类                                 → category_id: 'category-bm-like'
//
//  依赖的 matrix_display / matrix_limit / matrix_compare 来自
//  `./legacyMatrixUtils.js`（远古原样抽取），**不是** notation/ne/BM.js。
//
//  算法本体（mountain_to_matrix / leftleg / leftlegCol / leftlegRow / expand /
//  FS / FSalter）逐行照搬，一个字未改。
//
//  ⚠ 远古文件把 `mountain_to_matrix` / `leftleg` / `leftlegCol` / `leftlegRow`
//    定义在**脚本顶层**（即远古全局）。已 grep 确认全项目只有 MM2 用它们
//    （omega-Y / omega-Y-magma 里的 `leftleg_up` / `leftleg_entry` 是同名前缀的
//    不同东西，不是这些函数），故此处收进模块作用域，不导出。
//
//  语义变化同 MM.js：semiable 本来就不存在（无需丢弃）；low 边界退役；
//  ne 引擎会对非 limit 节点调 FS(expr, 0)，而远古引擎对非 able 表达式根本不调 FS
//  —— 详见 MM.js 文件末「遗留」与验证脚本输出。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_display, matrix_limit } from './legacyMatrixUtils.js';

var mountain_to_matrix = x=>{
   if(''+x==='Infinity') return [[Infinity]]
   var n = x.length, m = 0
   for(var i=0;i<n;i++) m = Math.max(m,x[i].length)
   var ans = []
   for(i=0;i<n;i++){
      var v = []
      for(var j=0;j<m;j++){
         if(~leftlegCol(x,i,j+1)) v.push((ans[leftlegCol(x,i,j+1)][leftlegRow(x,i,j+1)] ?? 0) + 1)
         else if(j) break
         else v.push(0)
      }
      ans.push(v)
   }
   return ans
}
,leftleg = (x,i,j)=>((x[i]?.[j])??[-1,-1]).slice()
,leftlegCol = (x,i,j)=>(x[i]?.[j]?.[0])??-1
,leftlegRow = (x,i,j)=>(x[i]?.[j]?.[1])??-1

export const MM2 = (()=>{
   var data={}
   ,dataalter={}
   var expand = (x0,N)=>{
      var x = x0.map(e=>e.slice())
      var n = x.length, m = 0
      for(var i=0;i<n;i++) m = Math.max(m,x[i].length)
      if(!n) return x
      var t = -1
      for(i=0;i<m;i++) if(~leftlegCol(x,n-1,i)) t=i
      if(t===-1) return x.slice(0,-1)
      var getlvl = (a,b)=>{
         if(leftlegCol(x,a,b) === -1) return 1
         var ans = 1
         for(var i=b-1;i>=1;i--){
            if(leftlegCol(x,a,b)===leftlegCol(x,a,i)&&leftlegRow(x,a,b)===leftlegRow(x,a,i)) ans++
            else break
         }
         return ans
      }
      var llvl = getlvl(n-1,t)
      var br = leftleg(x,n-1,t)
      if(llvl>1){
         while(getlvl(br[0],br[1])>=llvl) br = leftleg(x,br[0],br[1])
      }
      var lf = leftleg(x,n-1,t)
      while(x[n-1].length>t) x[n-1].pop()
      t--
      for(i=lf[1]+1;i<m;i++){
         if(leftlegCol(x,lf[0],i)===-1) break
         x[n-1][i-lf[1]+t] = leftleg(x,lf[0],i)
      }
      for(i=0;i<n;i++) m = Math.max(m,x[i].length)
      var mag=[]
      for(i = br[0]; i < n; i++){
         mag.push(Array(m).fill(0))
      }
      mag[0][br[1]] = 1
      for(i = br[0] + 1; i < n; i++)
         for(var j = m - 1; j >= 0; j--)
            if(
               (leftlegCol(x,i,j)>=br[0] && mag[leftlegCol(x,i,j)-br[0]][leftlegRow(x,i,j)])
               ||(j<m-1 && mag[i-br[0]][j+1])
            )
               mag[i-br[0]][j] = 1
      for(var M=1;M<=N;M++)
         for(i = br[0] + 1; i <= n - 1; i++){
            var v = []
            var e = mag[i-br[0]][br[1]]
            for(j = 0; j <= br[1]; j++){
               var y=leftleg(x,i,j)
               if(y[0]>=br[0]){
                  y[0] += M*(n-1-br[0])
               }
               v.push(y)
            }
            var h
            if(e) for(j = 1; j <= M * (t - br[1]); j++){
               y = leftleg(x,i,br[1]+1)
               if((j - 1) % (t - br[1]) === 0) h = j - 1
               else{
                  var p = (j - 1) % (t - br[1]) + 1
                  if(leftlegCol(x,n-1,br[1]+p-1)!==leftlegCol(x,n-1,br[1]+p)||leftlegRow(x,n-1,br[1]+p-1)!==leftlegRow(x,n-1,br[1]+p)) h = j - 1
               }
               if(y[0]>=br[0]){
                  y[0] += M*(n-1-br[0])
                  if(y[1]>=br[1]) y[1] += h
               }
               v.push(y)
            }
            for(j = br[1] + 1; j < m; j++){
               y=leftleg(x,i,j)
               if(y[0]>=br[0]){
                  y[0] += M*(n-1-br[0])
                  if(e&&y[1]>=br[1]) y[1] += M*(t-br[1])
               }
               v.push(y)
            }
            x.push(v)
         }
      return x.map(column=>{
         var j=column.length
         while(--j){
            if(~((column[j]?.[0])??-1)) break
            column.pop()
         }
         return column
      })
   }
   return {
      id:'mm2'
      ,name:'MM2'
      ,category_id:'category-bm-like'
      ,display:{plain:x=>matrix_display(mountain_to_matrix(x))}
      ,is_limit:x=>matrix_limit(mountain_to_matrix(x))
      ,compare:(x1,x2)=>matrix_compare(mountain_to_matrix(x1),mountain_to_matrix(x2))
      ,FS:(m,FSterm)=>{
         if(''+m==='Infinity') return [[[-1,-1]],[[-1,-1]].concat(Array(FSterm+1).fill(1).map(()=>[0,0]))]
         if(m.length===0) return []
         var datakey=matrix_display(mountain_to_matrix(m))
         if(!data[datakey]) data[datakey] = []
         else if(data[datakey][FSterm]!==undefined) return data[datakey][FSterm]
         return data[datakey][FSterm] = expand(m,FSterm).slice(0,-1)
      }
      ,FS_alter:(m,FSterm)=>{
         if(''+m==='Infinity') return [[[-1,-1]],[[-1,-1]].concat(Array(FSterm+1).fill(1).map(()=>[0,0]))]
         if(m.length===0) return []
         var datakey=matrix_display(mountain_to_matrix(m))
         if(!dataalter[datakey]) dataalter[datakey] = []
         else if(dataalter[datakey][FSterm]!==undefined) return dataalter[datakey][FSterm]
         return dataalter[datakey][FSterm] = expand(m,FSterm)
      }
      ,init:()=>([
         [[Infinity]]
         ,[]
      ])
   }
})()

register_notation(MM2);

// ---------------------------------------------------------------------------
//  另注（远古实现自身的边界，照搬不改）
// ---------------------------------------------------------------------------
//  远古 MM2 的 expand 末尾 `while(--j)` 在「空列」输入上永不终止：j 从 0 递减，
//  -1 在 JS 里是真值，`column.pop()` 对空数组不改变长度 → 死循环。
//  实测 FS([[[0,0]]], 0)（mountain 形式的 `(0)`）在**远古与 ne 两侧同样不终止**
//  （用 worker 线程 + 超时终止判定，见 .tmp-ne/verify-mm-hardcut.mjs 的 B4 段）。
//  正常的 init 展开链不触发它：mm2 的 tier=1 冒烟通过，且展开树与远古适配版
//  逐项相同。这里保持逐行照搬，不加超时/边界保护。
