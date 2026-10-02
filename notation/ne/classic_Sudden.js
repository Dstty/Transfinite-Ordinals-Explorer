// ============================================================================
//  notation/ne/classic_Sudden.js — sudden 矩阵（WSM / ZSM / USM）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：sudden 矩阵（WSM / ZSM / USM）；ne 分类 id = category-mx-sudden
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  ZSM — 参考版 key: zsm（工厂 9532 字节，原样）
// ---------------------------------------------------------------------------
const factory_zsm = function(){
class BSM {
            constructor() {
                this.S = [];
                this.X = 0;
                this.Y = 0;
                this.t = 0;
                this.R = [];
                this.Real_r = 0;
            }

            split(str, delimiter) {
                const regex = new RegExp(delimiter, 'g');
                return str.match(regex) || [];
            }

            read(p) {
                this.S = [];
                this.Y = 0;
                this.S.push([0]);
                const tokens = this.split(p, /(\[.*?\]|\(.*?\)|[^,\s]+)/g);
                for (const t of tokens) {
                    const z = [0];
                    if (t.startsWith('[')) z[0] = 1;
                    const numbers = t.match(/\d+/g) || [];
                    for (const num of numbers) {
                        z.push(parseInt(num));
                    }
                    this.S.push(z);
                    this.Y = Math.max(this.Y, z.length);
                }
                for (const row of this.S) {
                    while (row.length < this.Y) row.push(0);
                }
                this.Y--;
            }

            P(y, x) {
                if (y === 1) {
                    for (let p = x - 1; p > 0; p--) {
                        if (p < x && this.S[p][1] < this.S[x][1]) return p;
                    }
                    return 0;
                } else {
                    for (let p = x - 1; p > 0; p--) {
                        if (p < x && this.S[p][y] < this.S[x][y] && this.An(p, x, y - 1)) return p;
                    }
                    return 0;
                }
            }

            An(p, x, y) {
                if (x === p) return true;
                while (x > 0) {
                    const pa = this.P(y, x);
                    if (pa === p) return true;
                    x = this.P(y, x);
                }
                if (this.P(y, x) === p) return true;
                return false;
            }

            Max(v) {
                return Math.max(...v);
            }

            Min(v) {
                return Math.min(...v);
            }

            A(r, x, y) {
                for (const k of this.R) {
                    if (k >= r && this.An(k, x, y)) return 1;
                }
                return 0;
            }

            Delta(r, y) {
                if (y < this.t) return this.S[this.X][y] - this.S[r][y];
                if (y === this.t) return this.S[this.X][y] - this.S[r][y] - 1;
                return 0;
            }

            GetBx(r, a, x) {
                const ret = new Array(this.Y + 1).fill(0);
                for (let y = 1; y <= this.Y; y++) {
                    ret[y] = this.S[x][y] + a * this.Delta(r, y) * this.A(r, x, y);
                }
                return ret;
            }

            GetB(r, a) {
                const B = [new Array(this.Y + 1).fill(0)];
                for (let x = r; x < this.X; x++) {
                    const Bx = this.GetBx(r, a, x);
                    B.push(Bx);
                }
                return B;
            }

            GetG(r) {
                const G = [];
                for (let i = 0; i < r; i++) {
                    G.push(this.S[i]);
                }
                return G;
            }

            Connect(A, B) {
                for (let i = 1; i < B.length; i++) {
                    A.push(B[i]);
                }
                return A;
            }

            Compare(A, B) {
                const a = A.flat();
                const b = B.flat();
                for (let i = 0; i < Math.min(a.length, b.length); i++) {
                    if (a[i] > b[i]) return 1;
                    if (a[i] < b[i]) return -1;
                }
                if (a.length > b.length) return 1;
                if (a.length < b.length) return -1;
                return 0;
            }

            Small(r) {
                const p = this.Connect(this.Connect(this.GetG(r), this.GetB(r, 0)), this.GetB(r, 1));
                p.push(this.GetBx(r, 1, this.X));
                const mr = this.Max(this.R);
                const mp = this.Connect(this.Connect(this.GetG(mr), this.GetB(mr, 0)), this.GetB(mr, 1));
                mp.push(this.GetBx(mr, 1, this.X));
                return this.Compare(p, mp) < 0;
            }

            Forced(r) {
                let flag = false;
                for (let y = this.t + 1; y <= this.Y; y++) {
                    if (this.S[r][y] !== this.S[this.Max(this.R)][y]) flag = true;
                }
                return this.An(r, this.X, this.t) && flag;
            }

            ForcedBig(r) {
                let flag = true;
                for (let y = this.t + 1; y <= this.Y; y++) {
                    if (this.S[r][y] !== this.S[this.Max(this.R)][y]) flag = false;
                }
                return this.An(r, this.X, this.t) && flag;
            }

            findt(X) {
                let t = 1;
                for (let i = this.Y; i >= 1; i--) {
                    if (this.S[X][i] > 0) {
                        t = i;
                        break;
                    }
                }
                return t;
            }

            init() {
                this.X = this.S.length - 1;
                this.Y = this.S[0].length - 1;
                this.t = this.findt(this.X);
                this.R = [];
                for (let r = 1; r <= this.X; r++) {
                    const x = this.P(this.t, r);
                    if (this.An(r, this.X, this.t) && r !== this.X) {
                        this.R.push(r);
                        continue;
                    }
                    if (x === 0) continue;
                    if (this.An(x, this.P(this.t, this.P(this.t, this.X)), this.t) && (this.t <= 1 || this.An(r, this.X, this.t - 1))) {
                        this.R.push(r);
                    }
                }
            }

            Expand(k) {
                let e = 0;
                for (const r of this.R) {
                    if (this.Small(r)) e = r;
                }
                let r = this.X;
                for (let i = 1; i <= this.X; i++) {
                    if (i > e && this.An(i, this.X, this.t)) r = Math.min(r, i);
                }
                this.Real_r = r;
                let ret = this.Connect(this.GetG(r), this.GetB(r, 0));
                for (let i = 1; i <= k; i++) {
                    ret = this.Connect(ret, this.GetB(r, i));
                }
                return ret;
            }

            printMatrix(M) {
                let output = '';
                for (let i = 1; i < M.length; i++) {
                    output += '(';
                    for (let j = 1; j < M[i].length; j++) {
                        output += M[i][j];
                        if (j < M[i].length - 1) output += ',';
                    }
                    output += ')';
                }
                document.getElementById('output').textContent = output;
            }
        }

var Notation=(function(){
  function cmpTerm(a,b){
    var x=a.slice(1), y=b.slice(1);
    for(var i=0;i<Math.min(x.length,y.length);i++){
      if(x[i]>y[i]) return 1;
      if(x[i]<y[i]) return -1;
    }
    if(x.length>y.length) return 1;
    if(x.length<y.length) return -1;
    return 0;
  }
  function flatCompare(A,B){
    var ta=A.slice(1), tb=B.slice(1);
    for(var i=0;i<Math.min(ta.length,tb.length);i++){
      var c=cmpTerm(ta[i],tb[i]);
      if(c!==0) return c;
    }
    if(ta.length>tb.length) return 1;
    if(ta.length<tb.length) return -1;
    return 0;
  }
  function norm(m){ return (m && m.length>1) ? m : [[0]]; }
  function canon(m){
    m=norm(m);
    var w=1;
    for(var i=1;i<m.length;i++){
      var row=m[i];
      for(var j=row.length-1;j>=1;j--){ if(row[j]!==0){ if(j+1>w) w=j+1; break; } }
    }
    var out=[];
    for(var i=0;i<m.length;i++){
      var r=m[i].slice(0,w);
      while(r.length<w) r.push(0);
      out.push(r);
    }
    return out;
  }
  function parse(s){
    var t=String(s).trim();
    if(t==="") return [[0]];
    var toks=t.match(/(\[.*?\]|\(.*?\)|[^,\s]+)/g)||[];
    for(var i=0;i<toks.length;i++){
      var tk=toks[i];
      if(/^\d+$/.test(tk)) continue;
      var m=tk.match(/^([\[(])([\d,]*)([\])])$/);
      if(!m) return null;
      if(!/^(\d+(,\d+)*)?$/.test(m[2])) return null;
      if((m[1]==="("&&m[3]!==")")||(m[1]==="["&&m[3]!=="]")) return null;
    }
    var b=new BSM(); b.read(t); return canon(b.S);
  }
  function fmt(mat){
    var out="";
    for(var i=1;i<mat.length;i++){
      var vals=mat[i].slice(1);
      while(vals.length>1&&vals[vals.length-1]===0) vals.pop();
      out+="("+vals.join(",")+")";
    }
    return out;
  }
  return {
    parse: parse,
    format: fmt,
    isSuccessor: function(m){
      m=norm(m);
      return !(m.length>1 && m[m.length-1].length>1 && m[m.length-1][1]>0);
    },
    generateLimit: function(k){
      var inp = (k<=1) ? "0,1" : "0,(1" + Array(k-1).fill(",1").join("") + ")";
      var b=new BSM(); b.read(inp); return canon(b.S);
    },
    expand: function(m,n){
      var b=new BSM(); b.S=norm(m).map(function(r){return r.slice();}); b.init();
      var r=canon(b.Expand(n));
      if (flatCompare(r, m) === 0) {
        // 后继：类返回自身；按 BHM 的处理方式改为前驱（去掉最后一列）
        if (m.length > 2) return canon(m.slice(0, -1));
        return null;
      }
      return r;
    },
    compare: flatCompare
  };
})();


return Notation;};
export const def_zsm = define_classic_notation({
  id: "zsm",
  name: "ZSM",
  simple_name: "ZSM",
  category_id: "category-mx-sudden",
  credit_text_id: 'credit.community',
  create: factory_zsm,
});
register_notation(def_zsm);

