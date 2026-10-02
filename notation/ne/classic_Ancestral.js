// ============================================================================
//  notation/ne/classic_Ancestral.js — 祖先 / 基本列序列（RCSS / FSS 系）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：祖先 / 基本列序列（RCSS / FSS 系）；ne 分类 id = category-seq-ancestral
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  RCSS — 参考版 key: rcss（工厂 2204 字节，原样）
// ---------------------------------------------------------------------------
const factory_rcss = function(){

	class notation {
	static title = "RCSS";
	static header = "Restricted Child Sequence System";
	static footer = "<a href='viewer.html'>Row Viewer</a>";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		let a = [0,1,n+2];
		return a;
	}

	static expand(a, n) {
		let getParent = i => a.findLastIndex((v, j) => j < i && v < a[i]);
		let childDifferences = [];
		for (let i = 0; i < a.length; i++) {
			childDifferences[i] = 0;
			let parent = getParent(i);
			if (parent != -1) {
				childDifferences[parent] = Math.max(childDifferences[parent], a[i] - a[parent]);
			}
		}
		let rootIndex = getParent(a.length-1);
		if (rootIndex == -1) return a;
		let parentDifference = a[a.length-1] - a[rootIndex];
		if (parentDifference == 1) {
			while (childDifferences[rootIndex] > 1) {
				let parent = getParent(rootIndex);
				if (parent == -1) break;
				rootIndex = parent;
			}
		} else {
			while (childDifferences[rootIndex] >= parentDifference) {
				let parent = getParent(rootIndex);
				if (parent == -1) break;
				rootIndex = parent;
			}
		}
		
		let out = [...a];
		let cutNode = out.pop();
		let increment = cutNode - a[rootIndex] - 1;
		let badPart = out.slice(rootIndex);
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
export const def_rcss = define_classic_notation({
  id: "rcss",
  name: "RCSS",
  simple_name: "RCSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  sample_k: 1,
  create: factory_rcss,
});
register_notation(def_rcss);

// ---------------------------------------------------------------------------
//  wRCSS — 参考版 key: wrcss（工厂 1994 字节，原样）
// ---------------------------------------------------------------------------
const factory_wrcss = function(){

	class notation {
	static title = "Weak RCSS";
	static header = "Weak Restricted Child Sequence System";
	static footer = "<a href='viewer.html'>Row Viewer</a>";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		let a = [0,1,n+2];
		return a;
	}

	static expand(a, n) {
		let getParent = i => a.findLastIndex((v, j) => v < a[i] && j < i);
		let childDifferences = [];
		for (let i = 0; i < a.length; i++) {
			childDifferences[i] = 0;
			let parent = getParent(i);
			if (parent != -1) {
				childDifferences[parent] = Math.max(childDifferences[parent], a[i] - a[parent]);
			}
		}
		let rootIndex = getParent(a.length-1);
		if (rootIndex == -1) return a;
		let diff = a[a.length-1] - a[rootIndex];
		while (childDifferences[rootIndex] > diff) {
			let parent = getParent(rootIndex);
			if (parent == -1) break;
			rootIndex = parent;
		}

		let out = [...a];
		let cutNode = out.pop();
		let increment = cutNode - a[rootIndex] - 1;
		let badPart = out.slice(rootIndex);
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
export const def_wrcss = define_classic_notation({
  id: "wrcss",
  name: "Weak RCSS",
  simple_name: "wRCSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  create: factory_wrcss,
});
register_notation(def_wrcss);

// ---------------------------------------------------------------------------
//  GSS — 参考版 key: gss（工厂 2439 字节，原样）
// ---------------------------------------------------------------------------
const factory_gss = function(){

	let maxAncestors = 2;
let version = "default";
const ancestorsChangedEvent = new Event("ancestorsChanged");
document.addEventListener("DOMContentLoaded", () => {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	const requestedAncestors = Number(urlParams.get("ancestors"));
	if (urlParams.get("ancestors") != null && !isNaN(requestedAncestors) && requestedAncestors >= 1) {
		maxAncestors = requestedAncestors;
		document.dispatchEvent(ancestorsChangedEvent);
	}
});

class notation {
	static title = "Grandparent Sequence System";
	static footer = "<a href='viewer.html'>Row Viewer</a>";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		let sequence = [0];
		for (let add = 1; add < maxAncestors; add++) {
			sequence.push(sequence.at(-1) + add);
		}
		sequence.push(n + maxAncestors);
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
		let root = ancestry[Math.min(maxAncestors, parentDifference)];
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
export const def_gss = define_classic_notation({
  id: "gss",
  name: "Grandparent Sequence System",
  simple_name: "GSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  sample_k: 1,
  create: factory_gss,
});
register_notation(def_gss);

// ---------------------------------------------------------------------------
//  wFSS — 参考版 key: wfss（工厂 5276 字节，原样）
// ---------------------------------------------------------------------------
const factory_wfss = function(){

	class notation {
	static title = "Weak FSS";
	static header = "Weak Fundamental Sequence System";

	static lessOrEqual(a, b) {
		return compareTerms(a, b) <= 0;
	}

	static lessThan(a, b) {
		return compareTerms(a, b) === -1;
	}

	static equal(a, b) {
		return compareTerms(a, b) === 0;
	}

	static expandLimit(n) {
		return limit(n+1);
	}

	static expand(a, n) {
		return expand(a, n);
	}

	static isSuccessor(array) {
		let s = notation.toString(array);
		return s.length == 0 || s.endsWith("[]");
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1).replaceAll(/,/g, "");
	}

	static fromString(s) {
		return JSON.parse("["+s.replaceAll(/\]\[/g,"],[")+"]");
	}

	static convertToNotation(value) {
		if (value === "") return "∅";
		let s = value.replaceAll(/\]\[/g,"],[").replaceAll(/\[\]/g,"0");
		while (true) {
			let next = s.replaceAll(/\[([0,]+)\]/g,(_, n) => `${(n.length+1)/2}`);
			if (next == s) break;
			s = next;
		}
		s = s.replaceAll(/\[0[0-9,]*\]/g, function(x) {
			let a = JSON.parse(x);

			for (let i = a.length-2; i > 0; i--) { // standardize
				if (a[i] == a[i-1] && a[i+1] > a[i]) {
					a.splice(i, 1);
				}
			}
			
			for (let i = 1; i < a.length; i++) {
				if (a[i] - a[i-1] > 1) return JSON.stringify(a);
			}
			return PrSStoCNF(standardizePrSS(a));
		});
		s = s.replaceAll("[0,1,ω]", "ε₀");
		s = s.replaceAll("[0,1,ω,ω]", "ε₁");
		s = s.replaceAll("[0,1,ω,ω,ω]", "ε₂");
		s = s.replaceAll("[0,1,ω,ω+1]", "ε_ω");
		s = s.replaceAll("[0,1,ω,ω2]", "ε_ε₀");
		s = s.replaceAll("[0,1,ω,ω2,ω3]", "ε_ε_ε₀");
		s = s.replaceAll("[0,1,ω,ω^2]", "ζ₀");
		s = s.replaceAll("[0,1,ω,ω^2,ω^3]", "η₀");
		s = s.replaceAll("[0,1,ω,ω^ω]", "φ(ω,0)");
		return s;
	}
};

function compareTerms(a, b) {
	for (let i = 0; i < a.length; i++) {
		if (i >= b.length) return 1; // a > b
		let c = compareTerms(a[i], b[i]);
		if (c != 0) return c;
	}
	return b.length > a.length ? -1 : 0;
}

function toString(a) {
	if (a == null) return "null";
	return notation.convertToNotation(notation.toString(a));
}

function expand(a, n) {
	if (a.length === 0) return [];
	let str = toString(a);
	let out = [...a];
	let cutNode = out.pop();
	let isLimit = !notation.isSuccessor(cutNode);

	if (str === "0,1") return Array(n).fill([]);
	if (n == 0) {
		for (let i = a.length - 2; i >= 0; i--) { // cut the last nondecreasing sequence
			if (notation.lessThan(a[i+1], a[i])) {
				return a.slice(0, i + 1);
			}
		}
		return a.slice(0, -1); // cut the last element if the whole sequence is nondecreasing
	}

	let rootIndex = out.findLastIndex(v => notation.lessThan(v, cutNode));
	let root = out[rootIndex];

	if (isLimit) { // sequence ends in a limit
		let copyPart = [...out.slice(rootIndex+1)];
		let index = 0;
		while (notation.lessOrEqual(expand(cutNode, index), root)) {
			index++;
		}
		for (let i = index; i < index + n; i++) {
			out.push(expand(cutNode, i));
			out.push(...copyPart);
		}
		return out;
	}
	
	let badPart = [...out.slice(rootIndex)];
	let zeroth = [...out];
	if (notation.isSuccessor(zeroth)) zeroth.pop();
	let begin = notation.equal(zeroth, expand(a, 0)) ? 0 : 1;
	for (let i = begin; i < n; i++) {
		out.push(...badPart);
	}
	if (notation.isSuccessor(out)) out.pop();
	return out;
}

function limit(n) {
	if (n === 0) return [];
	if (n === 1) return [[]];
	let out = [];
	for (let i = 0; i < n; i++) out.push(limit(i));
	return out;
}

function standardizePrSS(s) {
	if (s.length == 0 || s[0] != 0) return s;
	let siblings = [];
	let current;
	for (let i = 0; i < s.length; i++) {
		if (s[i] == 0) {
			current = [];
			siblings.push(current);
		}
		current.push(s[i]);
	}
	for (let i = 0; i < siblings.length; i++) {
		if (siblings[i].includes(1)) {
			siblings[i] = [0, ...standardizePrSS(siblings[i].slice(1).map(x => x-1)).map(x => x+1)];
		}
	}
	for (let i = siblings.length - 2; i >= 0; i--) {
		if (siblings[i] < siblings[i+1]) {
			siblings.splice(i, 1);
		}
	}
	return siblings.flat();
}

function PrSStoCNF(s) {
	let out = "";
	let lastterm = "";
	let coefficient = 1;
	let root = 0;

	for (let i = 0; i <= s.length; i++) {
		if ((s[i + 1] === s[0]) || (i + 1 >= s.length)) {
			let branches = 0;
			for (let j = root+1; j <= i; j++) {
				branches += s[j] === s[root+1] ? 1 : 0;
			}

			let term = ["1", "ω"][i - root] || (branches === 1 ? "ω^x" : "ω^(x)").replace("x", PrSStoCNF(s.slice(root+1, i+1))).replace(/\((\d+)\)/g, "$1");
			if (term === lastterm && i !== s.length) {
				coefficient += 1;
			} else {
				if (lastterm) {
					out += "+" + (coefficient === 1 ? lastterm : lastterm === "1" ? coefficient : lastterm + (lastterm === "ω" ? "" : "·") + coefficient);
				}
				lastterm = term;
				coefficient = 1;
			}
			root = i + 1;
		}
	}

	return out.substring(1);
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
export const def_wfss = define_classic_notation({
  id: "wfss",
  name: "Weak FSS",
  simple_name: "wFSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  sample_k: 2,
  create: factory_wfss,
});
register_notation(def_wfss);

// ---------------------------------------------------------------------------
//  SwFSS — 参考版 key: swfss（工厂 3993 字节，原样）
// ---------------------------------------------------------------------------
const factory_swfss = function(){

	class notation {
	static title = "Shifted Weak FSS";
	static header = "Shifted Weak Fundamental Sequence System";

	static lessOrEqual(a, b) {
		return compareTerms(a, b) <= 0;
	}

	static lessThan(a, b) {
		return compareTerms(a, b) === -1;
	}

	static equal(a, b) {
		return compareTerms(a, b) === 0;
	}

	static expandLimit(n) {
		return limit(n+1);
	}

	static expand(a, n) {
		return expand(a, n);
	}

	static isSuccessor(array) {
		let s = notation.toString(array);
		return s.length == 0 || s.endsWith("[]");
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1).replaceAll(/,/g, "");
	}

	static fromString(s) {
		return JSON.parse("["+s.replaceAll(/\]\[/g,"],[")+"]");
	}

	static convertToNotation(value) {
		if (value === "") return "∅";
		let s = value.replaceAll(/\]\[/g,"],[").replaceAll(/\[\]/g,"0");
		while (true) {
			let next = s.replaceAll(/\[([0,]+)\]/g,(_, n) => `${(n.length+1)/2}`);
			if (next == s) break;
			s = next;
		}
		s = s.replaceAll("[0,0,1]", "ω");
		s = s.replaceAll("[0,0,1,0]", "ω+1");
		s = s.replaceAll("[0,0,1,0,0]", "ω+2");
		s = s.replaceAll("[0,0,1,0,0,0]", "ω+3");
		s = s.replaceAll("[0,0,1,0,0,1]", "ω2");
		s = s.replaceAll("[0,0,1,0,0,1,0,0,1]", "ω3");
		s = s.replaceAll("[0,0,1,0,1]", "ω^2");
		s = s.replaceAll("[0,0,1,0,1,0,1]", "ω^3");
		s = s.replaceAll("[0,0,1,0,1,0,1,0,1]", "ω^4");
		s = s.replaceAll("[0,0,1,1]", "ω^ω");
		s = s.replaceAll("[0,0,1,1,1]", "ω^ω^ω");
		s = s.replaceAll("[0,0,1,1,1,1]", "ω^ω^ω^ω");
		s = s.replaceAll("[0,0,1,1,2]", "ε₀");
		return s;
	}
};

function compareTerms(a, b) {
	for (let i = 0; i < a.length; i++) {
		if (i >= b.length) return 1; // a > b
		let c = compareTerms(a[i], b[i]);
		if (c != 0) return c;
	}
	return b.length > a.length ? -1 : 0;
}

function toString(a) {
	if (a == null) return "null";
	return notation.convertToNotation(notation.toString(a));
}

function expand(a, n) {
	if (a.length === 0) return [];
	let str = toString(a);
	let out = [...a];
	let cutNode = out.pop();
	let isLimit = !notation.isSuccessor(cutNode);

	if (str === "0,0,1") return Array(n).fill([]);
	if (n == 0) {
		for (let i = a.length - 2; i >= 0; i--) { // cut the last nondecreasing sequence
			if (notation.lessThan(a[i+1], a[i])) {
				return a.slice(0, i + 1);
			}
		}
		out = a.slice(0, -1);
		if (notation.isSuccessor(out)) out.pop();
		return out; // cut the last element if the whole sequence is nondecreasing
	}

	let j = out.findLastIndex(v => notation.lessThan(v, cutNode));
	let i = out.findLastIndex((v, i) => notation.lessThan(v, cutNode) && i < j);
	let rootIndex = (notation.equal(a[j], a[i]) && i == j - 1) ? j : i;
	let root = out[rootIndex];
	let badPart = [...out.slice(rootIndex)];

	if (isLimit) { // sequence ends in a limit
		let index = 0;
		while (notation.lessOrEqual(expand(cutNode, index), root)) {
			index++;
		}
		for (let i = index; i < index + n; i++) {
			let term = expand(cutNode, i);
			out.push(term, term);
		}
		if (notation.isSuccessor(out)) out.pop();
		return out;
	}
	
	let zeroth = [...out];
	if (notation.isSuccessor(zeroth)) zeroth.pop();
	let begin = notation.equal(zeroth, expand(a, 0)) ? 0 : 1;
	for (let i = begin; i < n; i++) {
		out.push(...badPart);
	}
	if (notation.isSuccessor(out)) out.pop();
	return out;
}

function limit(n) {
	if (n === 0) return [];
	if (n === 1) return [[]];
	let out = [];
	for (let i = 0; i < n; i++) {
		let term = limit(i);
		out.push(term, term);
	}
	return out;
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
export const def_swfss = define_classic_notation({
  id: "swfss",
  name: "Shifted Weak FSS",
  simple_name: "SwFSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  sample_k: 1,
  create: factory_swfss,
});
register_notation(def_swfss);

// ---------------------------------------------------------------------------
//  RFSS — 参考版 key: rfss（工厂 8409 字节，原样）
// ---------------------------------------------------------------------------
const factory_rfss = function(){

	class notation {
	static title = "RFSS";
	static header = "Recursive Fundamental Sequence System";

	static lessOrEqual(a, b) {
		return notation.toString(a).replaceAll(/./g, c => c == "[" ? 1 : 0) <= notation.toString(b).replaceAll(/./g, c => c == "[" ? 1 : 0);
	}

	static lessThan(a, b) {
		return notation.toString(a).replaceAll(/./g, c => c == "[" ? 1 : 0) < notation.toString(b).replaceAll(/./g, c => c == "[" ? 1 : 0);
	}

	static equal(a, b) {
		return notation.toString(a).replaceAll(/./g, c => c == "[" ? 1 : 0) == notation.toString(b).replaceAll(/./g, c => c == "[" ? 1 : 0);
	}

	static expandLimit(n) {
		return bigLimit(n+1);
	}

	static expand(a, n) {
		return expand(a, n);
	}

	static isSuccessor(array) {
		let s = notation.toString(array);
		return s.length == 0 || s.endsWith("[]");
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1).replaceAll(/,/g, "");
	}

	static fromString(s) {
		return JSON.parse("["+s.replaceAll(/\]\[/g,"],[")+"]");
	}

	static convertToNotation(value) {
		if (value === "") return "∅";
		let s = value.replaceAll(/\]\[/g,"],[").replaceAll(/\[\]/g,"0");
		while (true) {
			let next = s.replaceAll(/\[([0,]+)\]/g,(_, n) => `${(n.length+1)/2}`);
			if (next == s) break;
			s = next;
		}
		s = s.replaceAll(/\[[0-9,]+\]/g, function(x) {
			let a = JSON.parse(x);

			for (let i = a.length-2; i > 0; i--) { // standardize
				if (a[i] == a[i-1] && a[i+1] > a[i]) {
					a.splice(i, 1);
				}
			}
			
			for (let i = 1; i < a.length; i++) {
				if (a[i] - a[i-1] > 1) return JSON.stringify(a);
			}
			return PrSStoCNF(standardizePrSS(a));
		});
		s = s.replaceAll("[0,1,3]", "ε₀");
		s = s.replaceAll("[0,1,4]", "ζ₀");
		s = s.replaceAll("[0,1,5]", "η₀");
		s = s.replaceAll("[0,1,ω]", "φ(ω,0)");
		return s;
	}
};

function toString(a) {
	if (a == null) return "null";
	return notation.convertToNotation(notation.toString(a));
}

// remove the rightmost []
function decrement(a) {
	if (a.length === 0) return [];
	if (a[a.length - 1].length === 0) return a.slice(0, -1);
	return a.slice(0, -1).concat([decrement(a[a.length - 1])]);
}

function searchForParent(root, target) {
	// find limits where x[0] <= root < target < x
	let candidates = [];
	let current = [[[]]];
	while (true) {
		let rootIndex = findPrefixInExpansion(root, current)[1];
		let [next, nextIndex] = findPrefixInExpansion(target, current);
		if (nextIndex > rootIndex && rootIndex != -1) {
			candidates.push(current);
		}
		current = expand(current, nextIndex + 1);
		if (notation.isSuccessor(current)) break;
	}

	// find the candidate whose expansion contains the largest prefix of the root
	let parent, prefix;
	for (let i = 0; i < candidates.length; i++) {
		let index = findPrefixInExpansion(root, candidates[i])[1];
		let previous = expand(candidates[i], index);
		if (prefix == null || notation.lessThan(prefix, previous)) {
			parent = candidates[i];
			prefix = previous;
		}
	}

	return parent;
}

// find the largest term in the expansion of parent less than or equal to the target
function findPrefixInExpansion(term, parent) {
	if (notation.lessThan(parent, term)) return [null, -1]; // parent should be greater than or equal to term
	let index = 0;
	let element = expand(parent, 0);
	if (notation.lessThan(term, element)) return [null, -1]; // term should be at least parent[0]
	while (true) {
		let next = expand(parent, index + 1);
		if (notation.lessThan(term, next)) return [element, index];
		element = next;
		index++;
	}
}

function getTrajectory(term, parent) {
	if (notation.lessOrEqual(parent, term)) return [];
	let chain = [];
	let current = parent;
	while (true) {
		let [element, index] = findPrefixInExpansion(term, current);
		chain.push(index);
		if (notation.equal(element, term)) {
			return chain;
		}
		current = expand(current, chain[chain.length-1] + 1);
	}
}

function expand(a, n) {
	let str = toString(a);
	if (str === "1") return limit(n);
	if (str === "0,1") return Array(n).fill([]);
	if (a.length === 0) return [];
	if (n == 0) {
		for (let i = a.length - 2; i >= 0; i--) { // cut the last nondecreasing sequence
			if (notation.lessThan(a[i+1], a[i])) {
				return a.slice(0, i + 1);
			}
		}
		return a.slice(0, -1); // cut the last element if the whole sequence is nondecreasing
	}
	let out = [...a];
	let cutNode = out.pop();
	if (!notation.isSuccessor(cutNode)) {
		out.push(expand(cutNode, n));
		return out;
	}

	let predecessor = decrement(cutNode);
	let rootIndex = out.findLastIndex(v => notation.lessThan(v, cutNode));
	let root = out[rootIndex];
	let badPart = [predecessor, ...out.slice(rootIndex + 1)];
	if (notation.equal(root, predecessor)) { // cut node == root + 1
		let zeroth = [...out];
		if (notation.isSuccessor(zeroth)) zeroth.pop();
		let begin = notation.equal(zeroth, expand(a, 0)) ? 0 : 1;
		for (let i = begin; i < n; i++) {
			out.push(...badPart);
		}
		if (notation.isSuccessor(out)) out.pop();
		return out;
	}

	let parent = searchForParent(root, predecessor);
	let rootTrajectory = getTrajectory(root, parent);
	let badPartTrajectories = badPart.map(x => getTrajectory(x, parent));
	let predecessorTrajectory = badPartTrajectories[0];

	for (let i = 1; i <= n; i++) {
		// for each element in the bad part, if it's in the parent then move the index
		// find the recursive expansion that results in the suffix, and also move those indices
		let copy = [...badPart].map((x, j) => {
			if (notation.lessThan(x, parent)) {
				let shift = j == 0 ? i - 1 : i; // predecessor is shifted 1 group less
				let trajectory = badPartTrajectories[j];
				let current = parent;
				for (let k = 0; k < trajectory.length; k++) {
					let increment = 0;
					let index = trajectory[k];
					if (k >= predecessorTrajectory.length || predecessorTrajectory[k] < index) {
						// bound the increment trajectory of terms in the bad part to at most match the predecessor
						index = predecessorTrajectory.length <= k ? 0 : predecessorTrajectory[k];
					}
					if (k >= rootTrajectory.length || rootTrajectory[k] < index) {
						let base = k >= rootTrajectory.length ? 0 : rootTrajectory[k];
						increment = shift * (index - base);
					}
					let bIsNotLast = k < trajectory.length - 1;
					current = expand(current, trajectory[k] + increment + bIsNotLast);
				}
				return current;
			}
			return x;
		});
		out.push(...copy);
	}

	return out;
}

function bigLimit(n) {
	if (n === 0) return [];
	return [[], bigLimit(n-1)];
}

function limit(n) {
	if (n === 0) return [];
	let a = [];
	for (let i = 0; i < n; i++) {
		a.push(limit(i));
	}
	return a;
}

function standardizePrSS(s) {
	let siblings = [];
	let current;
	for (let i = 0; i < s.length; i++) {
		if (s[i] == 0) {
			current = [];
			siblings.push(current);
		}
		current.push(s[i]);
	}
	for (let i = 0; i < siblings.length; i++) {
		if (siblings[i].includes(1)) {
			siblings[i] = [0, ...standardizePrSS(siblings[i].slice(1).map(x => x-1)).map(x => x+1)];
		}
	}
	for (let i = siblings.length - 2; i >= 0; i--) {
		if (siblings[i] < siblings[i+1]) {
			siblings.splice(i, 1);
		}
	}
	return siblings.flat();
}

function PrSStoCNF(s) {
	let out = "";
	let lastterm = "";
	let coefficient = 1;
	let root = 0;

	for (let i = 0; i <= s.length; i++) {
		if ((s[i + 1] === s[0]) || (i + 1 >= s.length)) {
			let branches = 0;
			for (let j = root+1; j <= i; j++) {
				branches += s[j] === s[root+1] ? 1 : 0;
			}

			let term = ["1", "ω"][i - root] || (branches === 1 ? "ω^x" : "ω^(x)").replace("x", PrSStoCNF(s.slice(root+1, i+1))).replace(/\((\d+)\)/g, "$1");
			if (term === lastterm && i !== s.length) {
				coefficient += 1;
			} else {
				if (lastterm) {
					out += "+" + (coefficient === 1 ? lastterm : lastterm === "1" ? coefficient : lastterm + (lastterm === "ω" ? "" : "·") + coefficient);
				}
				lastterm = term;
				coefficient = 1;
			}
			root = i + 1;
		}
	}

	return out.substring(1);
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
export const def_rfss = define_classic_notation({
  id: "rfss",
  name: "RFSS",
  simple_name: "RFSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  create: factory_rfss,
});
register_notation(def_rfss);

// ---------------------------------------------------------------------------
//  FSS — 参考版 key: fss（工厂 8862 字节，原样）
// ---------------------------------------------------------------------------
const factory_fss = function(){

	let version = "1";
document.addEventListener("DOMContentLoaded", () => {
	setTimeout(function() { // optional version parameter
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const requestedVersion = urlParams.get("version");
		if (requestedVersion) {
			version = requestedVersion;
		}
	}, 1);
});

class notation {
	static title = "FSS";
	static header = "Fundamental Sequence System";

	static lessOrEqual(a, b) {
		return compareTerms(a, b) <= 0;
	}

	static lessThan(a, b) {
		return compareTerms(a, b) === -1;
	}

	static equal(a, b) {
		return compareTerms(a, b) === 0;
	}

	static expandLimit(n) {
		return limit(n+1);
	}

	static expand(a, n) {
		return expand(a, n);
	}

	static isSuccessor(array) {
		let s = notation.toString(array);
		return s.length == 0 || s.endsWith("[]");
	}

	static toString(array) {
		return JSON.stringify(array).slice(1,-1).replaceAll(/,/g, "");
	}

	static fromString(s) {
		return JSON.parse("["+s.replaceAll(/\]\[/g,"],[")+"]");
	}

	static convertToNotation(value) {
		if (value === "") return "∅";
		let s = value.replaceAll(/\]\[/g,"],[").replaceAll(/\[\]/g,"0");
		while (true) {
			let next = s.replaceAll(/\[([0,]+)\]/g,(_, n) => `${(n.length+1)/2}`);
			if (next == s) break;
			s = next;
		}
		s = s.replaceAll(/\[[0-9,]+\]/g, function(x) {
			let a = JSON.parse(x);

			for (let i = a.length-2; i > 0; i--) { // standardize
				if (a[i] == a[i-1] && a[i+1] > a[i]) {
					a.splice(i, 1);
				}
			}
			
			for (let i = 1; i < a.length; i++) {
				if (a[i] - a[i-1] > 1) return JSON.stringify(a);
			}
			return PrSStoCNF(standardizePrSS(a));
		});
		s = s.replaceAll("[0,1,3]", "ε₀");
		s = s.replaceAll("[0,1,4]", "ζ₀");
		s = s.replaceAll("[0,1,5]", "η₀");
		if (version == "1.2") {
			s = s.replaceAll("[0,1,ω]", "ε₀");
			s = s.replaceAll("[0,1,ω,ε₀]", "φ(ε₀,0)");
		} else {
			s = s.replaceAll("[0,1,ω]", "φ(ω,0)");
		}
		return s;
	}
};

function compareTerms(a, b) {
	for (let i = 0; i < a.length; i++) {
		if (i >= b.length) return 1; // a > b
		let c = compareTerms(a[i], b[i]);
		if (c != 0) return c;
	}
	return b.length > a.length ? -1 : 0;
}

function toString(a) {
	if (a == null) return "null";
	return notation.convertToNotation(notation.toString(a));
}

// remove the rightmost []
function decrement(a) {
	if (a.length === 0) return [];
	if (a[a.length - 1].length === 0) return a.slice(0, -1);
	return a.slice(0, -1).concat([decrement(a[a.length - 1])]);
}

function searchForParent(root, target) {
	// find limits where x[0] <= root < target < x
	let candidates = [];
	let current = [[[]]];
	let iter = 0;
	while (true) {
		iter++;
		let rootIndex = findPrefixInExpansion(root, current)[1];
		let [next, nextIndex] = findPrefixInExpansion(target, current);
		if (nextIndex > rootIndex && rootIndex != -1) {
			candidates.push(current);
		}
		current = expand(current, nextIndex + 1);
		if (notation.isSuccessor(current)) break;
	}

	// find the candidate whose expansion contains the largest prefix of the root
	let parent, prefix;
	for (let i = 0; i < candidates.length; i++) {
		let index = findPrefixInExpansion(root, candidates[i])[1];
		let previous = expand(candidates[i], index);
		if (prefix == null || notation.lessThan(prefix, previous)) {
			parent = candidates[i];
			prefix = previous;
		}
	}

	return parent;
}

// find the largest term in the expansion of parent less than or equal to the target
function findPrefixInExpansion(term, parent) {
	if (notation.lessThan(parent, term)) return [null, -1]; // parent should be greater than or equal to term
	let index = 0;
	let element = expand(parent, 0);
	if (notation.lessThan(term, element)) return [null, -1]; // term should be at least parent[0]
	while (true) {
		let next = expand(parent, index + 1);
		if (notation.lessThan(term, next)) return [element, index];
		element = next;
		index++;
	}
}

let expandCache = new Map();
function cacheResult(hash, out) {
	expandCache.set(hash, deepcopy(out));
	return out;
}

function deepcopy(term) {
	return [...term.map(x => deepcopy(x))];
}

function expand(a, n) {
	let str = toString(a);
	let hash = JSON.stringify([a, n]);
	if (expandCache.has(hash)) return deepcopy(expandCache.get(hash));
	if (str === "1") return cacheResult(hash, limit(n));
	if (str === "0,1") return cacheResult(hash, Array(n).fill([]));
	if (a.length === 0) return [];
	if (n == 0) {
		for (let i = a.length - 2; i >= 0; i--) { // cut the last nondecreasing sequence
			if (notation.lessThan(a[i+1], a[i])) {
				return cacheResult(hash, a.slice(0, i + 1));
			}
		}
		return cacheResult(hash, a.slice(0, -1)); // cut the last element if the whole sequence is nondecreasing
	}
	let out = [...a];
	let cutNode = out.pop();
	let cutIsSuccessor = notation.isSuccessor(cutNode);
	if (!cutIsSuccessor && version != "1.2") {
		if (version == "1.1") {
			out.push(expand(cutNode, n-1));
		} else {
			out.push(expand(cutNode, toString(cutNode) === "0,1" ? n : n-1));
		}
		return cacheResult(hash, out);
	}

	let parent = cutNode;
	let increment = 1;
	let rootIndex = out.findLastIndex(v => notation.lessThan(v, cutNode));
	let root = out[rootIndex];
	let badPart = [...out.slice(rootIndex)];
	if (cutIsSuccessor) {
		let predecessor = decrement(cutNode);
		badPart = [predecessor, ...out.slice(rootIndex + 1)];
		if (notation.equal(root, predecessor)) { // cut node == root + 1
			let zeroth = [...out];
			if (notation.isSuccessor(zeroth)) zeroth.pop();
			let begin = notation.equal(zeroth, expand(a, 0)) ? 0 : 1;
			for (let i = begin; i < n; i++) {
				out.push(...badPart);
			}
			if (notation.isSuccessor(out)) out.pop();
			return cacheResult(hash, out);
		}

		parent = searchForParent(root, predecessor);
		let indexRoot = findPrefixInExpansion(root, parent)[1];
		let indexPredecessor = findPrefixInExpansion(predecessor, parent)[1];
		increment = indexPredecessor - indexRoot;
	}
	for (let i = 1; i <= n; i++) {
		// for each element in the bad part, if it's in the parent then move the index and copy the suffix
		let copy = [...badPart].map((x, j) => {
			if (notation.lessThan(x, parent)) {
				let [prefix, index] = findPrefixInExpansion(x, parent);
				let offset = cutIsSuccessor ? 0 : 1;
				let term = expand(parent, index + increment * ((j == 0 ? i - 1 : i) + offset));
				let innerTerm = term;
				let innerPrefix = prefix;
				let innerX = x;
				while (innerX.length == innerPrefix.length && innerX.length > 0) {
					innerX = innerX[innerX.length - 1];
					innerPrefix = innerPrefix[innerPrefix.length - 1];
					innerTerm = innerTerm[innerTerm.length - 1];
					if (innerX == null || innerTerm == null || innerPrefix == null) break;
				}
				if (innerTerm == null) innerTerm = [];
				innerTerm.push(...innerX.slice(innerPrefix.length)); // copy suffix
				return term;
			}
			return x;
		});
		out.push(...copy);
	}

	return cacheResult(hash, out);
}

function limit(n) {
	if (n === 0) return [];
	let a = [];
	for (let i = 0; i < n; i++) {
		a.push(limit(i));
	}
	return a;
}

function standardizePrSS(s) {
	let siblings = [];
	let current;
	for (let i = 0; i < s.length; i++) {
		if (s[i] == 0) {
			current = [];
			siblings.push(current);
		}
		current.push(s[i]);
	}
	for (let i = 0; i < siblings.length; i++) {
		if (siblings[i].includes(1)) {
			siblings[i] = [0, ...standardizePrSS(siblings[i].slice(1).map(x => x-1)).map(x => x+1)];
		}
	}
	for (let i = siblings.length - 2; i >= 0; i--) {
		if (siblings[i] < siblings[i+1]) {
			siblings.splice(i, 1);
		}
	}
	return siblings.flat();
}

function PrSStoCNF(s) {
	let out = "";
	let lastterm = "";
	let coefficient = 1;
	let root = 0;

	for (let i = 0; i <= s.length; i++) {
		if ((s[i + 1] === s[0]) || (i + 1 >= s.length)) {
			let branches = 0;
			for (let j = root+1; j <= i; j++) {
				branches += s[j] === s[root+1] ? 1 : 0;
			}

			let term = ["1", "ω"][i - root] || (branches === 1 ? "ω^x" : "ω^(x)").replace("x", PrSStoCNF(s.slice(root+1, i+1))).replace(/\((\d+)\)/g, "$1");
			if (term === lastterm && i !== s.length) {
				coefficient += 1;
			} else {
				if (lastterm) {
					out += "+" + (coefficient === 1 ? lastterm : lastterm === "1" ? coefficient : lastterm + (lastterm === "ω" ? "" : "·") + coefficient);
				}
				lastterm = term;
				coefficient = 1;
			}
			root = i + 1;
		}
	}

	return out.substring(1);
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
export const def_fss = define_classic_notation({
  id: "fss",
  name: "FSS",
  simple_name: "FSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  sample_k: 2,
  create: factory_fss,
});
register_notation(def_fss);

// ---------------------------------------------------------------------------
//  HAM2SSS — 参考版 key: ham2sss（工厂 2974 字节，原样）
// ---------------------------------------------------------------------------
const factory_ham2sss = function(){

	function replaceAllEntries(s, n) {
	for (let i = 0; i < s.length; i++) {
		if (s[i] < n) {
			s[i] = n - 1;
		}
	}
	return s;
}

function maxLexicographicArray(arrays) {
	return arrays.reduce((maxArray, currentArray) => {
		for (let i = 0; i < maxArray.length; i++) {
			if (currentArray[i] > maxArray[i]) {
				return currentArray;
			} else if (currentArray[i] < maxArray[i]) {
				break;
			}
		}
		return maxArray;
	}, arrays[0]);
}

class notation {
	static title = "HAM 2-shifted";
	static header = "H-A-M's 2-shifted sequence system";
	static footer = "Definition of <a href='https://github.com/H-A-M-G-E-R/large-number-programs/blob/main/2-shifted%20sequence%20system.py'>2-shifted sequence system</a> by H-A-M-G-E-R";
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
		s = [...s];
		const last = s[s.length - 1];
		if (last === 0) {
			s.pop();
			return s;
		} else {
			if (s.length >= 3) {
				if ((s.at(-1) == s.at(-2)+1) && (s.at(-2) == s.at(-3))) { // expand terms like 0,0,1 to 0 instead of 0,0,0 and 1,1,2 to 1 instead of 1,1,1
					s.splice(-3, 3, ...Array(n).fill(s.at(-2)));
					return s;
				}
			}
			for (let i = s.length - 2; i >= 0; i--) {
				if (s[i] < last) {
					const t = replaceAllEntries(s.slice(i), last);
					for (let j = i - 1; j >= 0; j--) {
						if (s[j] <= last - 1) {
							const u = replaceAllEntries(s.slice(j), last);
							if (u < t) {
								const possibleBadParts = [];
								for (let k = j + 1; k < s.length; k++) {
									if (s[k] < last) {
										possibleBadParts.push(replaceAllEntries(s.slice(k, s.length - 1), last));
									}
								}
								const badPart = maxLexicographicArray(possibleBadParts);
								while ((badPart.at(-1) < last) && (badPart.at(-1) > s.at(-2)) && badPart.length > 1)
									badPart.pop();
								s.pop();
								for (let l = 0; l < n; l++) {
									s = s.concat(badPart);
								}
								if (s.at(-1) === 0) s.pop(); // fixes limits of limits expanding into successors
								return s;
							}
						}
					}
				}
			}
		}
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return JSON.stringify(array);
	}

	static fromString(s) {
		return JSON.parse(s);
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
export const def_ham2sss = define_classic_notation({
  id: "ham2sss",
  name: "HAM 2-shifted",
  simple_name: "HAM2SSS",
  category_id: "category-seq-ancestral",
  credit_text_id: 'credit.community',
  create: factory_ham2sss,
});
register_notation(def_ham2sss);
