// ============================================================================
//  notation/ne/classic_Primitive.js — Primitive 序列（HPrSS / LPrSS 系）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：Primitive 序列（HPrSS / LPrSS 系）；ne 分类 id = category-seq-primitive
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  LPrSS — 参考版 key: LPrSS（工厂 7186 字节，原样）
// ---------------------------------------------------------------------------
const factory_LPrSS = function(){
var Notation={
  // 内部表示：矩阵数组，每个元素为 [a, b]

  parse(inputStr) {
    const trimmed = inputStr.trim();
    if (trimmed === '') return [];
    const columns = [];
    const regex = /\(([^)]*)\)/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      const content = match[1];
      if (content === '') {
        columns.push([0, 0]);
      } else {
        const parts = content.split(',');
        const a = (parts[0] !== undefined && parts[0].trim() !== '') ? parseInt(parts[0], 10) : 0;
        let b = 0;
        if (parts.length > 1 && parts[1].trim() !== '') {
          b = parseInt(parts[1], 10);
        }
        if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || !Number.isInteger(a) || !Number.isInteger(b)) {
          return null;
        }
        columns.push([a, b]);
      }
    }
    // 确保没有多余字符，比如匹配后剩余非空白字符
    const remaining = trimmed.replace(/\(([^)]*)\)/g, '').trim();
    if (remaining !== '') return null;
    return columns;
  },

  format(obj) {
    if (!Array.isArray(obj)) return '';
    if (obj.length === 0) return '';
    return obj.map(([a, b]) => {
      if (a === 0 && b === 0) return '()';
      if (b === 0) return `(${a})`;
      return `(${a},${b})`;
    }).join('');
  },

  isSuccessor(obj) {
    if (!Array.isArray(obj) || obj.length === 0) return true; // 空序列视为0，后继
    const [lastA, lastB] = obj[obj.length - 1];
    return lastA === 0 && lastB === 0;
  },

  generateLimit(k) {
    return [[0, 0], [1, k]];
  },

  expand(obj, n) {
    if (!Array.isArray(obj) || obj.length === 0) return null;
    if (this.isSuccessor(obj)) return null;
    if (!Number.isInteger(n) || n < 1) return null;

    const lastIdx = obj.length - 1;
    const [lastA, lastB] = obj[lastIdx];

    // 假坏根分支（末列第二行为0且第一行非0）
    if (lastB === 0) {
      const fakeBadRoot = this._find1Parent(obj, lastIdx);
      if (fakeBadRoot === -1) return null;
      const G = obj.slice(0, fakeBadRoot);
      const B = obj.slice(fakeBadRoot, lastIdx);
      const result = [...G];
      for (let k = 0; k < n; k++) {
        result.push(...B.map(col => [col[0], col[1]]));
      }
      return result;
    }

    // 坏根分支（末列两行均不为0）
    const badRoot = this._find2Parent(obj, lastIdx);
    if (badRoot === -1) return null;
    const G = obj.slice(0, badRoot);
    const B = obj.slice(badRoot, lastIdx);
    const delta = lastA - obj[badRoot][0];
    const f = lastB - obj[badRoot][1] - 1;

    const result = [...G];
    // k = 0
    result.push(...B.map(col => [col[0], col[1]]));
    for (let k = 1; k < n; k++) {
      for (let j = 0; j < B.length; j++) {
        const origIdx = badRoot + j;
        const newA = B[j][0] + delta * k;
        let newB = B[j][1];
        if (this._hasBadRootIn2Ancestors(obj, origIdx, badRoot)) {
          newB = B[j][1] + f * k;
        }
        result.push([newA, newB]);
      }
    }
    return result;
  },

  compare(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const [a1, a2] = a[i];
      const [b1, b2] = b[i];
      if (a1 < b1) return -1;
      if (a1 > b1) return 1;
      if (a2 < b2) return -1;
      if (a2 > b2) return 1;
    }
    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;
    return 0;
  },

  // 辅助函数
  _find1Parent(matrix, idx) {
    const a = matrix[idx][0];
    if (a <= 0) return -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (matrix[i][0] === a - 1) return i;
    }
    return -1;
  },

  _find1Ancestors(matrix, idx) {
    const anc = [idx];
    let cur = idx;
    while (true) {
      const p = this._find1Parent(matrix, cur);
      if (p === -1) break;
      anc.push(p);
      cur = p;
    }
    return anc;
  },

  _find2Parent(matrix, idx) {
    const b = matrix[idx][1];
    const anc1 = this._find1Ancestors(matrix, idx);
    let best = -1;
    for (const a of anc1) {
      if (matrix[a][1] < b && a > best) best = a;
    }
    return best;
  },

  _find2Ancestors(matrix, idx) {
    const anc = [idx];
    let cur = idx;
    const visited = new Set([idx]);
    while (true) {
      const p = this._find2Parent(matrix, cur);
      if (p === -1 || visited.has(p)) break;
      visited.add(p);
      anc.push(p);
      cur = p;
    }
    return anc;
  },

  _hasBadRootIn2Ancestors(matrix, idx, badRoot) {
    const anc2 = this._find2Ancestors(matrix, idx);
    return anc2.includes(badRoot);
  },

  equivalentForms(matrix) {
    // 默认使用矩阵形式
    return {
      default: "矩阵形式",
      forms: {
        "矩阵形式": {
          display: (mat) => this.format(mat),
          parse: (str) => this.parse(str)
        },
        "hydra树状": {
          display: (mat) => this._matrixToHydra(mat),
          parse: (str) => this._hydraToMatrix(str)
        }
      }
    };
  },

  _matrixToHydra(matrix) {
    if (matrix.length === 0) return '';
    const n = matrix.length;
    const parent = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const a = matrix[i][0];
      if (a > 0) {
        for (let j = i - 1; j >= 0; j--) {
          if (matrix[j][0] === a - 1) { parent[i] = j; break; }
        }
      }
    }
    const nodes = matrix.map((col, i) => ({ b: col[1], children: [], idx: i }));
    const roots = [];
    for (let i = 0; i < n; i++) {
      if (parent[i] === -1) roots.push(nodes[i]);
      else nodes[parent[i]].children.push(nodes[i]);
    }
    const nodeStr = (node) => {
      let s = 'p' + node.b;
      if (node.children.length > 0) {
        s += '(' + node.children.map(nodeStr).join('+') + ')';
      }
      return s;
    };
    return roots.map(nodeStr).join('+');
  },

  _hydraToMatrix(str) {
    if (!str) return [];
    const s = str.replace(/\s/g, '');
    let pos = 0;
    const len = s.length;

    const parseNumber = () => {
      let num = '';
      while (pos < len && s[pos] >= '0' && s[pos] <= '9') {
        num += s[pos++];
      }
      if (num === '') throw new Error('缺少数字');
      return parseInt(num, 10);
    };

    const parseExpr = (depth) => {
      const cols = [];
      // 第一个项
      if (pos >= len || s[pos] !== 'p') throw new Error('期望 p');
      pos++;
      const b = parseNumber();
      cols.push([depth, b]);

      if (pos < len && s[pos] === '(') {
        pos++;
        if (pos < len && s[pos] !== ')') {
          const childCols = parseExpr(depth + 1);
          cols.push(...childCols);
        }
        if (pos >= len || s[pos] !== ')') throw new Error('缺少右括号');
        pos++;
      }

      while (pos < len && s[pos] === '+') {
        pos++;
        if (pos >= len || s[pos] !== 'p') throw new Error('期望 p');
        pos++;
        const b = parseNumber();
        cols.push([depth, b]);

        if (pos < len && s[pos] === '(') {
          pos++;
          if (pos < len && s[pos] !== ')') {
            const childCols = parseExpr(depth + 1);
            cols.push(...childCols);
          }
          if (pos >= len || s[pos] !== ')') throw new Error('缺少右括号');
          pos++;
        }
      }
      return cols;
    };

    try {
      const matrix = parseExpr(0);
      if (pos !== len) throw new Error('解析未完成');
      return matrix;
    } catch (e) {
      return null;
    }
  }
};


