// ============================================================================
//  core/ne/notationDef.js — 记号定义规格（移植自 ne-rewritten src/notation-definition.ts）
// ============================================================================
//  这是 ne 架构的接口契约层：记号不再自己造树，只提供「表达式 + 一组纯函数」。
//
//  NotationDefinition 字段（JS 下无类型，此处作为文档）：
//    id, name, simple_name, description, category_id
//    display              — 显示规格：函数，或 { plain, html?, latex?, from_display?, name? }
//    display_equiv        — 等价显示视图表 { viewId: 同上规格 }
//    is_limit(a)          — 极限判定（替代远古版的 able）
//    compare(a, b)        — 序比较
//    FS(a, index)         — 基本列（必需）
//    FS_alter?, FS_short? — 可选的基本列变体
//    FS_equiv?            — 额外变体表 { id: fn }
//    init()               — 返回「表达式数组」（不再是远古版的树节点列表！）
//    draw_diagram?, mountain_view?, credit_text_id?, debug?, debug_verification?
//
//  ⚠ 与远古接口的核心差异：
//    init() 返回 T[]，树结构完全由 core/ne/tree.js + expander.js 管理；
//    记号不再提供 low 边界（原 FSbounded 的职责由树的 get_bound 承担）。
// ============================================================================

/**
 * 把只含 <sub>/<sup> 的简单 HTML 转成 LaTeX。
 * 转义 5 个 LaTeX 特殊字符 \ { } ^ _，并识别 ω Ω ψ。
 */
export function html_to_latex(html) {
  let i = 0;

  const ESCAPE = {
    '\\': '\\textbackslash ',
    '{': '\\{',
    '}': '\\}',
    '^': '\\^{}',
    _: '\\_',
    ω: '\\omega ',
    Ω: '\\Omega ',
    ψ: '\\psi ',
  };

  function read(end_tag) {
    let result = '';
    while (i < html.length) {
      if (end_tag && html.startsWith(end_tag, i)) {
        i += end_tag.length;
        break;
      }
      if (html.startsWith('<sub>', i)) {
        i += 5;
        result += '_{' + read('</sub>') + '}';
      } else if (html.startsWith('<sup>', i)) {
        i += 5;
        result += '^{' + read('</sup>') + '}';
      } else {
        const ch = html[i];
        result += ESCAPE[ch] ?? ch;
        i++;
      }
    }
    return result;
  }

  return read();
}

/**
 * 解析 NameSpec：字符串按纯文本，{ id } 走翻译表。
 * 本项目的翻译表由 core/ne/i18n.js 提供；未命中时退回 id 本身。
 */
export function resolve_name(spec, translate) {
  if (spec === undefined) return undefined;
  if (typeof spec === 'string') return spec;
  return translate ? translate(spec.id) : spec.id;
}

/**
 * 把 display 规格统一成 { plain, html, latex, from_display?, name? }。
 * - 直接给函数：plain = html = 该函数，latex 由 html 转出
 * - 给对象：html 缺省取 plain，latex 缺省由 html 转出
 */
export function resolve_display(spec) {
  if (typeof spec === 'function') {
    const html = spec;
    const latex = (a) => html_to_latex(html(a));
    return { plain: spec, html, latex };
  }
  const html_fn = spec.html ?? spec.plain;
  const latex_fn = spec.latex ?? ((a) => html_to_latex(html_fn(a)));

  let name = spec.name;
  if (!name && spec.name_id) name = { id: spec.name_id };

  return {
    plain: spec.plain,
    html: html_fn,
    latex: latex_fn,
    from_display: spec.from_display,
    name,
  };
}

/** 取 display 规格的显示名（视图下拉里用）。 */
export function resolve_display_name(spec, translate) {
  return resolve_name(resolve_display(spec).name, translate);
}

/**
 * 运行 debug_verification 校验器。
 * 单个函数：未通过时 failed 为空数组（与 ne 行为一致）；
 * record 形态：运行全部校验函数，返回未通过的字段名列表。
 * 校验函数抛异常一律视为未通过。
 */
export function run_debug_verification(verification, expr) {
  if (verification === undefined) return { passed: true, failed: [] };

  if (typeof verification === 'function') {
    try {
      return { passed: verification(expr), failed: [] };
    } catch {
      return { passed: false, failed: [] };
    }
  }

  const failed = [];
  for (const name of Object.keys(verification)) {
    let passed = false;
    try {
      passed = verification[name](expr);
    } catch {
      passed = false;
    }
    if (!passed) failed.push(name);
  }
  return { passed: failed.length === 0, failed };
}
