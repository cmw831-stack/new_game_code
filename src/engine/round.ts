// 一轮的完整结算。时序见战斗细则 V1.1 第四、五、八章与执行契约 V1.1 第三章：
// 显示敌招 → 玩家承诺 → 共同准备 → 轮初恢复 → 先手／后手基础行动及整根连锁 → 轮末收束。
//
// runRound 是纯函数：先复制输入状态再结算，因此同一函数也用作本轮预览。

import { pick } from '../rules/rng.ts';
import {
  other,
  type ArtInstance,
  type BattleEvent,
  type BattleOutcome,
  type BattleState,
  type Decision,
  type EventType,
  type FighterState,
  type ModifierId,
  type Phase,
  type Power,
  type RoundIntent,
  type RoundModifiers,
  type RoundResult,
  type Side,
  type Stance,
  type TriggerDef,
} from '../rules/types.ts';
import { ValidationError } from './setup.ts';

const SIDES: Side[] = ['player', 'enemy'];
const GUARD_POSTURE = 4;
const BREATHE_QI = 4;
const REGEN_QI = 2;
const OPENING_BONUS = 2;

type Data = BattleEvent['data'];

/** 战斗在任意阶段结束时抛出，用于立即停止后续动作。 */
class Halt {}

interface HitOptions {
  castId: number;
  artId: string | null;
  basic: boolean;
  modifier: ModifierId | null;
  depth: number;
}

interface HitResult {
  contacts: number;
  hpDamage: number;
  froze: boolean;
}

interface Candidate {
  inst: ArtInstance;
  fact: BattleEvent;
}

class RoundContext {
  readonly s: BattleState;
  readonly events: BattleEvent[] = [];
  private readonly offered = new Map<number, Set<Side>>();
  private readonly mods: RoundModifiers;
  private phase: Phase = 'intent';
  private root: number | null = null;
  private rootEvents = 0;
  private readonly rootUsage = new Set<string>();

  constructor(s: BattleState, mods: RoundModifiers) {
    this.s = s;
    this.mods = mods;
  }

  // ---------- 基础工具 ----------

  f(side: Side): FighterState {
    return side === 'player' ? this.s.player : this.s.enemy;
  }

  private stance(side: Side, decision: Decision): Stance {
    return side === 'player' ? decision.stance : this.s.intent!.stance;
  }

  private reserve(side: Side): number {
    return side === 'player' ? (this.mods.reserve ?? this.s.player.reserve) : this.s.enemy.reserve;
  }

  emit(type: EventType, side: Side | null, art: string | null, data: Data, cast: number | null = null, depth = 0): BattleEvent {
    const s = this.s;
    const ev: BattleEvent = {
      seq: ++s.eventSeq,
      round: s.round,
      phase: this.phase,
      root: this.root,
      cast,
      parent: null,
      depth,
      type,
      side,
      art,
      data,
    };
    this.events.push(ev);
    s.eventsThisRound++;
    s.eventsThisBattle++;
    if (this.root !== null) this.rootEvents++;
    if (type !== 'battleEnd') {
      const l = s.limits;
      if (this.root !== null && this.rootEvents > l.eventsPerRoot) this.halt('safetyLimit', null, `单根事件超过 ${l.eventsPerRoot}`);
      if (s.eventsThisRound > l.eventsPerRound) this.halt('safetyLimit', null, `单轮事件超过 ${l.eventsPerRound}`);
      if (s.eventsThisBattle > l.eventsPerBattle) this.halt('safetyLimit', null, `单场事件超过 ${l.eventsPerBattle}`);
    }
    return ev;
  }

  halt(reason: BattleOutcome['reason'], winner: Side | null, detail: string): never {
    if (!this.s.over) {
      this.s.over = { reason, winner, detail };
      this.emit('battleEnd', winner, null, { reason, detail });
    }
    throw new Halt();
  }

  private beginRoot(): void {
    this.root = this.s.nextRootId++;
    this.rootEvents = 0;
    this.rootUsage.clear();
  }

  private endRoot(): void {
    // wardScope 为 chain 时，基础架招护势在被锁定的敌方根连锁结束后消费。
    for (const side of SIDES) {
      const w = this.f(side).status.ward;
      if (w && this.root !== null && w.lockedRoot === this.root) {
        this.f(side).status.ward = null;
        this.emit('wardConsumed', side, null, { scope: 'chain' });
      }
    }
    this.root = null;
  }