return Notation;};
export const def_LPrSS = define_classic_notation({
  id: "LPrSS",
  name: "LPrSS Hydra",
  simple_name: "LPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_LPrSS,
});
register_notation(def_LPrSS);

// ---------------------------------------------------------------------------
//  HPrSS — 参考版 key: HPrSS（工厂 2936 字节，原样）
// ---------------------------------------------------------------------------
const factory_HPrSS = function(){
class notation {
	static title = "HPrSS";
	
	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [0,n+1];
	}

	static expand(a, n) {
		let getParent = i => a.findLastIndex((v, j) => j < i && v < a[i]);
		let differences = a.map((v, i) => v - a[getParent(i)]);
		let parentDifference = differences[a.length-1];
		let root = getParent(a.length-1);
		if (parentDifference > 1) {
			while (differences[root] >= parentDifference) {
				let parent = getParent(root);
				if (parent == -1) break;
				root = parent;
			}
		}

		let out = [...a];
		let cutNode = out.pop();
		let increment = cutNode - a[root] - 1;
		let badPart = out.slice(root);
		for (let i = 1; i <= n; i++) {
			out.push(...badPart.map(v => v + increment * i));
		}
		return out;
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1);
	}

	static fromString(s) {
		return JSON.parse("["+s+"]");
	}
};

