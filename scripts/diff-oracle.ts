// E1 对拍：用固定种子随机生成对局，分别交给本引擎与独立参考实现（oracle/run.py），逐轮比较。
// 用法：
//   node scripts/diff-oracle.ts [条数] [种子]          对拍并写 docs/reports/e1-diff-data.md／.json
//   node scripts/diff-oracle.ts --engine-only [条数]   只跑本引擎，看生成器的分布
// 不一致时只报告，不修改任何一边；裁决见 docs/engine/oracle-io.md 第五节。

import { writeFileSync } from 'node:fs';
import fc from 'fast-check';
import { oracleCase } from '../src/sim/oracle-gen.ts';
import { runEngineCase } from '../src/sim/oracle-io.ts';
import { firstDiff, oracleAll, type Diff } from './e1/oracle-diff.ts';

const args = process.argv.slice(2);
const engineOnly = args[0] === '--engine-only';
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const count = nums[0] ?? 1000;
const seed = nums[1] ?? 20261029;
const cases = fc.sample(oracleCase, { numRuns: count, seed });

if (engineOnly) {
  const tally: Record<string, number> = {};
  let rounds = 0;
  for (const c of cases) {
    const r = runEngineCase(c);
    const k = 'error' in r ? `error: ${r.error.slice(0, 40)}` : (r.rounds.at(-1)?.over ?? 'ongoing');
    tally[k] = (tally[k] ?? 0) + 1;
    if (!('error' in r)) rounds += r.rounds.length;
  }
  console.log(tally, `平均 ${(rounds / cases.length).toFixed(1)} 轮`);
  process.exit(0);
}

const diffs: Diff[] = [];
const crashes: { index: number; crash: string }[] = [];
const oracleResults = oracleAll(cases);
for (const [i, c] of cases.entries()) {
  const e = runEngineCase(c);
  const o = oracleResults[i]!;
  if ('crash' in o) { crashes.push({ index: i, crash: o.crash }); continue; }
  const d = firstDiff(i, e, o);
  if (d) diffs.push(d);
}

const byField = new Map<string, Diff[]>();
for (const d of diffs) byField.set(d.field, [...(byField.get(d.field) ?? []), d]);
const lines = [
  '# E1 对拍：原始数据', '',
  `由 \`node scripts/diff-oracle.ts ${count} ${seed}\` 生成，请勿手改。生成器 src/sim/oracle-gen.ts，种子 ${seed}，共 ${count} 局。`, '',
  `- 一致：${count - diffs.length - crashes.length} 局`,
  `- 不一致：${diffs.length} 局`,
  `- 参考实现出错：${crashes.length} 局`, '',
  '## 按第一处不一致的字段分组', '',
  '| 字段 | 局数 | 例子（局号／轮次：引擎 vs 参考实现） |', '| --- | ---: | --- |',
  ...[...byField.entries()].sort((a, b) => b[1].length - a[1].length).map(([f, ds]) => `| ${f} | ${ds.length} | ${ds.slice(0, 3).map((d) => `#${d.index}／第 ${d.round} 轮：${JSON.stringify(d.engine)} vs ${JSON.stringify(d.oracle)}`).join('；')} |`),
  '',
  ...(crashes.length ? ['## 参考实现出错', '', ...crashes.slice(0, 10).map((c) => `- #${c.index}：${c.crash.replace(/\n/g, ' ')}`), ''] : []),
];
writeFileSync('docs/reports/e1-diff-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/e1-diff-data.json', JSON.stringify({ seed, count, diffs, crashes, cases: [...new Set([...diffs.map((d) => d.index), ...crashes.map((c) => c.index)])].slice(0, 50).map((i) => ({ index: i, case: cases[i] })) }, null, 2), 'utf8');
console.log(lines.slice(0, 12).join('\n'));
