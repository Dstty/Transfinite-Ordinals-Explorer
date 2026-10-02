// ============================================================================
//  core/converters.js — 记号互译注册表 / 树显示视图（v2.5）
// ============================================================================
//  按 DESIGN.md §5.3 约定：转换器与显示视图声明在 NOTATION_META 补充表，
//  记号算法文件保持只读。本模块只负责读取注册表并提供统一入口。
//
//  converters 条目格式：
//    { target: '0y', label: '0-Y', convert: (expr) => expr' }
//  target 为目标记号的 id；convert 把「源记号表达式」转成「目标记号表达式」。
//
//  views 条目格式（同记号的附加显示形式，纯数据，display 由本模块按 kind 生成）：
//    { id: 'simple', label: 'simple', kind: 'bm-simple' }
//    kind 支持：'strip-html'（剥 HTML 标签 → 纯文本）、'bm-simple'（BMS 简单式）、
//               'bm-0y'（BMS 矩阵 → 0-Y 序列）、'bm-bms'（→ 标准矩阵）
//
//  说明：本项目的 0-Y 记号内部表达式就是 BMS 矩阵（0-Y 序列经
//  compute_0Y_mountain(seq).m 解析成矩阵、display 再把矩阵显示成 0-Y 序列），
//  因此 bm4 ↔ 0y 的 convert 是恒等直传（表达式同构），转换结果由目标记号的
//  display 呈现为对应语法。
// ============================================================================
import { NOTATION_META, getNotation } from './register.js';
// ne 记号的等价显示在 def.display_equiv 里，只有经过 uiBridge 的适配层才拿得到
// （远古侧的 NOTATION_META 是另一份对象，看不到 ne 的 display_equiv）。
import { getNotation as getNeNotation } from './ne/uiBridge.js';
import { to_dbms_display } from './omegaYdbms.js';
import { bm_to_ocf_IR } from './bmBocf.js';

// display_equiv 各键的显示名（ne 那边走 i18n，这里给常用项兜底，其余用键名本身）
const EQUIV_LABELS = {
  layer: '分层', marked: '标记', separate: '分离',
  simple: '简单式', 'tri BMS': '三角 BMS', 'tri simple': '三角简单式',
  '0Y': '0-Y', '1Y': '1-Y',
};

// 树标题视图按钮的原生短名
const VIEW_LABELS = { bm4: 'BMS', '0y': '0-Y' };
const nativeLabel = (id) => VIEW_LABELS[id] || id.toUpperCase();

/**
 * 剥 HTML 标签：<sup>x</sup> → ^x、<sub>x</sub> → _x，
 * 其余标签（含内联样式 span）剥掉。用于把记号文件的 html 显示转成纯文本。
 */
export function stripHtml(s) {
  return String(s)
    .replace(/<sup>([^<]*)<\/sup>/g, '^$1')
    .replace(/<sub>([^<]*)<\/sub>/g, '_$1')
    .replace(/<span[^>]*>([^<]*)<\/span>/g, '$1')
    .replace(/<[^>]+>/g, '');
}

// view kind → display 函数生成器（notation 为源记号对象，v 为 views 条目）
const VIEW_DISPLAY_MAKERS = {
  'strip-html': (notation) => (expr) => stripHtml(notation.display(expr)),
  'bm-simple': () => (expr) => (window.NEUTILS && window.NEUTILS.BM_display_simple
    ? window.NEUTILS.BM_display_simple(expr) : String(expr)),
  'bm-0y': () => (expr) => (window.NEUTILS && window.NEUTILS.BM_display_as_0Y
    ? window.NEUTILS.BM_display_as_0Y(expr) : String(expr)),
  'bm-bms': () => (expr) => (window.NEUTILS && window.NEUTILS.BM_display
    ? window.NEUTILS.BM_display(expr) : String(expr)),
  // ω-Y → DBMS 系列（移植自 ne-rewritten Omega_Y.ts），views 条目带 type
  'oy-dbms': (notation, v) => (expr) => to_dbms_display(expr, v.type || 'DBMS'),
  // BMS → BOCF OCN 显示（移植自 ne-rewritten translators/BM-BOCF.ts），views 条目带 type
  'bm-ocf': (notation, v) => {
    const type = v.type || 'ocf';
    const irFn = (expr) => bm_to_ocf_IR(expr, type);
    const displayFn = window.NEUTILS && window.NEUTILS.make_OCN_display
      ? window.NEUTILS.make_OCN_display(irFn)
      : (expr) => String(expr);
    // 超出 BOCF 表示范围（bm_to_ocf_IR 返回 null）→ 显示 BMS 原样 + 标注
    // （标注用 .dsh-warn 类，颜色由主题注入，见 app.js 的 <style>）
    return (expr) => {
      const ir = bm_to_ocf_IR(expr, type);
      if (ir === null) {
        const bms = window.NEUTILS && window.NEUTILS.BM_display
          ? window.NEUTILS.BM_display(expr)
          : String(expr);
        return bms + '<span class="dsh-warn">（超出范围）</span>';
      }
      return displayFn(expr);
    };
  },
};

