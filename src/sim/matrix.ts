// 批量模拟：27 格构筑矩阵（执行契约 V1.1 第五章）与段落资源可行性检查。
// 普通模拟没有研究、银两或材料结算。

import { createBattle } from '../engine/setup.ts';
import { runBattle } from '../engine/round.ts';
import type { BattleEvent, EndReason } from '../rules/types.ts';
import { BUILDS, STRATEGIES, type Build, type Strategy } from './strategies.ts';

/** 预先固定的种子组（首轮提案每格 20 个），在运行前写定，不事后挑选。 */
export const SEEDS: number[] = Array.from({ length: 20 }, (_, i) => 1001 + i);

export const MATRIX_ENEMIES = ['balanced_standard', 'guard_standard', 'resonance_standard'];

const START = { hp: 30, qi: 20, posture: 20 };

export interface BattleMetrics {
  seed: number;
  reason: EndReason;
  rounds: number;
  hpEnd: number;
  hpMin: number;
  qiNet: number;
  /** 玩家各来源造成的实际气血伤害；基础出招记为 basic。 */
  damageBySource: Record<string, number>;
  /** 敌方因内力不足而停招的次数。 */
  enemyStarved: number;
  /** 段落序列，例如 A-B-A。 */
  segments: string;
}

export interface CellResult {
  build: string;
  enemy: string;
  strategy: string;
  battles: BattleMetrics[];
  wins: number;
  defeats: number;
  other: number;
  winRate: number;
  avgRounds: number;
  avgRoundsWin: number | null;
  avgHpEndWin: number | null;
  avgHpMin: number;
  avgQiNet: number;
  damageShare: Record<string, number>;
  enemyStarvedPerBattle: number;
  segmentSequences: number;
}

function metrics(seed: number, events: BattleEvent[], reason: EndReason, rounds: number, hpEnd: number, qiEnd: number): BattleMetrics {
  let hpMin = START.hp;
  const damageBySource: Record<string, number> = {};
  let enemyStarved = 0;
  const segs: string[] = [];
  let lastSeg = '';
  for (const e of events) {
    if (e.type === 'hit' && e.data.target === 'player') hpMin = Math.min(hpMin, e.data.targetHp as number);
    if (e.type === 'hit' && e.side === 'player') {
      const key = e.art ?? 'basic';
      damageBySource[key] = (damageBySource[key] ?? 0) + (e.data.hp as number);
    }
    if (e.type === 'skip' && e.side === 'enemy' && e.data.reason === 'insufficientQi') enemyStarved += 1;
    if (e.type === 'intent') {
      const seg = e.data.segment as string;
      if (e.data.item === 0 || seg !== lastSeg) segs.push(seg);
      lastSeg = seg;
    }
  }
  return { seed, reason, rounds, hpEnd, hpMin, qiNet: qiEnd - START.qi, damageBySource, enemyStarved, segments: segs.join('-') };
}

export function runOne(build: Build, enemy: string, strategy: Strategy, seed: number): BattleMetrics {
  const s0 = createBattle({
    battleId: `${build.id}/${enemy}/${strategy.id}/${seed}`,
    seed,
    player: {
      hp: START.hp, hpMax: 30, qi: START.qi, qiMax: 20, posture: START.posture, postureMax: 20,
      weaponId: 'iron_sword', arts: build.arts, reserve: 0,
    },
    enemy: { config: enemy },
  });
  const run = runBattle(s0, strategy.decide);
  const over = run.state.over!;
  return metrics(seed, run.events, over.reason, run.rounds, run.state.player.hp, run.state.player.qi);
}

const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function runCell(build: Build, enemy: string, strategy: Strategy, seeds: number[] = SEEDS): CellResult {
  const battles = seeds.map((seed) => runOne(build, enemy, strategy, seed));
  const wins = battles.filter((b) => b.reason === 'victory');
  const defeats = battles.filter((b) => b.reason === 'defeat').length;
  const total: Record<string, number> = {};
  for (const b of battles) for (const [k, v] of Object.entries(b.damageBySource)) total[k] = (total[k] ?? 0) + v;
  const sum = Object.values(total).reduce((a, b) => a + b, 0);
  const damageShare: Record<string, number> = {};
  for (const [k, v] of Object.entries(total)) damageShare[k] = sum === 0 ? 0 : v / sum;
  return {
    build: build.id,
    enemy,
    strategy: strategy.id,
    battles,
    wins: wins.length,
    defeats,
    other: battles.length - wins.length - defeats,
    winRate: wins.length / battles.length,
    avgRounds: avg(battles.map((b) => b.rounds)),
    avgRoundsWin: wins.length ? avg(wins.map((b) => b.rounds)) : null,
    avgHpEndWin: wins.length ? avg(wins.map((b) => b.hpEnd)) : null,
    avgHpMin: avg(battles.map((b) => b.hpMin)),
    avgQiNet: avg(battles.map((b) => b.qiNet)),
    damageShare,
    enemyStarvedPerBattle: avg(battles.map((b) => b.enemyStarved)),
    segmentSequences: new Set(battles.map((b) => b.segments)).size,
  };
}

export function runMatrix(seeds: number[] = SEEDS): CellResult[] {
  const out: CellResult[] = [];
  for (const build of BUILDS) for (const enemy of MATRIX_ENEMIES) for (const strategy of STRATEGIES) out.push(runCell(build, enemy, strategy, seeds));
  return out;
}

// ---------- 段落资源可行性 ----------

export interface SegmentFeasibility {
  enemy: string;
  probe: string;
  segment: string;
  rounds: number;
  /** 本段落中敌方武学因内力不足停招的次数。 */
  starved: number;
}

/** 用两个固定探针对手（始终架招、始终出招，均无武学）测五类标准敌人每个段落的停招情况。 */
export function segmentFeasibility(enemies: string[], seeds: number[] = SEEDS): SegmentFeasibility[] {
  const probes: [string, 'guard' | 'attack'][] = [['始终架招', 'guard'], ['始终出招', 'attack']];
  const out: SegmentFeasibility[] = [];
  for (const enemy of enemies) {
    for (const [probe, stance] of probes) {
      const acc = new Map<string, { rounds: number; starved: number }>();
      for (const seed of seeds) {
        const s0 = createBattle({
          seed,
          player: { hp: 30, hpMax: 30, qi: 20, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts: [] },
          enemy: { config: enemy },
          limits: { maxRounds: 12 },
        });
        const run = runBattle(s0, () => ({ stance }));
        const segOfRound = new Map<number, string>();
        for (const e of run.events) if (e.type === 'intent') segOfRound.set(e.round, e.data.segment as string);
        for (const [, seg] of segOfRound) {
          const a = acc.get(seg) ?? { rounds: 0, starved: 0 };
          a.rounds += 1;
          acc.set(seg, a);
        }
        for (const e of run.events) {
          if (e.type === 'skip' && e.side === 'enemy' && e.data.reason === 'insufficientQi') {
            const seg = segOfRound.get(e.round)!;
            acc.get(seg)!.starved += 1;
          }
        }
      }
      for (const [segment, a] of [...acc.entries()].sort()) out.push({ enemy, probe, segment, ...a });
    }
  }
  return out;
}
