// 批量模拟：27 格构筑矩阵（执行契约 V1.1 第五章）与段落资源可行性检查。
// 普通模拟没有研究、银两或材料结算。

import { createBattle, OPENING_QI_CAP, type ArtOverrides, type BattleInput, type FighterInput } from '../engine/setup.ts';
import { findEnemy, findWeapon } from '../content/catalog.ts';
import { runBattle } from '../engine/round.ts';
import type { BattleEvent, EndReason, RuleParams } from '../rules/types.ts';
import { BUILDS, STRATEGIES, type Build, type Strategy } from './strategies.ts';

/** 预先固定的种子组（首轮提案每格 20 个），在运行前写定，不事后挑选。 */
export const SEEDS: number[] = Array.from({ length: 20 }, (_, i) => 1001 + i);

export const MATRIX_ENEMIES = ['balanced_standard', 'guard_standard', 'resonance_standard'];

/** 模拟中每场遭遇的玩家开场资源：满气血、满架势，内力按 V1.9 开场上限 10。 */
const START = { hp: 30, qi: OPENING_QI_CAP, posture: 20 };

/** 调参实验的一组改动；全部只在内存中生效，不写回内容目录。 */
export interface Variant {
  id: string;
  name: string;
  /** 敌人气血上限倍率，四舍五入。 */
  enemyHpMul: number;
  /** 敌人兵器基础出招的气血威力增量。 */
  enemyBaseHp: number;
  artOverrides: ArtOverrides;
  rules: Partial<RuleParams>;
  /** 玩家开场内力；省略为 20。 */
  playerQi?: number;
  /** 按敌人配置单独指定的气血倍率，优先于 enemyHpMul。 */
  enemyHpMulBy?: Record<string, number>;
  /** 按敌人配置单独指定的基础出招气血增量，优先于 enemyBaseHp。 */
  enemyBaseHpBy?: Record<string, number>;
  /** 按敌人配置追加的武学（排在原有武学之后）。 */
  enemyArtsAdd?: Record<string, string[]>;
  /** 敌人的公开词缀（敌人细则第 9 章）。 */
  affixes?: string[];
}

export const BASELINE: Variant = { id: 'V0', name: '基线（V1.9）', enemyHpMul: 1, enemyBaseHp: 0, artOverrides: {}, rules: {} };

export function battleInput(build: { id: string; arts: FighterInput['arts'] }, enemy: string, seed: number, v: Variant = BASELINE): BattleInput {
  const config = findEnemy(enemy)!;
  config.hpMax = Math.round(config.hpMax * (v.enemyHpMulBy?.[enemy] ?? v.enemyHpMul));
  config.artIds.push(...(v.enemyArtsAdd?.[enemy] ?? []));
  const weapon = findWeapon(config.weaponId)!;
  weapon.base.hp += (config.basePowerBonus?.hp ?? 0) + (v.enemyBaseHpBy?.[enemy] ?? v.enemyBaseHp);
  weapon.base.posture += config.basePowerBonus?.posture ?? 0;
  return {
    battleId: `${v.id}/${build.id}/${enemy}/${seed}`,
    seed,
    player: {
      hp: START.hp, hpMax: 30, qi: v.playerQi ?? START.qi, qiMax: 20, posture: START.posture, postureMax: 20,
      weaponId: 'iron_sword', arts: build.arts, reserve: 0,
    },
    enemy: { config, weapon, affixes: v.affixes ?? [] },
    artOverrides: v.artOverrides,
    rules: v.rules,
  };
}

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

function metrics(seed: number, events: BattleEvent[], reason: EndReason, rounds: number, hpEnd: number, qiEnd: number, qiStart: number): BattleMetrics {
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
  return { seed, reason, rounds, hpEnd, hpMin, qiNet: qiEnd - qiStart, damageBySource, enemyStarved, segments: segs.join('-') };
}

