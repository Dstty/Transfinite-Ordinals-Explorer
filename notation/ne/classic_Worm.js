// ============================================================================
//  notation/ne/classic_Worm.js — 虫 / 三角序列（TrSS / worm）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：虫 / 三角序列（TrSS / worm）；ne 分类 id = category-seq-worm
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  TrSS — 参考版 key: trss（工厂 3739 字节，原样）
// ---------------------------------------------------------------------------
const factory_trss = function(){
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
	static title = "Triangular Sequence System";
	static footer = "<a href='viewer.html'>Row Viewer</a>";

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
			if (parents.length == 0) return [0];
			parents.at(-1).pop();
		}
		if (n == 0) return copy;

		let a = flatten(tree);
		function parent(ind) {
			return a.findLastIndex((v, i) => (i < ind || i == 0) && (v == 0 || v < a[ind]));
		}
		let cutNode = a.at(-1);
		let root = a.length - 1;
		let diff = cutNode - a[parent(a.length - 1)];
		let delta = 0;
		for (let i = 0; i < diff; i++) {
			if (a[root] == 0) {
				delta++;
			} else {
				root = parent(root);
			}
		}
		let badPart = a.slice(root, -1);
		let increment = cutNode - a[root] - 1;
		if (delta == 0) {
			for (let i = 1; i <= n; i++) {
				parents.at(-1).push(badPart.map(v => v + increment*i));
			}
		} else {
			parents.at(-1).push(badPart.map(v => v + increment));
			for (let i = 2; i <= n; i++) {
				let array = flatten(parents);
				let ancestors = [array.length - 1];
				while (true) {
					let last = ancestors.at(-1);
					let p = array.findLastIndex((x, j) => j < last && x < array[last]);
					if (p == -1) break;
					ancestors.push(p);
				}
				let offset = array[array.length - 1] + ancestors.length + (delta - 1);
				parents.at(-1).push(badPart.map(v => v + offset));
			}
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
		if (settings.notation == "Sequence") return flatten(tree).join(",");
		if (settings.notation == "Pairs") return toMatrixString(flatten(tree));
		return value; // Grouped
	}
};

function toMatrixString(sequence) {
	let row = sequence.map((v, i) => {
		return {value: v, position: i, parentIndex: sequence.findLastIndex((x, j) => x < v && j < i)};
	});
	return row.map((v, i) => {
		let numAncestors = 0;
		let current = i;
		while (true) {
			current = row[current].parentIndex;
			if (current == -1) break;
			numAncestors++;
		}
		let diff = v.parentIndex == -1 ? 0 : v.value - row[v.parentIndex].value - 1;
		return `(${numAncestors},${diff})`;
	}).join("").replaceAll(/,0\)/g,")");
}

function setNotation(newNotation) {
	settings.notation = newNotation;
	refreshTerms();
}

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
export const def_trss = define_classic_notation({
  id: "trss",
  name: "Triangular Sequence System",
  simple_name: "TrSS",
  category_id: "category-seq-worm",
  credit_text_id: 'credit.community',
  create: factory_trss,
});
register_notation(def_trss);

