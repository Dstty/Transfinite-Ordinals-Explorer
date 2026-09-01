// ============================================================================
//  scripts/test-convert.mjs — 记号互译（converters）验证（Node）
// ============================================================================
//  加载全部记号文件后，验证 core/converters.js 的互译：
//    1. bm4 → 0y 转换（BMS 矩阵 → 0-Y 序列显示）
//    2. 0y → bm4 转换（0-Y 序列 → BMS 矩阵显示）
//    3. 往返一致性（0y → bm4 → 0y 显示不变）
//    4. 不存在的转换返回 null；目标列表正确
//  运行：node scripts/test-convert.mjs
// ============================================================================
import vm from 'vm';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => readFileSync(join(root, p), 'utf8');

// 模拟浏览器并加载全部记号（与 list-notation.mjs 相同语义）
global.window = global;
global.register = [];
const run = (p) => vm.runInThisContext(load(p), { filename: p });
run('core/notation-manifest.js');
for (const it of global.NOTATION_MANIFEST) run(it.file);

const { convert, findConverter, listConverterTargets } =
  await import(pathToFileURL(join(root, 'core', 'converters.js')).href);

let pass = 0, fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.error('  ✗ ' + msg); }
};

const bm4 = global.register.find((n) => n.id === 'bm4');
const y0 = global.register.find((n) => n.id === '0y');

// 标准 BMS 例子：(0,0)(1,1,1)(2,1)(1,1,1) 是常用的 EBO 之下序列
const bmsMatrix = [[0, 0], [1, 1, 1], [2, 1], [1, 1, 1]];

console.log('--- 1. 注册表 ---');
check(findConverter('bm4', '0y') !== null, 'bm4 → 0y 转换器存在');
check(findConverter('0y', 'bm4') !== null, '0y → bm4 转换器存在');
check(findConverter('bm4', 'prss') === null, 'bm4 → prss 不存在（返回 null）');
check(JSON.stringify(listConverterTargets('bm4')) === JSON.stringify(['0y']), 'bm4 目标列表 = [0y]');

console.log('--- 2. bm4 → 0y（BMS 矩阵 → 0-Y 序列）---');
const to0y = convert('bm4', bmsMatrix, '0y');
check(to0y !== null, '转换成功');
check(to0y.expr === bmsMatrix, '表达式同构直传（内部都是 BMS 矩阵）');
console.log(`    bm4 ${bm4.display(bmsMatrix)} → 0y ${to0y.display}`);
check(!to0y.display.includes('('), '0-Y 显示不含矩阵括号（是序列形式）');

console.log('--- 3. 0y → bm4（0-Y 序列 → BMS 矩阵）---');
// 用 bm4→0y 的真实输出作为合法 0-Y 序列（0-Y 的底部值是山脉高度，如 1,4,6,4，
// 不是普通 Y 序列的 0,1,2；非法序列 parse 会 throw）
const seqStr = to0y.display;
const seqExpr = y0.parse(seqStr); // 0-Y 序列 → BMS 矩阵
check(y0.display(seqExpr) === seqStr, '0-Y display 往返（序列→矩阵→序列）');
const toBm4 = convert('0y', seqExpr, 'bm4');
check(toBm4 !== null, '转换成功');
console.log(`    0y ${seqStr} → bm4 ${toBm4.display}`);
check(toBm4.display.includes('('), 'BMS 显示含矩阵括号');

console.log('--- 4. 往返一致性（0y → bm4 → 0y）---');
const back = convert('bm4', toBm4.expr, '0y');
check(back !== null && back.display === seqStr, `往返后 0-Y 显示不变（${seqStr}）`);

console.log('--- 5. 无目标记号 / 无 parse ---');
check(convert('bm4', bmsMatrix, 'no-such-id') === null, '目标记号不存在 → null');

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exitCode = fail ? 1 : 0;
