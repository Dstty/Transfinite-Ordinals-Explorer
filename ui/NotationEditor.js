// ============================================================================
//  ui/NotationEditor.js — 自定义记号编辑弹窗（/notation 命令弹出）
// ============================================================================
//  和设置弹窗一个样式，但左边是「已有自定义记号」列表、右边是多行编辑器：
//    · 点左边的记号 → 载入它的源码，改完「保存」即覆盖
//    · 「＋ 新建记号」→ 载入模板，填 id 后保存
//    · 「删除」清掉记号与它的持久化
//  抽成独立组件有两个原因：app.js 已经 1500+ 行；而且这样能用桩 React 直接渲染验证
//  （见 .tmp-ne/verify-noteditor.mjs），不必开浏览器。
//
//  props: { theme, onClose }
// ============================================================================
import {
  add_user_notation,
  get_user_source,
  list_user_notations,
  normalize_source,
  remove_user_notation,
} from '../core/ne/userNotations.js';

/**
 * 新建时的模板：**参考版（自助版 NE-4.8.1）新建记号用的那份 PrSS 示例**，逐字保留
 * 六个方法，只去掉了它仅用于 OCF 显示的 `equivalentForms`（本项目不用）。
 *
 * 为什么不再自己瞎编一个：我上一版的「数字记号」把 `FS` 写成 `e - 1`（结果不随 i 变化），
 * 而 ne 引擎要求第 i 项随 i 递增 —— 第一次展开后节点有了子节点，`generate_fs` 里那个
 * `children.length === 0` 的试展开守卫就被绕过，`while` 永远拒绝同一个值 → **页面冻死**。
 * 参考版这份是真的随 n 增长，天然不踩这个坑（用例见 scripts/verify-expand-timeout.mjs）。
 *
 * 也支持写成表达式（ne 定义 `{display, is_limit, compare, FS, init}`）；
 * 声明式 `const Notation = {...}` 与参考版同一约定，求值器两种都认。
 */
export const NOTATION_TEMPLATE = `// 经典 6 方法接口（与 ne 一致，可直接整段替换）
// 也可以改写成表达式形式：({ display, is_limit, compare, FS, init })
const Notation = {
  parse(inputStr) {
    const trimmed = inputStr.trim();
    if (trimmed === '') return [];
    const parts = trimmed.split(',');
    const seq = [];
    for (let p of parts) {
      const num = parseInt(p.trim(), 10);
      if (isNaN(num) || num <= 0 || !Number.isInteger(num)) return null;
      seq.push(num);
    }
    return seq;
  },

  format(obj) {
    if (!Array.isArray(obj) || obj.length === 0) return '(空)';
    return obj.join(',');
  },

  isSuccessor(obj) {
    return obj.length > 0 && obj[obj.length - 1] === 1;
  },

  generateLimit(k) {
    const seq = [];
    for (let i = 1; i <= k; i++) seq.push(i);
    return seq;
  },

  expand(obj, n) {
    if (!Array.isArray(obj) || obj.length === 0) return null;
    const last = obj[obj.length - 1];
    if (last === 1) return null;
    let badRootIdx = -1;
    for (let i = obj.length - 2; i >= 0; i--) {
      if (obj[i] < last) { badRootIdx = i; break; }
    }
    if (badRootIdx === -1) return null;
    const G = obj.slice(0, badRootIdx);
    const B = obj.slice(badRootIdx, -1);
    const result = [...G];
    for (let i = 0; i < n; i++) result.push(...B);
    return result;
  },

  compare(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    if (a.length < b.length) return -1;
    if (a.length > b.length) return 1;
    return 0;
  },
};
`;

/** 面板顶部的接口说明（不参与求值）。 */
export const NOTATION_HINT =
  '两种接口任选其一：① 经典 6 方法 {parse, format, isSuccessor, generateLimit, expand, compare}' +
  '（模板就是这份，参考版同款）；② ne 定义 {display, is_limit, compare, FS, init}。' +
  '也可写成 `const Notation = {…}` 或用 export default 导出（导入时会自动剥壳）。' +
  '⚠ FS/expand 的第 n 项必须随 n 增长，否则引擎会一直试展开（有 5 秒上限兜底，见设置 time_limit）。' +
  '保存后出现在 /list 的「自定义记号」文件夹，展开走 ne 引擎。';

