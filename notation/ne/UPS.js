// ============================================================================
//  notation/ne/UPS.js — Upward projection sequence（硬切改写）
// ============================================================================
//  来源：notation/legacy/UPS.js（远古接口，register.push 形态）。
//  UPS 是**本项目远古独有**记号，ne-rewritten 里没有对应物 → 不是搬运，
//  而是把远古接口实现改写成 ne 风格 NotationDefinition。
//
//  接口映射（样板：notation/ne/PrSS.js；矩阵参考：notation/ne/MM.js）：
//
//    远古接口                                 ne 风格
//    ----                                     --
//    register.push({...})                     export const UPS = {...} + register_notation(UPS)
//    display: s => ...（记号自带箭头函数）      display: { plain: 同一函数（逐字照搬）}
//    able:    matrix_limit                    is_limit: matrix_limit
//    compare: matrix_compare                  compare: matrix_compare
//    FSalter                                  无（远古版没有 FSalter，故不设 FS_alter）
//    init() → [{expr, low, subitems}, ...]    init() → [表达式, ...]（只取 expr）
//    无分类                                    category_id: 'category-bm-like'
//
//  UPS 的表达式是「投影数列」`[[value, flag], ...]`，但远古版**就是**拿矩阵三件套
//  的 `matrix_limit` / `matrix_compare` 当 able / compare（notation/legacy/UPS.js
//  第 42–43 行），display 才是自己的箭头函数。因此这里从 `./legacyMatrixUtils.js`
//  接 `matrix_limit` / `matrix_compare`（该文件即远古 notation/legacy/BM.js 的
//  第 1–19 行 + omega-Y.js 第 1–13 行的逐行照搬），**不接** ne 的 BM.js
//  （两者不等价，证据见 legacyMatrixUtils.js 文件头）。
//
//  算法本体（last / cut / next / next0 / sup / father / fa0 / compare / proj /
//  unproj / r）逐行照搬，一个字未改；闭包结构保留原 IIFE，`FS_raw` 就是远古那个
//  返回的 FS 函数体（原样搬运，只加了名字）。
//
//  ## 门控：**需要**（依据）
//
//  ne 的 expand_single 对非 limit 节点一律调 `FS(expr, 0)`；远古引擎只在
//  able || semiable 为真时碰 FS（core/engine.js 第 152–157 行
//  `if (!(ableHit || semiableHit)) return`）。UPS 的远古定义**只有 able、没有 semiable**，
//  所以远古引擎从不把「非 able」的输入递给 FS。
//
//  实测（.tmp-ne/_probe-misc.mjs，逐条 worker + 超时）：
//    matrix_limit([[0,0]]) === false，而远古 FS([[0,0]], 0) → TypeError:
//    Cannot read properties of undefined (reading '0')
//      （`r()` 里末项 flag 为 0 → `b = father(s)` = last(s, -1, -1) = -1，
//        随后 `s[b][0]` 取 s[-1] 崩）。
//  而 `[[0,0]]` 在 ne 树里**可达**：init `[[Infinity]]`
//      → FS([[Infinity]], 0) = [[0,0],[1,1]]
//      → FS([[0,0],[1,1]], 0) = [[0,0]]
//  第三步展开该节点时 ne 会调 `FS([[0,0]], 0)`，旧引擎在此只是「不展开」。
//  即：不门控 = 用户点两下就抛错。
//
//  处理：**只在记号定义的 FS 字段外层加门控**，与 core/ne/legacyAdapter.js 的
//  `make_legacy_FS` 同款（那里判的就是 able || semiable，UPS 无 semiable ⟹ 判 able）：
//
//      FS: (m, FSterm) => matrix_limit(m) ? FS_raw(m, FSterm) : m
//
//  `FS_raw` 一字未改；门控只拦「远古引擎本来就不会递进来的输入」，
//  使 ne 侧的判断退化为「不可展开」（compare(自身, 自身) === 0 → expand_single 返回
//  undefined → 链终止），与远古行为一致。
//
//  ## low 边界退役
//
//  旧 init 给 `{expr:[[Infinity]],low:[[]]}, {expr:[],low:[[]]}`；ne 里上界 =
//  「先根遍历下一个节点」（core/ne/tree.js get_bound）。旧版展开极限项时把它作为
//  **兄弟**插进根列表，ne 会把它作为**子节点**挂下去——树形不同但展开内容相同。
// ============================================================================
import { register_notation } from '../../core/ne/registry.js';
import { matrix_compare, matrix_limit } from './legacyMatrixUtils.js';

