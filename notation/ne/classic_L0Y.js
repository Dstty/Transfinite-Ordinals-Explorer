// ============================================================================
//  notation/ne/classic_L0Y.js — L0-Y 矩阵
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：L0-Y 矩阵；ne 分类 id = category-mx-l0y
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  L0Y — 参考版 key: L0Y（工厂 7958 字节，原样）
// ---------------------------------------------------------------------------
const factory_L0Y = function(){
if (!Array.prototype.findLastIndex) {
            Array.prototype.findLastIndex = function (predicate, thisArg) {
                for (let i = this.length - 1; i >= 0; i--) {
                    if (predicate.call(thisArg, this[i], i, this)) return i;
                }
                return -1;
            };
        }

        function arrayCompare(a, b) {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i] != b[i]) return (a[i] || 0) < (b[i] || 0) ? -1 : 1;
            }
            return a.length < b.length ? -1 : a.length == b.length ? 0 : 1;
        }

        function toPointerMatrix(a) {
            const pointerMatrix = [];
            for (let i = 0; i < a.length; i++) {
                pointerMatrix[i] = [];
                for (let j = 0; j < a[i].length; j++) {
                    pointerMatrix[i][j] = 0;
                }
                let parentIndex = a.findLastIndex((v, j) => j < i && v[0] < a[i][0]);
                if (parentIndex != -1) {
                    pointerMatrix[i][0] = i - parentIndex;
                }
            }
            for (let i = 0; i < a.length; i++) {
                if (pointerMatrix[i][0] == 0) continue;
                for (let j = 1; j < a[i].length; j++) {
                    let parentIndex = i;
                    while (true) {
                        if ((a[parentIndex][j] || 0) < a[i][j]) {
                            break;
                        } else {
                            parentIndex -= pointerMatrix[parentIndex][j - 1];
                        }
                    }
                    pointerMatrix[i][j] = i - parentIndex;
                }
            }
            return pointerMatrix;
        }

        function toMatrix(pm) {
            const matrix = [];
            for (let i = 0; i < pm.length; i++) {
                matrix[i] = [];
                for (let j = 0; j < pm[i].length; j++) {
                    matrix[i][j] = pm[i][j] == 0 ? 0 : (matrix[i - pm[i][j]][j] || 0) + 1;
                }
            }
            return matrix;
        }

        class notation {
            static title = "Large 0-Y";
            static header = "Large 0-Y Matrix";

            static lessOrEqual(a, b) {
                for (let i = 0; i < a.length; i++) {
                    if (i >= b.length) return false;
                    const compare = arrayCompare(a[i], b[i]);
                    if (compare != 0) return compare < 0;
                }
                return a.length <= b.length;
            }

            static expandLimit(n) {
                return [[0], Array(n).fill(1)];
            }

            static expand(matrix, n, customRoot = null) {
                const pm = toPointerMatrix(matrix);

                let rootIndex;
                if (customRoot !== null && customRoot !== undefined && !isNaN(customRoot)) {
                    rootIndex = Number(customRoot);
                    if (!Number.isInteger(rootIndex) || rootIndex < 0 || rootIndex >= pm.length) {
                        throw new Error(`自定义坏根索引 ${rootIndex} 无效（应在 0 到 ${pm.length - 1} 之间）`);
                    }
                    if (rootIndex >= pm.length - 1) {
                        throw new Error(`坏根不能是最后一列（索引 ${rootIndex}），必须小于 ${pm.length - 1}`);
                    }
                } else {
                    rootIndex = pm.length - 1 - pm.at(-1).at(-1);
                }

                if (n == 0) {
                    return rootIndex == 0 ? [] : matrix.slice(0, rootIndex);
                }

                const out = pm.map(x => [...x]);
                const tail = out.slice(rootIndex + 1);

                if (tail.length === 0) {
                    throw new Error(`坏根索引 ${rootIndex} 导致没有可展开的尾部，请检查。`);
                }

                const cutNode = tail.at(-1);
                const rootNode = out[rootIndex];
                const lastColumn = cutNode.pop();

                const getTermLength = (x) => x.length - (x.at(-1) == 0 ? 1 : 0);
                const ascendingSet = new Set();
                const extra = getTermLength(cutNode) - getTermLength(rootNode);

                if (extra < 1) {
                    for (let i = cutNode.length; i < rootNode.length; i++) {
                        cutNode[i] = rootNode[i] == 0 ? 0 : rootNode[i] + lastColumn;
                    }
                } else {
                    ascendingSet.add(rootIndex);
                    ascendingSet.add(out.length - 1);
                    for (let i = rootIndex; i < out.length; i++) {
                        const parentIndex = i - out[i].at(-1);
                        const canAscend = getTermLength(out[i]) > getTermLength(rootNode);
                        if (canAscend && ascendingSet.has(parentIndex)) ascendingSet.add(i);
                    }
                }

                for (let i = 1; i < n; i++) {
                    for (let j = 0; j < tail.length; j++) {
                        const term = [...tail[j]];
                        if (ascendingSet.has(j + rootIndex)) {
                            const parent = out[rootIndex + 1 + j - term.at(-1)];
                            const lengthDelta = getTermLength(term) - getTermLength(parent);
                            const ascendCount = i * extra;
                            term.splice(-lengthDelta, 0, ...Array(ascendCount).fill(term[0]));
                        }
                        for (let k = 0; k < term.length; k++) {
                            if (term[k] > j + 1) term[k] += lastColumn * i;
                        }
                        out.push(term);
                    }
                }
                out.pop();
                return toMatrix(out);
            }

            static isSuccessor(matrix) {
                return matrix.length == 0 || matrix.at(-1).length == 0 || matrix.at(-1).at(-1) == 0;
            }

            static toString(m) {
                if (m.length == 0) return "∅";
                let s = "";
                for (let i = 0; i < m.length; i++) {
                    s += `(${m[i].join(",")})`;
                }
                return s;
            }

            static fromString(s) {
                const matrix = [];
                const columns = s.match(/\([^)]*\)/g) || [];
                for (const v of columns) {
                    const column = (v.match(/\d+/g) || []).map(Number);
                    matrix.push(column);
                }
                return matrix;
            }

            static parameters = [
                { type: "checkbox", label: "Compressed", id: "compress" },
            ];

            static convertToNotation(value) {
                const matrix = notation.fromString(value);
                let str = notation.toString(matrix);
                if (notation.compress) {
                    str = str.replace(/\d+/g, m => {
                        m = +m;
                        return m >= 10 && m <= 35 ? String.fromCharCode(55 + m) : m;
                    }).replaceAll(")(", " ").replace(/[(),]/g, "");
                }
                return str;
            }
        }

