// 规则核心的数据类型。全部为可 JSON 序列化的纯数据，不含函数或类实例，
// 以便状态副本预览、轮末检查点与回放直接复制。

export type Side = 'player' | 'enemy';

export function other(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player';
}

/** 三种基础姿态：出招／架招／调息。 */
export type Stance = 'attack' | 'guard' | 'breathe';

/** 攻击威力：气血／架势。不是保证的实际扣除量。 */
export interface Power {
  hp: number;
  posture: number;
}

export type WeaponClass = 'sword' | 'blade' | 'staff';

export interface Weapon {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  /** 零费基础出招的威力。 */
  base: Power;
  capacity: number;
}

// ---------- 武学组件 ----------

export type TriggerDef =
  | { kind: 'contact' }
  | { kind: 'dodge' }
  | { kind: 'block' }
  | { kind: 'break' }
  | { kind: 'qiCross'; threshold: number }
  | { kind: 'status'; condition: 'cold2' | 'freeze' }
  /** 敌方专用（蓄震）：对方一门主招对本人至少有 min 次有效接触。 */
  | { kind: 'multiContact'; min: number };

export type AttackType = 'single' | 'combo' | 'heavy' | 'break' | 'counter' | 'resonance';

export type ActionDef =
  | { kind: 'attack'; type: AttackType; hits: Power[]; swordOnly: boolean }
  | { kind: 'ward' }
  | { kind: 'step' }
  | { kind: 'qi'; amount: number };

export type ModifierId = 'gang' | 'soft' | 'cold' | 'shock';

export type FollowupDef =
  | { kind: 'onHpDamage'; hits: Power[]; cost: number; swordOnly: boolean }
  | { kind: 'onOwnFreeze'; hits: Power[]; cost: number; swordOnly: boolean };

export type RecoveryDef =
  | { kind: 'qiOnHpDamage'; amount: number }
  | { kind: 'postureOnComplete'; amount: number };

export type ArtCategory = '外功' | '内功' | '身法' | '心法' | '绝学' | '敌方';

/** 已编译的武学：费用与容量已按统一价表算好。 */
export interface ArtDef {
  id: string;
  name: string;
  category: ArtCategory;
  trigger: TriggerDef;
  action: ActionDef;
  modifier: ModifierId | null;
  followup: FollowupDef | null;
  recovery: RecoveryDef | null;
  /** 起手发动费用（不含变化子招）。 */
  cost: number;
  capacity: number;
  /** 每轮最多成功发动一次（回气类内功等）。 */
  perRound: boolean;
  /** 蓄震：每次有效接触贡献的气血威力。 */
  resonancePerContact?: number;
}

// ---------- 敌人脚本 ----------

export interface IntentItem {
  stance: Stance;
  /** 本项禁用的主动武学 ID；被动武学不受影响。 */
  disabled: string[];
}

export interface Segment {
  id: string;
  name: string;
  items: IntentItem[];
}

export interface EnemyConfig {
  id: string;
  templateId: string;
  name: string;
  hpMax: number;
  qi: number;
  qiMax: number;
  postureMax: number;
  weaponId: string;
  /** 优先级顺序，靠前先结算。 */
  artIds: string[];
  /** segments[0] 为开场段落 A。 */
  segments: Segment[];
  /** 只循环开场段落（引导配置）。 */
  fixedSegment: boolean;
}

// ---------- 战斗状态 ----------

export interface WardState {
  source: 'basic' | 'skill';
  /** 在该轮轮末到期。 */
  expiresRound: number;
  /** 已锁定的敌方主招施放 ID。 */
  lockedCast: number | null;
  /** 规则参数 wardScope 为 chain 时，基础架招护势锁定的敌方根连锁 ID。 */
  lockedRoot: number | null;
}

export interface StatusState {
  ward: WardState | null;
  /** 身法准备，在该轮轮末到期。 */
  step: { expiresRound: number } | null;
  cold: number;
  /** 冻结待跳过下一次尚未执行的基础行动。 */
  freezePending: boolean;
  /** 不会再被冻结跳过的基础行动机会序号。 */
  protectedSeq: number | null;
  /** 从冻结施加到保护窗口结束，寒意上限降低。 */
  coldCapReduced: boolean;
  /** 本人制造、尚未消费的破绽。 */
  opening: { expiresAfterSeq: number } | null;
  crashedThisRound: boolean;
}

export interface ArtInstance {
  instanceId: string;
  slot: number;
  art: ArtDef;
}

