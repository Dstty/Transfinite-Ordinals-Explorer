import assert from 'node:assert/strict';
import { TreeNodeView } from '../ui/TreeNodeView.js';
import { THEMES } from '../ui/themes.js';
globalThis.React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
  useRef: () => ({ current: null }), useEffect() {},
};
const find = (el, predicate) => {
  if (!el || typeof el !== 'object') return null;
  if (predicate(el)) return el;
  for (const child of el.children || []) { const hit = find(child, predicate); if (hit) return hit; }
  return null;
};
for (const style of ['ner', 'selfne']) {
  const node = { expr: 2, low: [0], _uid: 1, subitems: [{ expr: 1, low: [0], _uid: 2, subitems: [] }] };
  const props = {
    rootList: [node], treeStyle: style, theme: THEMES.dark,
    notation: { display: String, compare: (a, b) => a - b, able: () => false },
    onRefresh() {}, onMore() {}, onToggle() {},
  };
  const click = () => {
    const tree = TreeNodeView(props);
    const control = find(tree, el => typeof el.props.title === 'string' && /折叠/.test(el.props.title) && typeof el.props.onClick === 'function');
    assert(control, style + ' collapse control missing');
    control.props.onClick({ stopPropagation() {} });
  };
  click();
  assert.equal(node._collapsed, true);
  click();
  assert.equal(node._collapsed, false);
}
console.log('PASS: ner/selfne collapse controls reopen children');
