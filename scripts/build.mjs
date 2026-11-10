import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = join(root, 'dist');
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(join(root, 'core/notation-manifest.js'), 'utf8'), context);
const manifest = context.window.NOTATION_MANIFEST;

// Classic scripts share global helpers: concatenate in dependency order before bundling.
const pending = manifest.filter(item => !item.module);
const ordered = [];
const done = new Set();
while (pending.length) {
  const index = pending.findIndex(item => (item.dependsOn || []).every(dep => done.has(dep)));
  if (index < 0) throw new Error('Unresolved classic notation dependencies');
  const [item] = pending.splice(index, 1);
  ordered.push(item);
  done.add(item.file);
}
const classicSource = (await Promise.all(ordered.map(async item =>
  `\n// ${item.file}\n${await readFile(join(root, item.file), 'utf8')}\n;`
))).join('\n');
const modules = manifest.filter(item => item.module);
const entry = [
  "import './scripts/production-runtime.js';",
  "import 'classic-notations';",
  ...modules.filter(item => item.bootstrap).map(item => `import './${item.file}';`),
  ...modules.filter(item => !item.bootstrap).map(item => `import './${item.file}';`),
  "import './ui/app.js';",
].join('\n');

await mkdir(outdir, { recursive: true });
const result = await build({
  absWorkingDir: root,
  stdin: { contents: entry, resolveDir: root, sourcefile: 'production-entry.js' },
  bundle: true,
  minify: true,
  treeShaking: false, // Registration side effects must all run, including legacy fallbacks.
  format: 'iife',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  outdir,
  entryNames: 'assets/app-[hash]',
  metafile: true,
  legalComments: 'linked',
  plugins: [{
    name: 'classic-notations',
    setup(plugin) {
      plugin.onResolve({ filter: /^classic-notations$/ }, () => ({ path: 'classic-notations', namespace: 'classic' }));
      plugin.onLoad({ filter: /.*/, namespace: 'classic' }, () => ({ contents: classicSource, loader: 'js' }));
    },
  }],
});
const output = Object.keys(result.metafile.outputs).find(file => file.endsWith('.js'));
if (!output) throw new Error('Missing application bundle');
let html = await readFile(join(root, 'index.html'), 'utf8');
html = html.replace(/    <!-- React CDN[^]*?<\/script>\s*<script[^]*?<\/script>\s*/, '');
html = html.replace(/    <!--\s*记号文件清单[^]*?<script src="core\/loader.js"><\/script>/,
  `    <script defer src="${output.replace(/^dist\//, '')}"></script>`);
if (html.includes('core/loader.js') || html.includes('cdnjs.cloudflare.com')) {
  throw new Error('Production HTML still references source loader or external React');
}
await writeFile(join(outdir, 'index.html'), html, 'utf8');
await copyFile(join(root, 'favicon.svg'), join(outdir, 'favicon.svg'));
await writeFile(join(outdir, '.nojekyll'), '');
await mkdir(join(outdir, 'assets'), { recursive: true });
await copyFile(join(root, 'node_modules/@fontsource/jetbrains-mono/LICENSE'), join(outdir, 'assets/JetBrains-Mono-LICENSE.txt'));
await copyFile(join(root, 'assets/launcher-icon.png'), join(outdir, 'assets/launcher-icon.png'));
const fontCSS = [];
for (const weight of [400, 500, 700]) {
  const name = `jetbrains-mono-latin-${weight}-normal.woff2`;
  await copyFile(join(root, 'node_modules/@fontsource/jetbrains-mono/files', name), join(outdir, 'assets', name));
  fontCSS.push(`@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:${weight};font-display:swap;src:url('./${name}') format('woff2')}`);
}
await writeFile(join(outdir, 'assets/fonts.css'), fontCSS.join('\n'), 'utf8');
console.log(`Built ${manifest.length} notation entries into ${output}`);
console.log(`Application JavaScript: ${result.metafile.outputs[output].bytes} bytes (before HTTP compression)`);