var Notation=(function(){
  var __row = false;
  function __T(s){
    var a=notation.fromString(String(s));
    __validate(a);
    return a;
  }
  function __validate(a){
    if(!Array.isArray(a)) throw Error("not an array");
    for (var i=0;i<a.length;i++){
      var v=a[i];
      if(__row){
        if(!Array.isArray(v)) throw Error("row not array");
        for (var j=0;j<v.length;j++) if(!Number.isInteger(v[j])||v[j]<0) throw Error("bad entry");
      }else{
        if(!Number.isInteger(v)||v<0) throw Error("bad entry");
      }
    }
  }
  function __kmap(n){ return n; }
  function norm(s){ try { return notation.toString(__T(s)); } catch(e){ return null; } }
  return {
    parse: function(s){
      var t=String(s).trim();
      if(t==="") return [];
      try { return __T(t); } catch(e){ return null; }
    },
    format: function(m){ return notation.toString(m); },
    isSuccessor: function(m){
      try { return notation.isSuccessor(m) ? true : false; } catch(e){ return false; }
    },
    generateLimit: function(k){
      try { return notation.expandLimit(Number(k)|0); } catch(e){ return []; }
    },
    expand: function(m,n){
      try {
        if(!Number.isInteger(n)||n<0) return null;
        if(n>=1 && this.isSuccessor(m)) return null;
        var r=notation.expand(m, __kmap(n));
        if(r===null||r===undefined) return null;
        if(this.compare(r,m)>=0) return null;
        return r;
      } catch(e){ return null; }
    },
    compare: function(a,b){
      try {
        if(notation.lessOrEqual(a,b)) return notation.lessOrEqual(b,a)?0:-1;
        if(notation.lessOrEqual(b,a)) return 1;
        return 0;
      } catch(e){
        a=JSON.stringify(a); b=JSON.stringify(b);
        return a<b?-1:(a>b?1:0);
      }
    }
  };
})();
return Notation;
};
export const def_HPrSS = define_classic_notation({
  id: "HPrSS",
  name: "HPrSS",
  simple_name: "HPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_HPrSS,
});
register_notation(def_HPrSS);

