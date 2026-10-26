// 测试用构造工具。所有预期值来自策划文档中的独立手算，不由被测函数生成。

import { createBattle, type BattleInput, type EnemyInput, type FighterInput } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import type { BattleEvent, BattleState, EnemyConfig, IntentItem, Side, Stance } from '../src/rules/types.ts';

export function player(arts: FighterInput['arts'], over: Partial<FighterInput> = {}): FighterInput {
  return { hp: 30, hpMax: 30, qi: 20, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts, reserve: 0, ...over };
}

export function items(...stances: Stance[]): IntentItem[] {
  return stances.map((stance) => ({ stance, disabled: [] }));
}

/** 只用于规则用例的简化对手：明确列出资源、武学与意图。 */
export function fixture(over: Partial<EnemyConfig> & { items?: IntentItem[] } = {}): EnemyConfig {
  const { items: its, ...rest } = over;
  return {
    id: 'fixture',
    templateId: 'fixture',
    name: '测试对手',
    hpMax: 30,
    qi: 8,
    qiMax: 20,
    postureMax: 10,
    weaponId: 'iron_sword',
    artIds: [],
    segments: [{ id: 'A', name: '测试', items: its ?? items('attack') }],
    fixedSegment: true,
    ...rest,
  };
}

export function battle(p: FighterInput, enemy: EnemyInput, seed = 1, extra: Partial<BattleInput> = {}): BattleState {
  return createBattle({ seed, player: p, enemy, ...extra });
}

export function round(state: BattleState, stance: Stance = 'attack'): { state: BattleState; events: BattleEvent[] } {
  return runRound(state, { stance });
}

export function of(events: BattleEvent[], type: BattleEvent['type'], side?: Side, art?: string | null): BattleEvent[] {
  return events.filter((e) => e.type === type && (side === undefined || e.side === side) && (art === undefined || e.art === art));
}

/** 某一方在给定事件中造成的实际气血伤害合计。 */
export function damageBy(events: BattleEvent[], side: Side): number {
  return of(events, 'hit', side).reduce((sum, e) => sum + (e.data.hp as number), 0);
}

export function rootOf(events: BattleEvent[], side: Side, type: BattleEvent['type'] = 'basicAttack'): BattleEvent[] {
  const start = events.find((e) => e.type === type && e.side === side);
  if (!start) return [];
  return events.filter((e) => e.root === start.root);
}
