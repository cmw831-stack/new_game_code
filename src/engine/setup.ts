// 战斗输入、构筑校验与初始状态。非法输入在执行前给出可解释错误，
// 不生成半场结果（执行契约第四章“非法构筑”）。

import { compileArt, specProblems, type ArtSpec } from '../content/components.ts';
import { CONTENT_VERSION, findArt, findEnemy, findWeapon } from '../content/catalog.ts';
import type { ArtDef, ArtInstance, BattleState, EnemyConfig, FighterState, Limits, RuleParams, Side, StatusState, Weapon } from '../rules/types.ts';

export const RULES_VERSION = 'rules-v1.9-phase1';

export const MAX_ARTS = 4;
export const MAX_CAPACITY = 12;

export const DEFAULT_LIMITS: Limits = {
  eventsPerRoot: 128,
  eventsPerRound: 512,
  eventsPerBattle: 32768,
  maxDepth: 16,
  maxRounds: 100,
};

/** V1.9 规则（策划书 V1.9 第四章）。V1.8 的取值见 V18_RULES。 */
export const DEFAULT_RULES: RuleParams = {
  wardScope: 'chain',
  initiative: 'enemyOnAttack',
  freezeThreshold: 3,
};

/** V1.8 规则：只用于复现 V1.8 文档中的手算与历史实验。 */
export const V18_RULES: RuleParams = {
  wardScope: 'main',
  initiative: 'player',
  freezeThreshold: 3,
};

/** 每场遭遇开场内力不超过此值（策划书 V1.9 第 4.2 节）；由路线层在建立战斗输入时应用。 */
export const OPENING_QI_CAP = 10;

export function encounterOpeningQi(carried: number): number {
  return Math.min(carried, OPENING_QI_CAP);
}

/** 调参实验用：覆盖目录武学的部分字段（双方共用），例如费用或打击威力。 */
export type ArtOverrides = Record<string, Partial<Omit<ArtDef, 'id'>>>;

export interface FighterInput {
  name?: string;
  hp: number;
  hpMax: number;
  qi: number;
  qiMax: number;
  posture: number;
  postureMax: number;
  weaponId: string;
  /** 优先级顺序：目录中的武学 ID，或一份五槽装配。 */
  arts: (string | ArtSpec)[];
  reserve?: number;
  status?: Partial<StatusState>;
}

export interface EnemyInput {
  /** 目录中的配置 ID，或测试用的完整配置。 */
  config: string | EnemyConfig;
  /** 覆盖开场资源（教学检查点等明确的实验输入）。 */
  hp?: number;
  qi?: number;
  posture?: number;
  /** 开场段落中的起始项（从 0 计）。 */
  startItem?: number;
  /** 强制只循环开场段落（具名课题、教学检查点）。 */
  fixedSegment?: boolean;
  /** 手算用例的明确兵器输入，例如战斗细则 11.4 节“出招威力 8／6”。 */
  weapon?: Weapon;
  status?: Partial<StatusState>;
}

export interface BattleInput {
  battleId?: string;
  seed: number;
  player: FighterInput;
  enemy: EnemyInput;
  limits?: Partial<Limits>;
  /** 调参实验用的规则参数；省略即 V1.8 规则。 */
  rules?: Partial<RuleParams>;
  /** 调参实验用的武学覆盖；省略即内容目录原值。 */
  artOverrides?: ArtOverrides;
}

export class ValidationError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`输入不合法：${problems.join('；')}`);
    this.name = 'ValidationError';
    this.problems = problems;
  }
}

function emptyStatus(): StatusState {
  return {
    ward: null,
    step: null,
    cold: 0,
    freezePending: false,
    protectedSeq: null,
    coldCapReduced: false,
    opening: null,
    crashedThisRound: false,
  };
}

function checkResources(label: string, r: { hp: number; hpMax: number; qi: number; qiMax: number; posture: number; postureMax: number }, problems: string[]): void {
  const pairs: [string, number, number][] = [['气血', r.hp, r.hpMax], ['内力', r.qi, r.qiMax], ['架势', r.posture, r.postureMax]];
  for (const [name, cur, max] of pairs) {
    if (!Number.isInteger(cur) || !Number.isInteger(max)) problems.push(`${label}${name}必须是整数`);
    else if (max <= 0) problems.push(`${label}${name}上限必须大于 0`);
    else if (cur < 0) problems.push(`${label}${name}不能为负数`);
    else if (cur > max) problems.push(`${label}${name}超过上限`);
  }
  if (r.hp === 0) problems.push(`${label}开场气血不能为 0`);
}

export function isSwordOnly(art: ArtDef): boolean {
  return (art.action.kind === 'attack' && art.action.swordOnly) || (art.followup?.swordOnly ?? false);
}

