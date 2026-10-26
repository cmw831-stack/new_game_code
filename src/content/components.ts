// 五槽组件价表与编译。数据来源：docs/design/wulin-components-v1.1.md 第一至五章。

import type { ActionDef, ArtCategory, ArtDef, FollowupDef, ModifierId, Power, RecoveryDef, TriggerDef, WeaponClass } from '../rules/types.ts';

export type TriggerId = 'T_contact' | 'T_dodge' | 'T_block' | 'T_break' | 'T_qi' | 'T_status';
export type ActionId = 'A_single' | 'A_combo' | 'A_heavy' | 'A_break' | 'A_ward' | 'A_step' | 'A_qi' | 'A_counter';
export type ModifierComponentId = 'M_gang' | 'M_soft' | 'M_cold' | 'M_shock';
export type FollowupId = 'F_hit_single' | 'F_freeze_combo';
export type RecoveryId = 'R_qi' | 'R_posture';
export type Tier = '甲' | '乙';

/** 一门秘籍的五槽装配。劲力、变化、收势可为 null（中性“无”）。 */
export interface ArtSpec {
  id: string;
  name: string;
  category: ArtCategory;
  trigger: TriggerId;
  /** T_qi：8 或 10；T_status：'cold2' 或 'freeze'。 */
  triggerParam?: number | 'cold2' | 'freeze';
  action: ActionId;
  tier?: Tier;
  modifier: ModifierComponentId | null;
  followup: FollowupId | null;
  recovery: RecoveryId | null;
  perRound?: boolean;
}

const TRIGGER_COST: Record<TriggerId, number> = {
  T_contact: 0,
  T_dodge: -1,
  T_block: -1,
  T_break: -1,
  T_qi: 0,
  T_status: 0,
};

interface ActionTier {
  cost: number;
  capacity: number;
  hits?: Power[];
  amount?: number;
}

interface ActionComponent {
  kind: 'attack' | 'ward' | 'step' | 'qi';
  attackType?: 'single' | 'combo' | 'heavy' | 'break' | 'counter';
  swordOnly: boolean;
  tiers: Partial<Record<Tier, ActionTier>> & { 甲: ActionTier };
}

const p = (hp: number, posture: number): Power => ({ hp, posture });

export const ACTIONS: Record<ActionId, ActionComponent> = {
  A_single: {
    kind: 'attack', attackType: 'single', swordOnly: false,
    tiers: { 甲: { cost: 2, capacity: 2, hits: [p(4, 0)] }, 乙: { cost: 2, capacity: 2, hits: [p(3, 2)] } },
  },
  A_combo: {
    kind: 'attack', attackType: 'combo', swordOnly: true,
    tiers: {
      甲: { cost: 2, capacity: 3, hits: [p(2, 1), p(2, 1)] },
      乙: { cost: 3, capacity: 4, hits: [p(3, 2), p(3, 2), p(3, 2)] },
    },
  },
  A_heavy: {
    kind: 'attack', attackType: 'heavy', swordOnly: false,
    tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, capacity: 4, hits: [p(6, 5)] } },
  },
  A_break: {
    kind: 'attack', attackType: 'break', swordOnly: false,
    tiers: { 甲: { cost: 3, capacity: 4, hits: [p(2, 8)] }, 乙: { cost: 3, capacity: 4, hits: [p(3, 6)] } },
  },
  A_ward: { kind: 'ward', swordOnly: false, tiers: { 甲: { cost: 2, capacity: 3 } } },
  A_step: { kind: 'step', swordOnly: false, tiers: { 甲: { cost: 2, capacity: 3 } } },
  A_qi: {
    kind: 'qi', swordOnly: false,
    tiers: { 甲: { cost: 0, capacity: 2, amount: 1 }, 乙: { cost: 1, capacity: 2, amount: 2 } },
  },
  A_counter: {
    kind: 'attack', attackType: 'counter', swordOnly: false,
    tiers: { 甲: { cost: 4, capacity: 3, hits: [p(6, 2)] }, 乙: { cost: 4, capacity: 3, hits: [p(4, 5)] } },
  },
};

const MODIFIERS: Record<ModifierComponentId, { id: ModifierId; cost: number; capacity: number }> = {
  M_gang: { id: 'gang', cost: 1, capacity: 1 },
  M_soft: { id: 'soft', cost: 0, capacity: 1 },
  M_cold: { id: 'cold', cost: 1, capacity: 2 },
  M_shock: { id: 'shock', cost: 1, capacity: 1 },
};

const FOLLOWUPS: Record<FollowupId, { capacity: number; def: FollowupDef }> = {
  F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)], cost: 2, swordOnly: false } },
  F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2, 1), p(2, 1)], cost: 2, swordOnly: true } },
};

const RECOVERIES: Record<RecoveryId, { cost: number; capacity: number; def: RecoveryDef }> = {
  R_qi: { cost: 1, capacity: 1, def: { kind: 'qiOnHpDamage', amount: 2 } },
  R_posture: { cost: 0, capacity: 1, def: { kind: 'postureOnComplete', amount: 2 } },
};