// ---------------------------------------------------------------------------
//  USM — 参考版 key: usm（工厂 10936 字节，原样）
// ---------------------------------------------------------------------------
const factory_usm = function(){
class USM {
            constructor() {
                this.S = [];
                this.X = 0;
                this.Y = 0;
                this.t = 0;
                this.R = [];
                this.Real_r = 0;
                this.m = {};
            }

            inset(v, z) {
                return v && v.includes(z);
            }

            fa(x, y) {
                let t = this.S[x][y];
                let ans = [];
                for (let z = x - 1; z >= 1; z--) {
                    let prev_m = this.m[`${x},${y - 1}`];
                    if ((y === 1 || this.inset(prev_m, z)) && this.S[z][y] < t) {
                        t = this.S[z][y];
                    }
                    if (this.S[z][y] <= t) ans.push(z);
                }
                ans.sort((a, b) => a - b);
                this.m[`${x},${y}`] = ans;
                return ans;
            }

            Max(v) {
                if (!v || v.length === 0) return 0;
                return Math.max(...v);
            }

            A(r, x, y) {
                for (let k of this.R) {
                    if (k >= r && (this.inset(this.m[`${x},${y}`], k) || k === x)) {
                        return 1;
                    }
                }
                return 0;
            }

            Delta(r, y) {
                if (y < this.t) return this.S[this.X][y] - this.S[r][y];
                if (y === this.t) return this.S[this.X][y] - this.S[r][y] - 1;
                return 0;
            }

            GetBx(r, a, x) {
                let ret = new Array(this.Y + 1).fill(0);
                for (let y = 1; y <= this.Y; y++) {
                    ret[y] = this.S[x][y] + a * this.Delta(r, y) * this.A(r, x, y);
                }
                return ret;
            }

            GetB(r, a) {
                let B = [];
                B.push(new Array(this.Y + 1).fill(0)); // 空列，对齐C++
                for (let x = r; x <= this.X - 1; x++) {
                    B.push(this.GetBx(r, a, x));
                }
                return B;
            }

            GetG(r) {
                let G = [];
                for (let i = 0; i <= r - 1; i++) {
                    G.push([...this.S[i]]);
                }
                return G;
            }

            Connect(A, B) {
                let res = [];
                for (let a of A) res.push([...a]);
                for (let i = 1; i < B.length; i++) {
                    res.push([...B[i]]);
                }
                return res;
            }

            Compare(A, B) {
                let a = [], b = [];
                for (let x of A) for (let y of x) a.push(y);
                for (let x of B) for (let y of x) b.push(y);
                let len = Math.min(a.length, b.length);
                for (let i = 0; i < len; i++) {
                    if (a[i] > b[i]) return 1;
                    if (a[i] < b[i]) return -1;
                }
                if (a.length > b.length) return 1;
                if (a.length < b.length) return -1;
                return 0;
            }

            Small(r) {
                let p = this.Connect(this.Connect(this.GetG(r), this.GetB(r, 0)), this.GetB(r, 1));
                p.push(this.GetBx(r, 1, this.X));
                
                let mr = this.Max(this.R);
                let mp = this.Connect(this.Connect(this.GetG(mr), this.GetB(mr, 0)), this.GetB(mr, 1));
                mp.push(this.GetBx(mr, 1, this.X));
                
                return this.Compare(p, mp) < 0;
            }

            init() {
                this.X = this.S.length - 1;
                this.Y = this.S[0].length - 1;
                for (let i = this.Y; i >= 1; i--) {
                    if (this.S[this.X][i] > 0) {
                        this.t = i;
                        break;
                    }
                }
                this.m = {};
                for (let i = 1; i <= this.X; i++) {
                    for (let j = 1; j <= this.Y; j++) {
                        this.fa(i, j);
                    }
                }
            }

            getR() {
                let tempR = [];
                for (let i = 1; i <= this.t; i++) {
                    let nR = [];
                    let m_xi = this.m[`${this.X},${i}`] || [];
                    for (let x of m_xi) {
                        if (this.S[x][i] < this.S[this.X][i]) {
                            nR.push(x);
                        }
                    }
                    if (tempR.length === 0) tempR = [...nR];
                    else tempR = tempR.filter(v => nR.includes(v));
                }
                return tempR;
            }

            gett(x) {
                let c = 0;
                for (let d of x) {
                    if (d) c++;
                }
                return c;
            }

            Expand(k) {
                let w = this.getR();
                w.reverse();
                if (w.length === 0) return this.S;
                
                let lst = this.gett(this.S[w[0]]);
                this.R = [];
                for (let p of w) {
                    if (this.gett(this.S[p]) <= lst) {
                        this.R.push(p);
                        lst = this.gett(this.S[p]);
                    }
                }
                
                let e = 0;
                for (let r of this.R) {
                    if (this.Small(r)) {
                        e = r;
                        break;
                    }
                }
                
                let r = 998244353;
                for (let i of this.R) {
                    if (i > e) r = Math.min(i, r);
                }
                if (r === 998244353) r = e; // fail-safe fallback
                this.Real_r = r;
                
                let ret = this.Connect(this.GetG(r), this.GetB(r, 0));
                for (let i = 1; i <= k; i++) {
                    ret = this.Connect(ret, this.GetB(r, i));
                }
                return ret;
            }

            froms(M) {
                let now = [];
                for (let t of M) {
                    if (t[0] === 1) {
                        while (t.length < 3) t.push(0);
                        t.length = 3;
                        let t1 = [...t]; t1[0] = 0; now.push(t1);
                        let t2 = [...t1]; t2[1]++; now.push(t2);
                        let t3 = [...t2]; t3[1]++; t3[2]++; now.push(t3);
                    } else {
                        now.push([...t]);
                    }
                }
                return now;
            }

            read(p) {
                this.S = [[0]];
                this.Y = 0;
                const re = /(\[[^\]]*\]|\([^\)]*\)|[^,\s]+)/g;
                let match;
                while ((match = re.exec(p)) !== null) {
                    let t = match[1];
                    let z = [0];
                    if (t[0] === '[') z[0] = 1;
                    let nums = t.match(/\d+/g);
                    if (nums) {
                        nums.forEach(n => z.push(parseInt(n, 10)));
                    }
                    this.S.push(z);
                }

                for (let t of this.S) {
                    this.Y = Math.max(this.Y, t.length);
                }

                this.S = this.froms(this.S);

                for (let t of this.S) {
                    while (t.length < this.Y) t.push(0);
                    t.length = this.Y;
                }
                this.Y--;
            }

            format(M) {
                let out = [];
                for (let i = 1; i < M.length; i++) {
                    let t = [...M[i]];
                    while (t.length > 2 && t[t.length - 1] === 0) {
                        t.pop();
                    }
                    
                    if (t[0] === 1) {
                        out.push(`[${t.slice(1).join(',')}]`);
                    } else if (t.length === 2) {
                        out.push(`${t[1]}`);
                    } else {
                        out.push(`(${t.slice(1).join(',')})`);
                    }
                }
                return out.join(',');
            }
        }

