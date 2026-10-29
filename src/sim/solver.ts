// E2 求解器（目标 V2 第四节）：敌人行为公开且确定，每一局是单人规划问题。
// 对给定开局，带记忆地穷举玩家每轮的姿态（可选再加变招），求最优结果与最优打法。
// 求解口径（价值排序、轮数上限、变招选项）见 docs/engine/e2-solver.md；这里只做搜索，不含规则。

import { runRound } from '../engine/round.ts';
import type { BattleState, Decision, FighterState, Stance } from '../rules/types.ts';

export const STANCES: readonly Stance[] = ['attack', 'guard', 'breathe'];

export interface SolveOptions {
  /** 轮数上限：到这一轮结束仍未分胜负记为“未分胜负”。 */
  horizon: number;
  /** 是否搜索变招（每战两次：暂停一门、本轮优先级、本轮留力）。 */
  changes: boolean;
  /** 变招可选的本轮留力值。 */
  reserveLevels: readonly number[];
}

export const DEFAULT_SOLVE: SolveOptions = { horizon: 30, changes: false, reserveLevels: [0, 2, 4, 6] };

export type Tier = 'victory' | 'undecided' | 'defeat';

/** 一个局面在最优打法下的结果。 */
export interface Outcome {
  tier: Tier;
  /** 结束时玩家剩余气血（未分胜负或败退时也记）。 */
  hp: number;
  /** 结束时敌方剩余气血。 */
  enemyHp: number;
  /** 从开局到结束的轮数。 */
  round: number;
}

const TIER_RANK: Record<Tier, number> = { victory: 2, undecided: 1, defeat: 0 };

/**
 * 价值排序（越大越好）：先比胜负（胜 > 未分 > 负）；
 * 胜：剩余气血多者优，再比轮数少；未分与负：敌方剩余气血少者优，再比玩家剩余气血多、轮数多（撑得久）。
 */
export function compareOutcome(a: Outcome, b: Outcome): number {
  if (a.tier !== b.tier) return TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (a.tier === 'victory') return a.hp - b.hp || b.round - a.round;
  return b.enemyHp - a.enemyHp || a.hp - b.hp || a.round - b.round;
}

function snapFighter(f: FighterState): unknown[] {
  const st = f.status;
  return [f.hp, f.qi, f.posture, f.reserve, f.actionSeq, f.basicUsedThisRound,
    st.ward && [st.ward.source, st.ward.expiresRound, st.ward.lockedCast, st.ward.lockedRoot],
    st.step?.expiresRound ?? null, st.cold, st.freezePending, st.protectedSeq, st.coldCapReduced,
    st.opening?.expiresAfterSeq ?? null, st.crashedThisRound];
}

/**
 * 局面键（不含变招余量）：只含会影响此后结算的可变字段。事件序号、连锁与施放编号计数只用于记录，不进键；
 * 整场事件计数只影响 32,768 的诊断上限，求解轮数内达不到，也不进键（见 docs/engine/e2-solver.md）。
 */
export function positionKey(s: BattleState): string {
  const sc = s.script;
  return JSON.stringify([s.round, s.rng, sc.segIndex, sc.itemIndex, sc.nextSegIndex, snapFighter(s.player), snapFighter(s.enemy)]);
}

export function stateKey(s: BattleState, position = positionKey(s)): string {
  return `${s.changesLeft}|${position}`;
}

/** 某局面玩家可选的全部决策：三种姿态，变招额度未用完时再加各项变招。 */
export function decisionsAt(s: BattleState, opts: SolveOptions): Decision[] {
  const out: Decision[] = STANCES.map((stance) => ({ stance }));
  if (!opts.changes || s.changesLeft <= 0) return out;
  const ids = s.player.arts.map((a) => a.art.id);
  const changes: NonNullable<Decision['change']>[] = [];
  for (const id of ids) changes.push({ pause: [id] });
  for (const p of permutations(ids)) if (p.some((id, i) => id !== ids[i])) changes.push({ priority: p });
  for (const r of opts.reserveLevels) if (r !== s.player.reserve) changes.push({ reserve: r });
  for (const change of changes) for (const stance of STANCES) out.push({ stance, change });
  return out;
}

function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

export interface SolveNode { outcome: Outcome; best: Decision }

/** 记忆表项：exact 是精确值；upper 表示真实值不超过 outcome（被剪枝时只知道上界）。 */
interface Entry { outcome: Outcome; best: Decision | null; exact: boolean }

/**
 * 局面价值的上界：双方气血只减不增（战斗细则第五章：气血只因打击减少，本阶段没有回复气血的效果），
 * 所以从这里出发最好的结果是“本轮就以现有气血获胜”。
 */
export function upperBound(s: BattleState): Outcome {
  return { tier: 'victory', hp: s.player.hp, enemyHp: 0, round: s.round };
}

export class Solver {
  readonly memo = new Map<string, Entry>();
  /** 实际调用 runRound 的次数。 */
  calls = 0;
  readonly opts: SolveOptions;
  constructor(opts: Partial<SolveOptions> = {}) {
    this.opts = { ...DEFAULT_SOLVE, ...opts };
  }

  /** 已结束或到达上限的局面直接给出结果。 */
  terminal(s: BattleState): Outcome | null {
    const base = { hp: s.player.hp, enemyHp: s.enemy.hp, round: s.round };
    if (s.over) {
      const tier: Tier = s.over.reason === 'victory' ? 'victory' : s.over.reason === 'defeat' ? 'defeat' : 'undecided';
      return { tier, ...base };
    }
    if (s.round > this.opts.horizon) return { tier: 'undecided', ...base };
    return null;
  }

