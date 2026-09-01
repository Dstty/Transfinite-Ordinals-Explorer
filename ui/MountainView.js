// ============================================================================
//  ui/MountainView.js — 山脉图渲染组件（移植自 ne-rewritten DiagramViewer）
// ============================================================================
//  ⚠ 暂未启用（2026-09-01 用户要求暂时移除 UI 接入；组件保留待后续启用）。
// ============================================================================
//  消费 core/mountainDiagram.js 产出的通用 Diagram：
//    - Canvas 2D 画 elements（line / circle / text）
//    - extra_text 用绝对定位的 HTML span 叠放（display_html 支持 ω<sup> 等）
//  ColorSpec 中的 {type:'text'} / {type:'gray'} 映射到当前主题色。
// ============================================================================
import React from 'react';

// ColorSpec → CSS 颜色字符串
function colorCss(spec, theme) {
  if (!spec) return theme.fg;
  if ('color' in spec) {
    const c = spec.color;
    return `rgba(${c.r},${c.g},${c.b},${c.a ?? 1})`;
  }
  if (spec.type === 'gray') return theme.fgMuted;
  return theme.fg; // 'text' 及其余
}

/**
 * MountainView — 渲染一棵记号树的单表达式山脉图。
 * @param {object} props
 *   diagram  Diagram 数据（core/mountainDiagram.js 产出；undefined 时显示占位）
 *   theme    主题
 */
export function MountainView(props) {
  const { diagram, theme } = props;
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !diagram) return;
    if (diagram.width === 0 && diagram.height === 0) return;
    cvs.width = diagram.width;
    cvs.height = diagram.height;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, diagram.width, diagram.height);

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
  }, [diagram, theme]);

  if (!diagram) {
    return React.createElement('div', {
      style: { color: theme.fgMuted, fontSize: 13, padding: '4px 0' },
    }, '（该表达式无法绘制山脉图）');
  }

  // extra_text 的绝对定位样式
  const extraStyle = (t) => {
    const style = {
      position: 'absolute',
      left: t.x + 'px',
      top: t.y + 'px',
      fontSize: (t.size ?? 12) + 'px',
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
    style: { position: 'relative', display: 'inline-block', margin: '4px 0', maxWidth: '100%', overflowX: 'auto' },
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