  private wasOffered(ev: BattleEvent, side: Side): boolean {
    return this.offered.get(ev.seq)?.has(side) ?? false;
  }

  private markOffered(ev: BattleEvent, side: Side): void {
    let set = this.offered.get(ev.seq);
    if (!set) this.offered.set(ev.seq, (set = new Set()));
    set.add(side);
  }

  private since(mark: number): BattleEvent[] {
    return this.events.slice(mark);
  }

  private gainQi(side: Side, amount: number, source: string, cast: number | null = null, depth = 0): void {
    const f = this.f(side);
    const before = f.qi;
    f.qi = Math.min(f.qiMax, f.qi + amount);
    if (f.qi > before) this.emit('qi', side, null, { before, after: f.qi, source }, cast, depth);
  }

  private gainPosture(side: Side, amount: number, source: string, cast: number | null = null, depth = 0): void {
    const f = this.f(side);
    const before = f.posture;
    f.posture = Math.min(f.postureMax, f.posture + amount);
    if (f.posture > before) this.emit('posture', side, null, { before, after: f.posture, source }, cast, depth);
  }

  // ---------- 基础行动机会、破绽与冻结保护 ----------

  /** 占用本轮基础行动机会；若有待执行的冻结跳过则跳过。 */
  private takeOpportunity(side: Side, stance: Stance): 'go' | 'skipped' {
    const f = this.f(side);
    f.actionSeq += 1;
    f.basicUsedThisRound = true;
    const seq = f.actionSeq;
    if (f.status.freezePending && f.status.protectedSeq !== seq) {
      f.status.freezePending = false;
      f.status.protectedSeq = seq + 1;
      this.emit('freezeSkip', side, null, { seq, stance });
      this.afterOpportunity(side);
      return 'skipped';
    }
    return 'go';
  }