  next(s: BattleState, d: Decision): BattleState {
    this.calls += 1;
    return runRound(s, d).state;
  }

  /** 该局面在最优打法下的精确结果与第一步。 */
  solve(s: BattleState): SolveNode {
    const t = this.terminal(s);
    if (t) return { outcome: t, best: { stance: 'attack' } };
    const e = this.search(s, null);
    return { outcome: e.outcome, best: e.best! };
  }

  value(s: BattleState): Outcome {
    return this.solve(s).outcome;
  }

  /**
   * 带下界剪枝的深度优先搜索（单人最大化）。alpha 是调用方已经拿得到的结果：
   * 返回 exact 时是精确值；否则真实值不超过返回值且不超过 alpha，调用方不需要它。
   */
  private search(s: BattleState, alpha: Outcome | null, position = positionKey(s)): Entry {
    const t = this.terminal(s);
    if (t) return { outcome: t, best: null, exact: true };
    const key = stateKey(s, position);
    const hit = this.memo.get(key);
    if (hit && (hit.exact || (alpha && compareOutcome(hit.outcome, alpha) <= 0))) return hit;
    const ub = upperBound(s);
    if (alpha && compareOutcome(ub, alpha) <= 0) return { outcome: ub, best: null, exact: false };
    let best: Outcome | null = null;
    let bestDecision: Decision | null = null;
    let bound: Outcome | null = null;
    // 结果相同的决策只搜一次；变招余量多的局面不会更差，所以同一结果只保留余量最多的那个（不用变招的姿态排在前面）。
    const seen = new Map<string, number>();
    for (const d of decisionsAt(s, this.opts)) {
      const n = this.next(s, d);
      const pos = positionKey(n);
      if ((seen.get(pos) ?? -1) >= n.changesLeft) continue;
      seen.set(pos, n.changesLeft);
      const floor = best && (!alpha || compareOutcome(best, alpha) > 0) ? best : alpha;
      const child = this.search(n, floor, pos);
      if (child.exact) {
        if (!best || compareOutcome(child.outcome, best) > 0) { best = child.outcome; bestDecision = d; }
      } else if (!bound || compareOutcome(child.outcome, bound) > 0) bound = child.outcome;
      if (best && compareOutcome(best, ub) >= 0) break;
    }
    // 被剪掉的分支都不超过当时的 floor，而 floor 不超过 max(alpha, best)：best 高于 alpha 时就是精确值。
    const exact = best !== null && (!alpha || compareOutcome(best, alpha) > 0);
    const outcome = exact ? best! : [best, bound].reduce<Outcome>((m, x) => (x && compareOutcome(x, m) > 0 ? x : m), best ?? bound!);
    const entry: Entry = { outcome, best: exact ? bestDecision : null, exact };
    this.memo.set(key, entry);
    return entry;
  }

  /** 每种姿态（可配变招）在其后最优续打下的最好结果，都是精确值。 */
  stanceBest(s: BattleState): Record<Stance, Outcome> {
    const out = {} as Record<Stance, Outcome>;
    for (const stance of STANCES) {
      let best: Outcome | null = null;
      for (const d of decisionsAt(s, this.opts)) {
        if (d.stance !== stance) continue;
        const child = this.search(this.next(s, d), best);
        if (child.exact && (!best || compareOutcome(child.outcome, best) > 0)) best = child.outcome;
      }
      out[stance] = best!;
    }
    return out;
  }

  /** 以该姿态（可配变招）开头，能否得到严格好于 floor 的结果。只要回答是或否，剪枝比求精确值多得多。 */
  exceeds(s: BattleState, stance: Stance, floor: Outcome): boolean {
    for (const d of decisionsAt(s, this.opts)) {
      if (d.stance !== stance) continue;
      const child = this.search(this.next(s, d), floor);
      if (child.exact && compareOutcome(child.outcome, floor) > 0) return true;
    }
    return false;
  }

  /** 从开局按最优打法走到结束：每轮的局面、最优决策、唯一最优的姿态与是否关键轮（定义见 e2-solver.md 第三节；withKey 为 false 时不算关键轮）。 */
  line(s0: BattleState, withKey = true): LineStep[] {
    const out: LineStep[] = [];
    let s = s0;
    while (!this.terminal(s)) {
      const { best, outcome } = this.solve(s);
      const others = STANCES.filter((x) => x !== best.stance);
      // 另一姿态能达到同样好的结果（严格好于“紧挨着的更差结果”），最优姿态就不唯一。
      const ties = others.filter((y) => this.exceeds(s, y, justBelow(outcome)));
      const unique = ties.length === 0 ? best.stance : null;
      // “能否赢”要穷尽赢不了的分支，代价是求解本身的两倍多；E2 只在只选姿态的批次里算它。
      const key = withKey && outcome.tier === 'victory' && others.some((y) => !ties.includes(y) && !this.exceeds(s, y, BEST_UNDECIDED));
      out.push({ state: s, best, outcome, unique, key });
      s = this.next(s, best);
    }
    return out;
  }
}

/** 价值排序中紧挨在 o 下面的结果：严格好于它，就等于不差于 o。 */
export function justBelow(o: Outcome): Outcome {
  return o.tier === 'victory' ? { ...o, round: o.round + 1 } : { ...o, round: o.round - 1 };
}

/** 比任何“未分胜负”都好、比任何胜利都差的哨兵：严格好于它，就是能赢。 */
export const BEST_UNDECIDED: Outcome = { tier: 'undecided', hp: Infinity, enemyHp: -1, round: Infinity };

export interface LineStep { state: BattleState; best: Decision; outcome: Outcome; unique: Stance | null; key: boolean }
