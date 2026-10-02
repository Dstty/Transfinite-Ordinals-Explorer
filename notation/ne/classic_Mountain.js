// ============================================================================
//  notation/ne/classic_Mountain.js — 山脉系（Mountain / WAM）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：山脉系（Mountain / WAM）；ne 分类 id = category-mt-general
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  Mountain — 参考版 key: mountain（工厂 4222 字节，原样）
// ---------------------------------------------------------------------------
const factory_mountain = function(){

	class notation {
	static title = "Mountain";
	static footer = "<a href='mountain.html'>Viewer</a>";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return [1, n+2];
	}

	static expand(a, n) {
		let mountain = expand(calcMountain(arrayToRow(a)), n);
		return mountain[0].map(v => v.value);
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 1;
	}

	static toString(array) {
		return array.join(",");
	}

	static fromString(s) {
		return JSON.parse("["+s+"]");
	}
};

function arrayToRow(array, mode) {
	function parent(i) {
		return array.findLastIndex((x, j) => j < i && x < array[i]);
	}
	return array.map((v, i) => {
		let p = parent(i);
		if (p == -1) {
			return {
				value: v,
				position: i,
				parentIndex: -1,
				delta: 0
			};
		}
		return {
			value: v,
			position: i,
			parentIndex: p,
			delta: v - array[p]
		};
	});
}

function calcMountain(row) {
	let mountain = [row];
	while (true) {
		let newRow = [];
		for (let i = 0; i < row.length; i++) {
			if (row[i].parentIndex != -1) {
				newRow.push({
					value: row[i].delta,
					position: row[i].position,
					parentIndex: -1,
					delta: 0
				});
			}
		}
		for (let i = 0; i < newRow.length; i++) {
			let p = row.findIndex(x => x.position >= newRow[i].position);
			while (p >= 0) {
				p = row[p].parentIndex;
				if (p < 0) break;
				let j = newRow.findIndex(x => x.position >= row[p].position);
				if (j < 0 || (j < newRow.length-1 && newRow[j].position + 1 != newRow[j+1].position)) break;
				if (newRow[j].value < newRow[i].value) {
					newRow[i].parentIndex = j;
					newRow[i].delta = newRow[i].value - newRow[j].value;
					break;
				}
			}
		}
		if (newRow.length == 0) break;
		mountain.push(newRow);
		let hasNextRow = false;
		for (let i = 0; i < row.length; i++) {
			if (row[i].delta > 0) {
				hasNextRow = true;
				break;
			}
		}
		if (!hasNextRow) break;
		row = newRow;
	}
	return mountain;
}

function cloneMountain(mountain) {
	return mountain.map(layer => layer.map(element => {
		return {
			value: element.value,
			position: element.position,
			parentIndex: element.parentIndex
		};
	}));
}