  /** 一次基础行动机会（含其整根连锁）结束后：破绽到期、冻结保护结束。 */
  private afterOpportunity(side: Side): void {
    const f = this.f(side);
    const op = f.status.opening;
    if (op && f.actionSeq >= op.expiresAfterSeq) {
      f.status.opening = null;
      this.emit('openingExpired', side, null, { seq: f.actionSeq });
    }
    if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protectedSeq) {
      f.status.protectedSeq = null;
      f.status.coldCapReduced = false;
    }
  }

  private applyCold(side: Side, amount: number, cast: number, depth: number): boolean {
    const t = this.f(side);
    const cap = t.status.coldCapReduced ? t.coldCapProtected : t.coldThreshold;
    const before = t.status.cold;
    const after = Math.min(cap, before + amount);
    if (after === before) return false;
    t.status.cold = after;
    this.emit('cold', side, null, { before, after, cap }, cast, depth);
    if (after >= t.coldThreshold) {
      t.status.cold = 0;
      t.status.freezePending = true;
      t.status.coldCapReduced = true;
      this.emit('freeze', side, null, {}, cast, depth);
      return true;
    }
    return false;
  }

  // ---------- 打击 ----------

  /** 一门主招逐击结算（战斗细则 5.3 节）。 */
  private executeHits(side: Side, hits: Power[], o: HitOptions): HitResult {
    const a = this.f(side);
    const targetSide = other(side);
    const t = this.f(targetSide);
    let contacts = 0;
    let hpDamage = 0;
    let froze = false;
    hits.forEach((h, hitIndex) => {
      if (t.status.step) {
        t.status.step = null;
        this.emit('dodge', targetSide, null, { attacker: side, hitIndex }, o.castId, o.depth);
        return;
      }
      const first = contacts === 0;
      let hp = h.hp;
      let posture = h.posture;
      if (first) {
        if ((o.basic || o.modifier === 'gang') && a.status.opening) {
          a.status.opening = null;
          hp += OPENING_BONUS;
          this.emit('openingConsumed', side, o.artId, { bonus: OPENING_BONUS }, o.castId, o.depth);
        }
        if (o.modifier === 'shock') {
          hp = Math.max(0, hp - 2);
          posture += 4;
        } else if (o.modifier === 'soft') {
          hp = Math.max(0, hp - 2);
        }
      }
      const ward = t.status.ward;
      let blocked = false;
      if (ward) {
        const chain = ward.source === 'basic' && this.s.rules.wardScope === 'chain';
        const free = chain
          ? ward.lockedRoot === null || ward.lockedRoot === this.root
          : ward.lockedCast === null || ward.lockedCast === o.castId;
        if (free) {
          if (chain) ward.lockedRoot = this.root;
          else ward.lockedCast = o.castId;
          blocked = t.posture > 0 && !t.status.crashedThisRound;
        }
      }
      const hpLoss = Math.min(blocked ? hp >> 1 : hp, t.hp);
      const postureBefore = t.posture;
      const postureLoss = Math.min(posture, t.posture);
      t.hp -= hpLoss;
      t.posture -= postureLoss;
      contacts += 1;
      hpDamage += hpLoss;
      this.emit('hit', side, o.artId, {
        target: targetSide, hitIndex, basic: o.basic, blocked,
        hpPower: hp, posturePower: posture, hp: hpLoss, posture: postureLoss,
        targetHp: t.hp, targetPosture: t.posture,
      }, o.castId, o.depth);
      if (blocked) this.emit('block', targetSide, null, { attacker: side }, o.castId, o.depth);
      if (t.hp <= 0) {
        this.emit('death', targetSide, null, {}, o.castId, o.depth);
        this.halt(side === 'player' ? 'victory' : 'defeat', side, `${t.name}气血归零`);
      }
      if (postureBefore > 0 && t.posture === 0 && !t.status.crashedThisRound) {
        t.status.crashedThisRound = true;
        this.emit('crash', targetSide, null, { by: side }, o.castId, o.depth);
        if (!a.status.opening) {
          a.status.opening = { expiresAfterSeq: a.actionSeq + 1 };
          this.emit('opening', side, null, { expiresAfterSeq: a.actionSeq + 1 }, o.castId, o.depth);
        }
      }
      if (first && o.modifier === 'soft') this.gainPosture(side, 2, 'soft', o.castId, o.depth);
      if (o.modifier === 'cold' && this.applyCold(targetSide, 1, o.castId, o.depth)) froze = true;
    });
    if (t.status.ward && t.status.ward.lockedCast === o.castId) {
      t.status.ward = null;
      this.emit('wardConsumed', targetSide, null, {}, o.castId, o.depth);
    }
    this.emit('mainEnd', side, o.artId, { target: targetSide, contacts, hp: hpDamage }, o.castId, o.depth);
    return { contacts, hpDamage, froze };
  }

  // ---------- 起势匹配与批次 ----------

  private matches(trigger: TriggerDef, side: Side, ev: BattleEvent): boolean {
    const opp = other(side);
    switch (trigger.kind) {
      case 'contact':
        return ev.type === 'hit' && ev.side === side && ev.data.basic === true;
      case 'dodge':
        return ev.type === 'dodge' && ev.side === side;
      case 'block':
        return ev.type === 'block' && ev.side === side;
      case 'break':
        return ev.type === 'crash' && ev.side === opp;
      case 'qiCross': {
        if (ev.type !== 'qi' || ev.side !== side) return false;
        const before = ev.data.before as number;
        const after = ev.data.after as number;
        return before < trigger.threshold && after >= trigger.threshold;
      }
      case 'status':
        if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.side === opp;
        return ev.type === 'cold' && ev.side === opp && (ev.data.before as number) < 2 && (ev.data.after as number) >= 2;
      case 'multiContact':
        return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === side && (ev.data.contacts as number) >= trigger.min;
    }
  }

  private orderedArts(side: Side): ArtInstance[] {
    const arts = this.f(side).arts;
    if (side !== 'player' || !this.mods.priority) return arts;
    const order = this.mods.priority;
    return [...arts].sort((x, y) => {
      const ix = order.indexOf(x.art.id);
      const iy = order.indexOf(y.art.id);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.slot - y.slot;
    });
  }

  private candidates(side: Side, facts: BattleEvent[]): Candidate[] {
    const blocked = side === 'player' ? this.mods.paused : this.s.intent?.disabled ?? [];
    const out: Candidate[] = [];
    for (const inst of this.orderedArts(side)) {
      if (blocked.includes(inst.art.id)) continue;
      const fact = facts.find((ev) => this.matches(inst.art.trigger, side, ev));
      if (fact) out.push({ inst, fact });
    }
    return out;
  }

  /**
   * 按批处理一方的自动响应：同一批内按编排顺序执行；批内施放产生的新事实，
   * 在整批处理完后才构成下一批（战斗细则 8.2、8.3 节）。
   */
  private processBatches(side: Side, facts: BattleEvent[], depth: number): void {
    let pending = facts.filter((ev) => !this.wasOffered(ev, side));
    while (pending.length > 0) {
      for (const ev of pending) this.markOffered(ev, side);
      const cands = this.candidates(side, pending);
      if (cands.length === 0) return;
      const mark = this.events.length;
      for (const c of cands) this.tryCast(side, c, depth);
      pending = this.since(mark).filter((ev) => !this.wasOffered(ev, side));
    }
  }

  private skip(side: Side, art: string, reason: string, depth: number, extra: Data = {}): void {
    this.emit('skip', side, art, { reason, ...extra }, null, depth);
  }

  private tryCast(side: Side, c: Candidate, depth: number): void {
    const f = this.f(side);
    const art = c.inst.art;
    if (f.hp <= 0) return;
    if (depth > this.s.limits.maxDepth) this.halt('safetyLimit', null, `连锁深度超过 ${this.s.limits.maxDepth}`);
    const key = `${side}:${c.inst.instanceId}`;
    if (this.rootUsage.has(key)) return this.skip(side, art.id, 'rootLimit', depth);
    if (art.perRound && this.s.roundUsage.includes(key)) return this.skip(side, art.id, 'roundLimit', depth);
    const act = art.action;
    if (act.kind === 'ward' && f.status.ward) return this.skip(side, art.id, 'statusExists', depth);
    if (act.kind === 'step' && f.status.step) return this.skip(side, art.id, 'statusExists', depth);
    if (act.kind === 'qi') {
      const postureGain = art.recovery?.kind === 'postureOnComplete' && f.posture < f.postureMax;
      if (f.qi >= f.qiMax && !postureGain) return this.skip(side, art.id, 'noGain', depth);
    }
    const isAttack = act.kind === 'attack';
    if (f.qi < art.cost) return this.skip(side, art.id, 'insufficientQi', depth, { cost: art.cost, qi: f.qi });
    if (isAttack && f.qi - art.cost < this.reserve(side)) {
      return this.skip(side, art.id, 'reserve', depth, { cost: art.cost, qi: f.qi, reserve: this.reserve(side) });
    }
    const castId = this.s.nextCastId++;
    this.rootUsage.add(key);
    if (art.perRound) this.s.roundUsage.push(key);
    this.emit('cast', side, art.id, { trigger: c.fact.seq, cost: art.cost }, castId, depth);
    if (art.cost > 0) {
      const before = f.qi;
      f.qi -= art.cost;
      this.emit('pay', side, art.id, { cost: art.cost, before, after: f.qi }, castId, depth);
    }
    this.resolveArt(side, c, castId, depth);
  }

  /** 一门已付款武学的完整结构：主招 → 受击方拆招 → 变化 → 收势 → 完成。 */
  private resolveArt(side: Side, c: Candidate, castId: number, depth: number): void {
    const f = this.f(side);
    const art = c.inst.art;
    const act = art.action;
    if (act.kind === 'attack') {
      const target = other(side);
      const hits = act.type === 'resonance'
        ? [{ hp: (art.resonancePerContact ?? 0) * (c.fact.data.contacts as number), posture: 0 }]
        : act.hits;
      const mark = this.events.length;
      const res = this.executeHits(side, hits, { castId, artId: art.id, basic: false, modifier: art.modifier, depth });
      this.processBatches(target, this.since(mark), depth + 1);
      if (f.hp <= 0) return;
      const fu = art.followup;
      if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) this.followup(side, c.inst, fu.hits, fu.cost, depth);
      if (art.recovery?.kind === 'qiOnHpDamage' && res.hpDamage > 0) this.gainQi(side, art.recovery.amount, art.id, castId, depth);
    } else if (act.kind === 'ward') {
      f.status.ward = { source: 'skill', expiresRound: this.s.round + 1, lockedCast: null, lockedRoot: null };
      this.emit('ward', side, art.id, { source: 'skill', expiresRound: this.s.round + 1 }, castId, depth);
    } else if (act.kind === 'step') {
      f.status.step = { expiresRound: this.s.round + 1 };
      this.emit('step', side, art.id, { expiresRound: this.s.round + 1 }, castId, depth);
    } else {
      this.gainQi(side, act.amount, art.id, castId, depth);
    }
    if (art.recovery?.kind === 'postureOnComplete') this.gainPosture(side, art.recovery.amount, art.id, castId, depth);
    this.emit('complete', side, art.id, {}, castId, depth);
  }

  /** 变化子招：独立检查内力、留力和限次，独立付款；不继承父招劲力、变化与收势。 */
  private followup(side: Side, inst: ArtInstance, hits: Power[], cost: number, depth: number): void {
    const f = this.f(side);
    const id = `${inst.art.id}:followup`;
    const key = `${side}:${inst.instanceId}:followup`;
    if (this.rootUsage.has(key)) return this.skip(side, id, 'rootLimit', depth);
    if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, { cost, qi: f.qi });
    if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'reserve', depth, { cost, qi: f.qi, reserve: this.reserve(side) });
    const castId = this.s.nextCastId++;
    this.rootUsage.add(key);
    this.emit('cast', side, id, { cost }, castId, depth);
    const before = f.qi;
    f.qi -= cost;
    this.emit('pay', side, id, { cost, before, after: f.qi }, castId, depth);
    const mark = this.events.length;
    this.executeHits(side, hits, { castId, artId: id, basic: false, modifier: null, depth });
    this.processBatches(other(side), this.since(mark), depth + 1);
  }

  // ---------- 一轮 ----------

  private lockIntent(): void {
    this.phase = 'intent';
    const s = this.s;
    const sc = s.script;
    const r = resolveIntent(s);
    if (r.draw) {
      s.rng = r.draw.rng;
      s.rngDraws += 1;
      const nextSeg = sc.segments[r.draw.index]!;
      this.emit('segmentDraw', 'enemy', null, { from: r.intent.segmentId, next: nextSeg.id, nextName: nextSeg.name });
    }
    sc.nextSegIndex = r.nextSegIndex;
    s.intent = r.intent;
    this.emit('intent', 'enemy', null, { stance: r.intent.stance, segment: r.intent.segmentId, item: sc.itemIndex, disabled: r.intent.disabled.join(',') });
  }

  play(decision: Decision): void {
    const s = this.s;
    s.eventsThisRound = 0;
    if (s.round > s.limits.maxRounds) this.halt('roundLimit', null, `超过 ${s.limits.maxRounds} 轮`);
    this.lockIntent();
    this.emit('decision', 'player', null, { stance: decision.stance });
    const c = decision.change;
    if (c) {
      const adjust = c.pause ? 'pause' : c.priority ? 'priority' : 'reserve';
      const value = c.pause ? c.pause[0]! : c.priority ? c.priority.join(',') : c.reserve!;
      this.emit('change', 'player', null, { changesLeft: s.changesLeft, adjust, value });
    }

    // 共同准备：先提交双方未被跳过的架招，再依次结清各自的准备连锁。
    this.phase = 'prepare';
    const guards: { side: Side; before: number }[] = [];
    for (const side of SIDES) {
      if (this.stance(side, decision) !== 'guard') continue;
      if (this.takeOpportunity(side, 'guard') === 'skipped') continue;
      const f = this.f(side);
      const before = f.posture;
      f.posture = Math.min(f.postureMax, f.posture + GUARD_POSTURE);
      // 整链护势规则下，架招一定建立本轮基础护势，取代已有的技能护势（负责人决定 Q17，2026-10-29）；
      // 单招护势规则下两种护势保护范围相同，保留原护势、不刷新期限（战斗细则 5.2 节）。
      const basic = { source: 'basic' as const, expiresRound: s.round, lockedCast: null, lockedRoot: null };
      if (!f.status.ward || s.rules.wardScope === 'chain') f.status.ward = basic;
      guards.push({ side, before });
    }
    for (const { side, before } of guards) {
      this.beginRoot();
      const mark = this.events.length;
      const f = this.f(side);
      this.emit('guard', side, null, { postureBefore: before, postureAfter: f.posture });
      if (f.posture > before) this.emit('posture', side, null, { before, after: f.posture, source: 'guard' });
      this.processBatches(side, this.since(mark), 1);
      this.processBatches(other(side), this.since(mark), 1);
      this.endRoot();
      this.afterOpportunity(side);
    }

    // 轮初恢复：双方数值先同时更新，再按玩家→敌人分别建立边界根。
    this.phase = 'regen';
    const regen = SIDES.map((side) => {
      const f = this.f(side);
      const before = f.qi;
      f.qi = Math.min(f.qiMax, f.qi + REGEN_QI);
      return { side, before, after: f.qi };
    });
    for (const { side, before, after } of regen) {
      if (after === before) continue;
      this.beginRoot();
      const mark = this.events.length;
      this.emit('qi', side, null, { before, after, source: 'regen' });
      this.processBatches(side, this.since(mark), 1);
      this.processBatches(other(side), this.since(mark), 1);
      this.endRoot();
    }

    // 基础行动：默认玩家先手。执行前再次检查最新冻结。
    this.phase = 'action';
    const order: Side[] = s.rules.initiative === 'enemyOnAttack' && s.intent!.stance === 'attack' ? ['enemy', 'player'] : SIDES;
    for (const side of order) {
      const f = this.f(side);
      if (f.basicUsedThisRound) continue;
      const stance = this.stance(side, decision);
      if (this.takeOpportunity(side, stance) === 'skipped') continue;
      this.beginRoot();
      const mark = this.events.length;
      if (stance === 'attack') {
        const castId = s.nextCastId++;
        this.emit('basicAttack', side, null, { weapon: f.weapon.id }, castId);
        this.executeHits(side, [f.weapon.base], { castId, artId: null, basic: true, modifier: null, depth: 0 });
        this.processBatches(other(side), this.since(mark), 1);
        if (f.hp > 0) this.processBatches(side, this.since(mark), 1);
      } else {
        this.gainQi(side, BREATHE_QI, 'breathe');
        this.processBatches(side, this.since(mark), 1);
        this.processBatches(other(side), this.since(mark), 1);
      }
      this.endRoot();
      this.afterOpportunity(side);
    }

    // 轮末：到期、崩溃恢复、推进段落。
    this.phase = 'roundEnd';
    for (const side of SIDES) {
      const f = this.f(side);
      if (f.status.ward && f.status.ward.expiresRound <= s.round) {
        f.status.ward = null;
        this.emit('expire', side, null, { status: 'ward' });
      }
      if (f.status.step && f.status.step.expiresRound <= s.round) {
        f.status.step = null;
        this.emit('expire', side, null, { status: 'step' });
      }
      if (f.status.crashedThisRound) {
        const floor = Math.floor((f.postureMax * f.crashFloorPct) / 100);
        if (f.posture < floor) this.gainPosture(side, floor - f.posture, 'crashRecovery');
        f.status.crashedThisRound = false;
      }
      f.basicUsedThisRound = false;
    }
    const sc = s.script;
    sc.itemIndex += 1;
    if (sc.itemIndex >= sc.segments[sc.segIndex]!.items.length) {
      sc.segIndex = sc.nextSegIndex ?? 0;
      sc.itemIndex = 0;
      sc.nextSegIndex = null;
    }
    s.roundUsage = [];
    this.emit('roundEnd', null, null, { round: s.round });
    s.round += 1;
  }
}

