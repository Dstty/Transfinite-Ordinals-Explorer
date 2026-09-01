// ============================================================================
//  ui/exportUtils.js — 导出树为 CSV
// ============================================================================
//  遍历树（先序），每行：展示文本, 注释。导出为 CSV 并触发下载。
// ============================================================================

/**
 * 递归收集所有节点（先序）。
 * @param {Array} list 节点列表
 * @param {Array} out 输出数组
 */
export function collectNodes(list, out = []) {
  for (const item of list) {
    out.push(item);
    if (item.subitems && item.subitems.length > 0) {
      collectNodes(item.subitems, out);
    }
  }
  return out;
}

function escapeCSV(str) {
  if (str === undefined || str === null) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** 剥离 HTML 标签与实体，用于 CSV 纯文本导出。 */
function stripHtml(str) {
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/&sdot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * 导出整棵树为 CSV 并触发下载。
 * @param {object} notation 记号对象（display 函数）
 * @param {Array} rootList 树的根列表
 * @param {string} notationName 记号显示名
 * @param {Function} addOutput UI 输出回调
 */
export function downloadTreeAsCSV(notation, rootList, notationName, addOutput) {
  if (!rootList || rootList.length === 0) {
    addOutput('该树没有任何节点', 'error');
    return;
  }

  const nodes = collectNodes(rootList);
  if (nodes.length === 0) {
    addOutput('该树没有任何节点', 'error');
    return;
  }

  const rows = nodes.map(item => {
    let displayStr;
    try {
      displayStr = notation.display(item.expr);
    } catch {
      displayStr = String(item.expr);
    }
    return [escapeCSV(stripHtml(displayStr)), escapeCSV(item.note || '')];
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `${notationName}_${timestamp}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  addOutput(`✅ 已保存为 ${filename} (${nodes.length} 个节点)`, 'info');
}