export function NotationEditor(props) {
  const { theme, onClose } = props;
  const [sel, setSel] = React.useState(null); // 编辑中的 id；null = 新建
  const [form, setForm] = React.useState(() => ({ id: '', name: '', simple_name: '', source: NOTATION_TEMPLATE }));
  const [msg, setMsg] = React.useState(null);
  const [, bump] = React.useState(0);
  const fileRef = React.useRef(null);
  const refresh = () => bump((n) => n + 1);

  const list = list_user_notations();
  const isNew = sel == null;

  const inputStyle = {
    width: "100%",
    background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 3,
    padding: "5px 8px",
    fontFamily: "inherit",
    fontSize: 14,
    boxSizing: "border-box",
  };
  const btn = (extra) => ({
    background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    ...(extra || {}),
  });

  const doSave = () => {
    // id 允许空：JS 里写了 id 就用它，都没写就自动分配 user1、user2……
    // （用户点「新建」后什么都不填直接保存，不该被拦下来）
    const id = form.id.trim();
    // 同 id 覆盖 / 改过 id：都先注销旧定义，避免留下孤儿
    if (sel != null) remove_user_notation(sel !== id ? sel : id);
    const res = add_user_notation(form.source, {
      id: id || undefined,
      name: form.name.trim() || undefined,
      simple_name: form.simple_name.trim() || undefined,
    });
    if (!res.ok) { setMsg({ kind: 'err', text: '✗ ' + res.error }); return; }
    setSel(res.id);
    setForm((f) => ({ ...f, id: res.id }));
    setMsg({
      kind: 'ok',
      text: `✓ 已保存 ${res.id}（${res.kind === 'classic' ? '经典 6 方法接口' : 'ne 定义'}）` +
        (res.generated_id ? '——未填 id，已自动分配默认名' : '') +
        '。关掉本窗口后用 /list 查看，或直接输入它的名字建树。',
    });
    refresh();
  };

  /** 导入 .js：规整外壳 → 填进编辑器 → 尽量自动补 id / 显示名（不直接注册，留一步复核）。 */
  const doImportFile = async (file) => {
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch (e) {
      setMsg({ kind: 'err', text: `✗ 读文件失败：${e.message}` });
      return;
    }
    const r = normalize_source(text);
    if (!r.ok) { setMsg({ kind: 'err', text: '✗ ' + r.error }); return; }
    // 源码里没有 id 时，用文件名兜底（CTN2.ne-rewritten.js → CTN2）：省得用户再想一个
    const fromName = String(file.name || '')
      .replace(/\.(ne-rewritten|ner|notation)?\.?(js|mjs|txt)$/i, '')
      .replace(/[^\w\u4e00-\u9fa5.-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const id = r.id || fromName || '';
    setSel(null); // 导入视为新建
    setForm({
      id,
      name: r.name || fromName || '',
      simple_name: '',
      source: r.source,
    });
    setMsg({
      kind: 'ok',
      text: `✓ 已载入 ${file.name}` + (r.note ? `（${r.note}）` : '') + '。' +
        (r.id
          ? `识别到 id「${r.id}」；`
          : id
            ? `源码里没写 id，按文件名填了「${id}」；`
            : '没识别到 id，保存时会自动分配默认名；') +
        '确认无误后点「保存」注册。',
    });
  };

  const doDelete = () => {
    const res = remove_user_notation(sel);
    setMsg(res.ok ? { kind: 'ok', text: `✓ 已删除 ${sel}` } : { kind: 'err', text: '✗ ' + res.error });
    setSel(null);
    setForm({ id: '', name: '', simple_name: '', source: NOTATION_TEMPLATE });
    refresh();
  };

  const sideItem = (u) => React.createElement("button", {
    key: u.id,
    onClick: () => {
      setSel(u.id);
      setForm({
        id: u.id,
        name: u.name || '',
        simple_name: u.simple_name || '',
        source: get_user_source(u.id) || NOTATION_TEMPLATE,
      });
      setMsg(null);
    },
    title: u.id,
    style: {
      display: "block",
      width: "100%",
      textAlign: "left",
      background: sel === u.id ? theme.accent : "transparent",
      color: sel === u.id ? theme.bg : theme.fg,
      border: `1px solid ${sel === u.id ? theme.accent : theme.border}`,
      borderRadius: 3,
      padding: "4px 8px",
      marginBottom: 4,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  }, u.simple_name || u.name || u.id);

  return React.createElement("div", {
    style: {
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    onClick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); },
    onKeyDown: (e) => {
      // 弹窗里 Esc 关窗，别让外层容器上的导航快捷键接手
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (onClose) onClose();
      }
    },
  },
    React.createElement("div", {
      style: {
        background: theme.bg,
        color: theme.fg,
        padding: 20,
        borderRadius: 8,
        width: "min(920px, 94vw)",
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${theme.border}`,
        boxSizing: "border-box",
      },
    },
      React.createElement("h2", { style: { margin: "0 0 6px", fontSize: 20 } }, "自定义记号"),
      React.createElement("div", { style: { color: theme.fgDim, fontSize: 12, marginBottom: 10, lineHeight: 1.5 } },
        NOTATION_HINT + ' 也可「导入 .js」直接把文件读进来（会尽量自动识别 id / 显示名）。'),
      React.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap", minHeight: 0, flex: 1 } },
        // —— 左：已有记号 ——
        React.createElement("div", { style: { width: 190, minWidth: 150, flexShrink: 0 } },
          React.createElement("div", { style: { color: theme.fgDim, fontSize: 12, marginBottom: 6 } },
            `已注册 ${list.length} 个（存本地，刷新后自动载入）`),
          React.createElement("div", { style: { maxHeight: "52vh", overflowY: "auto" } }, ...list.map(sideItem)),
          React.createElement("button", {
            onClick: () => {
              setSel(null);
              setForm({ id: '', name: '', simple_name: '', source: NOTATION_TEMPLATE });
              setMsg(null);
            },
            title: '新建一个记号（右边填 id / 改 JS）',
            style: btn({
              width: "100%",
              marginTop: 6,
              textAlign: "left",
              // 「新建中」时高亮 —— 与左侧已选项同一套选中样式，
              // 否则点了新建看不出当前处于哪个状态（用户反馈）
              background: isNew ? theme.accent : theme.inputBg,
              color: isNew ? theme.bg : theme.fg,
              border: `1px solid ${isNew ? theme.accent : theme.border}`,
              fontWeight: isNew ? 600 : 400,
            }),
          }, "＋ 新建记号")
        ),
        // —— 右：编辑区 ——
        React.createElement("div", { style: { flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 8 } },
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            React.createElement("div", { style: { flex: "1 1 140px" } },
              React.createElement("div", { style: { color: theme.fgDim, fontSize: 12, marginBottom: 3 } }, "id（输入用的名字，别与已有重名）"),
              React.createElement("input", {
                value: form.id,
                onChange: (e) => setForm((f) => ({ ...f, id: e.target.value })),
                placeholder: "例如 myNotation",
                spellCheck: false,
                style: { ...inputStyle, fontFamily: "ui-monospace, Menlo, Consolas, monospace" },
              })
            ),
            React.createElement("div", { style: { flex: "1 1 140px" } },
              React.createElement("div", { style: { color: theme.fgDim, fontSize: 12, marginBottom: 3 } }, "显示名（可空）"),
              React.createElement("input", {
                value: form.name,
                onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })),
                placeholder: "例如 我的记号",
                style: inputStyle,
              })
            ),
            React.createElement("div", { style: { flex: "0 1 110px" } },
              React.createElement("div", { style: { color: theme.fgDim, fontSize: 12, marginBottom: 3 } }, "短名（可空）"),
              React.createElement("input", {
                value: form.simple_name,
                onChange: (e) => setForm((f) => ({ ...f, simple_name: e.target.value })),
                placeholder: "myN",
                style: inputStyle,
              })
            )
          ),
          React.createElement("textarea", {
            value: form.source,
            onChange: (e) => setForm((f) => ({ ...f, source: e.target.value })),
            spellCheck: false,
            rows: 16,
            style: {
              ...inputStyle,
              minHeight: 220,
              flex: 1,
              resize: "vertical",
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: "pre",
              overflow: "auto",
            },
          }),
          msg && React.createElement("div", {
            style: {
              fontSize: 13,
              color: msg.kind === 'ok' ? theme.fg : theme.error,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            },
          }, msg.text),
          React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
            React.createElement("button", { onClick: doSave, style: btn({ background: theme.accent, color: theme.bg, border: "none" }) }, "保存"),
            React.createElement("button", {
              onClick: () => { if (fileRef.current) fileRef.current.click(); },
              title: '导入一份记号 JS（对象、工厂函数，或带 export default / export const 的模块文件）',
              style: btn({}),
            }, "导入 .js"),
            // 隐藏的文件选择框：导入走它，读文件后填进编辑器（不直接注册，留一步复核）
            React.createElement("input", {
              type: "file",
              accept: ".js,.mjs,.txt",
              ref: fileRef,
              style: { display: "none" },
              onChange: (e) => {
                const f = e.target.files && e.target.files[0];
                // 清空 value：同一个文件再选一次也要能触发 onChange
                Promise.resolve(doImportFile(f)).finally(() => { e.target.value = ''; });
              },
            }),
            sel != null && React.createElement("button", { onClick: doDelete, style: btn({ color: theme.error }) }, "删除"),
            React.createElement("button", {
              onClick: () => { if (onClose) onClose(); },
              style: btn({ marginLeft: "auto" }),
            }, "关闭")
          )
        )
      )
    )
  );
}
