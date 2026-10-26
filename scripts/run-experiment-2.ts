// 调参实验 2：以实验 1 的 V8 为起点，做小幅参数网格，按预先写定的通过标准筛选。
// 全部改动只在内存中生效，不修改内容目录。用法：npm run experiment2

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { findEnemy } from '../src/content/catalog.ts';
import { RULES_VERSION, type ArtOverrides } from '../src/engine/setup.ts';
import { bestCell, BASELINE, checkTargets, MATRIX_ENEMIES, rankings, runMatrix, SEEDS, type CellResult, type TargetCheck, type Variant } from '../src/sim/matrix.ts';
import { BUILDS, STRATEGIES } from '../src/sim/strategies.ts';

/** 通过标准（实验 1 报告第七节），运行前写定。 */
export const PASS = {
  inRoundRange: 6,
  readBeatsAttack: 5,
  distinctLeaders: 2,
  enemiesWonPerBuild: 2,
  abnormal: 0,
};

const COLD_HITS = [{ hp: 2, posture: 2 }, { hp: 2, posture: 2 }, { hp: 2, posture: 2 }];

/** V8：X1–X4 ＋ S1 开场内力 10 ＋ S2 敌方出招轮先手 ＋ X5 护势保护整条攻击链。 */
function v8(id: string, name: string, extra: { guardHp: number; otherHp: number; balancedHp?: number; cold: 'none' | 'cost5' | 'freeze4' }): Variant {
  const overrides: ArtOverrides = {
    cold_sword: { action: { kind: 'attack', type: 'combo', hits: COLD_HITS, swordOnly: true }, ...(extra.cold === 'cost5' ? { cost: 5 } : {}) },
    wind_step: { cost: 3 },
  };
  return {
    ...BASELINE,
    id,
    name,
    enemyHpMul: extra.otherHp,
    enemyHpMulBy: { guard_standard: extra.guardHp, ...(extra.balancedHp ? { balanced_standard: extra.balancedHp } : {}) },
    enemyBaseHp: 3,
    artOverrides: overrides,
    rules: { wardScope: 'chain', initiative: 'enemyOnAttack', ...(extra.cold === 'freeze4' ? { freezeThreshold: 4 } : {}) },
    playerQi: 10,
  };
}

const COLD_LABEL = { none: '寒霜不再削弱', cost5: '叠寒剑费用 5', freeze4: '冻结阈值 4' } as const;

export const GRID: Variant[] = [];
for (const otherHp of [1.25, 1.5]) {
  for (const guardHp of [1, 1.25, 1.5]) {
    for (const cold of ['none', 'cost5', 'freeze4'] as const) {
      const id = `W${GRID.length + 1}`;
      GRID.push(v8(id, `均衡／蓄震 ×${otherHp}，高架势 ×${guardHp}，${COLD_LABEL[cold]}`, { guardHp, otherHp, cold }));
    }
  }
}
// 网格之后的补充：三类敌人分别调整气血（报告第三节）。
for (const [balancedHp, guardHp] of [[1.75, 1], [1.75, 1.25], [2, 1]] as const) {
  GRID.push(v8(`W${GRID.length + 1}`, `均衡 ×${balancedHp}，高架势 ×${guardHp}，蓄震 ×1.25，叠寒剑费用 5`, { balancedHp, guardHp, otherHp: 1.25, cold: 'cost5' }));
}

interface Evaluated {
  v: Variant;
  cells: CellResult[];
  t: TargetCheck;
  leaders: string[];
  passed: string[];
  failed: string[];
}

function evaluate(v: Variant): Evaluated {
  const cells = runMatrix(SEEDS, v);
  const t = checkTargets(cells);
  const r = rankings(cells);
  const leaders = MATRIX_ENEMIES.map((e) => r[e]![0]!);
  const checks: [string, boolean][] = [
    [`6–10 轮 ≥ ${PASS.inRoundRange}`, t.inRoundRange >= PASS.inRoundRange],
    [`读窗口优于始终出招 ≥ ${PASS.readBeatsAttack}`, t.readBeatsAttack.length >= PASS.readBeatsAttack],
    ['各敌人第一名不全相同', new Set(leaders).size >= PASS.distinctLeaders],
    ['每套构筑至少胜 2 类', Object.values(t.enemiesWon).every((n) => n >= PASS.enemiesWonPerBuild)],
    ['无非正常结束', t.abnormal <= PASS.abnormal],
  ];
  return { v, cells, t, leaders, passed: checks.filter((c) => c[1]).map((c) => c[0]), failed: checks.filter((c) => !c[1]).map((c) => c[0]) };
}

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

