// 测试用构造工具。所有预期值来自策划文档中的独立手算，不由被测函数生成。
//
// V1.8 文档里的手算用 battle18() 复现：显式使用 V1.8 规则参数、V1.8 组件价与 V1.8 敌人数值。
// 这些用例检验的是结算机制本身；V1.9 新增的手算另见 handcalc-v19.test.ts。

import { findEnemy } from '../src/content/catalog.ts';
import { createBattle, V18_RULES, type ArtOverrides, type BattleInput, type EnemyInput, type FighterInput } from '../src/engine/setup.ts';
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

/** V1.8 组件价：叠寒剑三段 3／2、费用 4；踏风步费用 2；回身步费用 1。 */
export const V18_ART_OVERRIDES: ArtOverrides = {
  cold_sword: { cost: 4, action: { kind: 'attack', type: 'combo', hits: [{ hp: 3, posture: 2 }, { hp: 3, posture: 2 }, { hp: 3, posture: 2 }], swordOnly: true } },
  wind_step: { cost: 2 },
  turn_step: { cost: 1 },
};

const V18_ENEMY_HP: Record<string, number> = { balanced_standard: 26, guard_standard: 34, resonance_standard: 32 };

/** 敌人细则 V1.1（策划书 V1.8）中的敌人配置数值。 */
export function enemy18(id: string): EnemyConfig {
  const config = findEnemy(id)!;
  if (V18_ENEMY_HP[id] !== undefined) config.hpMax = V18_ENEMY_HP[id]!;
  delete config.basePowerBonus;
  return config;
}

/** 按策划书 V1.8 的规则、组件价与敌人数值建立战斗。目录中的敌人 ID 自动换成 V1.8 数值。 */
export function battle18(p: FighterInput, enemy: EnemyInput, seed = 1, extra: Partial<BattleInput> = {}): BattleState {
  const e = typeof enemy.config === 'string' ? { ...enemy, config: enemy18(enemy.config) } : enemy;
  return createBattle({ seed, player: p, enemy: e, rules: V18_RULES, artOverrides: V18_ART_OVERRIDES, ...extra, ...(extra.rules ? { rules: { ...V18_RULES, ...extra.rules } } : {}) });
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