// ---------------------------------------------------------------------------
//  TrSS worm — 参考版 key: trssw（工厂 2093 字节，原样）
// ---------------------------------------------------------------------------
const factory_trssw = function(){

	class notation {
	static title = "TrSS worm";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		let sequence = [0, n+1];
		return sequence;
	}

	static expand(a, n) {
		if (a.length == 1) return a;
		let out = [...a];	
		let cutNode = out.pop();
		let ancestry = [a.length-1];
		while (true) {
			let current = ancestry.at(-1);
			let parent = a.findLastIndex((v, i) => i < current && v < a[current]);
			if (parent == -1) break;
			ancestry.push(parent);
		}
		if (ancestry.length == 1) {
			return out;
		}
		let parentDifference = cutNode - a[ancestry[1]];
		let delta = Math.max(0, parentDifference - ancestry.length + 1);
		if (delta == 0) {
			let root = a[ancestry[1]];
			let increment = parentDifference - 1;
			for (let i = 1; i <= n; i++) {
				out.push(root + increment * i);
			}
		} else {
			out.push(cutNode - 1);
			let ancestryLength = 0;
			let currentAncestor = out.length - 1;
			while (currentAncestor > 0) {
				ancestryLength++;
				currentAncestor = out.findLastIndex((v, i) => i < currentAncestor && v < out[currentAncestor]);
			}
			for (let i = 1; i < n; i++) {
				out.push(out.at(-1) + ancestryLength + i + delta - 1);
			}
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
export const def_trssw = define_classic_notation({
  id: "trssw",
  name: "TrSS worm",
  simple_name: "TrSS worm",
  category_id: "category-seq-worm",
  credit_text_id: 'credit.community',
  create: factory_trssw,
});
register_notation(def_trssw);

// ---------------------------------------------------------------------------
//  ndp worm — 参考版 key: ndpworm（工厂 3753 字节，原样）
// ---------------------------------------------------------------------------
const factory_ndpworm = function(){

        
        function 相加(p, q) {
            return p.map((value, index) => value + q[index]);
        }

        function SSSS(S, n, t = 1) {
            if (!S.length) return n;
            if (S[S.length - 1] <= Math.min(...S)) return S.slice(0, -1);

            let 期望值 = S[S.length - 1] - 1;
            let r0 = Math.max(...S.map((value, index) => value < S[S.length - 1] ? index : -1));
            let p = r0;
            let 当前 = r0;

            for (let i = r0; i >= 0; i--) {
                if (S[i] <= 期望值) {
                    if (S[i] < 期望值) 期望值 -= 1;
                    if (相加(S.slice(i), Array(S.length - i).fill(S[当前] - S[i])) < S.slice(当前)) {
                        if (!t) break;
                        t -= 1;
                        当前 = i;
                    }
                    if (相加(S.slice(i), Array(S.length - i).fill(S[p] - S[i])) > S.slice(p)) {
                        p = i;
                    }
                }
            }

            let 结果 = [];
            for (let i = 0; i <= n; i++) {
                结果 = 结果.concat(相加(S.slice(p, -1), Array(S.slice(p, -1).length).fill(i * (S[S.length - 1] - S[p] - 1))));
            }

            return S.slice(0, p).concat(结果);
        }

        
        function reverseConvert(counts) {
            if (!counts.length) return [];
            const result = [];
            for (let val of counts) {
                result.push(0);
                for (let i = 0; i < val; i++) {
                    result.push(1);
                }
            }
            return result;
        }

        
        function forwardConvert(binarySeq) {
            const result = [];
            for (let i = 0; i < binarySeq.length; i++) {
                if (binarySeq[i] === 0) {
                    let count = 0;
                    let j = i + 1;
                    while (j < binarySeq.length && binarySeq[j] === 1) {
                        count++;
                        j++;
                    }
                    result.push(count);
                }
            }
            return result;
        }

       
        function fillIncreasingGaps(arr) {
            if (!arr.length) return [];
            const result = [];
            result.push(arr[0]);
            for (let i = 1; i < arr.length; i++) {
                const prev = arr[i-1];
                const curr = arr[i];
                if (curr > prev) {
                   
                    for (let val = prev + 1; val < curr; val++) {
                        result.push(val);
                    }
                }
                result.push(curr);
            }
            return result;
        }

var Notation=(function(){
  function parse(s){
    var t=String(s).trim(); if(t==="") return [];
    var parts=t.split(/[,\s]+/); var arr=[];
    for(var i=0;i<parts.length;i++){
      var p=parts[i]; if(p==="") continue;
      if(!/^\d+$/.test(p)) return null;
      arr.push(parseInt(p,10));
    }
    return arr;
  }
  function fmt(m){ return m.join(","); }
  function lex(a,b){
    var n=Math.min(a.length,b.length);
    for(var i=0;i<n;i++){ if(a[i]<b[i]) return -1; if(a[i]>b[i]) return 1; }
    return a.length<b.length?-1:(a.length>b.length?1:0);
  }
  return {
    parse: parse,
    format: fmt,
    isSuccessor: function(m){ return m.length===0 || m[m.length-1]===0; },
    generateLimit: function(k){ var r=[]; for(var i=0;i<=k;i++) r.push(i); return r; },
    expand: function(m,n){
      if(m.length===0) return null;
      var binary=reverseConvert(m);
      var e=SSSS(binary, n, 1);
      if(!Array.isArray(e)) return null;
      var rc=forwardConvert(e);
      return fillIncreasingGaps(rc);
    },
    compare: lex
  };
})();


return Notation;};
export const def_ndpworm = define_classic_notation({
  id: "ndpworm",
  name: "ndp worm",
  simple_name: "ndp worm",
  category_id: "category-seq-worm",
  credit_text_id: 'credit.community',
  create: factory_ndpworm,
});
register_notation(def_ndpworm);