interface ResolvedIntent {
  intent: RoundIntent;
  nextSegIndex: number | null;
  draw: { index: number; rng: number } | null;
}

/** 本轮将锁定的敌方意图；段落最后一项时同时确定下一段落。不修改状态。 */
function resolveIntent(s: BattleState): ResolvedIntent {
  const sc = s.script;
  const segment = sc.segments[sc.segIndex]!;
  const item = segment.items[sc.itemIndex]!;
  const last = sc.itemIndex === segment.items.length - 1;
  let nextSegIndex = sc.nextSegIndex;
  let draw: ResolvedIntent['draw'] = null;
  if (last && nextSegIndex === null) {
    if (sc.fixed) {
      nextSegIndex = 0;
    } else {
      const r = pick(s.rng, sc.segments.length);
      draw = { index: r.index, rng: r.state };
      nextSegIndex = r.index;
    }
  }
  const next = last ? sc.segments[nextSegIndex!]!.items[0]! : segment.items[sc.itemIndex + 1]!;
  return {
    intent: {
      stance: item.stance,
      disabled: [...item.disabled],
      segmentId: segment.id,
      segmentName: segment.name,
      itemIndex: sc.itemIndex,
      segmentLength: segment.items.length,
      next: structuredClone(next),
    },
    nextSegIndex,
    draw,
  };
}

