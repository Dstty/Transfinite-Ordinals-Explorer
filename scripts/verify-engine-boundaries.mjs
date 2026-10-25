import assert from 'node:assert/strict';
import { make_tree, can_expand_ne, expand_ne } from '../core/ne/uiEngine.js';
import { set_max_find_fs, preview_expand } from '../core/ne/expander.js';
import { buildImportTree } from '../core/importer.js';

const def = {
  id: 'boundary-fixture', display: { plain: String }, init: () => [100, 40],
  is_limit: e => e === 100, compare: (a, b) => a - b,
  FS: (e, i) => e === 100 ? i : Math.max(0, e - 1),
};
const notation = { _ne: true, _def: def, parse: Number, compare: def.compare };
set_max_find_fs(100);
const tree = make_tree(notation, null);
assert.equal(can_expand_ne(notation, tree[0]), true);
assert.equal(tree[0]._neNode.fs_state, undefined, 'preview must not advance FS state');
assert.equal(expand_ne(notation, tree, tree[0], 0, 0, 1000).changed, true);
assert.equal(tree[0].subitems[0].expr, 41);

const broken = { ...def, init: () => [100], FS: e => {
  if (e === 100) return 2;
  throw new Error('fixture failure');
} };
const partial = make_tree({ _ne: true, _def: broken }, null);
partial[0].note = 'preserved';
assert.throws(() => expand_ne({ _ne: true, _def: broken }, partial, partial[0], 1, 0, 1000), /fixture failure/);
assert.equal(partial[0]._neNode.children.length, 1);
assert.equal(partial[0].subitems.length, 1);
assert.equal(partial[0].note, 'preserved');

const imported = buildImportTree(notation, {}, [
  { exprText: '2', note: 'old' }, { exprText: '5', note: 'five' }, { exprText: '2', note: 'latest' },
]);
assert.deepEqual(imported.rootList.map(n => n.expr), [5, 2]);
assert.deepEqual(imported.rootList.map(n => n.note), ['five', 'latest']);
assert(imported.rootList.every(n => n._neNode));
assert.equal(expand_ne(notation, imported.rootList, imported.rootList[0], 0, 0, 1000).changed, true);
assert.equal(imported.rootList[0].subitems[0].expr, 4);
assert.equal(imported.rootList[0].note, 'five');

const legacy = buildImportTree({ parse: Number, compare: def.compare, init: () => [] }, {}, [{ exprText: '3' }]);
assert.equal(legacy.rootList[0]._neNode, undefined);
assert.deepEqual(legacy.rootList[0].low, [[]]);

let calls = 0;
const stalled = { ...def, FS: () => { calls++; return 0; } };
const stalledTree = make_tree({ _ne: true, _def: stalled }, 100);
// Existing children bypass the original trial-count guard; preview still has its own budget.
stalledTree[0]._neNode.children.push({ expr: 1, children: [], parent: stalledTree[0]._neNode, index: 0 });
assert.equal(preview_expand(stalledTree[0]._neNode, stalled, 'FS'), null);
assert(calls <= 256);
set_max_find_fs(10);
console.log('PASS: preview parity, partial-error synchronization, native import, duplicate notes, bounded preview');
