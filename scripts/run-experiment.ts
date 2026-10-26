// 调参实验 1：按模拟报告第五节逐项叠加 X1–X4，并加试规则改动 X5。
// 全部改动只在内存中生效，不修改内容目录。用法：npm run experiment

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { findEnemy } from '../src/content/catalog.ts';
import { RULES_VERSION } from '../src/engine/setup.ts';
import { BASELINE, bestCell, checkTargets, MATRIX_ENEMIES, rankings, runMatrix, SEEDS, type CellResult, type Variant } from '../src/sim/matrix.ts';
import { BUILDS, STRATEGIES } from '../src/sim/strategies.ts';
import type { ArtOverrides } from '../src/engine/setup.ts';

const COLD_2_2: ArtOverrides = {
  cold_sword: { action: { kind: 'attack', type: 'combo', hits: [{ hp: 2, posture: 2 }, { hp: 2, posture: 2 }, { hp: 2, posture: 2 }], swordOnly: true } },
};
const STEP_COST_3: ArtOverrides = { wind_step: { cost: 3 } };

const X1 = { enemyHpMul: 1.5 };
const X2 = { enemyBaseHp: 3 };

export const VARIANTS: Variant[] = [
  BASELINE,
  { id: 'V1', name: 'X1：敌人气血 ×1.5', ...X1, enemyBaseHp: 0, artOverrides: {}, rules: {} },
  { id: 'V2', name: 'X1＋X2：再加敌人基础出招气血 +3', ...X1, ...X2, artOverrides: {}, rules: {} },
  { id: 'V3', name: 'X1＋X2＋X3：再把叠寒剑每段 3／2 改为 2／2', ...X1, ...X2, artOverrides: { ...COLD_2_2 }, rules: {} },
  { id: 'V4', name: 'X1＋X2＋X3＋X4：再把踏风步费用 2 改为 3', ...X1, ...X2, artOverrides: { ...COLD_2_2, ...STEP_COST_3 }, rules: {} },
  { id: 'V5', name: 'V4＋X5：基础架招护势保护敌人整条攻击链', ...X1, ...X2, artOverrides: { ...COLD_2_2, ...STEP_COST_3 }, rules: { wardScope: 'chain' } },
  // 以下为扫描中发现的结构性开关（报告第四节）。
  { id: 'V6', name: 'V4＋S1：玩家开场内力 20 改为 10', ...X1, ...X2, artOverrides: { ...COLD_2_2, ...STEP_COST_3 }, rules: {}, playerQi: 10 },
  { id: 'V7', name: 'V4＋S2：敌方意图为出招时敌方先手', ...X1, ...X2, artOverrides: { ...COLD_2_2, ...STEP_COST_3 }, rules: { initiative: 'enemyOnAttack' } },
  { id: 'V8', name: 'V4＋S1＋S2＋X5', ...X1, ...X2, artOverrides: { ...COLD_2_2, ...STEP_COST_3 }, rules: { wardScope: 'chain', initiative: 'enemyOnAttack' }, playerQi: 10 },
];

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  if (execSync('git status --porcelain -- src scripts', { encoding: 'utf8' }).trim()) commit += '（另有未提交的代码改动）';
} catch {
  // 不在 git 仓库中运行时保留 unknown。
}

const enemyName = (id: string): string => findEnemy(id)!.name;
const buildName = (id: string): string => BUILDS.find((b) => b.id === id)!.name;
const stratName = (id: string): string => STRATEGIES.find((s) => s.id === id)!.name;
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number | null): string => (x === null ? '—' : x.toFixed(1));
const cellText = (c: CellResult): string => (c.wins ? `${pct(c.winRate)}，${num(c.avgRoundsWin)} 轮，剩 ${num(c.avgHpEndWin)}` : '0%');
const pairName = (p: string): string => {
  const [b, e] = p.split('/');
  return `${buildName(b!)}×${enemyName(e!)}`;
};

const lines: string[] = [];
const json: unknown[] = [];
lines.push('# Phase 1 调参实验 1：原始数据表', '');
lines.push(`由 \`npm run experiment\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。种子 ${SEEDS[0]}–${SEEDS.at(-1)}，每个变体 27 格 540 场。`, '');
lines.push('所有改动只在内存中生效，不代表已采纳的设计。', '');

lines.push('## 一、各变体的设计目标核对', '');
lines.push('| 变体 | 每套构筑胜过的敌人类数 | 排序交换 | 最佳打法 6–10 轮（共 9） | 读窗口优于始终出招 | 最佳打法不是始终出招 | 非正常结束 |');
lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: |');
const results: { v: Variant; cells: CellResult[] }[] = [];
for (const v of VARIANTS) {
  const cells = runMatrix(SEEDS, v);
  results.push({ v, cells });
  const t = checkTargets(cells);
  const won = BUILDS.map((b) => `${b.name} ${t.enemiesWon[b.id]}`).join('，');
  lines.push(`| ${v.id} ${v.name} | ${won} | ${t.rankSwap ? '有' : '无'} | ${t.inRoundRange} | ${t.readBeatsAttack.length} | ${t.bestNotAttack.length} | ${t.abnormal} |`);
  json.push({ variant: v, targets: t, rankings: rankings(cells), cells: cells.map(({ battles, ...rest }) => rest) });
}
lines.push('');

for (const { v, cells } of results) {
  const t = checkTargets(cells);
  const r = rankings(cells);
  lines.push(`## ${v.id} ${v.name}`, '');
  lines.push(`排名：${MATRIX_ENEMIES.map((e) => `${enemyName(e)} ${r[e]!.map(buildName).join(' > ')}`).join('；')}。`, '');
  if (t.readBeatsAttack.length) lines.push(`读窗口优于始终出招：${t.readBeatsAttack.map(pairName).join('、')}。`, '');
  if (t.bestNotAttack.length) lines.push(`最佳打法不是始终出招：${t.bestNotAttack.map(pairName).join('、')}。`, '');
  lines.push('| 敌人 | 构筑 | 始终出招 | 读窗口 | 守反为主 | 最佳 |', '| --- | --- | --- | --- | --- | --- |');
  for (const e of MATRIX_ENEMIES) {
    for (const b of BUILDS) {
      const get = (s: string) => cells.find((c) => c.build === b.id && c.enemy === e && c.strategy === s)!;
      const best = bestCell(cells, b.id, e);
      lines.push(`| ${enemyName(e)}（${Math.round(findEnemy(e)!.hpMax * v.enemyHpMul)}） | ${b.name} | ${cellText(get('always_attack'))} | ${cellText(get('read_windows'))} | ${cellText(get('guard_first'))} | ${stratName(best.strategy)} |`);
    }
  }
  lines.push('');
}

mkdirSync('docs/reports', { recursive: true });
writeFileSync('docs/reports/phase1-experiment-1-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase1-experiment-1-data.json', JSON.stringify({ rulesVersion: RULES_VERSION, commit, seeds: SEEDS, results: json }, null, 1), 'utf8');
console.log('wrote docs/reports/phase1-experiment-1-data.md and .json');