/**
 * 玩家承诺前界面上公开的本轮敌方意图，与 runRound 开始时锁定的意图完全一致。
 * 段落最后一项时，下一段落在锁定时抽定并公开，所以这里也一并给出。
 */
export function peekIntent(state: BattleState): RoundIntent {
  return resolveIntent(state).intent;
}

/** 变招一次只做一项调整（战斗细则 V1.2 4.4 节），且只能涉及已装备的武学。 */
export function changeProblems(state: BattleState, change: NonNullable<Decision['change']>): string[] {
  const problems: string[] = [];
  const kinds = (['pause', 'priority', 'reserve'] as const).filter((k) => change[k] !== undefined);
  if (kinds.length !== 1) problems.push('一次变招只能做一项调整：本轮优先级、暂停一门武学或本轮留力');
  const equipped = state.player.arts.map((a) => a.art.id);
  if (change.pause !== undefined && (change.pause.length !== 1 || !equipped.includes(change.pause[0]!))) {
    problems.push('变招只能暂停一门已装备的武学');
  }
  if (change.priority !== undefined) {
    const p = change.priority;
    if (p.length !== equipped.length || new Set(p).size !== p.length || p.some((id) => !equipped.includes(id))) {
      problems.push('本轮优先级必须是已装备武学的重新排列');
    }
  }
  if (change.reserve !== undefined && (!Number.isInteger(change.reserve) || change.reserve < 0)) problems.push('留力必须是非负整数');
  return problems;
}