// ---------------------------------------------------------------------------
//  PlPrSS — 参考版 key: plprss（工厂 2371 字节，原样）
// ---------------------------------------------------------------------------
const factory_plprss = function(){
var settings = { indentation: "expansion", aliases: false };

	function flatten(x) {
	let a = [];
	function recurse(x) {
		for (let i = 0; i < x.length; i++) {
			if (typeof(x[i]) == "number") {
				a.push(x[i]);
			} else {
				recurse(x[i]);
			}
		}
	}
	recurse(x);
	return a;
}

class notation {
	static title = "Parent Sequence";

	static lessOrEqual(a, b) {
		a = flatten(a);
		b = flatten(b);
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [0, n+1];
	}

	static expand(tree, n) {
		let copy = JSON.parse(JSON.stringify(tree));
		let parents = [copy];
		while (typeof(parents.at(-1).at(-1)) != "number") {
			parents.push(parents.at(-1).at(-1));
		}
		parents.at(-1).pop();
		while (parents.at(-1).length == 0) {
			parents.pop();
			parents.at(-1).pop();
		}

		let a = flatten(tree);
		function parent(ind) {
			return a.findLastIndex((v, i) => (i < ind || i == 0) && (v == 0 || v < a[ind]));
		}
		let cutNode = a.at(-1);
		let root = a.length - 1;
		let diff = cutNode - a[parent(a.length - 1)];
		for (let i = 0; i < diff; i++) {
			root = parent(root);
			if (a[root] == 0) break;
		}
		let delta = cutNode - a[root] - 1;
		let badPart = a.slice(root, -1);
		for (let i = 1; i <= n; i++) {
			parents.at(-1).push(badPart.map(v => v + delta*i));
		}
		return copy;
	}

	static isSuccessor(tree) {
		let array = flatten(tree);
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(tree) {
		return JSON.stringify(tree);
	}

	static fromString(s) {
		return JSON.parse(s);
	}

	static convertToNotation(value) {
		let tree = notation.fromString(value);
		if (!settings.advanced) {
			return flatten(tree).join(",");
		}
		return value;
	}
};

settings.advanced = true;

var Notation=(function(){
  var N=notation;
  function cmp(a,b){ return N.lessOrEqual(a,b) ? (N.lessOrEqual(b,a)?0:-1) : 1; }
  return {
    parse: function(s){ try{ return N.fromString(s); }catch(e){ return null; } },
    format: function(m){ try{ return N.toString(m); }catch(e){ return String(m); } },
    isSuccessor: function(m){ return N.isSuccessor(m); },
    generateLimit: function(k){ return N.expandLimit(k); },
    expand: function(m,n){ return N.expand(m,n); },
    compare: cmp
  };
})();


return Notation;};
export const def_plprss = define_classic_notation({
  id: "plprss",
  name: "Parent Sequence",
  simple_name: "PlPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_plprss,
});
register_notation(def_plprss);

// ---------------------------------------------------------------------------
//  SLPrSS — 参考版 key: slprss（工厂 1516 字节，原样）
// ---------------------------------------------------------------------------
const factory_slprss = function(){

	class notation {
	static title = "Shifted LPrSS";
	
	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [0,0,n+1];
	}

	static expand(s, n) {
		let out = [...s];
		let cutNode = out.pop();

		let j = out.findLastIndex(x => x < cutNode);
		let i = out.findLastIndex((x, i) => x < cutNode && i < j);
		let increment = cutNode - s[i] - 1;

		let badPart = out.slice((s[j] == s[i] && i == j - 1) ? j : i);
		for (let x = 1; x <= n; x++) {
			out.push(...badPart.map(v => v + increment * x));
		}

		if (out.at(-1) === 0) out.pop(); // fix limits of limits expanding into successors
		return out;
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1);
	}

	static fromString(s) {
		return JSON.parse("["+s+"]");
	}
};

var Notation=(function(){
  var N=notation;
  function cmp(a,b){ return N.lessOrEqual(a,b) ? (N.lessOrEqual(b,a)?0:-1) : 1; }
  return {
    parse: function(s){ try{ return N.fromString(s); }catch(e){ return null; } },
    format: function(m){ try{ return N.toString(m); }catch(e){ return String(m); } },
    isSuccessor: function(m){ return N.isSuccessor(m); },
    generateLimit: function(k){ return N.expandLimit(k); },
    expand: function(m,n){ return N.expand(m,n); },
    compare: cmp
  };
})();


return Notation;};
export const def_slprss = define_classic_notation({
  id: "slprss",
  name: "Shifted LPrSS",
  simple_name: "SLPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_slprss,
});
register_notation(def_slprss);

// ---------------------------------------------------------------------------
//  SHPrSS — 参考版 key: shprss（工厂 2197 字节，原样）
// ---------------------------------------------------------------------------
const factory_shprss = function(){

	class notation {
	static title = "Shifted HPrSS";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [0, 0, n+1];
	}

	static expand(a, n) {
                if (a.length > 0 && a[a.length-1] === 0) return a.slice(0, -1);
		function parent(n) {
			if (a[n] === 0) return 1;
			let r = n;
			while (a[r] >= a[n]) r--;
			let r2 = r-1;
			while (a[r2] >= a[n]) r2--;
			if ((r2 == r-1) && (a[r2] == a[r])) return r;
			return r2;
		}

		let root = parent(a.length-1);
		if (a[root] == a[a.length-1]-1) {
			let out = a.slice(0, root);
			let badPart = a.slice(root, -1);
			for (let i = 0; i < n; i++) {
				out = out.concat(badPart);
			}
			if (out.at(-1) === 0) out.pop();
			return out;
		}

		let differences = a.map((v, i) => v - a[parent(i)]);

		let q = [];
		for (let i = 0; i < a.length; i++) {
			if (differences[i] < differences[a.length-1]) q.push(i);
		}
		root = a.length-1;
		while ((root > 0) && !q.includes(root)) root = parent(root);

		let diff = a[a.length-1] - a[root] - 1;
		let out = a.slice(0, root);
		let badPart = a.slice(root, -1);
		for (let i = 0; i < n; i++) {
			out = out.concat(badPart.map((j) => j + diff * i));
		}

		if (out.at(-1) === 0) out.pop(); // fixes limits of limits expanding into successors
		return out;
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return "("+JSON.stringify(array).slice(1,-1)+")";
	}

	static fromString(s) {
		return JSON.parse("["+s.slice(1,-1)+"]");
	}
};

