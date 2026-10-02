// ============================================================================
//  ui/TreeSettings.js — 单棵树的设置弹窗（树标题行右侧 ⚙️ 打开）
// ============================================================================
//  用户要求：每棵树上插一个设置按钮，里面能
//    ① 跳转到某个位置（像参考版那样输入目标表达式的显示文本，自动找到并定位）
//    ② 调整这棵树的显示方式（视图切换 / 是否把等价显示一并显示出来）
//    ③ 调整交互风格：这棵树更像「本工具」的 UI 还是更像参考版（ner）
//    ④ 调整上下键时屏幕是否跟随（不跟 / 仅到边界 / 始终，并可选中上·中间·顶部）
//
//  抽成独立组件：app.js 已经很长，而且这样能用桩 React 直接渲染验证
//  （见 .tmp-ne/verify-treesettings.mjs）。
//
//  props:
//    theme, notationName, notationId
//    views: [{ id, label }]            可用显示视图（含原生）
//    currentViewId
//    cfg: { style, scrollFollow, showAllViews }
//    onChange(patch)                   改配置（立即生效）
//    onSetView(id)
//    onJump(text) => Promise<{ok, message}>   执行跳转（由 app.js 负责搜索 + 重放 + 定位）
//    onClose()
// ============================================================================
import { SCROLL_MODES, SCROLL_MODE_LABELS } from './scrollFollow.js';
export const DEFAULT_TREE_CFG = { style: 'mine', scrollFollow: 'edge', showAllViews: false, compareView: null };
/**
 * 样式三档：**外观与键盘配套**（用户要求：树样式和交互风格要配套），各自照源码来。
 * 每档的说明同时写清「长什么样」与「键盘什么键位」，不让用户猜。
 */
