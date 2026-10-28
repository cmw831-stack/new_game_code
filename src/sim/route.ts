// 两战路线模拟：节点 1 战斗 → 节点 3 安全整备（可用止血散）→ 节点 4 战斗。
// 依据：成长挑战细则 V1.3 第 5.1 节（战间只清除临时战斗状态并回满新战架势，气血与内力延续实际结果）、第八章；
// 主计划 V1.9.1 4.2 节（每场开场内力取结转值与 10 中较小者）；成长经济细则 V1.4（止血散战间气血恢复 12，不超上限；携带上限 2 剂）。

import { runBattle } from '../engine/round.ts';
import { createBattle, encounterOpeningQi } from '../engine/setup.ts';
import type { EndReason } from '../rules/types.ts';
import type { FighterInput } from '../engine/setup.ts';
import { BASELINE, battleInput, type Variant } from './matrix.ts';
import type { Strategy } from './strategies.ts';

export const POTION_HEAL = 12;
export const POTION_CARRY_MAX = 2;

export interface RouteFight {
  enemy: string;
  reason: EndReason;
  rounds: number;
  hpStart: number;
  qiStart: number;
  hpEnd: number;
  qiEnd: number;
}

export interface RouteResult {
  seed: number;
  fights: RouteFight[];
  potionsUsed: number;
  /** 全部战斗都获胜。 */
  cleared: boolean;
}

/**
 * 按顺序打完各节点。两场之间在安全整备节点用药：气血未满且还有药就用一剂，直到满或用完。
 * 每场用同一条路线种子（段落抽取各自从该种子开始）。
 */
export function runRoute(build: { id: string; arts: FighterInput['arts'] }, enemies: readonly string[], strategy: Pick<Strategy, 'decide'>, seed: number, potions: number, v: Variant = BASELINE): RouteResult {
  if (!Number.isInteger(potions) || potions < 0 || potions > POTION_CARRY_MAX) throw new Error(`药品携带 0–${POTION_CARRY_MAX} 剂`);
  const fights: RouteFight[] = [];
  let hp = 30;
  let qi = encounterOpeningQi(v.playerQi ?? 10);
  let left = potions;
  for (const [i, enemy] of enemies.entries()) {
    if (i > 0) {
      while (left > 0 && hp < 30) {
        hp = Math.min(30, hp + POTION_HEAL);
        left -= 1;
      }
    }
    const input = battleInput(build, enemy, seed, v);
    input.player.hp = hp;
    input.player.qi = qi;
    const run = runBattle(createBattle(input), strategy.decide);
    const over = run.state.over!;
    fights.push({ enemy, reason: over.reason, rounds: run.rounds, hpStart: hp, qiStart: qi, hpEnd: run.state.player.hp, qiEnd: run.state.player.qi });
    if (over.reason !== 'victory') break;
    hp = run.state.player.hp;
    qi = encounterOpeningQi(run.state.player.qi);
  }
  return { seed, fights, potionsUsed: potions - left, cleared: fights.length === enemies.length && fights.every((f) => f.reason === 'victory') };
}