function expand(mountain, n) {
	let result = cloneMountain(mountain);
	if (mountain[0].at(-1).parentIndex == -1 || n == 0) {
		result[0].pop();
	} else {
		let cutHeight = mountain.findLastIndex(row => row.at(-1).position == mountain[0].length - 1);
		for (let i = 0; i <= cutHeight; i++) result[i].pop();

		let badRootRow = mountain[cutHeight];

		let cutNode = badRootRow.at(-1).value;
		let parentIndex = badRootRow.at(-1).parentIndex;
		while (parentIndex != -1 && badRootRow[parentIndex].value >= cutNode - 1) {
			parentIndex = badRootRow[parentIndex].parentIndex;
		}
		let row = result[cutHeight];
		for (let i = 1; i <= n; i++) {
			row.push({
				value: (cutNode - 1) * (1 << (i - 1)),
				position: badRootRow.at(-1).position + i - 1,
				parentIndex: parentIndex + i - 1
			});
		}
		for (let k = cutHeight - 1; k >= 0; k--) {
			let parent = mountain[k].at(-1).parentIndex;
			for (let p = result[k].at(-1).position + 1; p <= result[k+1].at(-1).position; p++) {
				let difference = result[k+1].find(x => x.position == p).value;
				result[k].push({
					value: result[k][parent].value + difference,
					position: result[k].at(-1).position + 1,
					parentIndex: parent
				});
				parent = result[k].length - 1;
			}
		}
		return calcMountain(arrayToRow(result[0].map(v => v.value)));
	}
	while (result.length > 0 && result.at(-1).length == 0) result.pop();

	return result;
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
export const def_mountain = define_classic_notation({
  id: "mountain",
  name: "Mountain",
  simple_name: "Mountain",
  category_id: "category-mt-general",
  credit_text_id: 'credit.community',
  create: factory_mountain,
});
register_notation(def_mountain);

// ---------------------------------------------------------------------------
//  WAM — 参考版 key: wam（工厂 5482 字节，原样）
// ---------------------------------------------------------------------------
const factory_wam = function(){

	class notation {
	static title = "Weak Ancestral Mountain";
	static footer = "<a href='mountain.html'>Mountain Viewer</a>";

	static lessOrEqual(a, b) {
		for (let i = 0; i < a.length; i++) {
			if (i >= b.length) return false;
			if (a[i] != b[i]) return a[i] < b[i];
		}
		return a.length <= b.length;
	}

	static expandLimit(n) {
		return Array(n+1).fill(0).map((v, i) => (2<<i)-i-2);
	}

	static expand(a, n) {
		let mountain = expand(calcMountain(arrayToRow(a)), n);
		return mountain[0].map(v => v.value);
	}

	static isSuccessor(array) {
		return array.length == 0 || array.at(-1) == 0;
	}

	static toString(array) {
		return array.join(",");
	}

	static fromString(s) {
		return JSON.parse("["+s+"]");
	}
};

function arrayToRow(array, mode) {
	function parent(i) {
		return array.findLastIndex((x, j) => j < i && x < array[i]);
	}
	return array.map((v, i) => {
		let p = parent(i);
		if (p == -1) {
			return {
				value: v,
				position: i,
				parentIndex: -1,
				delta: 0
			};
		}
		let ancestors = [p];
		while (true) {
			let ancestor = parent(ancestors.at(-1));
			if (ancestor == -1) break;
			ancestors.push(ancestor);
		}
		let diff = v - array[ancestors[0]];
		let delta = diff - ancestors.length;
		let parentIndex = ancestors[0];
		return {
			value: v,
			position: i,
			parentIndex: parentIndex,
			delta: delta
		};
	});
}

function clampedValue(term) {
	return Math.max(0, term.value);
}

function calcMountain(row) {
	let mountain = [row];
	while (true) {
		let newRow = [];
		for (let i = 0; i < row.length; i++) {
			if (row[i].parentIndex != -1) {
				let ancestry = [i];
				while (row[ancestry.at(-1)].parentIndex != -1) {
					ancestry.push(row[ancestry.at(-1)].parentIndex);
				}
				newRow.push({
					value: row[i].delta,
					position: row[i].position,
					parentIndex: -1,
					delta: 0
				});
			}
		}
		for (let i = 0; i < newRow.length; i++) {
			let p = row.findIndex(x => x.position >= newRow[i].position);
			while (p >= 0) {
				p = row[p].parentIndex;
				if (p < 0) break;
				let j = newRow.findIndex(x => x.position >= row[p].position);
				if (j < 0 || (j < newRow.length-1 && newRow[j].position + 1 != newRow[j+1].position)) break;
				if (clampedValue(newRow[j]) < clampedValue(newRow[i])) {
					newRow[i].parentIndex = j;
					let ancestors = [j];
					while (true) {
						let ancestor = newRow[ancestors.at(-1)].parentIndex;
						if (ancestor == -1) break;
						ancestors.push(ancestor);
					}
					let diff = clampedValue(newRow[i]) - clampedValue(newRow[j]);
					let delta = diff - ancestors.length;
					newRow[i].parentIndex = ancestors[0];
					newRow[i].delta = delta;
					break;
				}
			}
		}
		if (newRow.length == 0) break;
		mountain.push(newRow);
		let hasNextRow = false;
		for (let i = 0; i < row.length; i++) {
			if (row[i].delta > 0) {
				hasNextRow = true;
				break;
			}
		}
		if (!hasNextRow) break;
		row = newRow;
	}
	return mountain;
}

function cloneMountain(mountain) {
	return mountain.map(layer => layer.map(element => {
		return {
			value: element.value,
			position: element.position,
			parentIndex: element.parentIndex,
			delta: element.delta
		};
	}));
}

function countAncestors(row, index) {
	let current = index == -1 ? row.length - 1 : index;
	let count = 0;
	while (true) {
		current = row[current].parentIndex;
		if (current == -1) break;
		count++;
	}
	return count;
}

function expand(mountain, n) {
	let result = cloneMountain(mountain);
	if (mountain[0].at(-1).parentIndex == -1) {
		result[0].pop();
	} else {
		let cutHeight = mountain.findLastIndex(row => row.at(-1).position == mountain[0].length - 1 && row.at(-1).value > 0);
		for (let i = 0; i <= cutHeight; i++) result[i].pop();

		let badRootRow = mountain[cutHeight];

		let cutNode = badRootRow.at(-1).value;
		let parentIndex = badRootRow.at(-1).parentIndex;
		let increment = parentIndex == -1 ? 0 : cutNode - badRootRow[parentIndex].value - 1;
		while (parentIndex != -1 && badRootRow[parentIndex].value >= cutNode - 1) {
			parentIndex = badRootRow[parentIndex].parentIndex;
		}
		let row = result[cutHeight];
		for (let i = 1; i <= n; i++) {
			row.push({
				value: (cutNode - 1) + increment * (i - 1),
				position: badRootRow.at(-1).position + i - 1,
				parentIndex: parentIndex + i - 1
			});
		}
		for (let k = cutHeight - 1; k >= 0; k--) {
			let parent = mountain[k].at(-1).parentIndex;
			for (let p = result[k].at(-1).position + 1; p <= result[k+1].at(-1).position; p++) {
				let delta = result[k+1].find(x => x.position == p).value;
				let numAncestors = 1 + countAncestors(result[k], parent);
				result[k].push({
					value: result[k][parent].value + delta + numAncestors,
					position: result[k].at(-1).position + 1,
					parentIndex: parent
				});
				parent = result[k].length - 1;
			}
		}
		return calcMountain(arrayToRow(result[0].map(v => v.value)));
	}
	while (result.length > 0 && result.at(-1).length == 0) result.pop();

	return result;
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
export const def_wam = define_classic_notation({
  id: "wam",
  name: "Weak Ancestral Mountain",
  simple_name: "WAM",
  category_id: "category-mt-general",
  credit_text_id: 'credit.community',
  sample_k: 2,
  create: factory_wam,
});
register_notation(def_wam);
