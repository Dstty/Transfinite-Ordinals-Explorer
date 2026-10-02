// ============================================================================
//  core/ne/tree.js — 展开树的数据结构与导航（移植自 ne-rewritten src/core/tree.ts）
// ============================================================================
//  这是 ne 架构的核心差异所在：树由 core 拥有，记号只提供表达式。
//
//  TreeNode 字段：
//    expr        — 记号内部的表达式值
//    children    — 子节点（先根顺序即展开顺序）
//    parent      — 父节点（根为 null）
//    index       — 不可变序号（创建时分配；首子最小、末子最大，可为负）
//    path        — 由 index 拼出的稳定路径（"0,1,-1" 之类），供 UI 做 key
//    fs_state    — { variant, index }：该节点上次展开到第几项（换变体会重算）
//    extraData   — 附加数据（注释、analysis 等），核心逻辑不读
//    pending_items — 挂载的待导入条目（树结构的一部分，按 expr 递增有序）
//
//  ⚠ 远古版用记号手写的 low 数组当展开上界；ne 用 get_bound(node)
//    ——「先根遍历的下一个节点的表达式」。low 边界与 FSbounded 因此整体退役。
// ============================================================================

import { run_debug_verification } from './notationDef.js';

/** 该节点在其父 children 中的下标。 */
function array_pos(node) {
  return node.index - node.parent.children[0].index;
}

/** 创建树节点，自动计算 path。 */
export function create_node(expr, parent, index) {
  return {
    expr,
    children: [],
    parent,
    index,
    path: parent.path ? parent.path + ',' + index : '' + index,
  };
}

/**
 * 用记号的 init() 建初始树。根节点是虚拟的（expr = null，index = -1），
 * init() 返回的每个表达式成为根的一个子节点。
 */
export function init_dataset(notation) {
  const root = {
    expr: null,
    children: [],
    parent: null,
    index: -1,
  };

  const exprs = notation.init();
  for (let i = 0; i < exprs.length; i++) {
    const child = create_node(exprs[i], root, i);
    // debug_verification：初始根节点也校验（仅 console.warn）
    if (notation.debug_verification) {
      const { passed, failed } = run_debug_verification(notation.debug_verification, child.expr);
      if (!passed) {
        console.warn(
          '[debug_verification] init 节点未通过校验' +
            (failed.length > 0 ? ' [未通过: ' + failed.join(', ') + ']' : ''),
          child.expr,
        );
      }
    }
    root.children.push(child);
  }
  return root;
}

/** 把 expr 插入为 node 的首个子节点。index 向左递减（可负）。 */
export function prepend_child(node, expr) {
  const index = (node.children[0]?.index ?? 1) - 1;
  const child = create_node(expr, node, index);
  node.children.unshift(child);
  return child;
}

/** 把 expr 追加为 node 的末位兄弟。index 向右递增。 */
export function append_sibling(node, expr) {
  const parent = node.parent;
  const last_index = parent.children[parent.children.length - 1]?.index ?? -1;
  const child = create_node(expr, parent, last_index + 1);
  parent.children.push(child);
  return child;
}

/**
 * 先根遍历的下一个节点（skip = 0 时的语义）。
 * skip 为位组合：
 *   bit 0 (1) — 跳过子节点（直接到兄弟）
 *   bit 1 (2) — 跳过同深度（上移一层找下一兄）
 */
export function find_next(node, skip = 0) {
  if (!(skip & 1) && node.children.length > 0) {
    return node.children[0];
  }
  return next_sibling(node, skip);
}

export function find_prev(node, skip = 0) {
  const parent = node.parent;
  if (!parent) return undefined;

  if (skip & 2) return parent;

  const pos = array_pos(node);

  if (pos <= 0) return parent.parent ? parent : undefined;

  const prev = parent.children[pos - 1];
  return skip & 1 ? prev : last_descendant(prev);
}

export function next_sibling(node, skip = 0) {
  const parent = node.parent;
  if (!parent) return undefined;

  if (skip & 2) return next_sibling(parent, 0);

  const pos = array_pos(node);

  if (pos < parent.children.length - 1) {
    return parent.children[pos + 1];
  }
  return next_sibling(parent, 0);
}

export function last_descendant(node) {
  let cur = node;
  while (cur.children.length > 0) cur = cur.children[cur.children.length - 1];
  return cur;
}

/** 展开上界 = 先根遍历的下一个节点的表达式（替代远古版的 low）。 */
export function get_bound(node) {
  return find_next(node, 0)?.expr;
}