var Notation=(function(){
  var N=notation;
  function cmp(a,b){ return N.lessOrEqual(a,b) ? (N.lessOrEqual(b,a)?0:-1) : 1; }
  return {
    parse: function(s){ try{ return N.fromString(s); }catch(e){ return null; } },
    format: function(m){ try{ return N.toString(m); }catch(e){ return String(m); } },
    isSuccessor: function(m){ return N.isSuccessor(m); },
    generateLimit: function(k){ return N.expandLimit(k); },
    expand: function(m,n){ return N.expand(m,n); },
    compare: cmp
  };
})();


return Notation;};
export const def_shprss = define_classic_notation({
  id: "shprss",
  name: "Shifted HPrSS",
  simple_name: "SHPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_shprss,
});
register_notation(def_shprss);

// ---------------------------------------------------------------------------
//  ILPrSS — 参考版 key: ilprss（工厂 6674 字节，原样）
// ---------------------------------------------------------------------------
const factory_ilprss = function(){
var Notation={
  parse(inputStr) {
    const trimmed = inputStr.trim();
    if (trimmed === '') return [];
    const columns = [];
    const regex = /\(([^)]*)\)/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      const content = match[1];
      if (content === '') {
        columns.push([0, 0]);
      } else {
        const parts = content.split(',');
        const a = (parts[0] !== undefined && parts[0].trim() !== '') ? parseInt(parts[0], 10) : 0;
        let b = 0;
        if (parts.length > 1 && parts[1].trim() !== '') {
          b = parseInt(parts[1], 10);
        }
        if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || !Number.isInteger(a) || !Number.isInteger(b)) {
          return null;
        }
        columns.push([a, b]);
      }
    }
    const remaining = trimmed.replace(/\(([^)]*)\)/g, '').trim();
    if (remaining !== '') return null;
    return columns;
  },

  format(obj) {
    if (!Array.isArray(obj)) return '';
    if (obj.length === 0) return '';
    return obj.map(([a, b]) => {
      if (a === 0 && b === 0) return '()';
      if (b === 0) return `(${a})`;
      return `(${a},${b})`;
    }).join('');
  },

  isSuccessor(obj) {
    if (!Array.isArray(obj) || obj.length === 0) return true;
    const [lastA, lastB] = obj[obj.length - 1];
    return lastA === 0 && lastB === 0;
  },

  generateLimit(k) {
    return [[0, 0], [1, k]];
  },

  compare(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const [a1, a2] = a[i];
      const [b1, b2] = b[i];
      if (a1 < b1) return -1;
      if (a1 > b1) return 1;
      if (a2 < b2) return -1;
      if (a2 > b2) return 1;
    }
    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;
    return 0;
  },

  expand(obj, n) {
    if (!Array.isArray(obj) || obj.length === 0) return null;
    if (this.isSuccessor(obj)) return null;
    if (!Number.isInteger(n) || n < 1) return null;
    try {
      const 白矩阵 = obj.map(col => [col[0], col[1]]);

      function 获取父项列标(矩阵) {
        const 列数 = 矩阵.length;
        const 父项字典 = {1: [], 2: []};
        for (let i = 0; i < 列数; i++) {
          父项字典[1][i] = null;
          父项字典[2][i] = null;
          for (let j = i-1; j >= 0; j--) {
            if (矩阵[j][0] < 矩阵[i][0]) {
              父项字典[1][i] = j+1;
              break;
            }
          }
          for (let j = i-1; j >= 0; j--) {
            if (矩阵[j][1] < 矩阵[i][1]) {
              父项字典[2][i] = j+1;
              break;
            }
          }
        }
        return 父项字典;
      }

      const 父项字典 = 获取父项列标(白矩阵);
      const 末列索引 = 白矩阵.length - 1;
      const 末列第二行值 = 白矩阵[末列索引][1];
      let 坏列列标;

      if (末列第二行值 === 0) {
        坏列列标 = 父项字典[1][末列索引];
      } else {
        const 父项链 = [];
        let 当前列 = 父项字典[1][末列索引];
        while (当前列 !== null) {
          父项链.push(当前列);
          当前列 = 父项字典[1][当前列-1];
        }
        坏列列标 = 父项链.reduce((max, 列标) => {
          return (白矩阵[列标-1][1] < 末列第二行值) ? Math.max(max, 列标) : max;
        }, -Infinity);
        if (坏列列标 === -Infinity) return null;
      }

      function 获取父项链(父项字典, 列标, 行号) {
        const 父项链 = [];
        let 当前列 = 列标;
        while (当前列 !== null) {
          父项链.push(当前列);
          当前列 = 父项字典[行号][当前列-1];
        }
        return 父项链;
      }

      let 最终矩阵;
      if (坏列列标 === null) {
        最终矩阵 = 白矩阵;
      } else {
        const 坏列索引 = 坏列列标 - 1;
        const 坏部 = 白矩阵.slice(坏列索引, 末列索引);
        const 好部 = 白矩阵.slice(0, 坏列索引);
        const d1 = 白矩阵[末列索引][0] - 坏部[0][0] - (末列第二行值 === 0 ? 1 : 0);
        const d2 = 白矩阵[末列索引][1] - 坏部[0][1] - 1;

        const 展开后的列 = [];
        for (let i = 1; i <= n; i++) {
          展开后的列.push(...坏部.map((列, idx) => {
            if (idx === 0) {
              return [列[0] + d1 * i, 列[1] + (末列第二行值 !== 0 ? d2 * i : 0)];
            } else {
              const 第二行父项链 = 获取父项链(父项字典, 坏列索引 + idx + 1, 2);
              const 第一行父项链 = 获取父项链(父项字典, 坏列索引 + idx + 1, 1);
              if (!第二行父项链.includes(坏列列标) || !第一行父项链.includes(坏列列标) || 坏部[idx][0] > 白矩阵[末列索引][0]) {
                return [列[0] + d1 * i, 列[1]];
              } else {
                return [列[0] + d1 * i, 列[1] + (末列第二行值 !== 0 ? d2 * i : 0)];
              }
            }
          }));
        }
        最终矩阵 = [...好部, ...坏部, ...展开后的列];
      }
      return 最终矩阵;
    } catch (e) {
      return null;
    }
  },

  equivalentForms(matrix) {
    return {
      default: "矩阵形式",
      forms: {
        "矩阵形式": {
          display: (mat) => this.format(mat),
          parse: (str) => this.parse(str)
        },
        "hydra树状": {
          display: (mat) => this._matrixToHydra(mat),
          parse: (str) => this._hydraToMatrix(str)
        }
      }
    };
  },

  _matrixToHydra(matrix) {
    if (matrix.length === 0) return '';
    const n = matrix.length;
    const parent = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const a = matrix[i][0];
      if (a > 0) {
        for (let j = i - 1; j >= 0; j--) {
          if (matrix[j][0] === a - 1) { parent[i] = j; break; }
        }
      }
    }
    const nodes = matrix.map((col, i) => ({ b: col[1], children: [], idx: i }));
    const roots = [];
    for (let i = 0; i < n; i++) {
      if (parent[i] === -1) roots.push(nodes[i]);
      else nodes[parent[i]].children.push(nodes[i]);
    }
    const nodeStr = (node) => {
      let s = 'p' + node.b;
      if (node.children.length > 0) {
        s += '(' + node.children.map(nodeStr).join('+') + ')';
      }
      return s;
    };
    return roots.map(nodeStr).join('+');
  },

  _hydraToMatrix(str) {
    if (!str) return [];
    const s = str.replace(/\s/g, '');
    let pos = 0;
    const len = s.length;

    const parseNumber = () => {
      let num = '';
      while (pos < len && s[pos] >= '0' && s[pos] <= '9') {
        num += s[pos++];
      }
      if (num === '') throw new Error('缺少数字');
      return parseInt(num, 10);
    };

    const parseExpr = (depth) => {
      const cols = [];
      if (pos >= len || s[pos] !== 'p') throw new Error('期望 p');
      pos++;
      const b = parseNumber();
      cols.push([depth, b]);

      if (pos < len && s[pos] === '(') {
        pos++;
        if (pos < len && s[pos] !== ')') {
          const childCols = parseExpr(depth + 1);
          cols.push(...childCols);
        }
        if (pos >= len || s[pos] !== ')') throw new Error('缺少右括号');
        pos++;
      }
      return cols;
    };

    try {
      const matrix = parseExpr(0);
      if (pos !== len) throw new Error('解析未完成');
      return matrix;
    } catch (e) {
      return null;
    }
  }
};