var Notation=(function(){
  function norm(m){ return (m && m.length>1) ? m : [[0]]; }
  function canon(m){
    m=norm(m);
    var w=2;
    for(var i=1;i<m.length;i++){
      var row=m[i];
      for(var j=row.length-1;j>=1;j--){ if(row[j]!==0){ if(j+1>w) w=j+1; break; } }
    }
    var out=[];
    for(var i=0;i<m.length;i++){
      var r=m[i].slice(0,w);
      while(r.length<w) r.push(0);
      out.push(r);
    }
    return out;
  }
  function mk(m){ var u=new USM(); u.S=canon(m).map(function(r){ return r.slice(); }); u.init(); return u; }
  function cmpTerm(a,b){
    var x=a.slice(1), y=b.slice(1);
    for(var i=0;i<Math.min(x.length,y.length);i++){
      if(x[i]>y[i]) return 1;
      if(x[i]<y[i]) return -1;
    }
    if(x.length>y.length) return 1;
    if(x.length<y.length) return -1;
    return 0;
  }
  function flatCompare(A,B){
    var ta=A.slice(1), tb=B.slice(1);
    for(var i=0;i<Math.min(ta.length,tb.length);i++){
      var c=cmpTerm(ta[i],tb[i]);
      if(c!==0) return c;
    }
    if(ta.length>tb.length) return 1;
    if(ta.length<tb.length) return -1;
    return 0;
  }
  function parse(s){
    var t=String(s).trim();
    if(t==="") return [[0]];
    var toks=t.match(/(\[[^\]]*\]|\([^\)]*\)|[^,\s]+)/g)||[];
    var rest=t.replace(/(\[[^\]]*\]|\([^\)]*\)|[^,\s]+)/g,'').replace(/[,\s]/g,'');
    if(rest!=="") return null;
    for(var i=0;i<toks.length;i++){
      var tk=toks[i];
      if(/^\d+$/.test(tk)) continue;
      var m=tk.match(/^([\[(])([\d,]*)([\])])$/);
      if(!m) return null;
      if(!/^(\d+(,\d+)*)?$/.test(m[2])) return null;
      if((m[1]==="("&&m[3]!==")")||(m[1]==="["&&m[3]!=="]")) return null;
    }
    var u=new USM();
    try { u.read(t); } catch(e){ return null; }
    return canon(u.S);
  }
  function isSuccessor(m){
    try { var u=mk(m); return u.getR().length===0; } catch(e){ return true; }
  }
  return {
    parse: parse,
    format: function(m){ return USM.prototype.format(m); },
    isSuccessor: isSuccessor,
    generateLimit: function(k){
      var inp = (k<=1) ? "0,1" : "0,(1" + Array(k-1).fill(",1").join("") + ")";
      var u=new USM();
      try { u.read(inp); } catch(e){ return [[0]]; }
      return canon(u.S);
    },
    expand: function(m,n){
      try {
        var u=mk(m);
        // USM 类对后继节点（getR 空）返回自身副本，导致框架 k 循环空转与去重自斥；
        // 按 BHM 的处理方式：后继的展开结果=前驱（去掉最后一列），n=0 或无可去列时为 null
        if (u.getR().length === 0) {
          if (Number.isInteger(n) && n >= 1 && m.length > 2) return canon(m.slice(0, -1));
          return null;
        }
        return canon(u.Expand(n));
      } catch(e){ return null; }
    },
    compare: flatCompare
  };
})();

return Notation;};
export const def_usm = define_classic_notation({
  id: "usm",
  name: "USM",
  simple_name: "USM",
  category_id: "category-mx-sudden",
  credit_text_id: 'credit.community',
  create: factory_usm,
});
register_notation(def_usm);
