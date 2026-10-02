// ============================================================================
//  notation/ne/classic_Descending.js — 降下矩阵（LDMS / DDMS）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：降下矩阵（LDMS / DDMS）；ne 分类 id = category-mx-descending
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  LDMS — 参考版 key: ldms（工厂 2921 字节，原样）
// ---------------------------------------------------------------------------
const factory_ldms = function(){

	function arrayCompare(a, b) { // -1 if a < b, 0 if a == b, 1 if a > b
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if (a[i] != b[i]) return (a[i] || 0) < (b[i] || 0) ? -1 : 1;
	}
	return a.length < b.length ? -1 : a.length == b.length ? 0 : 1
}

class notation {
	static title = "LDMS";
	static header = "Large Descending Matrix System";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			const compare = arrayCompare(a[i], b[i]);
			if (compare != 0) return compare < 0;
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		let s = "()(" + (n+1) + ")";
		return this.fromString(s);
	}

	static expand(matrix, n) {
		const lastEntry = matrix.at(-1);
		if (!lastEntry) return [];
		const newMatrix = matrix.map(row => [...row]);
		const cutNode = newMatrix.pop();
		if (n == 0 || cutNode.length == 0) {
			return newMatrix;
		}
		const rootIndex = newMatrix.findLastIndex((row, i) => {
			if (arrayCompare(cutNode, row) <= 0) return false;
			if (newMatrix.find((row2, j) => j > i && arrayCompare(row, row2) == 1)) return false;
			return cutNode.at(-1) > (row[cutNode.length-1] || 0);
		});
		let rootNode = newMatrix[rootIndex];
		const badPart = newMatrix.slice(rootIndex);
		const delta = cutNode.at(-1) - (rootNode.at(cutNode.length-1) || 0);
		for (let i = 1; i < n; i++) {
			newMatrix.push(...badPart.map(row => {
				const newRow = row.map((v, j) => {
					let increment = Math.max(0, (cutNode[j] || 0) - (rootNode[j] || 0) - (j == cutNode.length-1 ? 1 : 0));
					if (delta > 1 && cutNode.length < row.length) increment = delta - 1;
					return v + increment * i;
				});
				const offset = cutNode.at(-1) - (row.at(cutNode.length-1) || 0);
				if (offset > 1 && arrayCompare(row, cutNode) == -1) {
					for (let b = 0; b < i; b++) {
						newRow.push((offset - 1) * (i - b));
					}
				}
				return newRow;
			}));
		}
		return newMatrix;
	}

	static isSuccessor(matrix) {
		return matrix.length == 0 || matrix.at(-1).length == 0;
	}
	
	static toString(m) {
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
export const def_ldms = define_classic_notation({
  id: "ldms",
  name: "LDMS",
  simple_name: "LDMS",
  category_id: "category-mx-descending",
  credit_text_id: 'credit.community',
  create: factory_ldms,
});
register_notation(def_ldms);

// ---------------------------------------------------------------------------
//  DDMS — 参考版 key: DDMS（工厂 7541 字节，原样）
// ---------------------------------------------------------------------------
const factory_DDMS = function(){
function arrayCompare(a, b) { // -1 if a < b, 0 if a == b, 1 if a > b
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if (a[i] != b[i]) return (a[i] || 0) < (b[i] || 0) ? -1 : 1;
	}
	return a.length < b.length ? -1 : a.length == b.length ? 0 : 1
}

function toPointerMatrix(a) {
	const pointerMatrix = [];
	for (let i = 0; i < a.length; i++) {
		pointerMatrix[i] = [];
		for (let j = 0; j < a[i].length; j++) {
			pointerMatrix[i][j] = {distance: 0, delta: 0}
		}
		let parentIndex = a.findLastIndex((v, j) => j < i && v[0] < a[i][0]);
		if (parentIndex != -1) {
			pointerMatrix[i][0] = {distance: i - parentIndex, delta: a[i][0] - a[parentIndex][0]}
		}
	}
	for (let i = 0; i < a.length; i++) {
		if (pointerMatrix[i][0].delta == 0) continue;
		for (let j = 1; j < a[i].length; j++) {
			let parentIndex = i;
			while (true) {
				if ((a[parentIndex][j] || 0) < a[i][j]) {
					break;
				} else {
					parentIndex -= pointerMatrix[parentIndex][j-1].distance;
				}
			}
			pointerMatrix[i][j].distance = i - parentIndex;
			pointerMatrix[i][j].delta = a[i][j] - (a[parentIndex][j] || 0);
		}
	}
	return pointerMatrix;
}

function toMatrix(pm) {
	const matrix = [];
	for (let i = 0; i < pm.length; i++) {
		matrix[i] = [];
		for (let j = 0; j < pm[i].length; j++) {
			matrix[i][j] = pm[i][j].delta == 0 ? 0 : (matrix[i-pm[i][j].distance][j] || 0) + pm[i][j].delta;
		}
	}
	return matrix;
}

function deepcopy(pm) {
	return pm.map(v => {
		let a = v.map(x => {
			return {distance: x.distance, delta: x.delta};
		});
		if (v.ascending) a.ascending = v.ascending;
		return a;
	});
}

class notation {
	static title = "DDMS";
	static header = "Diagonal Descending Matrix System";
	static weaklyAscending = false;

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			const compare = arrayCompare(a[i], b[i]);
			if (compare != 0) return compare < 0;
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [[0], [n + 1]];
	}

	static expand(matrix, n) {
		const pm = toPointerMatrix(matrix);
		const rootIndex = pm.length - 1 - pm.at(-1).at(-1).distance;
		if (n == 0) return toMatrix(pm.slice(0, rootIndex - 1));
		const out = deepcopy(pm);
		const tail = out.slice(rootIndex + 1);
		
		const cutNode = tail.at(-1);
		const rootNode = out[rootIndex];
		const lastColumnIndex = cutNode.length - 1;
		const lastColumn = cutNode[lastColumnIndex];
		const lastColumnDistance = lastColumn.distance;
		const getTermLength = (x) => x.length - (x.at(-1).delta == 0 ? 1 : 0); // (0) has length 0
		const ascend = lastColumnIndex >= getTermLength(rootNode) ? lastColumn.delta - 1 : 0;
		if (ascend == 0 && cutNode.length - getTermLength(rootNode) <= 1) {
			cutNode.pop();
			for (let i = lastColumnIndex; i < rootNode.length; i++) {
				cutNode[i] = {distance: rootNode[i].distance + lastColumnDistance, delta: rootNode[i].delta};
			}
		} else {
			if (lastColumn.delta > 1) {
				lastColumn.delta--;
				for (let i = 1; i < n; i++) {
					cutNode.push(lastColumn);
				}
				return toMatrix(out);
			}
			lastColumn.delta--;
			// find how many extra columns the term ends in
			const ascend = getTermLength(cutNode) - getTermLength(rootNode); // number of extra columns to ascend
			rootNode.ascending = ascend;
			cutNode.ascending = ascend;
			// descendants of an ascended term that have an extra column also ascend
			for (let i = rootIndex; i < out.length; i++) {
				const parentIndex = i - out[i].at(-1).distance;
				const canAscend = getTermLength(out[i]) > getTermLength(notation.weaklyAscending ? out[parentIndex] : rootNode);
				if (canAscend && out[parentIndex].ascending) out[i].ascending = ascend;
			}
		}
		const parentColumn = pm[rootIndex][lastColumnIndex];
		if (parentColumn && lastColumn.delta == parentColumn.delta) lastColumn.distance = parentColumn.distance;
		if (cutNode.length > 1 && lastColumn.delta == 0) cutNode.pop();
		for (let i = 1; i < n; i++) {
			const copy = deepcopy(tail);
			for (let j = 0; j < copy.length; j++) {
				const term = copy[j];
				if (term.ascending) {
					const parent = out[rootIndex + 1 + j - term.at(-1).distance];
					const lengthDelta = term.length - parent.length + (parent[0].distance == 0 ? 1 : 0);
					const distance = term[0].distance;
					const back = [];
					for (let k = 0; k < lengthDelta; k++) {
						back.unshift(term.pop());
					}
					for (let k = 0; k < i * term.ascending; k++) {
						term.unshift({distance: distance, delta: 1});
					}
					term.push(...back);
				}
				for (let v of term) {
					if (v.distance > j+1) v.distance += lastColumnDistance * i;
				}
			}
			out.push(...copy);
		}
		out.pop(); // remove last copy of the cut node in case it's a successor
		return toMatrix(out);
	}

	static isSuccessor(matrix) {
		return matrix.length == 0 || matrix.at(-1).length == 0 || matrix.at(-1).at(-1) == 0;
	}
	
	static toString(m) {
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
		{type: "checkbox", label: "Weakly ascending", id: "weaklyAscending", url: true},
		{type: "checkbox", label: "Compressed", id: "compress"},
	]

	static convertToNotation(value) {
		let matrix = notation.fromString(value);
		let str = notation.toString(matrix);
		if (notation.compress) {
			str = str.replace(/\d+/g, m => {
				m = +m;
				return m >= 10 && m <= 35 ? String.fromCharCode(55 + m) : m;
			}).replaceAll(")(", " ").replace(/[(),]/g, "");
		}
		return str;
	}
};

var Notation=(function(){
  var __row = true;
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
export const def_DDMS = define_classic_notation({
  id: "DDMS",
  name: "DDMS",
  simple_name: "DDMS",
  category_id: "category-mx-descending",
  credit_text_id: 'credit.community',
  create: factory_DDMS,
});
register_notation(def_DDMS);