export interface FighterState {
  side: Side;
  name: string;
  hp: number;
  hpMax: number;
  qi: number;
  qiMax: number;
  posture: number;
  postureMax: number;
  weapon: Weapon;
  arts: ArtInstance[];
  /** 追加攻击留力底线。 */
  reserve: number;
  status: StatusState;
  /** 最近一次开始（或被跳过）的基础行动机会序号；单调递增。 */
  actionSeq: number;
  basicUsedThisRound: boolean;
  /** 冻结阈值与寒意正常上限。 */
  coldThreshold: number;
  /** 冻结保护期间的寒意上限。 */
  coldCapProtected: number;
}

export interface ScriptState {
  configId: string;
  segments: Segment[];
  segIndex: number;
  itemIndex: number;
  /** 已抽定的下一段落。 */
  nextSegIndex: number | null;
  fixed: boolean;
}

/**
 * 可调的规则参数，默认值即策划书 V1.8 的规则。只用于调参实验；
 * 改默认值等于改规则，必须先改策划文档。
 */
export interface RuleParams {
  /** 基础架招的护势保护范围：main＝只保护第一门敌方主招（V1.8）；chain＝保护敌方整条根连锁。 */
  wardScope: 'main' | 'chain';
  /** 基础行动先后：player＝始终玩家先手（V1.8）；enemyOnAttack＝敌方本轮意图为出招时敌方先手，并已在意图中公开。 */
  initiative: 'player' | 'enemyOnAttack';
  /** 冻结阈值与寒意正常上限（V1.8 为 3）；冻结保护期上限为阈值减 1。双方共用。 */
  freezeThreshold: number;
}

export interface Limits {
  eventsPerRoot: number;
  eventsPerRound: number;
  eventsPerBattle: number;
  maxDepth: number;
  maxRounds: number;
}

/** 玩家胜利、玩家败退、安全上限、轮数上限、决策不足。安全上限与决策不足都不算获胜或平局。 */
export type EndReason = 'victory' | 'defeat' | 'safetyLimit' | 'roundLimit' | 'noDecision';

export interface BattleOutcome {
  reason: EndReason;
  winner: Side | null;
  detail: string;
}

export interface RoundIntent {
  stance: Stance;
  disabled: string[];
  segmentId: string;
  segmentName: string;
  itemIndex: number;
  segmentLength: number;
  /** 下一项提示；本段末且下一段已抽定时来自下一段第一项。 */
  next: IntentItem | null;
}

export interface RoundModifiers {
  paused: string[];
  priority: string[] | null;
  reserve: number | null;
}

export interface BattleState {
  rulesVersion: string;
  contentVersion: string;
  battleId: string;
  round: number;
  player: FighterState;
  enemy: FighterState;
  script: ScriptState;
  /** 战斗随机数状态（uint32）。 */
  rng: number;
  rngDraws: number;
  eventSeq: number;
  nextRootId: number;
  nextCastId: number;
  eventsThisRound: number;
  eventsThisBattle: number;
  /** 本轮已成功发动的每轮限次键。 */
  roundUsage: string[];
  changesLeft: number;
  intent: RoundIntent | null;
  over: BattleOutcome | null;
  limits: Limits;
  rules: RuleParams;
}

// ---------- 决策 ----------

export interface Decision {
  stance: Stance;
  /** 变招：本轮临时调整，消耗一次额度。 */
  change?: {
    pause?: string[];
    priority?: string[];
    reserve?: number;
  };
}

// ---------- 事件 ----------

export type Phase = 'intent' | 'prepare' | 'regen' | 'action' | 'roundEnd';

export type EventType =
  | 'intent'
  | 'segmentDraw'
  | 'decision'
  | 'change'
  | 'guard'
  | 'freezeSkip'
  | 'qi'
  | 'posture'
  | 'basicAttack'
  | 'cast'
  | 'pay'
  | 'skip'
  | 'dodge'
  | 'hit'
  | 'block'
  | 'crash'
  | 'opening'
  | 'openingConsumed'
  | 'openingExpired'
  | 'cold'
  | 'freeze'
  | 'ward'
  | 'wardConsumed'
  | 'step'
  | 'mainEnd'
  | 'complete'
  | 'death'
  | 'expire'
  | 'roundEnd'
  | 'battleEnd';

export interface BattleEvent {
  seq: number;
  round: number;
  phase: Phase;
  root: number | null;
  cast: number | null;
  parent: number | null;
  depth: number;
  type: EventType;
  side: Side | null;
  art: string | null;
  data: Record<string, number | string | boolean | null>;
}

export interface RoundResult {
  state: BattleState;
  events: BattleEvent[];
}
