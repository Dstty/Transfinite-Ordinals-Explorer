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

/** 按 includeNoNote 过滤节点：false（默认）只保留有注释的行，true 保留全部。 */
function selectNodes(rootList, includeNoNote) {
  const all = collectNodes(rootList);
  if (includeNoNote) return all;
  return all.filter(n => n.note && String(n.note).trim() !== '');
}

/**
 * 导出整棵树为 CSV 并触发下载。
 * @param {object} notation 记号对象（display 函数）
 * @param {Array} rootList 树的根列表
 * @param {string} notationName 记号显示名
 * @param {Function} addOutput UI 输出回调
 * @param {boolean} [includeNoNote=false] true=连同无注释的行一起导出，false=只导出有注释的行
 */
export function downloadTreeAsCSV(notation, rootList, notationName, addOutput, includeNoNote = false) {
  if (!rootList || rootList.length === 0) {
    addOutput('该树没有任何节点', 'error');
    return;
  }

  const nodes = selectNodes(rootList, includeNoNote);
  if (nodes.length === 0) {
    addOutput('没有带注释的节点（此树没有可导出的行；如要连无注释的行一起导出，可加参数 True）', 'error');
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

// ----------------------------------------------------------------------------
//  xlsx 导出（与 core/importer.js 的导入对称）：write-excel-file 浏览器构建，按需动态加载
// ----------------------------------------------------------------------------
let xlsxWriterPromise = null;
function loadXlsxWriter() {
  if (!xlsxWriterPromise) {
    xlsxWriterPromise = import('https://esm.sh/write-excel-file@4/browser')
      .then((mod) => mod.default)
      .catch((err) => {
        xlsxWriterPromise = null;
        throw new Error(`加载 xlsx 写入库失败（需要联网）: ${err && err.message ? err.message : err}`);
      });
  }
  return xlsxWriterPromise;
}

/** 收集节点（先序）为 [[展示文本, 注释], ...]。传入已按 includeNoNote 过滤的 nodes。 */
function buildRows(notation, nodes) {
  return nodes.map(item => {
    let displayStr;
    try {
      displayStr = notation.display(item.expr);
    } catch {
      displayStr = String(item.expr);
    }
    return [stripHtml(displayStr), item.note || ''];
  });
}

/**
 * 导出整棵树为 xlsx 并触发下载（与 CSV 版同列结构）。
 * @param {object} notation 记号对象（display 函数）
 * @param {Array} rootList 树的根列表
 * @param {string} notationName 记号显示名
 * @param {Function} addOutput UI 输出回调
 * @param {boolean} [includeNoNote=false] true=连同无注释的行一起导出，false=只导出有注释的行
 */
export async function downloadTreeAsXLSX(notation, rootList, notationName, addOutput, includeNoNote = false) {
  if (!rootList || rootList.length === 0) {
    addOutput('该树没有任何节点', 'error');
    return;
  }
  const nodes = selectNodes(rootList, includeNoNote);
  if (nodes.length === 0) {
    addOutput('没有带注释的节点（此树没有可导出的行；如要连无注释的行一起导出，可加参数 True）', 'error');
    return;
  }

  const rows = buildRows(notation, nodes);
  let writeXlsxFile;
  try {
    writeXlsxFile = await loadXlsxWriter();
  } catch (err) {
    addOutput(err.message, 'error');
    return;
  }

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `${notationName}_${timestamp}.xlsx`;

  try {
    const result = await writeXlsxFile(rows);
    const blob = await result.toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addOutput(`✅ 已保存为 ${filename} (${nodes.length} 个节点)`, 'info');
  } catch (err) {
    addOutput(`导出失败: ${err && err.message ? err.message : err}`, 'error');
  }
}
