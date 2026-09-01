// ============================================================================
//  notation/_shared.js — 记号文件共享工具（window.NEUTILS）
// ============================================================================
//  从 ne-rewritten (SmileLee-lyx/ne-rewritten) 移植的 TypeScript 记号在
//  转换时复用以下工具，避免在 30+ 个记号文件里重复代码。
//  必须在所有记号文件之前加载（index.html 中位于最前面）。
//
//  内容：
//   - utils（deepcopy / 各种比较器）
//   - notation_utils（FS 变体包装器：FS / FSalter / FS_short）
//   - OCN_utils（OCF 系列显示 AST 渲染）
//   - Y 序列辅助（sequence_display / sequence_from_display）
//   - BM 辅助（normalize / standardize / display）+ BM↔三角BMS 转换器
// ============================================================================
;(function () {
  'use strict';

  // --------------------------------------------------------------------------
  //  utils.ts
  // --------------------------------------------------------------------------
  function number_compare(a, b) {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  function boolean_compare(a, b) {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }
  function compare_by(transform, cmp) {
    return (a, b) => cmp(transform(a), transform(b));
  }
  function lex_compare(a, b, cmp) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const result = cmp(a[i], b[i]);
      if (result !== 0) return result;
    }
    return number_compare(a.length, b.length);
  }
  function lex_compare_by(cmp) {
    return (a, b) => lex_compare(a, b, cmp);
  }
  function anti_lex_compare(a, b, cmp) {
    if (a.length !== b.length) return number_compare(a.length, b.length);
    for (let i = a.length - 1; i >= 0; i--) {
      const result = cmp(a[i], b[i]);
      if (result !== 0) return result;
    }
    return 0;
  }
  function tuple_lex_compare(a, b, cmp) {
    for (let i = 0; i < cmp.length; i++) {
      const result = cmp[i] ? cmp[i](a[i], b[i]) : 0;
      if (result !== 0) return result;
    }
    return 0;
  }
  function tuple_lex_compare_by(cmp) {
    return (a, b) => {
      for (let i = 0; i < cmp.length; i++) {
        const result = cmp[i] ? cmp[i](a[i], b[i]) : 0;
        if (result !== 0) return result;
      }
      return 0;
    };
  }
  function object_lex_compare_by(cmp, order) {
    return (a, b) => {
      for (const k of order) {
        const result = cmp[k](a[k], b[k]);
        if (result !== 0) return result;
      }
      return 0;
    };
  }
  function bind2(fn, t2) {
    return (a) => fn(a, t2);
  }
  function index_of_first(array, predicate) {
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i])) return i;
    }
    return -1;
  }
  function index_of_last(array, predicate) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) return i;
    }
    return -1;
  }
  function deepcopy(obj) {
    if (!obj) return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'string') return obj;
    if (Array.isArray(obj)) {
      const result = new Array(obj.length);
      for (let i = 0, len = obj.length; i < len; i++) {
        if (i in obj) result[i] = deepcopy(obj[i]);
      }
      return result;
    } else {
      const result = {};
      for (const key in obj) {
        result[key] = deepcopy(obj[key]);
      }
      return result;
    }
  }

  // --------------------------------------------------------------------------
  //  notation_utils.ts — FS 变体包装器
  // --------------------------------------------------------------------------

  /** 通用序列变体（shorter 标志区分 FS / FSalter / FS_short） */
  function sequence_FS_variants(expand, is_infinity, infinity_FS, is_limit, display) {
    const data = {};
    const data_alter = {};
    const data_short = {};
    const core = {
      FS: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data[data_key] === undefined) data[data_key] = [];
        else if (data[data_key][index] !== undefined) return data[data_key][index];
        return (data[data_key][index] = expand(seq, index, true));
      },
      FS_alter: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data_alter[data_key] === undefined) data_alter[data_key] = [];
        else if (data_alter[data_key][index] !== undefined) return data_alter[data_key][index];
        return (data_alter[data_key][index] = expand(seq, index, false));
      },
      FS_short: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        if (index === 0) return seq.slice(0, seq.length - 1);
        if (index === 1) {
          const result = core.FS_alter(seq, 1);
          return result.slice(0, seq.length);
        }
        const data_key = display(seq);
        let d = data_short[data_key];
        if (d === undefined) {
          d = data_short[data_key] = core.FS(seq, 1).length !== seq.length;
        }
        return core.FS(seq, index - (d ? 1 : 0));
      },
    };
    return core;
  }

  /** 通用序列变体（无 shorter 标志版本，expand 签名 (seq, index)）
   *  用于 LPMS（lpmsFS 只接收 index，无 shorter 参数）。返回 FS / FS_short。 */
  function sequence_FS_variants0(expand, is_infinity, infinity_FS, is_limit, display) {
    const data = {};
    const data_short = {};
    const core = {
      FS: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data[data_key] === undefined) data[data_key] = [];
        else if (data[data_key][index] !== undefined) return data[data_key][index];
        return (data[data_key][index] = expand(seq, index));
      },
      FS_short: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        if (index === 0) return seq.slice(0, seq.length - 1);
        if (index === 1) {
          const result = core.FS(seq, 1);
          return result.slice(0, seq.length);
        }
        const data_key = display(seq);
        let d = data_short[data_key];
        if (d === undefined) {
          d = data_short[data_key] = core.FS(seq, 0).length !== seq.length;
        }
        return core.FS(seq, index - (d ? 2 : 1));
      },
    };
    return core;
  }

  /** MN（mountain）系列变体（FS / FSalter / FS_short） */
  function MN_FS_variants(expand, is_infinity, infinity_FS, is_limit, display) {
    const data = {};
    const data_alter = {};
    const data_short = {};
    const core = {
      FS: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data[data_key] === undefined) data[data_key] = [];
        else if (data[data_key][index] !== undefined) return data[data_key][index];
        return (data[data_key][index] = expand(seq, index, true));
      },
      FS_alter: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data_alter[data_key] === undefined) data_alter[data_key] = [];
        else if (data_alter[data_key][index] !== undefined) return data_alter[data_key][index];
        return (data_alter[data_key][index] = expand(seq, index, false));
      },
      FS_short: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        if (index === 0) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        let d = data_short[data_key];
        if (d === undefined) {
          const target = core.FS(seq, 1);
          d = data_short[data_key] = [
            target[seq.length - 1].length !== seq[seq.length - 1].length - 1,
            target.length !== seq.length,
          ];
        }
        let current = 1;
        if (d[0]) {
          if (index === current) {
            const result = seq.slice();
            result[result.length - 1] = result[result.length - 1].slice();
            result[result.length - 1].pop();
            return result;
          } else current++;
        }
        if (d[1]) {
          if (index === current) {
            return core.FS(seq, 1).slice(0, seq.length);
          } else current++;
        }
        return core.FS(seq, 1 + index - current);
      },
    };
    return core;
  }

  /** Y 序列变体（FS / FSalter / FS_short） */
  function Y_FS_variants(expand_longer, is_infinity, infinity_FS, is_limit, display) {
    const data = {};
    const data_short = {};
    const core = {
      FS: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const result = core.FS_alter(seq, index);
        return result.slice(0, result.length - 1);
      },
      FS_alter: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        const data_key = display(seq);
        if (data[data_key] === undefined) data[data_key] = [];
        else if (data[data_key][index] !== undefined) return data[data_key][index];
        return (data[data_key][index] = expand_longer(seq, index));
      },
      FS_short: (seq, index) => {
        if (is_infinity(seq)) return infinity_FS(index);
        if (!seq.length) return [];
        if (!is_limit(seq)) return seq.slice(0, seq.length - 1);
        if (index === 0) return seq.slice(0, seq.length - 1);
        if (index === 1) {
          const result = core.FS_alter(seq, 1);
          return result.slice(0, seq.length);
        }
        const data_key = display(seq);
        let d = data_short[data_key];
        if (d === undefined) {
          d = data_short[data_key] = core.FS(seq, 1).length !== seq.length;
        }
        return core.FS(seq, index - (d ? 1 : 0));
      },
    };
    return core;
  }

  /** 合并同类项（字符串版，Veblen 等用） */
  function merge_sum(terms) {
    let result = [];
    let i = 0;
    while (i < terms.length) {
      let j = i + 1;
      let t = terms[i];
      while (j < terms.length && terms[j] === t) j++;
      if (j === i + 1) {
        result.push(terms[i]);
      } else {
        let count = j - i;
        if (t === '1') result.push('' + count);
        else result.push(t + count);
      }
      i = j;
    }
    return result.join('+');
  }

  // --------------------------------------------------------------------------
  //  OCN_utils.ts — OCF 系列显示 AST 渲染
  // --------------------------------------------------------------------------
  function display_OCN_IR(e, type) {
    switch (e.type) {
      case 'number':
        return '' + e.value;

      case 'sum':
        return e.terms.map((t) => display_OCN_IR(t, type)).join('+');

      case 'mul_nat': {
        const v = display_OCN_IR(e.value, type);
        if (type === 'latex') return v + '\\cdot ' + e.coe;
        return v + '·' + e.coe;
      }

      case 'omega':
        return display_OCN_IR(
          { type: 'constant', display: 'ω', display_latex: '\\omega ', sup: e.sup },
          type,
        );

      case 'Omega':
        return display_OCN_IR(
          { type: 'constant', display: 'Ω', display_latex: '\\Omega ', sub: e.sub },
          type,
        );

      case 'psi':
        return display_OCN_IR(
          { type: 'constant', display: 'ψ', display_latex: '\\psi ', sub: e.sub, arg: e.arg },
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
    throw new Error('unreachable');
  }

  /** 合并同类项（OCN IR 版） */
  function merge_sum_OCN(terms) {
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

  /** 构造 OCF 系列 display（HTML 版，v2 的 TreeNodeView 会渲染 <sup>/<sub>） */
  function make_OCN_display(to_ir) {
    return (e) => display_OCN_IR(to_ir(e), 'html');
  }

  // --------------------------------------------------------------------------
  //  Y 序列辅助（来自 Omega_Y.ts）
  // --------------------------------------------------------------------------
  function sequence_display(expr) {
    return is_Y_infinity(expr) ? 'Limit' : '' + expr;
  }
  function is_Y_infinity(expr) {
    return '' + expr === 'Infinity';
  }
  const sequence_from_display = (str) => {
    if (str === 'Limit') return [Infinity];
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal sequence');
    return result;
  };

  // --------------------------------------------------------------------------
  //  BM 辅助（来自 BM.ts）
  // --------------------------------------------------------------------------
  function BM_INFINITY() {
    return [[Infinity]];
  }
  function BM_is_infinity(a) {
    return ('' + a).startsWith('Infinity');
  }
  function BM_normalize_col(col) {
    return col.slice(0, index_of_last(col, (x) => x > 0) + 1);
  }
  function BM_normalize(m) {
    return m.map(BM_normalize_col);
  }
  function BM_standardize(m, min = 0) {
    if (m.length === 0) return m;
    const H = Math.max(...m.map((col) => col.length), min);
    return m.map((col) => [...col, ...Array.from({ length: H - col.length }, () => 0)]);
  }
  function BM_column_display(col) {
    const n_col = BM_normalize_col(col);
    if (n_col.length === 0) return '(0)';
    return '(' + n_col + ')';
  }
  function BM_display(a) {
    if (BM_is_infinity(a)) return 'Limit';
    return a.map(BM_column_display).join('');
  }
  function BM_from_display(s, std = false) {
    if (s === 'Limit') return BM_INFINITY();
    s = s.trim();
    if (s === '') return [];
    function error() {
      throw new Error('Illegal input string: ' + s);
    }
    function skip_spaces(i) {
      while (i < s.length && s[i] === ' ') i++;
      return i;
    }
    function parse_column(start) {
      if (s[start] !== '(') error();
      let i = skip_spaces(start + 1);
      if (i < s.length && s[i] === ')') return [[], i + 1];
      const col = [];
      while (i < s.length) {
        i = skip_spaces(i);
        if (i < s.length && s[i] >= '0' && s[i] <= '9') {
          let num = 0;
          while (i < s.length && s[i] >= '0' && s[i] <= '9') {
            num = num * 10 + (s.charCodeAt(i) - 48);
            i++;
          }
          col.push(num);
          i = skip_spaces(i);
          if (i < s.length && s[i] === ',') {
            i++;
          } else if (i < s.length && s[i] === ')') {
            i++;
            break;
          } else {
            error();
          }
        } else {
          error();
        }
      }
      return [col, i];
    }
    function parse_expression(start) {
      const result = [];
      let i = start;
      while (i < s.length) {
        i = skip_spaces(i);
        if (i >= s.length || s[i] !== '(') break;
        const [col, end] = parse_column(i);
        result.push(col);
        i = end;
      }
      return [result, i];
    }
    const [result, end] = parse_expression(0);
    if (end !== s.length) error();
    return std ? BM_standardize(result) : BM_normalize(result);
  }

  // --- 0Y / simple 显示（来自 BM.ts） ---
  function BM_parents(m) {
    const result = [];
    for (let i = 0; i < m.length; i++) {
      result.push([]);
      for (let j = 0; j < m[i].length; j++) {
        let p = i;
        while (true) {
          p = j > 0 ? result[p][j - 1] : p - 1;
          if (p < 0) p = undefined;
          if (p === undefined) break;
          if ((m[p][j] ?? 0) < m[i][j]) break;
        }
        if (p !== undefined) result[i].push(p);
        else break;
      }
    }
    return result;
  }
  function BM_compute_mountain(m) {
    const P = BM_parents(m);
    const h = Math.max(...m.map((col) => col.length));
    const diagram_rows = h + 1;
    const M = [];
    for (let i = 0; i < m.length; i++) {
      M.push([]);
      for (let j = diagram_rows - 1; j >= 0; j--) {
        if (j >= P[i].length || P[i][j] < 0) {
          M[i][j] = 1;
        } else {
          const up = M[i][j + 1] ?? 1;
          const left = M[P[i][j]][j] ?? 1;
          M[i][j] = up + left;
        }
      }
    }
    return { m, M, P };
  }
  function BM_convert_to_0Y(m) {
    return BM_compute_mountain(m).M.map((col) => col[0]);
  }
  function BM_display_as_0Y(m) {
    return BM_is_infinity(m) ? '1,ω' : BM_convert_to_0Y(m).join(',');
  }
  function BM_compute_0Y_mountain(seq) {
    const P = Array.from({ length: seq.length }, () => []);
    const M = Array.from({ length: seq.length }, (_, i) => [seq[i]]);
    const m = Array.from({ length: seq.length }, () => []);
    for (let j = 0; ; j++) {
      let has_next = false;
      for (let i = 0; i < seq.length; i++) {
        if (M[i][j] === 1) {
          M[i].push(1);
        } else {
          let p = j === 0 ? i - 1 : P[i][j - 1];
          while (p >= 0) {
            if (M[i][j] > M[p][j]) break;
            p = j === 0 ? p - 1 : P[p][j - 1];
          }
          if (p >= 0) {
            P[i].push(p);
            M[i].push(M[i][j] - M[p][j]);
            m[i].push((m[p][j] ?? 0) + 1);
            has_next = true;
          } else {
            throw new Error('Illegal 0Y sequence: ' + seq);
          }
        }
      }
      if (!has_next) break;
    }
    return { M, P, m };
  }
  function BM_from_display_as_0Y(str) {
    if (str === 'Limit' || str === '1,ω' || str === '1,w') return BM_INFINITY();
    const result = str.split(',').map((s) => parseInt(s.trim(), 10));
    if (result.find(Number.isNaN) !== undefined) throw new Error('Illegal omega-Y sequence');
    return BM_compute_0Y_mountain(result).m;
  }
  function BM_entry_display_simple(e) {
    const str = '' + e;
    return str.length > 1 ? '(' + str + ')' : str;
  }
  function BM_column_display_simple(col) {
    const N = index_of_last(col, (x) => x > 0) + 1;
    if (N === 0) return '0';
    return col.slice(0, N).map(BM_entry_display_simple).join('');
  }
  function BM_display_simple(m) {
    if (BM_is_infinity(m)) return 'Limit';
    return m.map(BM_column_display_simple).join(' ');
  }
  function BM_from_display_simple(s, std = false) {
    if (s === 'Limit') return BM_INFINITY();
    let i = 0;
    function error() {
      throw new Error('Illegal input string: ' + s);
    }
    function skip_spaces() {
      while (i < s.length && s[i] === ' ') i++;
    }
    function parse_value() {
      if (i < s.length && s[i] === '(') {
        i++;
        const start = i;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        if (start === i) error();
        if (i >= s.length || s[i] !== ')') error();
        const v = parseInt(s.substring(start, i), 10);
        i++;
        return v;
      }
      if (i < s.length && s[i] >= '0' && s[i] <= '9') {
        const v = s.charCodeAt(i) - 48;
        i++;
        return v;
      }
      error();
    }
    function parse_column() {
      const col = [];
      while (i < s.length && s[i] !== ' ') {
        col.push(parse_value());
      }
      return col;
    }
    function parse_expr() {
      const result = [];
      while (i < s.length) {
        skip_spaces();
        if (i >= s.length) break;
        if (s[i] === '0' && (i + 1 >= s.length || s[i + 1] === ' ')) {
          result.push([]);
          i++;
          continue;
        }
        result.push(parse_column());
      }
      return result;
    }
    skip_spaces();
    if (i + 5 <= s.length && s.substring(i, i + 5) === 'Limit') {
      i += 5;
      skip_spaces();
      if (i !== s.length) error();
      return BM_INFINITY();
    }
    const result = parse_expr();
    skip_spaces();
    if (i !== s.length) error();
    return std ? BM_standardize(result) : BM_normalize(result);
  }

  // --------------------------------------------------------------------------
  //  BM_converter.ts — DBM(三角 BMS) ↔ BMS 双向转换
  // --------------------------------------------------------------------------
  class NonStandardExpressionError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NonStandardExpressionError';
    }
  }

  function lastPositiveRow(column) {
    for (let i = column.length - 1; i >= 0; i--) {
      if (column[i] > 0) return i + 1;
    }
    return 0;
  }
  function incrementPrefix(column, count) {
    if (count < 0 || count > column.length) {
      throw new NonStandardExpressionError('非法前缀长度：' + count);
    }
    return column.map((value, index) => (index < count ? value + 1 : value));
  }
  function decrementPrefix(column, count) {
    if (count < 0 || count > column.length) {
      throw new NonStandardExpressionError('非法前缀长度：' + count);
    }
    const result = column.slice();
    for (let i = 0; i < count; i++) {
      if (result[i] === 0) {
        throw new NonStandardExpressionError('列的前 ' + count + ' 项不能全部减一');
      }
      result[i]--;
    }
    return result;
  }
  function incrementRow(column, row) {
    if (row < 1 || row > column.length) {
      throw new NonStandardExpressionError('非法实际行号：' + row);
    }
    const result = column.slice();
    result[row - 1]++;
    return result;
  }
  function zeroFromRow(column, row) {
    if (row < 1 || row > column.length + 1) {
      throw new NonStandardExpressionError('非法清零起始行：' + row);
    }
    const result = column.slice();
    for (let i = row - 1; i < result.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  function firstRowColumn(value, n) {
    const result = new Array(n).fill(0);
    result[0] = value;
    return result;
  }

  class AncestorIndex {
    constructor(columns) {
      if (columns.length === 0) {
        throw new Error('不能为空矩阵建立祖先关系');
      }
      this.columns = columns;
      this.n = columns[0].length;
      this.columnCount = columns.length;

      this.parents = Array.from({ length: this.n + 1 }, () => new Array(this.columnCount).fill(null));
      this.ancestors = Array.from({ length: this.n + 1 }, () =>
        Array.from({ length: this.columnCount }, () => new Set()),
      );

      for (let ci = 0; ci < this.columnCount; ci++) {
        this.parents[0][ci] = ci > 0 ? ci - 1 : null;
        this.ancestors[0][ci] = new Set();
        for (let a = 0; a < ci; a++) {
          this.ancestors[0][ci].add(a);
        }
      }

      for (let row = 1; row <= this.n; row++) {
        const valueIndex = row - 1;
        for (let ci = 0; ci < this.columnCount; ci++) {
          let parent = null;
          const candidates = Array.from(this.ancestors[row - 1][ci]).sort((a, b) => b - a);
          for (const candidate of candidates) {
            if (columns[candidate][valueIndex] < columns[ci][valueIndex]) {
              parent = candidate;
              break;
            }
          }
          this.parents[row][ci] = parent;
          if (parent !== null) {
            this.ancestors[row][ci] = new Set([parent, ...this.ancestors[row][parent]]);
          } else {
            this.ancestors[row][ci] = new Set();
          }
        }
      }
    }
    hasAncestorColumn(elementColumn, row, ancestorColumn) {
      return this.ancestors[row][elementColumn].has(ancestorColumn);
    }
    parentIsColumn(elementColumn, row, parentColumn) {
      return this.parents[row][elementColumn] === parentColumn;
    }
  }

  function columnLessThan(a, b) {
    const maxLen = Math.max(a.length, b.length);
    for (let r = 0; r < maxLen; r++) {
      const av = r < a.length ? a[r] : 0;
      const bv = r < b.length ? b[r] : 0;
      if (av !== bv) return av < bv;
    }
    return false;
  }
  function columnsEqual(a, b) {
    const maxLen = Math.max(a.length, b.length);
    for (let r = 0; r < maxLen; r++) {
      const av = r < a.length ? a[r] : 0;
      const bv = r < b.length ? b[r] : 0;
      if (av !== bv) return false;
    }
    return true;
  }
  function arraysGreaterThan(a, b) {
    const common = Math.min(a.length, b.length);
    for (let i = 0; i < common; i++) {
      const cmp = compareColumnsBM(a[i], b[i]);
      if (cmp !== 0) return cmp > 0;
    }
    return a.length > b.length;
  }
  function compareColumnsBM(a, b) {
    const maxLen = Math.max(a.length, b.length);
    for (let r = 0; r < maxLen; r++) {
      const av = r < a.length ? a[r] : 0;
      const bv = r < b.length ? b[r] : 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  /** DBM → BMS */
  function triangular_to_BM(matrix) {
    if (BM_is_infinity(matrix)) return matrix;
    if (matrix.length === 0) return matrix;

    const columns = BM_standardize(matrix, 2);
    const n = columns[0].length;
    let index = columns.length - 1;

    while (index >= 0) {
      const x = columns[index];
      if (x[n - 2] > 0) {
        index--;
        continue;
      }

      const k = lastPositiveRow(x);
      if (k + 2 > n) {
        throw new NonStandardExpressionError('列无法构造前 k+2 行；k=' + k + ', n=' + n);
      }

      const y = incrementPrefix(x, k + 1);
      const z = incrementPrefix(y, k + 2);
      const yIndex = index + 1;
      const machineStart = index + 2;

      if (
        yIndex >= columns.length ||
        !columnsEqual(columns[yIndex], y) ||
        machineStart >= columns.length ||
        columnLessThan(columns[machineStart], z)
      ) {
        index--;
        continue;
      }

      const ancestors = new AncestorIndex(columns);
      const xPrime = [];
      let cursor = machineStart;
      let lastStep = null;
      let xEnd;

      while (true) {
        if (cursor >= columns.length || columnLessThan(columns[cursor], z)) {
          xEnd = cursor;
          break;
        }

        const t = columns[cursor];
        const matchingRows = [];
        for (let row = 0; row <= k + 1; row++) {
          if (ancestors.hasAncestorColumn(cursor, row, yIndex)) {
            matchingRows.push(row);
          }
        }

        if (matchingRows.length === 0) {
          throw new NonStandardExpressionError(
            '找不到最大的 l≤k+1，使 t[l] 有祖先在 y：' +
              'x@' + (index + 1) + ', y@' + (yIndex + 1) + ', t@' + (cursor + 1) +
              ', t=' + JSON.stringify(t),
          );
        }

        const l = Math.max(...matchingRows);
        const stoppedByXParent = l <= k && ancestors.parentIsColumn(cursor, l + 1, index);

        let tPrime = decrementPrefix(t, l);
        if (stoppedByXParent) {
          tPrime = zeroFromRow(tPrime, l + 2);
        }

        xPrime.push(tPrime);
        cursor++;

        lastStep = { column: t, l, stoppedByXParent };

        if (stoppedByXParent) {
          xEnd = cursor;
          break;
        }
      }

      const nextAfterX = xEnd < columns.length ? columns[xEnd] : null;
      const keepCase1 = nextAfterX !== null && !columnLessThan(nextAfterX, firstRowColumn(z[0], n));
      const keepCase2 =
        lastStep !== null &&
        lastStep.column[lastStep.l] === 0 &&
        ancestors.parentIsColumn(xEnd - 1, lastStep.l, yIndex);
      const keepCase3 =
        lastStep !== null && lastStep.stoppedByXParent && lastStep.l + 1 < n && lastStep.column[lastStep.l + 1] > 0;

      const keepOriginalYx = keepCase1 || keepCase2 || keepCase3;

      if (keepOriginalYx) {
        columns.splice(index + 1, 0, ...xPrime);
      } else {
        columns.splice(index + 1, xEnd - (index + 1), ...xPrime);
      }

      index--;
    }

    return BM_normalize(columns);
  }

  /** BMS → DBM */
  function BM_to_triangular(matrix, stepLimit = 100000) {
    if (BM_is_infinity(matrix)) return matrix;
    if (matrix.length === 0) return matrix;

    const columns = BM_standardize(matrix);
    const n = columns[0].length;
    let index = 0;
    let steps = 0;

    while (index < columns.length) {
      steps++;
      if (steps > stepLimit) {
        throw new NonStandardExpressionError('超过转换步数限制；输入可能不是标准表达式，或规则导致了非终止插入');
      }

      const x = columns[index];
      const k = lastPositiveRow(x);

      if (k >= n - 1) {
        index++;
        continue;
      }

      const y = incrementPrefix(x, k + 1);
      const z = incrementRow(y, k + 2);
      const xStart = index + 1;

      if (xStart >= columns.length || columnLessThan(columns[xStart], z)) {
        index++;
        continue;
      }

      let xEnd = xStart;
      while (xEnd < columns.length && !columnLessThan(columns[xEnd], z)) {
        xEnd++;
      }

      const ancestors = new AncestorIndex(columns);
      const xPrime = [];

      for (let cursor = xStart; cursor < xEnd; cursor++) {
        const t = columns[cursor];
        const matchingRows = [];
        for (let row = 0; row <= k + 1; row++) {
          if (ancestors.hasAncestorColumn(cursor, row, index)) {
            matchingRows.push(row);
          }
        }

        if (matchingRows.length === 0) {
          throw new NonStandardExpressionError(
            '找不到最大的 l≤k+1，使 t[l] 有祖先在 x：' +
              'x@' + (index + 1) + ", x'@" + (xStart + 1) + ', t@' + (cursor + 1) +
              ', t=' + JSON.stringify(t),
          );
        }

        let l = Math.max(...matchingRows);
        const isLast = cursor === xEnd - 1;

        if (isLast) {
          if (l < 0 || l >= n) {
            throw new NonStandardExpressionError('无法读取 t[l+1]：l=' + l + ', n=' + n);
          }
          if (ancestors.parentIsColumn(cursor, l, index) && t[l] === 0) {
            l--;
          }
        }

        if (l < 0) {
          throw new NonStandardExpressionError('最后一列修正使 l 变成负数');
        }

        xPrime.push(incrementPrefix(t, l));
      }

      const remainder = columns.slice(xEnd);
      const comparisonMatrix = [y, ...xPrime, firstRowColumn(y[0] + 1, n)];
      const insertion = [y, ...xPrime];

      columns.splice(xStart, xEnd - xStart);

      if (arraysGreaterThan(comparisonMatrix, remainder)) {
        columns.splice(xStart, 0, ...insertion);
      }

      index++;
    }

    return BM_normalize(columns);
  }

  // --------------------------------------------------------------------------
  window.NEUTILS = {
    number_compare,
    boolean_compare,
    compare_by,
    lex_compare,
    lex_compare_by,
    anti_lex_compare,
    tuple_lex_compare,
    tuple_lex_compare_by,
    object_lex_compare_by,
    bind2,
    index_of_first,
    index_of_last,
    deepcopy,
    merge_sum,
    sequence_FS_variants,
    sequence_FS_variants0,
    MN_FS_variants,
    Y_FS_variants,
    display_OCN_IR,
    merge_sum_OCN,
    make_OCN_display,
    sequence_display,
    sequence_from_display,
    BM_INFINITY,
    BM_is_infinity,
    BM_normalize_col,
    BM_normalize,
    BM_standardize,
    BM_column_display,
    BM_display,
    BM_from_display,
    BM_display_as_0Y,
    BM_from_display_as_0Y,
    BM_display_simple,
    BM_from_display_simple,
    triangular_to_BM,
    BM_to_triangular,
  };
})();
