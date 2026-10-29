// E2 全构筑穷举（目标 V2 第四节）：构筑空间、一处改动的相邻构筑、单局记录。
// 口径在运行前写定于 docs/engine/e2-solver.md；本文件只做枚举与记录，结算全部来自引擎，最优打法来自求解器。

import { createBattle } from '../engine/setup.ts';
import { runRound } from '../engine/round.ts';
import { checkLoadout, LAB_ART_IDS } from '../edit/loadout.ts';
import type { Stance } from '../rules/types.ts';
import { battleInput, BASELINE } from './matrix.ts';
import { Solver, type Outcome, type Tier } from './solver.ts';

/** 构筑：优先级顺序的武学与开场留力。 */
export interface Config { arts: string[]; reserve: number }

/** 开场留力档位（首轮提案）：0 与战斗细则 3.3 节的例子 4 之间、之上各取一档。 */
export const RESERVE_LEVELS = [0, 2, 4, 6] as const;

export const configId = (c: Config): string => `${c.arts.join('+') || '空'}@${c.reserve}`;

/** 先行六门组成的全部合法出战构筑（含空构筑），每种都配四档留力。 */
export function allConfigs(): Config[] {
  const loadouts: string[][] = [];
  const rec = (cur: string[]): void => {
    if (checkLoadout({ arts: cur, weaponId: 'iron_sword', acquired: LAB_ART_IDS }).ok) loadouts.push(cur);
    if (cur.length < 4) for (const a of LAB_ART_IDS) if (!cur.includes(a)) rec([...cur, a]);
  };
  rec([]);
  return loadouts.flatMap((arts) => RESERVE_LEVELS.map((reserve) => ({ arts, reserve })));
}

/**
 * 一处改动可达的合法构筑：换一门（同一位置换成未装备的一门）、加一门（任意位置）、去一门、
 * 把一门移到另一个位置（调优先级）、改开场留力。单槽改良不在这里（见 e2-solver.md 第四节）。
 */
export function neighbors(c: Config): Config[] {
  const out = new Map<string, Config>();
  const add = (arts: string[], reserve = c.reserve): void => {
    const n = { arts, reserve };
    if (configId(n) !== configId(c) && checkLoadout({ arts, weaponId: 'iron_sword', acquired: LAB_ART_IDS }).ok) out.set(configId(n), n);
  };
  const free = LAB_ART_IDS.filter((a) => !c.arts.includes(a));
  c.arts.forEach((_, i) => {
    for (const a of free) add(c.arts.map((x, j) => (j === i ? a : x)));
    add(c.arts.filter((_, j) => j !== i));
    const rest = c.arts.filter((_, j) => j !== i);
    for (let k = 0; k <= rest.length; k++) add([...rest.slice(0, k), c.arts[i]!, ...rest.slice(k)]);
  });
  if (c.arts.length < 4) for (const a of free) for (let k = 0; k <= c.arts.length; k++) add([...c.arts.slice(0, k), a, ...c.arts.slice(k)]);
  for (const r of RESERVE_LEVELS) add(c.arts, r);
  return [...out.values()];
}

export function startState(c: Config, enemy: string, seed: number, affix: string | null) {
  const input = battleInput({ id: configId(c), arts: c.arts }, enemy, seed, { ...BASELINE, affixes: affix ? [affix] : [] });
  input.player.reserve = c.reserve;
  return createBattle(input);
}

export type Model = 'full' | 'stance';

export interface Task { config: number; enemy: string; seed: number; affix: string | null; model: Model }

/** 一个决策点：最优姿态、唯一最优的姿态（没有则为 null）、是否关键轮、最优决策是否用了变招。 */
export interface Point { best: Stance; unique: Stance | null; key: boolean; change: 'pause' | 'priority' | 'reserve' | null }

export interface BattleRecord extends Task {
  tier: Tier; hp: number; enemyHp: number; round: number;
  /** 同一开局“每轮出招、不变招”的结果。 */
  attack: { tier: Tier; hp: number; round: number };
  points: Point[];
  calls: number;
}

export const HORIZON = 30;

/** “每轮出招、不变招”的固定打法，与求解器用同一轮数上限。 */
export function alwaysAttack(c: Config, enemy: string, seed: number, affix: string | null): BattleRecord['attack'] {
  let s = startState(c, enemy, seed, affix);
  while (!s.over && s.round <= HORIZON) s = runRound(s, { stance: 'attack' }).state;
  const tier: Tier = s.over?.reason === 'victory' ? 'victory' : s.over?.reason === 'defeat' ? 'defeat' : 'undecided';
  return { tier, hp: s.player.hp, round: s.round };
}

export function solveTask(t: Task, configs: Config[]): BattleRecord {
  const c = configs[t.config]!;
  const solver = new Solver({ horizon: HORIZON, changes: t.model === 'full', reserveLevels: RESERVE_LEVELS });
  const s0 = startState(c, t.enemy, t.seed, t.affix);
  const o: Outcome = solver.solve(s0).outcome;
  // 判定 4 只用 S1 的局面，关键轮只用 S2 无词缀批次（e2-solver.md 第三节）；带词缀的批次只要胜负。
  const steps = t.model === 'full' ? solver.line(s0, false) : t.affix === null ? solver.line(s0, true) : [];
  const points: Point[] = steps.map((step) => {
    const ch = step.best.change;
    const change = ch?.pause ? 'pause' : ch?.priority ? 'priority' : ch?.reserve !== undefined ? 'reserve' : null;
    return { best: step.best.stance, unique: step.unique, key: step.key, change };
  });
  return { ...t, tier: o.tier, hp: o.hp, enemyHp: o.enemyHp, round: o.round, attack: alwaysAttack(c, t.enemy, t.seed, t.affix), points, calls: solver.calls };
}