const results = GRID.map(evaluate);
const score = (e: Evaluated): number => e.passed.length * 100 + e.t.readBeatsAttack.length * 10 + e.t.inRoundRange;
const ordered = [...results].sort((a, b) => score(b) - score(a));

const lines: string[] = [];
lines.push('# Phase 1 调参实验 2：原始数据表', '');
lines.push(`由 \`npm run experiment2\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。种子 ${SEEDS[0]}–${SEEDS.at(-1)}，每个变体 27 格 540 场，共 ${GRID.length} 个变体。`, '');
lines.push('共同基础（实验 1 的 V8）：敌人基础出招气血 +3、叠寒剑每段 2／2、踏风步费用 3、玩家开场内力 10、敌方出招轮先手、基础架招护势保护整条攻击链。所有改动只在内存中生效。', '');
lines.push(`通过标准：最佳打法 6–10 轮至少 ${PASS.inRoundRange} 组；读窗口优于始终出招至少 ${PASS.readBeatsAttack} 组；三类敌人的第一名不全是同一构筑；每套构筑至少胜 2 类敌人；无非正常结束。`, '');
lines.push('## 一、全部变体（按通过项数排序）', '');
lines.push('| 变体 | 设置 | 通过项 | 6–10 轮 | 读窗口优于始终出招 | 最佳不是始终出招 | 各敌人第一名 | 未通过 |');
lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |');
for (const e of ordered) {
  lines.push(`| ${e.v.id} | ${e.v.name} | ${e.passed.length}/5 | ${e.t.inRoundRange} | ${e.t.readBeatsAttack.length} | ${e.t.bestNotAttack.length} | ${e.leaders.map(buildName).join('／')} | ${e.failed.join('；') || '—'} |`);
}
lines.push('');

const detail = ordered.filter((e) => e.failed.length === 0);
const shown = detail.length > 0 ? detail : ordered.slice(0, 3);
lines.push(`## 二、${detail.length > 0 ? '通过的变体' : '得分最高的三个变体'}明细`, '');
for (const e of shown) {
  const r = rankings(e.cells);
  lines.push(`### ${e.v.id} ${e.v.name}`, '');
  lines.push(`排名：${MATRIX_ENEMIES.map((x) => `${enemyName(x)} ${r[x]!.map(buildName).join(' > ')}`).join('；')}。`, '');
  lines.push('| 敌人 | 构筑 | 始终出招 | 读窗口 | 守反为主 | 最佳 |', '| --- | --- | --- | --- | --- | --- |');
  for (const en of MATRIX_ENEMIES) {
    const hp = Math.round(findEnemy(en)!.hpMax * (e.v.enemyHpMulBy?.[en] ?? e.v.enemyHpMul));
    for (const b of BUILDS) {
      const get = (s: string) => e.cells.find((c) => c.build === b.id && c.enemy === en && c.strategy === s)!;
      lines.push(`| ${enemyName(en)}（${hp}） | ${b.name} | ${cellText(get('always_attack'))} | ${cellText(get('read_windows'))} | ${cellText(get('guard_first'))} | ${stratName(bestCell(e.cells, b.id, en).strategy)} |`);
    }
  }
  lines.push('');
}

mkdirSync('docs/reports', { recursive: true });
writeFileSync('docs/reports/phase1-experiment-2-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase1-experiment-2-data.json', JSON.stringify({
  rulesVersion: RULES_VERSION, commit, seeds: SEEDS, pass: PASS,
  results: ordered.map((e) => ({ variant: e.v, targets: e.t, leaders: e.leaders, passed: e.passed, failed: e.failed, cells: e.cells.map(({ battles, ...rest }) => rest) })),
}, null, 1), 'utf8');
console.log(`wrote docs/reports/phase1-experiment-2-data.md and .json; passed ${detail.length}/${GRID.length}`);
