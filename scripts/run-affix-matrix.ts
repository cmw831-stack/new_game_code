// 词缀矩阵（M4）：按敌人细则 V1.3 第 9.3 节检验首批六个词缀。
// 三套先行构筑 × 三类标准敌人 × 四种打法 × 20 个固定种子，每个词缀单独加上，与无词缀对照。用法：npm run affix-matrix
//
// 运行前写定的判定：
// 1. 改变题目：某个词缀至少让一格（构筑×敌人×打法）胜率比无词缀下降 20 个百分点以上。
// 2. 保留解法：带该词缀的每类标准敌人，仍有至少 2 个“解法”（构筑×打法，胜率 ≥ 80%）。
// 3. 非正常结束（安全上限、轮数上限）为 0。

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { AFFIXES } from '../src/content/affixes.ts';
import { findEnemy } from '../src/content/catalog.ts';
import { RULES_VERSION } from '../src/engine/setup.ts';
import { BASELINE, MATRIX_ENEMIES, runCell, SEEDS, type CellResult } from '../src/sim/matrix.ts';
import { BUILDS, CAUTIOUS, STRATEGIES, type Strategy } from '../src/sim/strategies.ts';

const ALL: Strategy[] = [...STRATEGIES, CAUTIOUS];
const DROP = 0.2;
const SOLVED = 0.8;
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const pct = (x: number) => `${Math.round(x * 100)}%`;
const bName = (id: string) => BUILDS.find((b) => b.id === id)!.name;
const sName = (id: string) => ALL.find((s) => s.id === id)!.name;
const eName = (id: string) => findEnemy(id)!.name;

function cells(affixes: string[], enemy: string): CellResult[] {
  return BUILDS.flatMap((b) => ALL.map((s) => runCell(b, enemy, s, SEEDS, { ...BASELINE, id: affixes.join('+') || 'none', affixes })));
}

const base = new Map(MATRIX_ENEMIES.map((e) => [e, cells([], e)]));
const lines: string[] = [];
const json: unknown[] = [];
lines.push('# 词缀矩阵：原始数据', '');
lines.push(`由 \`npm run affix-matrix\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。种子 ${SEEDS[0]}–${SEEDS.at(-1)}，每格 20 场。`, '');
lines.push(`判定（运行前写定）：改变题目＝至少一格胜率下降 ≥ ${pct(DROP)}；保留解法＝每类敌人至少 2 个“构筑×打法”胜率 ≥ ${pct(SOLVED)}；非正常结束为 0。`, '');
lines.push('## 一、汇总', '');
lines.push('| 词缀 | 最大降幅（构筑／敌人／打法） | 改变题目 | 各敌人解法数（均衡／高架势／蓄震） | 保留解法 | 非正常结束 | 通过 |');
lines.push('| --- | --- | --- | --- | --- | ---: | --- |');
const details: string[] = [];
for (const a of AFFIXES) {
  let maxDrop = { d: -1, where: '' };
  const solutions: number[] = [];
  let abnormal = 0;
  const perEnemy: Record<string, unknown> = {};
  for (const e of MATRIX_ENEMIES) {
    if (!a.templates.includes(findEnemy(e)!.templateId)) { solutions.push(NaN); continue; }
    const cs = cells([a.id], e);
    const b0 = base.get(e)!;
    cs.forEach((c, i) => {
      const d = b0[i]!.winRate - c.winRate;
      if (d > maxDrop.d) maxDrop = { d, where: `${bName(c.build)}／${eName(e)}／${sName(c.strategy)}（${pct(b0[i]!.winRate)}→${pct(c.winRate)}）` };
      abnormal += c.other;
    });
    solutions.push(cs.filter((c) => c.winRate >= SOLVED).length);
    perEnemy[e] = cs.map((c) => ({ build: c.build, strategy: c.strategy, winRate: c.winRate, base: b0[cs.indexOf(c)]!.winRate }));
    details.push(`### ${a.name} × ${eName(e)}`, '', '| 构筑 | ' + ALL.map((s) => s.name).join(' | ') + ' |', '| --- |' + ALL.map(() => ' ---: |').join(''));
    for (const b of BUILDS) {
      const row = ALL.map((s) => {
        const c = cs.find((x) => x.build === b.id && x.strategy === s.id)!;
        const o = b0.find((x) => x.build === b.id && x.strategy === s.id)!;
        return c.winRate === o.winRate ? pct(c.winRate) : `${pct(o.winRate)}→**${pct(c.winRate)}**`;
      });
      details.push(`| ${b.name} | ${row.join(' | ')} |`);
    }
    details.push('');
  }
  const changes = maxDrop.d >= DROP;
  const keeps = solutions.every((n) => Number.isNaN(n) || n >= 2);
  const pass = changes && keeps && abnormal === 0;
  lines.push(`| ${a.name} | ${pct(Math.max(0, maxDrop.d))}：${maxDrop.where} | ${changes ? '是' : '否'} | ${solutions.map((n) => (Number.isNaN(n) ? '不适用' : n)).join('／')} | ${keeps ? '是' : '否'} | ${abnormal} | ${pass ? '✓' : '✗'} |`);
  json.push({ affix: a.id, maxDrop: maxDrop.d, where: maxDrop.where, solutions, abnormal, pass, perEnemy });
}
lines.push('', '## 二、无词缀基线的解法数', '');
for (const e of MATRIX_ENEMIES) lines.push(`- ${eName(e)}：${base.get(e)!.filter((c) => c.winRate >= SOLVED).length} 个`);
lines.push('', '## 三、逐格结果（只列变化的格，加粗为带词缀后的胜率）', '', ...details);

writeFileSync('docs/reports/phase2-affix-matrix-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase2-affix-matrix-data.json', JSON.stringify({ commit, rules: RULES_VERSION, seeds: SEEDS, affixes: json }, null, 2), 'utf8');
console.log(lines.slice(0, 16).join('\n'));
