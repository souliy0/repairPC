import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distGasDir = path.join(rootDir, 'dist-gas');
const appsScriptDir = path.join(rootDir, 'apps-script');
const publicAppsScriptDir = path.join(rootDir, 'public', 'apps-script');

console.log('Building single-file IIFE bundle for Google Apps Script...');
execSync('npx vite build --config vite.config.gas.ts', {
  stdio: 'inherit',
  cwd: rootDir,
});

const jsPath = path.join(distGasDir, 'repaircom.iife.js');
if (!fs.existsSync(jsPath)) {
  throw new Error('Missing built JS file at dist-gas/repaircom.iife.js');
}

const cssCandidates = fs
  .readdirSync(distGasDir)
  .filter((f) => f.endsWith('.css'));

const cssContent = cssCandidates
  .map((f) => fs.readFileSync(path.join(distGasDir, f), 'utf8'))
  .join('\n')
  .replace(/<\/style/gi, '<\\/style');

const jsContent = fs
  .readFileSync(jsPath, 'utf8')
  .replace(/<\/script/gi, '<\\/script');

const htmlOutput = `<!doctype html>
<html lang="lo">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RepairCom — ລະບົບບັນທຶກການສ້ອມແປງຄອມພິວເຕີ</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Lao:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
${cssContent}
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
    <div id="root"></div>
    <script>
${jsContent}
    </script>
  </body>
</html>
`;

fs.mkdirSync(appsScriptDir, { recursive: true });
fs.mkdirSync(publicAppsScriptDir, { recursive: true });

const indexTarget = path.join(appsScriptDir, 'Index.html');
fs.writeFileSync(indexTarget, htmlOutput, 'utf8');
fs.copyFileSync(indexTarget, path.join(publicAppsScriptDir, 'Index.html'));

for (const fileName of ['Code.gs', 'appsscript.json']) {
  const srcFile = path.join(appsScriptDir, fileName);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(publicAppsScriptDir, fileName));
  }
}

fs.rmSync(distGasDir, { recursive: true, force: true });

const sizeKb = Math.round(Buffer.byteLength(htmlOutput, 'utf8') / 1024);
console.log(`Generated apps-script/Index.html (${sizeKb} KB) and synced public/apps-script/`);
