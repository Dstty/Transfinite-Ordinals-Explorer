// ============================================================================
//  core/ne/classicNotation.js — 「经典 6 方法接口」→ ne NotationDefinition 适配器
// ============================================================================
//  背景：参考版（自助版NE-4.8.1）里大量用户记号是同一个简单接口的对象：
//      { parse, format, isSuccessor, generateLimit, expand, compare }
//  而本项目的 ne 记号接口是：
//      { display, is_limit, compare, FS, init }  —— 树结构由 core/ne 管，记号只给纯函数
//  两者一一对应，所以**不必改写算法**，套一层适配器即可移植（算法保持与原作逐字一致，
//  可移植性因此不依赖我对某个记号的理解是否正确）。
//
//  ── 三处语义差异，必须显式处理（都踩过）────────────────────────────────────
//  ① 基本列下标基数不同：
//       参考版 expand(m, n) 的 n 从 **1** 起（n<1 返回 null）；
//       ne 的 FS(e, i) 从 **0** 起。故 FS = expand(e, i + 1)。
//     若直接透传，每个记号都会整体错位一项（第一项取不到、末项多一项）。
//  ② 非极限表达式：
//       参考版对后继式 expand 返回 null（它没有「前驱」函数）。
//       ne 的 expander 对非 limit 节点会调 fs(e,0) 并要求结果 < e，否则判定「不可展开」
//       （expander.js:80-82）。所以这里对后继式**返回表达式自身** —— 正好等价于
//       「不可展开」，且不会造出重复节点。注意别返回 undefined：旧引擎
//       （core/engine.js:156）会拿 FS 结果去 compare，undefined 会直接抛。
//  ③ 极限式 expand 返回 null（病态输入）时也返回自身：ne 的 generate_fs 有
//     「连续试展开次数过多」守卫（expander.js:54）会兜住，不会死循环。
//
//  另：参考版的 generateLimit(k) 就是它 UI 的「示例极限式」，直接用作 init()。
// ============================================================================

/** 默认示例档位（树不要太大，够展开即可）。 */
const DEFAULT_SAMPLE_K = 3;

// 参考版有些工厂在**构造期**就碰 DOM（gss / fss 里 `document.addEventListener(...)`、
// `document.dispatchEvent(...)`）。浏览器里无所谓，但 Node 验证脚本里会 ReferenceError，
// 而且是**模块级**抛错 —— 一个记号炸掉会让同文件后面的记号全部注册不上
// （实测表现为「gss/wfss/swfss/rfss/fss/ham2sss 不在注册表里」，见
//  .tmp-ne/debug-classic-path.mjs 的排查过程）。故在没有 DOM 时补一个空桩。
if (typeof document === 'undefined') {
  const noop = () => {};
  globalThis.document = {
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: noop,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: noop, addEventListener: noop, setAttribute: noop }),
    body: { appendChild: noop },
  };
}

/**
 * 把一个经典 6 方法记号对象包装成 ne NotationDefinition。
 *
 * @param {object} opts
 * @param {string} opts.id           记号 id
 * @param {string} opts.name         全名
 * @param {string} [opts.simple_name] 显示短名
 * @param {string} opts.category_id  ne 分类 id
 * @param {string} [opts.credit_text_id] 出处标注
 * @param {string} [opts.description]
 * @param {number} [opts.sample_k]   init 用的 generateLimit 档位，默认 3
 * @param {() => object} opts.create 返回经典记号对象（工厂本体，原样从参考版抠出）
 */
export function define_classic_notation(opts) {
  const api = opts.create();
  const missing = ['parse', 'format', 'isSuccessor', 'generateLimit', 'expand', 'compare'].filter(
    (m) => typeof api[m] !== 'function',
  );
  if (missing.length) {
    throw new Error(`记号 '${opts.id}' 的经典接口缺少方法：${missing.join(', ')}`);
  }
  const sample_k = opts.sample_k ?? DEFAULT_SAMPLE_K;

  return {
    id: opts.id,
    name: opts.name,
    simple_name: opts.simple_name,
    description: opts.description,
    category_id: opts.category_id,
    credit_text_id: opts.credit_text_id,

    display: {
      // 参考版的 format() 输出就是纯文本（形如 ()(1,3)），plain / html 同源
      plain: (e) => api.format(e),
      from_display: (s) => {
        const r = api.parse(s);
        if (r === null || r === undefined) throw new Error(`无法解析为 ${opts.simple_name ?? opts.id}：${s}`);
        return r;
      },
    },

    // 参考版的 isSuccessor 对空/无效输入返回 true（视为 0），这里兜住异常 → 当后继处理
    is_limit: (e) => {
      try {
        return !api.isSuccessor(e);
      } catch {
        return false;
      }
    },

    compare: (a, b) => api.compare(a, b),

    FS: (e, i) => {
      if (!api.isSuccessor(e)) {
        const r = api.expand(e, i + 1); // ← ① 下标基数 +1
        if (r !== null && r !== undefined) return r;
      }
      return e; // ← ② / ③ 后继式与病态输入：返回自身 = 不可展开
    },

    init: () => {
      const seed = api.generateLimit(sample_k);
      // ⚠ 别写成 Array.isArray(seed)：buchholzSeq / SPrDSS 这类记号的表达式**本身就是
      // 字符串**（它们的 parse 也返回字符串），用数组判定会把种子全部丢掉、init 变空。
      return seed === null || seed === undefined ? [] : [seed];
    },
  };
}
