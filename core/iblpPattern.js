// ============================================================================
//  core/iblpPattern.js — IBLP（DEN2）图案数据层
// ============================================================================
//  IBLP = Infinite Basic Laver Pattern（Googology Wiki），即本项目的 den2 记号
//  （notation/legacy/DEN2.js，与 NE 上的 DEN2 规则对应）。
//  表达式 = (行)L(行)L…：
//    (row) = (a[-1],a[-2],…,a[2],a[1])，条目从大到小（与 DEN2 的 display 一致）；
//            * 前缀表示标记（Marks 集合）
//    L     = 步长（行末数字）
//
//  绘图：移植自 ne-rewritten 的 src/notations/DEN/DEN2.ts（draw_diagram_control，
//  可视化方案由 test_alpha0 给出）—— 是「点线图」不是列式堆叠：
//    - 每行一条水平线；每个条目的【值】就是它的 x 坐标（pos = value * A，A=16px）
//    - 行内相邻条目用线段连接
//    - 每个条目画圆点（r=A/4）：索引 j === L（步长）的根条目【红色实心】；
//      其余条目带 * 标记实心填充（前景色），未标记用背景色（空心圈）
//    - 步长 L 印在行最右端（紧挨最右条目的右侧）
//  渲染复用 ui/MountainView.js（`draw` 指令的 IBLP 分支）。
// ============================================================================

/**
 * 判断字符串是否为 IBLP 图案形式（(行)L(行)L…，行内条目可带 * 标记）。
 * 与 Y 序列（1,2,4,8 / [1,2,4,8]）结构完全不同，可放心自动识别；
 * 容忍组间/条目间空白（如 "(1,0)1 (2,1,0)1"）。
 * @param {string} str
 * @returns {boolean}
 */
export function isIblpDisplay(str) {
  const s = String(str).replace(/\s+/g, '');
  return /^(\(\*?\d+(,\*?\d+)*\)\d+)+$/.test(s);
}

/**
 * 解析 IBLP 显示字符串 → 行结构。
 * @param {string} str 如 "(1,0)1(2,1,0)1(3,2,1,0)2"（条目可用 * 前缀标记）
 * @returns {Array<{L:number, entries:Array<{value:number, mark:boolean}>}>}
 *   entries 从大到小排列（与显示一致）
 */
export function parseIblpDisplay(str) {
  const s = String(str).replace(/\s+/g, '');
  if (!s) throw new Error('缺少表达式');
  if (/^limit$/i.test(s)) throw new Error('Limit 是极限表达式，没有具体图案可绘制');

  const rowRe = /\(([^)]*)\)(\d+)/g;
  const rows = [];
  let m;
  let last = 0;
  while ((m = rowRe.exec(s)) !== null) {
    if (m.index !== last) throw new Error(`非法输入: "${s}"`);
    const entriesText = m[1].trim();
    if (entriesText === '') throw new Error(`第 ${rows.length + 1} 行缺少条目: ${m[0]}`);
    const entries = [];
    for (const t of entriesText.split(',')) {
      const em = t.trim().match(/^\*?(\d+)$/);
      if (!em) throw new Error(`无法解析条目 "${t}"（应为数字，* 前缀表示标记）`);
      entries.push({ value: parseInt(em[1], 10), mark: t.trim().startsWith('*') });
    }
    rows.push({ L: parseInt(m[2], 10), entries });
    last = m.index + m[0].length;
  }
  if (last !== s.length) throw new Error(`非法输入: "${s}"`);
  if (rows.length === 0) throw new Error('不是 IBLP 表达式（应为 (1,0)1(2,1,0)1… 形式）');
  return rows;
}

/**
 * 行结构 → 通用 Diagram（点线图，移植自 ne-rewritten DEN2.ts draw_diagram）。
 * @param {Array<{L:number, entries:Array<{value:number, mark:boolean}>}>} rows
 * @param {object} [opts] { offset, offset_x, max_display }
 *   默认全部行显示（max_display=Infinity）；offset/offset_x 为滚动偏移（暂未接 UI）
 * @returns {object|undefined} Diagram { width, height, elements, extra_text }
 */
export function iblp_diagram(rows, opts) {
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const A = 16;
  const { offset = 0, offset_x = 0, max_display = Infinity } = opts || {};

  const total = rows.length;
  const show_all = total <= max_display;
  const start = show_all ? 0 : Math.min(offset, total - max_display);
  const end = Math.min(start + max_display, total);
  const visible = end - start;
  const offX = Math.min(offset_x, end - 1);
  const width = (end - offX) * A + A;
  const height = visible * A + A / 2;

  const elements = [];
  const lines = [];
  const circles = [];
  const extra_text = [];
  const black = { type: 'text' };
  const white = { type: 'background' };
  const red = { type: 'red' };

  for (let vi = 0; vi < visible; vi++) {
    const i = start + vi;
    const entries = rows[i].entries;
    const step = rows[i].L;
    const rightmost = entries.length ? entries[0].value - offX : undefined;
    let prev;

    for (let j = 0; j < entries.length; j++) {
      const pos = entries[j].value - offX;
      const mark = entries[j].mark;
      if (prev !== undefined && prev >= 0) {
        // 行内相邻条目连线（前一个点可见时）
        lines.push({
          type: 'line',
          x1: prev * A + A / 2,
          y1: vi * A + A / 2,
          x2: pos * A + A / 2,
          y2: vi * A + A / 2,
          stroke: true,
          stroke_color: black,
          width: 1,
        });
      }
      if (pos >= 0) {
        // 条目圆点：j === step（根条目/步长索引）→ 红色实心；其余按标记实心/背景空心
        circles.push({
          type: 'circle',
          x: pos * A + A / 2,
          y: vi * A + A / 2,
          r: A / 4,
          stroke: true,
          stroke_color: j === step ? red : black,
          fill: true,
          fill_color: j === step ? red : (mark ? black : white),
          width: 1,
        });
      }
      prev = pos;
    }

    // 行最右端印步长 L
    if (rightmost !== undefined && rightmost >= 0) {
      extra_text.push({
        text: '' + step,
        x: rightmost * A + A,
        y: vi * A + A / 2,
        size: 10,
        color: black,
      });
    }
  }

  elements.unshift(...circles);
  elements.unshift(...lines);
  return { width, height, elements, extra_text };
}

/**
 * 便捷入口：IBLP 显示字符串 → Diagram。
 * @param {string} str 显示字符串（如 "(1,0)1(2,1,0)1"）
 * @returns {object|undefined}
 */
export function iblpDiagramFromDisplay(str) {
  const rows = parseIblpDisplay(str);
  return iblp_diagram(rows);
}