function cloneFighter(f: FighterState): FighterState {
  const st = f.status;
  return {
    ...f,
    status: { ...st, ward: st.ward && { ...st.ward }, step: st.step && { ...st.step }, opening: st.opening && { ...st.opening } },
  };
}

/**
 * runRound 的工作副本。规则参数、诊断上限、武学定义、兵器、段落与词缀在结算中只读，与输入共享；
 * 其余可变部分逐层复制（比整体 structuredClone 快约三倍，E2 求解器大量调用）。
 * 共享部分不得在任何地方原地修改；“预览不改变输入”由 test/invariants.test.ts 检查。
 */
function cloneState(s: BattleState): BattleState {
  return {
    ...s,
    player: cloneFighter(s.player),
    enemy: cloneFighter(s.enemy),
    script: { ...s.script },
    roundUsage: [...s.roundUsage],
    intent: s.intent && { ...s.intent },
    over: s.over && { ...s.over },
  };
}

/**
 * 结算一整轮，返回新状态与本轮事件。输入状态不会被修改，
 * 所以同一调用也是“本轮预览”：预览不推进原状态、正式随机数或事件序号。
 */
export function runRound(state: BattleState, decision: Decision): RoundResult {
  if (state.over) throw new ValidationError(['战斗已经结束']);
  const s = cloneState(state);
  let mods: RoundModifiers = { paused: [], priority: null, reserve: null };
  if (decision.change) {
    if (s.changesLeft <= 0) throw new ValidationError(['本场变招次数已用完']);
    const problems = changeProblems(s, decision.change);
    if (problems.length > 0) throw new ValidationError(problems);
    s.changesLeft -= 1;
    mods = {
      paused: decision.change.pause ?? [],
      priority: decision.change.priority ?? null,
      reserve: decision.change.reserve ?? null,
    };
  }
  const ctx = new RoundContext(s, mods);
  try {
    ctx.play(decision);
  } catch (e) {
    if (!(e instanceof Halt)) throw e;
  }
  return { state: s, events: ctx.events };
}

export type DecisionSource = (state: BattleState) => Decision;

export interface BattleRun {
  state: BattleState;
  events: BattleEvent[];
  rounds: number;
}

/** 连续结算直到战斗结束。决策来源可以是固定序列或策略函数。 */
export function runBattle(initial: BattleState, decide: DecisionSource | Decision[]): BattleRun {
  let state = initial;
  const events: BattleEvent[] = [];
  let i = 0;
  while (!state.over) {
    let decision: Decision | undefined;
    if (Array.isArray(decide)) {
      decision = decide[i];
      if (!decision) {
        state = structuredClone(state);
        state.over = { reason: 'noDecision', winner: null, detail: '没有提供下一轮决策' };
        break;
      }
    } else {
      decision = decide(state);
    }
    const r = runRound(state, decision);
    events.push(...r.events);
    state = r.state;
    i += 1;
  }
  return { state, events, rounds: i };
}
