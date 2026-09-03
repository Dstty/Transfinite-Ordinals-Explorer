// ============================================================================
//  ui/commandParser.js — 命令解析
// ============================================================================
//  任何输入都是指令。命令可带可选前导 '/'，也可不带（两种写法等价）：
//    help / /help · list / /list · clear / /clear
//    tree / /tree · draw / /draw · save 3 / /save 3 · set tier=0 / /set tier=0
//  draw 的旧名 mountain 仍可用（别名）；裸输入（没有命令词，如 "PrSS 0,1,2"）
//  是 tree 命令的缩写：调用方收到 'unknown' 时按 tree 处理（见 ui/app.js 的 handleSubmit）。
//  命令词不区分大小写。
// ============================================================================

export function parseCommand(input) {
  const trimmed = input.trim();
  // 可选前导 '/'
  const body = trimmed.startsWith('/') ? trimmed.slice(1).trim() : trimmed;
  const parts = body.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === 'clear' || cmd === 'list' || cmd === 'help') {
    return { command: cmd };
  }

  if (cmd === 'save') {
    // 语法：save [csv|xlsx] [n] [True|False]
    //   True  连没有注释的行一起导出
    //   False 只导出有注释的行（默认）
    let format = 'csv';
    let num;
    let includeNoNote = false;
    for (const p of parts.slice(1)) {
      if (/^\d+$/.test(p)) num = parseInt(p, 10);
      else {
        const lc = p.toLowerCase();
        if (lc === 'xlsx' || lc === 'xls') format = 'xlsx';
        else if (lc === 'csv') format = 'csv';
        else if (lc === 'true' || lc === 'yes' || lc === '1') includeNoNote = true;
        else if (lc === 'false' || lc === 'no' || lc === '0') includeNoNote = false;
      }
    }
    return { command: 'save', num, format, includeNoNote };
  }

  if (cmd === 'import') {
    // 语法：import            —— 用最后一棵树的记号解析导入文件
    //       import <记号名>   —— 用指定记号解析导入文件（如 import bm4）
    return { command: 'import', arg: parts.slice(1).join(' ') };
  }

  if (cmd === 'set') {
    const rest = parts.slice(1).join(' ');
    const eqMatch = rest.match(/^(\w+)\s*=\s*(.+)$/);
    if (eqMatch) {
      return { command: 'set', key: eqMatch[1].toLowerCase(), value: eqMatch[2].trim() };
    }
    const spaceMatch = rest.match(/^(\w+)\s+(.+)$/);
    if (spaceMatch) {
      return { command: 'set', key: spaceMatch[1].toLowerCase(), value: spaceMatch[2].trim() };
    }
    return { command: 'set', key: rest.toLowerCase(), value: '' };
  }

  if (cmd === 'convert') {
    // 语法：convert <源记号> <表达式> to <目标记号>
    // 例：  convert bm4 (0,0)(1,1,1) to 0y
    //       convert 0y 0,1,2 to bm4
    const toIdx = parts.findIndex((p) => p.toLowerCase() === 'to');
    if (toIdx > 1 && toIdx < parts.length - 1) {
      return {
        command: 'convert',
        fromName: parts[1],
        exprStr: parts.slice(2, toIdx).join(' '),
        toName: parts.slice(toIdx + 1).join(' '),
      };
    }
    return { command: 'convert', error: '用法: convert <源记号> <表达式> to <目标记号>' };
  }

  if (cmd === 'tree') {
    // 语法：tree <记号名> <表达式>（或 tree <记号名> / tree limit <记号名> 用示例建树）
    // 例：  tree PrSS 0,1,2 · tree DEN · tree limit DEN
    return { command: 'tree', arg: parts.slice(1).join(' ') };
  }

  if (cmd === 'draw' || cmd === 'mountain') {
    // 语法：draw <Y序列> [显示模式]     —— Y 序列山脉图（mountain 旧名仍可用）
    //       draw iblp <IBLP表达式>      —— IBLP（DEN2）图案
    // 例：  draw 1,2,4,8 · draw 1,2,4,8 DBMS · draw iblp (1,0)1(2,1,0)1
    return { command: 'draw', arg: parts.slice(1).join(' ') };
  }

  return { command: 'unknown', raw: trimmed };
}