export const UPS = (()=>{
   const last=(s,n=1,i=s.length-1)=>{while(i>=0&&s[i][0]!=n)i--;return i}
   const cut=(s,t,e=s.length)=>{if(t===-1)return [];let r=[],d=s[t][0],m=s.length>e?e+1:s.length;for(let i=t;i<m&&s[i][0]>=d;i++)r.push([s[i][0]-d,i===e?1:s[i][1]]);return r}
   const next=s=>cut(s,last(s))
   const next0=s=>compare(s=next(s),[[0,1]])<0?s:next0(s)
   const sup=(s,f1,f2)=>{let i=f1;while(s[i][1]||s[i][0]!=s[f2][0])i++;return i}
   const father=(s,n=s.length-1)=>last(s,s[n][0]-1,n-1)
   const fa0=(s,n=s.length-1)=>s[(n=father(s,n))>=0?n:0][1]?fa0(s,n):n
   const compare=(a,b,i=0)=>a.length===i?b.length===i?0:-1:b.length===i?1:a[i][0]>b[i][0]?1:a[i][0]<b[i][0]?-1:a[i][1]===b[i][1]?compare(a,b,i+1):a[i][1]-b[i][1]
   function proj(s,n){
      let ne=next0(s);
      for(let i=0;i<n;i++)if(compare(s=next(s),[[0,1]])<0){s=0;break;}
      if(ne.length)ne=proj(ne,n);
      return s===0||ne.length&&compare(s,ne)>0?ne:s
   }
   function unproj(s1,s2){
      for(let i=0;;i++){
         let p1=proj(s1,i),p2=proj(s2,i);
         if(p1.length===0)return true
         if(compare(p1,p2)>0)return false
      }
   }
   function r(s0,z0){
      let s=s0.slice(),z=z0,b;
      if(s[s.length-1][1]===0){
         b=father(s);
      }else for(let f2=fa0(s),f1=fa0(s,f2);;f2=f1,f1=fa0(s,f1)){
         if(f1===-1){b=0;break}
         b=sup(s,f1,f2);
         if(unproj(cut(s,f1,b),cut(s,f2)))break
      }
      let d=s[s.length-1][0]+s[s.length-1][1]-s[b][0]-1;
      s.pop();
      let B=s.slice(b);
      while(z--){B=B.map(item=>[item[0]+d,item[1]]);s.push(...B)}
      return s
   }
   // 远古 UPS 的 FS 函数体，原样搬运（门控在记号字段外层，本函数内一字未改）
   const FS_raw=(m,FSterm)=>{
      if(''+m==='Infinity') return [[0,0]].concat(Array(FSterm).fill(0).map((x,n)=>[n+1,1]))
      if(m.length===0) return []
      return r(m,FSterm)
   }
   return {
      id:'ups'
      ,name:'Upward projection sequence'
      ,category_id:'category-bm-like'
      ,display:{plain:s=>''+s==='Infinity'?'Limit':s.map(item=>item[1]?item[0]+'*':item[0]).join(',')}
      ,is_limit:matrix_limit
      ,compare:matrix_compare
      // 不可展开门控：非 limit 输入返回自身（远古引擎从不把这类输入递给 FS，见文件头）
      ,FS:(m,FSterm)=>matrix_limit(m)?FS_raw(m,FSterm):m
      ,init:()=>([
         [[Infinity]]
         ,[]
      ])
   }
})()

register_notation(UPS);
