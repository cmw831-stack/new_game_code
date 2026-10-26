// 调参实验 3：让“一直出招”在多数对手面前输掉，同时看意图打仍能稳赢。
// 起点为 V1.9 默认规则与数值；全部改动只在内存中生效。用法：npm run experiment3

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { findEnemy } from '../src/content/catalog.ts';
import { RULES_VERSION } from '../src/engine/setup.ts';
import { BASELINE, MATRIX_ENEMIES, runCell, SEEDS, type CellResult, type Variant } from '../src/sim/matrix.ts';
import { BUILDS, STRATEGIES, type Strategy } from '../src/sim/strategies.ts';
import type { BattleState } from '../src/rules/types.ts';

/** 通过标准，运行前写定（负责人试玩反馈：只要出招就会赢）。 */
export const PASS = {
  attackMaxWin: 0.5,
  otherMinWin: 0.8,
  pairsPerBuild: 2,
  floorWins: 18,
};

function upcoming(s: BattleState): 'attack' | 'guard' | 'breathe' {
  return s.script.segments[s.script.segIndex]!.items[s.script.itemIndex]!.stance;
}

/** 第四种公开打法：敌方架招时调息而不是攻进去。只用于本实验。 */
const CAUTIOUS: Strategy = {
  id: 'cautious',
  name: '谨慎读窗口',
  rule: '敌方出招时架招；敌方调息时出招；敌方架招时调息。',
  decide: (s) => {
    const e = upcoming(s);
    return { stance: e === 'attack' ? 'guard' : e === 'breathe' ? 'attack' : 'breathe' };
  },
};
const ALL_STRATEGIES: Strategy[] = [...STRATEGIES, CAUTIOUS];

const STARTER = { id: 'starter', arts: ['break_strike', 'return_breath'] };

export const GRID: Variant[] = [];
for (const counter of [false, true]) {
  for (const balancedHp of [0, 3]) {
    for (const allHp of [0, 3, 6]) {
      const id = `X${GRID.length + 1}`;
      GRID.push({
        ...BASELINE,
        id,
        name: `出招轮基础出招 +${allHp}（均衡武者另 +${balancedHp}）${counter ? '，均衡与蓄震加借力反击' : ''}`,
        enemyBaseHp: allHp,
        enemyBaseHpBy: { balanced_standard: allHp + balancedHp },
        enemyArtsAdd: counter ? { balanced_standard: ['borrow_force'], resonance_standard: ['borrow_force'] } : {},
      });
    }
  }
}

// 网格之后的补充：按敌人分别调整（报告第三节）。均衡武者保持 V1.9，作为新手首节点的对手。
GRID.push(
  { ...BASELINE, id: 'X13', name: '高架势守卫气血 ×1.2', enemyHpMul: 1, enemyHpMulBy: { guard_standard: 1.2 }, enemyBaseHp: 0 },
  { ...BASELINE, id: 'X14', name: '高架势守卫气血 ×1.2；蓄震守卫气血 ×1.2、基础出招再 +9', enemyHpMul: 1, enemyHpMulBy: { guard_standard: 1.2, resonance_standard: 1.2 }, enemyBaseHp: 0, enemyBaseHpBy: { resonance_standard: 9 } },
);

interface Pair {
  build: string;
  enemy: string;
  attack: CellResult;
  best: CellResult;
  hit: boolean;
}

interface Evaluated {
  v: Variant;
  pairs: Pair[];
  floor: Record<string, number>;
  passedBuilds: string[];
  floorOk: boolean;
  abnormal: number;
  passed: boolean;
}

function evaluate(v: Variant): Evaluated {
  const pairs: Pair[] = [];
  let abnormal = 0;
  for (const b of BUILDS) {
    for (const e of MATRIX_ENEMIES) {
      const cells = ALL_STRATEGIES.map((s) => runCell(b, e, s, SEEDS, v));
      abnormal += cells.reduce((n, c) => n + c.other, 0);
      const attack = cells[0]!;
      const others = cells.slice(1).sort((x, y) => y.winRate - x.winRate || (x.avgRoundsWin ?? 99) - (y.avgRoundsWin ?? 99));
      const best = others[0]!;
      pairs.push({ build: b.id, enemy: e, attack, best, hit: attack.winRate <= PASS.attackMaxWin && best.winRate >= PASS.otherMinWin });
    }
  }
  const floor: Record<string, number> = {};
  for (const s of ALL_STRATEGIES) floor[s.id] = runCell(STARTER as never, 'balanced_standard', s, SEEDS, v).wins;
  const passedBuilds = BUILDS.filter((b) => pairs.filter((p) => p.build === b.id && p.hit).length >= PASS.pairsPerBuild).map((b) => b.id);
  const floorOk = Math.max(floor.read_windows ?? 0, floor.cautious ?? 0) >= PASS.floorWins;
  return { v, pairs, floor, passedBuilds, floorOk, abnormal, passed: passedBuilds.length === BUILDS.length && floorOk && abnormal === 0 };
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
const stratName = (id: string): string => ALL_STRATEGIES.find((s) => s.id === id)!.name;
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number | null): string => (x === null ? '—' : x.toFixed(1));