export const STYLE_NOTES = {
  mine:
    '【外观】树线 ├─└─ + 文本按钮 [+] / [-] / [✎]；注释显示在行尾（按 n 或点 [✎] 编辑）\n' +
    '【键盘】全套：方向键 / j k h l / , 回父 / Enter 展开一层 / 0-9 选 FS 项 / n / + 加载更多 / Esc',
  selfne:
    '【外观】卡片：左侧 5px 色条（极限 / 后继 / 展不动）+ ⟨ 折叠 + ➕ 展开（展不动时禁用）；' +
    '缩进用 marginLeft；行尾常驻注释框\n' +
    '【键盘】自助版 NE-4.8.1 树上基本只有鼠标（键盘只有 Esc 关弹窗、以及「展开到」框里的 Enter）' +
    '→ 本档除 Esc 外一律不抢占',
  ner:
    '【外观】ne-rewritten：无卡片；缩进树线 + ▾/▸ 折叠三角（无子节点时空占位）+ 点表达式本身展开；' +
    '注释框在**行首**（宽度可调）\n' +
    '【键盘】ne-rewritten：↑↓ 移动 · Enter 单次展开 · Shift+Enter 一层展开 · Ctrl+H 折叠/展开子项 · Esc' +
    '（它没有 j k h l / 0-9 / n / +-，故这些键不抢占）',
};
/** 三档的按钮文案（与 STYLE_NOTES 的键一一对应）。 */
export const STYLE_LABELS = {
  mine: '序数探索器',
  selfne: '自助版 NE',
  ner: 'ne-rewritten',
};
export function TreeSettings(props) {
  const {
    theme, notationName, notationId, views, currentViewId, cfg, onChange, onSetView,
    onJump, onExport, onImport, maxFindFs, onSetMaxFindFs, noteWidth, onSetNoteWidth, onClose,
  } = props;
  const c = { ...DEFAULT_TREE_CFG, ...(cfg || {}) };
  const [target, setTarget] = React.useState('');
  const [fsIndex, setFsIndex] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const box = {
    background: theme.bg,
    color: theme.fg,
    padding: 20,
    borderRadius: 8,
    width: 'min(760px, 94vw)',
    maxHeight: '88vh',
    overflowY: 'auto',
    border: `1px solid ${theme.border}`,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };
  const input = {
    background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 3,
    padding: '5px 8px',
    fontFamily: 'inherit',
    fontSize: 14,
    boxSizing: 'border-box',
  };
  const btn = (extra) => ({
    background: theme.inputBg,
    color: theme.fg,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '5px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    textAlign: 'left',
    ...(extra || {}),
  });
  const chip = (active) => ({
    background: active ? theme.accent : 'transparent',
    color: active ? theme.bg : theme.fg,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    borderRadius: 3,
    padding: '2px 9px',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });
  // 只要标题和控件：说明小字（字符串参数）与标题里的括号一律不显示（用户要求）。
  // 注意 section 用可变参数：调用处可能把控件放在第三、第四个参数上（如「显示方式」里的
  // 「等价显示」按钮），所以必须保留「元素」，只丢掉「字符串」。
  const cleanTitle = (t) => String(t).replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
  const section = (title, ...children) =>
    React.createElement('div', { style: { borderTop: `1px solid ${theme.border}`, paddingTop: 10 } },
      React.createElement('div', { style: { fontSize: 13, color: theme.fgDim, marginBottom: 6 } }, cleanTitle(title)),
      ...children.filter((c) => c != null && typeof c !== 'string'),
    );
  /**
   * 跳转（只作用于这一棵树）。mode='nav' = 反解析 + 按序导航（同 ne-rewritten）；
   * mode='search' = 直接用枚举搜索兜底（记号没有 from_display 时用）。
   */
  const doJump = async (mode) => {
    if (!onJump || busy) return;
    const t = target.trim();
    if (!t) { setMsg({ kind: 'err', text: '请先填目标表达式（如 (0)(1,1,1)(2,1)(1,1,1)）' }); return; }
    setBusy(true);
    setMsg({ kind: 'info', text: `处理「${t}」中…（优先反解析，必要时才搜索）` });
    await new Promise((r) => setTimeout(r, 0)); // 先让「处理中…」画出来
    let res;
    try {
      res = await onJump(t, Number(fsIndex) || 0, mode || 'nav');
    } catch (e) {
      res = { ok: false, message: '跳转出错：' + (e && e.message) };
    }
    setBusy(false);
    setMsg({
      kind: res && res.ok ? 'ok' : 'err',
      text: (res && res.ok ? '✓ ' : '✗ ') + ((res && res.message) || '没有结果'),
    });
  };
  return React.createElement('div', {
    style: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    onClick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); },
    onKeyDown: (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (onClose) onClose(); }
      const role = e.target && e.target.dataset && e.target.dataset.role;
      if (e.key === 'Enter' && (role === 'jump-input' || role === 'jump-fs')) { e.stopPropagation(); doJump(); }
    },
  },
    React.createElement('div', { style: box },
      React.createElement('h2', { style: { margin: 0, fontSize: 20 } },
        `树设置 · ${notationName || notationId || ''}`),

      // ① 跳转（只作用于这一棵树；照 ne-rewritten：优先 from_display 反解析，带一个 FS 序号）
      section('跳转到位置（只作用于这一棵树）',
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          React.createElement('input', {
            value: target,
            'data-role': 'jump-input',
            onChange: (e) => setTarget(e.target.value),
            placeholder: '例如 (0)(1,1,1)(2,1)(1,1,1)',
            spellCheck: false,
            style: { ...input, flex: '1 1 220px' },
          }),
          React.createElement('input', {
            type: 'number',
            value: fsIndex,
            min: 0,
            'data-role': 'jump-fs',
            onChange: (e) => setFsIndex(e.target.value),
            placeholder: 'FS 序号',
            title: '可选：取该表达式第 n 个基本列项（ne-rewritten 的 ExpandDialog 是这么用的）',
            style: { ...input, width: 110 },
          }),
          React.createElement('button', {
            onClick: () => doJump('nav'),
            disabled: busy,
            style: btn({ background: theme.accent, color: theme.bg, border: 'none' }),
          }, busy ? '处理中…' : '跳转'),
          React.createElement('button', {
            onClick: () => doJump('search'),
            disabled: busy,
            title: '记号没有 from_display（不能反解析）时的兜底：枚举搜索（上限 search_ms）',
            style: btn({}),
          }, '搜索兜底'),
        ),
        '用记号的 from_display 把文本**反解析**回表达式 → 在这棵树上按 compare 导航（按需现场展开）→ 命中就滚过去。'
        + '填了 FS 序号 n 则先取它的第 n 个基本列项。反解析不了才用搜索兜底。'
        + (msg ? '' : '')),
      // 跳转结果反馈（独立一行；之前这里只有一个 (msg ? '' : '')，等于没有反馈）
      msg && React.createElement('div', {
        style: {
          fontSize: 12, whiteSpace: 'pre-wrap', marginTop: -4, lineHeight: 1.5,
          color: msg.kind === 'ok' ? theme.accent : (msg.kind === 'err' ? theme.error : theme.fgDim),
        },
      }, msg.text),
      // ①c 展开引擎参数（原先挂在顶部工具条上，现在收进每棵树的设置）
      section('展开引擎',
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: 13 } }, '最大搜索基本列项数'),
          React.createElement('input', {
            type: 'number', min: 1, max: 9999,
            value: maxFindFs === undefined ? 10 : maxFindFs,
            onChange: (e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v) && v >= 1 && v <= 9999 && onSetMaxFindFs) onSetMaxFindFs(v);
            },
            style: { ...input, width: 90 },
          }),
        ),
        '试展开上限：越大越不容易「展不动」，也越慢。'),
      // ①b 导入 / 导出（同样只作用于这一棵树）
      section('导入 / 导出（只作用于这一棵树）',
        React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          React.createElement('button', {
            onClick: () => onExport && onExport('xlsx'),
            style: btn({}),
          }, '导出 xlsx'),
          React.createElement('button', {
            onClick: () => onExport && onExport('csv'),
            style: btn({}),
          }, '导出 csv'),
          React.createElement('button', {
            onClick: () => onImport && onImport(),
            style: btn({}),
          }, '导入到新树…'),
        ),
        '导出这棵树；导入用该记号的 parse 建新树。'),
      // ② 样式：**外观 + 键盘配套**（合成一档，用户要求两者配套）
      section('样式（外观与键盘配套，只作用于这一棵树）',
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          ['mine', 'selfne', 'ner'].map((k) => React.createElement('button', {
            key: k,
            onClick: () => onChange({ style: k }),
            style: chip(c.style === k),
          }, STYLE_LABELS[k])))),
      // ③ 显示方式（视图切换 + 等价显示全显）
      section('显示方式',
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
          (views || []).map((v) => React.createElement('button', {
            key: v.id === undefined ? 'native' : String(v.id),
            onClick: () => onSetView && onSetView(v.id),
            disabled: v.id === currentViewId,
            title: `把整棵树显示为 ${v.label}（展开树不变，仅翻译文本）`,
            style: chip(v.id === currentViewId),
          }, v.label))),
        // 对比视图：勾选后主位置显示当前视图、注释位置显示所选视图（再点一次取消）
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
          React.createElement('span', { style: { fontSize: 12, color: theme.fgDim } }, '在注释位对比：'),
          React.createElement('button', {
            onClick: () => onChange({ compareView: null }),
            title: '关闭对比，注释位置恢复为空',
            style: chip(!c.compareView),
          }, '关闭对比'),
          (views || []).map((v) => {
            const vid = v.id === undefined ? 'native' : String(v.id);
            const active = (c.compareView || null) === (v.id === undefined ? null : String(v.id));
            return React.createElement('button', {
              key: vid,
              onClick: () => onChange({ compareView: active ? null : (v.id === undefined ? null : String(v.id)) }),
              title: '主位置保持当前视图，注释位置显示这一种；再点一次取消',
              style: chip(active),
            }, v.label);
          })),
        ),
      // ④ 滚动跟随
      section('按上下键时屏幕是否跟随',
        React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          SCROLL_MODES.map((m) => React.createElement('button', {
            key: m,
            onClick: () => onChange({ scrollFollow: m }),
            style: chip(c.scrollFollow === m),
          }, SCROLL_MODE_LABELS[m]))),
        '「仅到边界才跟随」按到视口边缘时才滚动；「始终跟随」会把当前节点固定在中上/中间/顶部。'),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
        React.createElement('button', { onClick: () => { if (onClose) onClose(); }, style: btn({}) }, '关闭')),
    )
  );
}