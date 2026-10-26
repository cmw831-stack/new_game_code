// 把 Vite 产物内联成一个 HTML 片段，发布为 Claude 私有网页（Artifact）。
// 发布时平台会补上 doctype、head 与 body，所以这里只保留 title、meta、link、style 与 script。
// 用法：npm run artifact

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT_DIR = 'dist-artifact';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

const keep: string[] = [];
let script = '';
let style = '';
for (const tag of head.match(/<(title|meta|link|script)\b[^>]*>(?:[^<]*<\/title>)?/g) ?? []) {
  if (tag.startsWith('<meta charset') || tag.startsWith('<meta name="viewport"')) continue;
  const src = tag.match(/src="\.\/([^"]+)"/)?.[1];
  const href = tag.match(/href="\.\/([^"]+)"/)?.[1];
  if (tag.startsWith('<script') && src) script += readFileSync(join(DIST, src), 'utf8');
  else if (tag.startsWith('<link') && href && href.endsWith('.css')) style += readFileSync(join(DIST, href), 'utf8');
  else if (!tag.startsWith('<script')) keep.push(tag);
}

const safeScript = script.replace(/<\/script/gi, '<\/script');
const out = [
  ...keep,
  `<style>${style}</style>`,
  body.replace(/<script[^>]*><\/script>/g, '').trim(),
  `<script type="module">${safeScript}</script>`,
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'wulin-lab.html'), out, 'utf8');
console.log(`wrote ${OUT_DIR}/wulin-lab.html (${Math.round(out.length / 1024)} KB)`);
