// ============================================================================
//  ui/MountainView.js — 图案渲染组件（移植自 ne-rewritten DiagramViewer）
// ============================================================================
//  2026-09-01 曾按用户要求移除 UI 接入；2026-09-02 起通过独立指令
//  `draw <Y序列> [模式]`（山脉图）与 `draw iblp <IBLP表达式>`（IBLP 图案）启用
//  （见 ui/app.js 的 handleDrawCommand），不与树标题视图按钮并列。
// ============================================================================
//  消费通用 Diagram（core/mountainDiagram.js / core/iblpPattern.js 产出）：
//    - Canvas 2D 画 elements（line / circle / text）
//    - extra_text 用绝对定位的 HTML span 叠放（display_html 支持 ω<sup> 等）
//  ColorSpec 中的 {type:'text'} / {type:'gray'} 映射到当前主题色。
//  注意：零构建环境无打包器，不能用 `import React from 'react'`，
//  必须与 ui/app.js 一致用 `const React = window.React`。
// ============================================================================
const React = window.React;

// ColorSpec → CSS 颜色字符串
//   {type:'text'} → 前景；{type:'gray'} → 弱前景；{type:'background'} → 背景；
//   {type:'red'} → 主题错误色（IBLP 步长索引标记用）
function colorCss(spec, theme) {
  if (!spec) return theme.fg;
  if ('color' in spec) {
    const c = spec.color;
    return `rgba(${c.r},${c.g},${c.b},${c.a ?? 1})`;
  }
  if (spec.type === 'gray') return theme.fgMuted;
  if (spec.type === 'background') return theme.bg;
  if (spec.type === 'red') return theme.error;
  return theme.fg; // 'text' 及其余
}

/**
 * MountainView — 渲染一棵记号树的单表达式山脉图。
 * @param {object} props
 *   diagram  Diagram 数据（core/mountainDiagram.js / core/iblpPattern.js 产出；
 *            undefined 时显示占位）
 *   theme    主题
 *   scale    缩放系数（默认 1）。Canvas 用 ctx.scale 整体缩放；
 *            extra_text span 的坐标/字号按比例缩放。
 */
export function MountainView(props) {
  const { diagram, theme, scale = 1 } = props;
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !diagram) return;
    if (diagram.width === 0 && diagram.height === 0) return;
    cvs.width = Math.max(1, Math.round(diagram.width * scale));
    cvs.height = Math.max(1, Math.round(diagram.height * scale));
    const ctx = cvs.getContext('2d');
    // 先重置变换再清屏，避免上一次缩放残留；随后整体缩放绘制（坐标保持原值）
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, diagram.width, diagram.height);
    ctx.scale(scale, scale);

    for (const el of diagram.elements) {
      if (el.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        if (el.stroke) ctx.strokeStyle = colorCss(el.stroke_color, theme);
        if (el.width) ctx.lineWidth = el.width;
        ctx.stroke();
      } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
        if (el.fill) {
          ctx.fillStyle = colorCss(el.fill_color, theme);
          ctx.fill();
        }
        if (el.stroke) {
          ctx.strokeStyle = colorCss(el.stroke_color, theme);
          ctx.lineWidth = el.width ?? 1;
          ctx.stroke();
        }
      } else if (el.type === 'text') {
        ctx.fillStyle = colorCss(el.fill_color, theme);
        ctx.font = (el.size ?? 14) + 'px monospace';
        ctx.textAlign = el.align ?? 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.text, el.x, el.y);
      }
    }
  }, [diagram, theme, scale]);

  if (!diagram) {
    return React.createElement('div', {
      style: { color: theme.fgMuted, fontSize: 13, padding: '4px 0' },
    }, '（该表达式无法绘制图案）');
  }

  // extra_text 的绝对定位样式（坐标与字号按 scale 缩放）
  const extraStyle = (t) => {
    const style = {
      position: 'absolute',
      left: t.x * scale + 'px',
      top: t.y * scale + 'px',
      fontSize: (t.size ?? 12) * scale + 'px',
      color: colorCss(t.color, theme),
      fontFamily: 'inherit',
      lineHeight: '1',
      whiteSpace: 'pre',
      pointerEvents: 'none',
    };
    if (t.align === 'left') {
      style.transform = 'translate(0,-0.3em)';
    } else if (t.align === 'center') {
      style.transform = 'translate(-50%,-0.3em)';
      style.textAlign = 'center';
    } else if (t.align === 'right') {
      style.transform = 'translate(-100%,-0.3em)';
      style.textAlign = 'right';
    }
    return style;
  };

  return React.createElement('div', {
    style: { position: 'relative', display: 'inline-block', margin: '4px 0' },
  },
    React.createElement('canvas', { ref: canvasRef, style: { display: 'block' } }),
    diagram.extra_text.map((t, i) =>
      React.createElement('span', {
        key: i,
        style: extraStyle(t),
        ...(t.display_html ? { dangerouslySetInnerHTML: { __html: t.text } } : {}),
      }, t.display_html ? undefined : t.text)
    )
  );
}
