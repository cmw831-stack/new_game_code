// A／B 对照：同一对手、同一种子、同一决策序列下，两个构筑各自从相同输入重新开始，逐轮并列。
// 依据：教学细则 V1.2 3.1 节（从相同输入重新开始，不能把 A 的状态接给 B；可将两版延长到相同轮数与决策序列）、
// 4.5 节（对照记录显示条件；条件不同时提示）；主计划 V1.9.1 9.1 节（对比项）。

import { runRound } from '../engine/round.ts';
import type { BattleEvent, BattleState, Decision, EndReason } from '../rules/types.ts';

export interface Snapshot {
  player: { hp: number; qi: number; posture: number };
  enemy: { hp: number; posture: number; cold: number; frozen: boolean };
  /** 本轮玩家造成的实际气血伤害。 */
  dealt: number;
  /** 本轮玩家受到的实际气血伤害。 */
  taken: number;
  /** 本轮玩家实际支付的内力。 */
  qiSpent: number;
  /** 本轮敌方反震命中次数。 */
  resonance: number;
  /** 本轮玩家武学成功发动次数。 */
  casts: number;
  over: EndReason | null;
}

export interface CompareRow {
  round: number;
  decision: Decision;
  a: Snapshot | null;
  b: Snapshot | null;
}

export interface Comparison {
  rows: CompareRow[];
  a: { outcome: EndReason | null; rounds: number };
  b: { outcome: EndReason | null; rounds: number };
  /** 第一处结果不同的轮次；完全相同时为 null。 */
  firstDivergence: number | null;
}

function snapshot(state: BattleState, events: BattleEvent[]): Snapshot {
  const sum = (pred: (e: BattleEvent) => boolean, key: string) => events.filter(pred).reduce((n, e) => n + (e.data[key] as number), 0);
  return {
    player: { hp: state.player.hp, qi: state.player.qi, posture: state.player.posture },
    enemy: { hp: state.enemy.hp, posture: state.enemy.posture, cold: state.enemy.status.cold, frozen: state.enemy.status.freezePending },
    dealt: sum((e) => e.type === 'hit' && e.side === 'player', 'hp'),
    taken: sum((e) => e.type === 'hit' && e.side === 'enemy', 'hp'),
    qiSpent: sum((e) => e.type === 'pay' && e.side === 'player', 'cost'),
    resonance: events.filter((e) => e.type === 'hit' && e.side === 'enemy' && e.art === 'npc_resonance').length,
    casts: events.filter((e) => e.type === 'cast' && e.side === 'player').length,
    over: state.over?.reason ?? null,
  };
}

/**
 * 把 A 的变招翻译给 B：按装备位对应武学 ID。A 有、B 在同位没有的武学，暂停改为不变招；
 * 优先级按同位重排。翻译后不合法的变招在 B 侧去掉，并照常只做基础姿态。
 */
export function translateDecision(decision: Decision, from: BattleState, to: BattleState): Decision {
  const c = decision.change;
  if (!c || (!c.pause && !c.priority)) return decision;
  const map = new Map(from.player.arts.map((a) => [a.art.id, to.player.arts[a.slot]?.art.id]));
  const ids = (list: string[]) => list.map((id) => map.get(id));
  if (c.pause) {
    const [id] = ids(c.pause);
    return id ? { stance: decision.stance, change: { pause: [id] } } : { stance: decision.stance };
  }
  const order = ids(c.priority!);
  if (order.some((id) => !id) || order.length !== to.player.arts.length) return { stance: decision.stance };
  return { stance: decision.stance, change: { priority: order as string[] } };
}

/** 两个初始状态（只差构筑）按同一决策序列各自结算，直到序列用完或双方都结束。 */
export function compareVersions(a0: BattleState, b0: BattleState, decisions: readonly Decision[]): Comparison {
  let a = a0;
  let b = b0;
  const rows: CompareRow[] = [];
  let firstDivergence: number | null = null;
  for (const [i, d] of decisions.entries()) {
    if (a.over && b.over) break;
    const row: CompareRow = { round: i + 1, decision: d, a: null, b: null };
    if (!a.over) {
      const r = runRound(a, d);
      row.a = snapshot(r.state, r.events);
      const db = translateDecision(d, a, b);
      a = r.state;
      if (!b.over) {
        const rb = runRound(b, db);
        row.b = snapshot(rb.state, rb.events);
        b = rb.state;
      }
    } else {
      const rb = runRound(b, translateDecision(d, a, b));
      row.b = snapshot(rb.state, rb.events);
      b = rb.state;
    }
    if (firstDivergence === null && JSON.stringify(row.a) !== JSON.stringify(row.b)) firstDivergence = row.round;
    rows.push(row);
  }
  const count = (side: 'a' | 'b') => rows.filter((r) => r[side]).length;
  return {
    rows,
    a: { outcome: a.over?.reason ?? null, rounds: count('a') },
    b: { outcome: b.over?.reason ?? null, rounds: count('b') },
    firstDivergence,
  };
}