function resolveArts(label: string, entries: (string | ArtSpec)[], weapon: Weapon | undefined, problems: string[], overrides: ArtOverrides = {}): ArtInstance[] {
  const out: ArtInstance[] = [];
  if (entries.length > MAX_ARTS) problems.push(`${label}最多装备 ${MAX_ARTS} 门武学，当前 ${entries.length} 门`);
  const seen = new Set<string>();
  entries.forEach((entry, slot) => {
    let art: ArtDef | undefined;
    if (typeof entry === 'string') {
      art = findArt(entry);
      if (!art) problems.push(`${label}未知内容 ID：${entry}`);
      else if (overrides[entry]) art = { ...art, ...structuredClone(overrides[entry]), id: art.id };
    } else {
      const ps = specProblems(entry, weapon?.weaponClass);
      if (ps.length > 0) problems.push(...ps.map((x) => `${label}${entry.name}：${x}`));
      else art = compileArt(entry);
    }
    if (!art) return;
    if (seen.has(art.id)) problems.push(`${label}同一武学不能重复装备：${art.name}`);
    seen.add(art.id);
    if (weapon && weapon.weaponClass !== 'sword' && isSwordOnly(art)) problems.push(`${label}${art.name}带剑专用组件，${weapon.name}不能使用`);
    out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}`, slot, art });
  });
  const capacity = out.reduce((sum, a) => sum + a.art.capacity, 0) + (weapon?.capacity ?? 0);
  if (capacity > MAX_CAPACITY) problems.push(`${label}总容量 ${capacity} 超过上限 ${MAX_CAPACITY}`);
  return out;
}

function fighter(side: Side, name: string, r: { hp: number; hpMax: number; qi: number; qiMax: number; posture: number; postureMax: number }, weapon: Weapon, arts: ArtInstance[], reserve: number, status: Partial<StatusState> | undefined, freezeThreshold: number): FighterState {
  return {
    side,
    name,
    hp: r.hp,
    hpMax: r.hpMax,
    qi: r.qi,
    qiMax: r.qiMax,
    posture: r.posture,
    postureMax: r.postureMax,
    weapon,
    arts,
    reserve,
    status: { ...emptyStatus(), ...status },
    actionSeq: 0,
    basicUsedThisRound: false,
    coldThreshold: freezeThreshold,
    coldCapProtected: freezeThreshold - 1,
  };
}

export function createBattle(input: BattleInput): BattleState {
  const problems: string[] = [];
  const overrides = input.artOverrides ?? {};
  for (const id of Object.keys(overrides)) if (!findArt(id)) problems.push(`覆盖了不存在的武学：${id}`);
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff) problems.push('种子必须是 0–4294967295 的整数');

  // 玩家
  const pi = input.player;
  const pWeapon = findWeapon(pi.weaponId);
  if (!pWeapon) problems.push(`玩家未知兵器 ID：${pi.weaponId}`);
  checkResources('玩家', pi, problems);
  const reserve = pi.reserve ?? 0;
  if (!Number.isInteger(reserve) || reserve < 0) problems.push('留力必须是非负整数');
  const pArts = resolveArts('玩家', pi.arts, pWeapon, problems, overrides);

  // 敌人
  const ei = input.enemy;
  const config = typeof ei.config === 'string' ? findEnemy(ei.config) : structuredClone(ei.config);
  if (!config) problems.push(`未知敌人配置 ID：${String(ei.config)}`);
  let eWeapon: Weapon | undefined;
  let eArts: ArtInstance[] = [];
  let eRes = { hp: 1, hpMax: 1, qi: 0, qiMax: 1, posture: 1, postureMax: 1 };
  if (config) {
    eWeapon = ei.weapon ? structuredClone(ei.weapon) : findWeapon(config.weaponId);
    if (!eWeapon) problems.push(`敌人未知兵器 ID：${config.weaponId}`);
    else if (!ei.weapon && config.basePowerBonus) {
      eWeapon.base = { hp: eWeapon.base.hp + config.basePowerBonus.hp, posture: eWeapon.base.posture + config.basePowerBonus.posture };
    }
    eArts = resolveArts('敌人', config.artIds, eWeapon, problems, overrides);
    eRes = {
      hp: ei.hp ?? config.hpMax,
      hpMax: config.hpMax,
      qi: ei.qi ?? config.qi,
      qiMax: config.qiMax,
      posture: ei.posture ?? config.postureMax,
      postureMax: config.postureMax,
    };
    checkResources('敌人', eRes, problems);
    const first = config.segments[0];
    if (!first || config.segments.some((sg) => sg.items.length === 0)) problems.push('敌人段落不能为空');
    const startItem = ei.startItem ?? 0;
    if (first && (!Number.isInteger(startItem) || startItem < 0 || startItem >= first.items.length)) problems.push('敌人起始项超出开场段落范围');
  }

  const rules: RuleParams = { ...DEFAULT_RULES, ...input.rules };
  if (!Number.isInteger(rules.freezeThreshold) || rules.freezeThreshold < 2) problems.push('冻结阈值必须是不小于 2 的整数');

  if (problems.length > 0 || !pWeapon || !config || !eWeapon) throw new ValidationError(problems);

  const limits: Limits = { ...DEFAULT_LIMITS, ...input.limits };
  return {
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
    battleId: input.battleId ?? `battle-${input.seed}`,
    round: 1,
    player: fighter('player', pi.name ?? '玩家', pi, pWeapon, pArts, reserve, pi.status, rules.freezeThreshold),
    enemy: fighter('enemy', config.name, eRes, eWeapon, eArts, 0, ei.status, rules.freezeThreshold),
    script: {
      configId: config.id,
      segments: config.segments,
      segIndex: 0,
      itemIndex: ei.startItem ?? 0,
      nextSegIndex: null,
      fixed: ei.fixedSegment ?? config.fixedSegment,
    },
    rng: input.seed >>> 0,
    rngDraws: 0,
    eventSeq: 0,
    nextRootId: 1,
    nextCastId: 1,
    eventsThisRound: 0,
    eventsThisBattle: 0,
    roundUsage: [],
    changesLeft: 2,
    intent: null,
    over: null,
    limits,
    rules,
  };
}
