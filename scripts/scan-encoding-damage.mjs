#!/usr/bin/env node
// ============================================================================
//  scan-encoding-damage.mjs — 扫描仓库里「被 PowerShell 默认编码破坏过」的文件
// ============================================================================
//  背景：在只装了 Windows PowerShell 5.1 的机器上，[Text.Encoding]::Default 是 ANSI
//  （本机 GBK/CP936），于是这些常见写法都会静默破坏 UTF-8 源文件：
//    Get-Content -Raw + Set-Content          → 丢字节 + LF 变 CRLF
//    上面再加 -Encoding UTF8                 → 读端仍按 GBK 解码 → 全文乱码 + BOM
//    Get-Content ... > file / git show > f   → 写成 UTF-16LE
//  本脚本用 Node 读（不经 PowerShell），按 UTF-8 解码后找两类痕迹：
//    A. U+FFFD 替换字符（字节序列非法）
//    B. GBK 误解码产生的成对生僻字（如「鈥锛涓绗鏄鑺寰鐨」）
//  只读，不改任何文件。
//
//  用法：node scripts/scan-encoding-damage.mjs [目录] [--all]
//    --all  连同 .tmp-ne / dist 等也扫
// ============================================================================

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const args = process.argv.slice(2);
const all = args.includes('--all');
const weak = args.includes('--weak'); // 弱信号默认不报（易误报）
const rootArg = args.find((a) => !a.startsWith('--'));
const root = resolve(rootArg || process.cwd());

const EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.md', '.html', '.css', '.txt', '.yml', '.yaml', '.ps1', '.py', '.sh']);
const SKIP = new Set(['.git', 'node_modules', 'dist', 'build', 'out', '.next', '.cache'].concat(all ? [] : ['.tmp-ne']));
// GBK 误解码的典型产物（UTF-8 中文被当 GBK 读再以 UTF-8 写回）
const GBK_PAIRS = [0x9225, 0x951b, 0x6d93, 0x7ed7, 0x93c4, 0x947a, 0x5bf0, 0x9428, 0x5a34, 0x924b, 0x83e2, 0x935c, 0x749c, 0x65c3, 0x8bc1, 0x9359, 0x9428, 0x9404, 0x9484, 0x6174].map((c) => String.fromCharCode(c));
const MOJIBAKE = /[\uFFFD]/;

let scanned = 0;
const hits = [];

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP.has(e.name)) continue;
      walk(join(dir, e.name));
      continue;
    }
    if (!EXTS.has(extname(e.name).toLowerCase())) continue;
    const p = join(dir, e.name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.size > 8 * 1024 * 1024) continue;
    scanned++;
    let buf;
    try { buf = readFileSync(p); } catch { continue; }

    const rel = p.replace(/\\/g, '/').replace(root.replace(/\\/g, '/') + '/', '');
    if (rel.endsWith('scan-encoding-damage.mjs')) continue; // 自己文件头注释里举了乱码示例，避免自命中
    const reasons = [];

    // A. 字节层：非法 UTF-8（U+FFFD）或 BOM 异常
    const s = buf.toString('utf8');
    const fffd = (s.match(/\uFFFD/g) || []).length;
    if (fffd) reasons.push(`非法 UTF-8 字节 ×${fffd}`);

    // B. UTF-16 误写（大量 NUL 交错）
    if (buf.length > 8) {
      let nul = 0;
      const step = Math.max(1, Math.floor(buf.length / 4096));
      let n = 0;
      for (let i = 0; i < buf.length; i += step) { if (buf[i] === 0) nul++; n++; }
      if (n && nul / n > 0.3) reasons.push('疑似 UTF-16（大量 NUL）');
    }

    // C. UTF-8 无 BOM 却含 U+FEFF（BOM 被塞到中间 / 重复写）—— 只报开头有 BOM 的情况
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf && !/\.(json)$/i.test(p)) {
      reasons.push('带 UTF-8 BOM（PS 5.1 的 -Encoding UTF8 会写 BOM）');
    }

    // D. GBK 误解码的生僻字对
    const gbkHits = GBK_PAIRS.filter((x) => s.includes(x));
    if (gbkHits.length >= 2) reasons.push(`GBK 误解码痕迹 ×${gbkHits.length}（${gbkHits.slice(0, 5).join('')}）`);

    // E. 中文文件里出现「全角标点后紧跟代码」的吞字特征（弱信号，仅提示）
    // （已移除「疑似吞字节」弱信号：正常中文注释里出现 const/React 就会误报）

    if (reasons.length) hits.push({ rel, reasons, size: st.size });
  }
}

walk(root);

console.log(`扫描根目录：${root}`);
console.log(`文本文件 ${scanned} 个；命中 ${hits.length} 个\n`);
if (!hits.length) {
  console.log('✅ 未发现编码破坏痕迹。');
} else {
  for (const h of hits) {
    console.log(`⚠ ${h.rel}  (${h.size} 字节)`);
    for (const r of h.reasons) console.log(`    · ${r}`);
  }
  console.log('\n说明：A/B 是硬性损坏（必须修）；C 可能是有意保留；D/E 是强/弱信号。');
}

// 顺带报告本机 PowerShell 情况（这是破坏的根因）
console.log('\n本机 PowerShell 情况（用 Node 探测，不启动 PowerShell）：');
for (const c of ['C:/Program Files/PowerShell/7/pwsh.exe', 'C:/Program Files (x86)/PowerShell/7/pwsh.exe']) {
  let ok = false;
  try { ok = statSync(c).isFile(); } catch { ok = false; }
  console.log(`   ${ok ? '✔' : '✘'} ${c}`);
}
console.log('   （若上面都没有 ✔，则 DSH 的 pwsh 工具会回落到 C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe = 5.1，');
console.log('    其 Get-Content/Set-Content/ > 默认使用 ANSI(GBK) / UTF-16，会静默破坏 UTF-8 文件）');