var Notation=(function(){
  var N=notation;
  function parse(s){
    var t=String(s).trim();
    if(t==="∅") return [];
    var groups=t.match(/\([^)]*\)/g)||[];
    var rest=t.replace(/\([^)]*\)/g,"").trim();
    if(rest!=="") return null;
    for(var i=0;i<groups.length;i++){
      if(!/^\(\d*(,\d+)*\)$/.test(groups[i])) return null;
    }
    var mat=N.fromString(t);
    return mat;
  }
  function cmp(a,b){ return N.lessOrEqual(a,b) ? (N.lessOrEqual(b,a)?0:-1) : 1; }
  return {
    parse: parse,
    format: function(m){ return N.toString(m); },
    isSuccessor: function(m){ return N.isSuccessor(m); },
    generateLimit: function(k){ return N.expandLimit(k); },
    expand: function(m,n){ return N.expand(m,n); },
    compare: cmp
  };
})();



return Notation;};
export const def_L0Y = define_classic_notation({
  id: "L0Y",
  name: "L0-Y矩阵",
  simple_name: "L0Y",
  category_id: "category-mx-l0y",
  credit_text_id: 'credit.community',
  create: factory_L0Y,
});
register_notation(def_L0Y);

// ---------------------------------------------------------------------------
//  LBMS — 参考版 key: lbms（工厂 7307 字节，原样）
// ---------------------------------------------------------------------------
const factory_lbms = function(){
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

            
            A(r, x, y) {
                return this.An(this.Real_r, x, y) ? 1 : 0;
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
                
                const r = this.P(this.t, this.X);
                if (r === 0) {
                    
                    
                    return this.S;
                }
                this.Real_r = r;  

                let ret = this.Connect(this.GetG(r), this.GetB(r, 0));
                for (let i = 1; i <= k; i++) {
                    ret = this.Connect(ret, this.GetB(r, i));
                }
                return ret;
            }

        }

var Notation=(function(){
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
  function arrCompare(a,b){
    for(var i=0;i<Math.max(a.length,b.length);i++){
      var x=a[i]||0, y=b[i]||0;
      if(x!==y) return x<y?-1:1;
    }
    return a.length<b.length?-1:(a.length===b.length?0:1);
  }
  function cmp(A,B){
    var ca=[],cb=[];
    for(var i=1;i<A.length;i++) ca.push(A[i].slice(1));
    for(var j=1;j<B.length;j++) cb.push(B[j].slice(1));
    var n=Math.min(ca.length,cb.length);
    for(var k=0;k<n;k++){ var c=arrCompare(ca[k],cb[k]); if(c!==0) return c; }
    return ca.length<cb.length?-1:(ca.length>cb.length?1:0);
  }
  return {
    parse: parse,
    format: fmt,
    isSuccessor: function(m){
      m=norm(m);
      return !(m.length>1 && m[m.length-1].length>1 && m[m.length-1][1]>0);
    },
    generateLimit: function(k){
      var w=Math.max(2,k+1);
      var S=[[]];
      for(var i=0;i<w;i++) S[0].push(0);
      function tok(vals){ var r=[0]; for(var j=0;j<vals.length;j++) r.push(vals[j]); while(r.length<w) r.push(0); return r; }
      S.push(tok([0])); S.push(tok([1]));
      for(var v=2;v<=k;v++){ var a=[]; for(var q=0;q<v;q++) a.push(v); S.push(tok(a)); }
      return canon(S);
    },
    expand: function(m,n){
      var b=new BSM(); b.S=norm(m).map(function(r){return r.slice();}); b.init();
      return canon(b.Expand(n));
    },
    compare: cmp
  };
})();



return Notation;};
export const def_lbms = define_classic_notation({
  id: "lbms",
  name: "LBMS",
  simple_name: "LBMS",
  category_id: "category-mx-l0y",
  credit_text_id: 'credit.community',
  sample_k: 2,
  create: factory_lbms,
});
register_notation(def_lbms);