export function runOne(build: { id: string; arts: FighterInput['arts'] }, enemy: string, strategy: Pick<Strategy, 'decide'>, seed: number, v: Variant = BASELINE): BattleMetrics {
  const s0 = createBattle(battleInput(build, enemy, seed, v));
  const run = runBattle(s0, strategy.decide);
  const over = run.state.over!;
  return metrics(seed, run.events, over.reason, run.rounds, run.state.player.hp, run.state.player.qi, s0.player.qi);
}

const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function runCell(build: { id: string; arts: FighterInput['arts'] }, enemy: string, strategy: Strategy, seeds: number[] = SEEDS, v: Variant = BASELINE): CellResult {
  const battles = seeds.map((seed) => runOne(build, enemy, strategy, seed, v));
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

export function runMatrix(seeds: number[] = SEEDS, v: Variant = BASELINE): CellResult[] {
  const out: CellResult[] = [];
  for (const build of BUILDS) for (const enemy of MATRIX_ENEMIES) for (const strategy of STRATEGIES) out.push(runCell(build, enemy, strategy, seeds, v));
  return out;
}

// ---------- 设计目标核对 ----------

const byQuality = (a: CellResult, b: CellResult): number =>
  b.winRate - a.winRate || (a.avgRoundsWin ?? 99) - (b.avgRoundsWin ?? 99) || (b.avgHpEndWin ?? 0) - (a.avgHpEndWin ?? 0);

/** 某构筑面对某敌人时三种打法中最好的一格：胜率高者优先，再比胜场轮数少、剩血多。 */
export function bestCell(cells: CellResult[], build: string, enemy: string): CellResult {
  return cells.filter((c) => c.build === build && c.enemy === enemy).sort(byQuality)[0]!;
}

/** 各敌人面前的构筑排名（按各自最佳打法）。 */
export function rankings(cells: CellResult[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const enemy of MATRIX_ENEMIES) out[enemy] = BUILDS.map((b) => bestCell(cells, b.id, enemy)).sort(byQuality).map((c) => c.build);
  return out;
}

export interface TargetCheck {
  /** 每套构筑在几类敌人上有胜利。 */
  enemiesWon: Record<string, number>;
  rankSwap: boolean;
  /** 最佳打法的胜场平均轮数落在 6–10 轮的组合数（共 9 个）。 */
  inRoundRange: number;
  /** “读窗口”胜率更高、或胜率相同而剩血更多于“始终出招”的构筑×敌人组合。 */
  readBeatsAttack: string[];
  /** 最佳打法不是“始终出招”的组合。 */
  bestNotAttack: string[];
  abnormal: number;
}

export function checkTargets(cells: CellResult[]): TargetCheck {
  const enemiesWon: Record<string, number> = {};
  const readBeatsAttack: string[] = [];
  const bestNotAttack: string[] = [];
  let inRoundRange = 0;
  for (const b of BUILDS) {
    enemiesWon[b.id] = MATRIX_ENEMIES.filter((e) => cells.some((c) => c.build === b.id && c.enemy === e && c.wins > 0)).length;
    for (const e of MATRIX_ENEMIES) {
      const get = (s: string) => cells.find((c) => c.build === b.id && c.enemy === e && c.strategy === s)!;
      const aa = get('always_attack');
      const rw = get('read_windows');
      if (rw.winRate > aa.winRate || (rw.winRate === aa.winRate && rw.winRate > 0 && (rw.avgHpEndWin ?? 0) > (aa.avgHpEndWin ?? 0))) readBeatsAttack.push(`${b.id}/${e}`);
      const best = bestCell(cells, b.id, e);
      if (best.strategy !== 'always_attack') bestNotAttack.push(`${b.id}/${e}`);
      if (best.avgRoundsWin !== null && best.avgRoundsWin >= 6 && best.avgRoundsWin <= 10) inRoundRange += 1;
    }
  }
  const r = rankings(cells);
  return {
    enemiesWon,
    rankSwap: new Set(MATRIX_ENEMIES.map((e) => r[e]!.join('>'))).size > 1,
    inRoundRange,
    readBeatsAttack,
    bestNotAttack,
    abnormal: cells.reduce((n, c) => n + c.other, 0),
  };
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