return Notation;
return Notation;};
export const def_ilprss = define_classic_notation({
  id: "ilprss",
  name: "ILPrSS Hydra",
  simple_name: "ILPrSS",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_ilprss,
});
register_notation(def_ilprss);

// ---------------------------------------------------------------------------
//  LPrSS(w3z) — 参考版 key: w3z-LPrSS（工厂 2635 字节，原样）
// ---------------------------------------------------------------------------
const factory_w3z_LPrSS = function(){
class notation {
	static title = "LPrSS";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [0, n+1];
	}

	static expand(a, n) {
		let out = [...a];
		let cutNode = out.pop();
		let root = out.length-1;
		while (out[root] >= cutNode && root > 0) root--;
		let increment = cutNode - out[root] - 1;
		let badPart = out.slice(root);
		for (let i = 1; i < n; i++) {
			out = out.concat(badPart.map(v => v + increment * i));
		}
		return out
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1);
	}

	static fromString(s) {
		return JSON.parse("["+s+"]");
	}
};

var Notation=(function(){
  var __row = false;
  function __T(s){
    var a=notation.fromString(String(s));
    __validate(a);
    return a;
  }
  function __validate(a){
    if(!Array.isArray(a)) throw Error("not an array");
    for (var i=0;i<a.length;i++){
      var v=a[i];
      if(__row){
        if(!Array.isArray(v)) throw Error("row not array");
        for (var j=0;j<v.length;j++) if(!Number.isInteger(v[j])||v[j]<0) throw Error("bad entry");
      }else{
        if(!Number.isInteger(v)||v<0) throw Error("bad entry");
      }
    }
  }
  function __kmap(n){ return n+1; }
  function norm(s){ try { return notation.toString(__T(s)); } catch(e){ return null; } }
  return {
    parse: function(s){
      var t=String(s).trim();
      if(t==="") return [];
      try { return __T(t); } catch(e){ return null; }
    },
    format: function(m){ return notation.toString(m); },
    isSuccessor: function(m){
      try { return notation.isSuccessor(m) ? true : false; } catch(e){ return false; }
    },
    generateLimit: function(k){
      try { return notation.expandLimit(Number(k)|0); } catch(e){ return []; }
    },
    expand: function(m,n){
      try {
        if(!Number.isInteger(n)||n<0) return null;
        if(n>=1 && this.isSuccessor(m)) return null;
        var r=notation.expand(m, __kmap(n));
        if(r===null||r===undefined) return null;
        if(this.compare(r,m)>=0) return null;
        return r;
      } catch(e){ return null; }
    },
    compare: function(a,b){
      try {
        if(notation.lessOrEqual(a,b)) return notation.lessOrEqual(b,a)?0:-1;
        if(notation.lessOrEqual(b,a)) return 1;
        return 0;
      } catch(e){
        a=JSON.stringify(a); b=JSON.stringify(b);
        return a<b?-1:(a>b?1:0);
      }
    }
  };
})();
return Notation;
};
export const def_w3z_LPrSS = define_classic_notation({
  id: "w3z-LPrSS",
  name: "LPrSS（w3z 实现）",
  simple_name: "LPrSS(w3z)",
  category_id: "category-seq-primitive",
  credit_text_id: 'credit.community',
  create: factory_w3z_LPrSS,
});
register_notation(def_w3z_LPrSS);
