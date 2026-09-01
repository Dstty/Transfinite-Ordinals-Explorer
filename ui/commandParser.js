// ============================================================================
//  ui/commandParser.js — 命令解析
// ============================================================================
//  命令可带可选前导 '/'，也可不带（两种写法等价）：
//    help / /help · list / /list · clear / /clear
//    save 3 / /save 3 · set tier=0 / /set tier=0
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
    if (parts.length > 1 && /^\d+$/.test(parts[1])) {
      return { command: 'save', num: parseInt(parts[1], 10) };
    }
    return { command: 'save' };
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

  return { command: 'unknown', raw: trimmed };
}