/**
 * 解析一棵树的全部可用显示视图。
 * @param {string} notationId 记号 id
 * @returns {Array<{ id: (string|undefined), label: string, display: (fn|null) }>}
 *   第一个是原生视图（id=undefined, display=null → 用记号自身 display）；
 *   其后依次为 NOTATION_META.views（同记号变体）与 converters（目标记号视图）。
 */
export function resolveTreeViews(notationId) {
  const notation = getNotation(notationId);
  const meta = NOTATION_META[notationId] || {};
  const views = [{ id: undefined, label: nativeLabel(notationId), display: null }];
  const usedEquiv = new Set();

  // ne 记号自带的等价显示（def.display_equiv）→ 视图。
  // 这一步原先缺失，导致「只在 display_equiv 里声明等价形式」的记号
  // （如 BTBMS 的 layer / marked）视图数量比 ne-rewritten 少。
  const neDef = (() => {
    const n = getNeNotation(notationId);
    return n && n._def ? n._def : (n && n.display_equiv ? n : null);
  })();
  const equiv = neDef && neDef.display_equiv;
  if (equiv && typeof equiv === 'object') {
    for (const [key, spec] of Object.entries(equiv)) {
      if (!spec || typeof spec.plain !== 'function') continue;
      usedEquiv.add(key);
      // ⚠ display 必须是**函数**：UI 会直接调用它渲染节点。
      // 之前这里传的是 { plain, html, from_display } 对象，结果节点显示成
      // [object Object]、甚至整行空白（用户实测到）。
      // 需要 from_display 的地方（跳转反解析）把原 spec 挂在函数属性上，两不耽误。
      const dispFn = (expr) => {
        try { return spec.plain(expr); } catch { return String(expr); }
      };
      dispFn.from_display = spec.from_display;
      dispFn.plain = spec.plain;
      dispFn.html = spec.html;
      views.push({ id: 'equiv:' + key, label: EQUIV_LABELS[key] || key, display: dispFn });
    }
  }

  // 有 display_equiv 就以它为准（那是 ne 侧声明的、与 ne-rewritten 一致的一套），
  // 不再混入远古侧 meta.views，否则同一视图会出现两次（实测 bm4 的 0-Y）。
  const hasEquiv = usedEquiv.size > 0;
  for (const v of hasEquiv ? [] : (meta.views || [])) {
    const vid = typeof v === 'string' ? v : (v && v.id);
    if (vid && usedEquiv.has(vid)) continue;
    const maker = VIEW_DISPLAY_MAKERS[v.kind];
    views.push({
      id: 'view:' + v.id,
      label: v.label,
      display: maker ? maker(notation, v) : null,
    });
  }
  for (const c of meta.converters || []) {
    const target = getNotation(c.target);
    views.push({
      id: 'conv:' + c.target,
      label: c.label || nativeLabel(c.target),
      display: target && typeof target.display === 'function'
        ? (expr) => target.display(expr)
        : null,
    });
  }
  // 统一按 label 去重（保序）：display_equiv / 远古 meta.views / converters 三个来源
  // 可能给出同一个视图（实测 bm4 的 0-Y 会出现两次）。
  const seenLabel = new Set();
  return views.filter((v) => {
    const k = String(v.label);
    if (seenLabel.has(k)) return false;
    seenLabel.add(k);
    return true;
  });
}

/**
 * 查找 fromId → toId 的转换器；没有则返回 null。
 */
export function findConverter(fromId, toId) {
  const meta = NOTATION_META[fromId];
  if (!meta || !Array.isArray(meta.converters)) return null;
  return meta.converters.find((c) => c.target === toId) || null;
}

/**
 * 列出 fromId 记号可转换到的所有目标记号 id。
 */
export function listConverterTargets(fromId) {
  const meta = NOTATION_META[fromId];
  if (!meta || !Array.isArray(meta.converters)) return [];
  return meta.converters.map((c) => c.target);
}

/**
 * 统一转换入口。
 * @param {string} fromId 源记号 id
 * @param {*} expr 源表达式（源记号的内部表示）
 * @param {string} toId 目标记号 id
 * @returns {{ expr: *, display: string } | null}
 *   expr 为目标记号表达式；display 为目标记号 display 格式化后的字符串。
 *   无转换器或目标记号不存在时返回 null。
 */
export function convert(fromId, expr, toId) {
  const conv = findConverter(fromId, toId);
  if (!conv) return null;
  const convertedExpr = conv.convert(expr);
  const target = getNotation(toId);
  if (!target) return null;
  return {
    expr: convertedExpr,
    display: typeof target.display === 'function'
      ? target.display(convertedExpr)
      : String(convertedExpr),
  };
}
