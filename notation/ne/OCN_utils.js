// ============================================================================
//  notation/ne/OCN_utils.js — OCF/OCN 显示 IR 与渲染（ne 原生风格）
// ============================================================================
//  移植自 ne-rewritten: src/notations/OCN/OCN_utils.ts
//  被 BOCF_EBO / MOCF_EBO / NOCF_EBO / Inacc_OCF / UPS1_1r5 / finite_Mahlo_OCF 等使用。
//
//  注意：本文件的 merge_sum 操作的是 **OCNDisplayIR**（按显示文本合并同类项），
//  与 core/ne/notationUtils.js 里的 merge_sum（按字符串合并）同名但完全不同，
//  各用各的，勿混。
// ============================================================================

// ========== 合并同类项 ==========

/** 合并 sum 中相邻的同类项。同类指 display_OCN_IR(-, 'plain') 结果相同。 */
export function merge_sum(terms) {
  if (terms.length === 0) return { type: 'number', value: 0 };
  const result = [];
  let i = 0;
  while (i < terms.length) {
    let j = i + 1;
    const key = display_OCN_IR(terms[i], 'plain');
    while (j < terms.length && display_OCN_IR(terms[j], 'plain') === key) j++;
    const count = j - i;
    if (count === 1) {
      result.push(terms[i]);
    } else if (key === '1') {
      result.push({ type: 'number', value: count });
    } else {
      result.push({ type: 'mul_nat', value: terms[i], coe: count });
    }
    i = j;
  }
  if (result.length === 0) return { type: 'number', value: 0 };
  if (result.length === 1) return result[0];
  return { type: 'sum', terms: result };
}

// ========== 渲染 ==========

export function display_OCN_IR(e, type) {
  switch (e.type) {
    case 'number':
      return '' + e.value;

    case 'sum':
      return e.terms.map((t) => display_OCN_IR(t, type)).join('+');

    case 'mul_nat': {
      const v = display_OCN_IR(e.value, type);
      // 序数乘法：value × coe，整数写在右边
      if (type === 'latex') return v + '\\cdot ' + e.coe;
      return v + '·' + e.coe;
    }

    case 'omega':
      return display_OCN_IR(
        {
          type: 'constant',
          display: 'ω',
          display_latex: '\\omega ',
          sup: e.sup,
        },
        type,
      );

    case 'Omega':
      return display_OCN_IR(
        {
          type: 'constant',
          display: 'Ω',
          display_latex: '\\Omega ',
          sub: e.sub,
        },
        type,
      );

    case 'psi':
      return display_OCN_IR(
        {
          type: 'constant',
          display: 'ψ',
          display_latex: '\\psi ',
          sub: e.sub,
          arg: e.arg,
        },
        type,
      );

    case 'constant': {
      const name = type === 'latex' ? e.display_latex : e.display;
      const sup_str = e.sup ? display_OCN_IR(e.sup, type) : undefined;
      const sub_str = e.sub ? display_OCN_IR(e.sub, type) : undefined;
      const arg_str = e.arg ? display_OCN_IR(e.arg, type) : '';

      let result = name;
      if (sup_str !== undefined) {
        if (type === 'html') result += '<sup>' + sup_str + '</sup>';
        else if (type === 'latex') result += '^{' + sup_str + '}';
        else result += '{' + sup_str + '}';
      }
      if (sub_str !== undefined) {
        if (type === 'html') result += '<sub>' + sub_str + '</sub>';
        else if (type === 'latex') result += '_{' + sub_str + '}';
        else result += '[' + sub_str + ']';
      }
      if (e.arg) result += '(' + arg_str + ')';
      return result;
    }
  }
}

/** 辅助函数：传入 to_OCN_display 转换函数，返回 DisplaySpec 对象 */
export function make_OCN_display(to_ir, name) {
  return {
    plain: (e) => display_OCN_IR(to_ir(e), 'plain'),
    html: (e) => display_OCN_IR(to_ir(e), 'html'),
    latex: (e) => display_OCN_IR(to_ir(e), 'latex'),
    name,
  };
}