/** 编辑时的合法性问题；空数组表示合法。 */
export function specProblems(spec: ArtSpec, weaponClass?: WeaponClass): string[] {
  const problems: string[] = [];
  const action = ACTIONS[spec.action];
  if (!action) return [`未知主招组件：${spec.action}`];
  if (!(spec.trigger in TRIGGER_COST)) problems.push(`未知起势组件：${spec.trigger}`);
  const tier = action.tiers[spec.tier ?? '甲'];
  if (!tier) problems.push(`${spec.action} 没有 ${spec.tier} 档`);
  const isAttack = action.kind === 'attack';
  if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.triggerParam !== 10) {
    problems.push('T_qi 阈值只能是 8 或 10');
  }
  if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && spec.triggerParam !== 'freeze') {
    problems.push('T_status 条件只能是“寒意跨 2”或“冻结出现”');
  }
  if (spec.action === 'A_counter' && spec.trigger !== 'T_block' && spec.trigger !== 'T_dodge') {
    problems.push('反击主招只接受格挡或闪避起势');
  }
  if (spec.modifier) {
    if (!MODIFIERS[spec.modifier]) problems.push(`未知劲力组件：${spec.modifier}`);
    else if (!isAttack) problems.push('劲力只能装在攻击主招上');
    else if ((spec.modifier === 'M_soft' || spec.modifier === 'M_shock') && tier?.hits && (tier.hits[0]?.hp ?? 0) < 2) {
      problems.push('柔劲、震劲要求主招原始首次气血威力至少 2');
    }
  }
  if (spec.followup) {
    if (!FOLLOWUPS[spec.followup]) problems.push(`未知变化组件：${spec.followup}`);
    else if (!isAttack) problems.push('变化只能装在攻击主招上');
    else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_cold') {
      problems.push('冻结追击必须与本门寒劲共同装配');
    }
  }
  if (spec.recovery) {
    if (!RECOVERIES[spec.recovery]) problems.push(`未知收势组件：${spec.recovery}`);
    else if (spec.recovery === 'R_qi' && !isAttack) problems.push('伤血回气只兼容攻击主招');
    else if (spec.recovery === 'R_posture' && isAttack) problems.push('复架势只兼容回气或状态主招');
  }
  if (weaponClass && weaponClass !== 'sword') {
    const swordOnly = action.swordOnly || (spec.followup ? FOLLOWUPS[spec.followup]?.def.swordOnly : false);
    if (swordOnly) problems.push('该秘籍带剑专用组件，当前兵器不是剑');
  }
  return problems;
}

function triggerDef(spec: ArtSpec): TriggerDef {
  switch (spec.trigger) {
    case 'T_contact': return { kind: 'contact' };
    case 'T_dodge': return { kind: 'dodge' };
    case 'T_block': return { kind: 'block' };
    case 'T_break': return { kind: 'break' };
    case 'T_qi': return { kind: 'qiCross', threshold: spec.triggerParam as number };
    case 'T_status': return { kind: 'status', condition: spec.triggerParam as 'cold2' | 'freeze' };
  }
}

/** 按统一价表编译：先相加组件与唯一起势修正，再应用攻击最低 1／其他最低 0。 */
export function compileArt(spec: ArtSpec): ArtDef {
  const problems = specProblems(spec);
  if (problems.length > 0) throw new Error(`${spec.id} 不合法：${problems.join('；')}`);
  const action = ACTIONS[spec.action];
  const tier = action.tiers[spec.tier ?? '甲']!;
  const mod = spec.modifier ? MODIFIERS[spec.modifier] : null;
  const fol = spec.followup ? FOLLOWUPS[spec.followup] : null;
  const rec = spec.recovery ? RECOVERIES[spec.recovery] : null;
  const isAttack = action.kind === 'attack';
  const raw = tier.cost + (mod?.cost ?? 0) + (rec?.cost ?? 0) + TRIGGER_COST[spec.trigger];
  const cost = Math.max(isAttack ? 1 : 0, raw);
  const capacity = tier.capacity + (mod?.capacity ?? 0) + (fol?.capacity ?? 0) + (rec?.capacity ?? 0);
  let actionDef: ActionDef;
  if (action.kind === 'attack') {
    actionDef = { kind: 'attack', type: action.attackType!, hits: tier.hits!.map((h) => ({ ...h })), swordOnly: action.swordOnly };
  } else if (action.kind === 'qi') {
    actionDef = { kind: 'qi', amount: tier.amount! };
  } else {
    actionDef = { kind: action.kind };
  }
  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    trigger: triggerDef(spec),
    action: actionDef,
    modifier: mod?.id ?? null,
    followup: fol ? { ...fol.def, hits: fol.def.hits.map((h) => ({ ...h })) } : null,
    recovery: rec?.def ?? null,
    cost,
    capacity,
    perRound: spec.perRound ?? false,
  };
}