const results = GRID.map(evaluate);
const hits = (e: Evaluated): number => e.pairs.filter((p) => p.hit).length;
const ordered = [...results].sort((a, b) => Number(b.passed) - Number(a.passed) || b.passedBuilds.length - a.passedBuilds.length || hits(b) - hits(a));

const lines: string[] = [];
lines.push('# Phase 2 调参实验 3：原始数据表', '');
lines.push(`由 \`npm run experiment3\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。种子 ${SEEDS[0]}–${SEEDS.at(-1)}，每格 20 场。起点为 V1.9 默认值，所有改动只在内存中生效。`, '');
lines.push(`打法：${ALL_STRATEGIES.map((s) => `${s.name}（${s.rule}）`).join('；')}`, '');
lines.push(`通过标准：每套构筑至少 ${PASS.pairsPerBuild} 类敌人满足“始终出招胜率 ≤ ${pct(PASS.attackMaxWin)}，且其余打法中最好的一种胜率 ≥ ${pct(PASS.otherMinWin)}”；初始两门用读窗口或谨慎读窗口对均衡武者无药至少 ${PASS.floorWins}／20；无非正常结束。`, '');
lines.push('## 一、全部变体', '');
lines.push('| 变体 | 设置 | 通过 | 达标构筑 | 达标组合（共 9） | 初始两门首节点（始终出招／读窗口／守反／谨慎） | 非正常结束 |');
lines.push('| --- | --- | --- | --- | ---: | --- | ---: |');
for (const e of ordered) {
  const f = e.floor;
  lines.push(`| ${e.v.id} | ${e.v.name} | ${e.passed ? '是' : '否'} | ${e.passedBuilds.map(buildName).join('、') || '—'} | ${hits(e)} | ${f.always_attack}／${f.read_windows}／${f.guard_first}／${f.cautious} | ${e.abnormal} |`);
}
lines.push('');
for (const e of ordered.slice(0, 4)) {
  lines.push(`## ${e.v.id} ${e.v.name}`, '');
  lines.push('| 敌人 | 构筑 | 始终出招 | 最好的其他打法 | 达标 |', '| --- | --- | --- | --- | --- |');
  for (const p of e.pairs) {
    lines.push(`| ${enemyName(p.enemy)} | ${buildName(p.build)} | ${pct(p.attack.winRate)}${p.attack.wins ? `，${num(p.attack.avgRoundsWin)} 轮，剩 ${num(p.attack.avgHpEndWin)}` : ''} | ${stratName(p.best.strategy)} ${pct(p.best.winRate)}${p.best.wins ? `，${num(p.best.avgRoundsWin)} 轮，剩 ${num(p.best.avgHpEndWin)}` : ''} | ${p.hit ? '✓' : ''} |`);
  }
  lines.push('');
}

mkdirSync('docs/reports', { recursive: true });
writeFileSync('docs/reports/phase2-experiment-3-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase2-experiment-3-data.json', JSON.stringify({
  rulesVersion: RULES_VERSION, commit, seeds: SEEDS, pass: PASS,
  results: ordered.map((e) => ({ variant: e.v, passed: e.passed, passedBuilds: e.passedBuilds, floor: e.floor, abnormal: e.abnormal,
    pairs: e.pairs.map((p) => ({ build: p.build, enemy: p.enemy, hit: p.hit, attack: { ...p.attack, battles: undefined }, best: { ...p.best, battles: undefined } })) })),
}, null, 1), 'utf8');
console.log(`wrote docs/reports/phase2-experiment-3-data.md; passed ${results.filter((r) => r.passed).length}/${GRID.length}`);
