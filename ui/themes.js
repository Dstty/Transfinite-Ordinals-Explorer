// ============================================================================
//  ui/themes.js — 主题配色
// ============================================================================
export const THEMES = {
  dark: {
    name: "Dark",
    bg: "#0e1117",
    fg: "#c8d4e0",
    fgDim: "#8a94a0",
    fgMuted: "#555a60",
    accent: "#6a8ab0",
    accent2: "#4a6a8a",
    border: "#1a1f2b",
    error: "#e05252",
    logColor: "#5a7a5a",
    moreColor: "#5a7a9a",
    highlight: "rgba(106,138,176,0.12)",
    inputBg: "transparent",
    headerBg: "transparent",
    labelColor: "#7a8599",
    settingColor: "#4a5568",
    noteColor: "#64b5f6"
  },
  light: {
    name: "Light",
    bg: "#ffffff",
    fg: "#1a1a2e",
    fgDim: "#555577",
    fgMuted: "#aaaacc",
    accent: "#2255aa",
    accent2: "#4477cc",
    border: "#e0e0ee",
    error: "#cc2222",
    logColor: "#338833",
    moreColor: "#4477aa",
    highlight: "rgba(34,85,170,0.08)",
    inputBg: "transparent",
    headerBg: "#f8f8fc",
    labelColor: "#6666aa",
    settingColor: "#9999bb",
    noteColor: "#2a6bb0"
  },
  paper: {
    name: "Paper",
    bg: "#f5f0e8",
    fg: "#3a3530",
    fgDim: "#7a7568",
    fgMuted: "#b5ae9f",
    accent: "#8a6530",
    accent2: "#a08050",
    border: "#ddd5c5",
    error: "#b83020",
    logColor: "#5a7a45",
    moreColor: "#8a7050",
    highlight: "rgba(138,101,48,0.08)",
    inputBg: "transparent",
    headerBg: "#efe8da",
    labelColor: "#8a7858",
    settingColor: "#b0a890",
    noteColor: "#8a6b40"
  },
  solarizedLight: {
    name: "Sol. Light",
    bg: "#fdf6e3",
    fg: "#657b83",
    fgDim: "#93a1a1",
    fgMuted: "#ccc8b0",
    accent: "#268bd2",
    accent2: "#2aa198",
    border: "#eee8d5",
    error: "#dc322f",
    logColor: "#859900",
    moreColor: "#6c71c4",
    highlight: "rgba(38,139,210,0.08)",
    inputBg: "transparent",
    headerBg: "#eee8d5",
    labelColor: "#b58900",
    settingColor: "#93a1a1",
    noteColor: "#268bd2"
  },
  solarizedDark: {
    name: "Sol. Dark",
    bg: "#002b36",
    fg: "#839496",
    fgDim: "#586e75",
    fgMuted: "#073642",
    accent: "#268bd2",
    accent2: "#2aa198",
    border: "#073642",
    error: "#dc322f",
    logColor: "#859900",
    moreColor: "#6c71c4",
    highlight: "rgba(38,139,210,0.12)",
    inputBg: "transparent",
    headerBg: "#073642",
    labelColor: "#b58900",
    settingColor: "#586e75",
    noteColor: "#268bd2"
  }
};

// ============================================================================
//  树形绘制符号常量
// ============================================================================
export const GUTTER = "│ ";
export const BRANCH = "├ ";
export const LAST_B = "└ ";
export const EMPTY = "  ";
