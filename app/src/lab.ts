// 实验室的数据层：预设构筑、对手列表、建立对局与结果统计。界面组件只调用这里与规则引擎。

import { findArt, findEnemy } from '../../src/content/catalog.ts';
import { createBattle, OPENING_QI_CAP } from '../../src/engine/setup.ts';
import { runRound } from '../../src/engine/round.ts';
import { BUILDS } from '../../src/sim/strategies.ts';
import type { BattleEvent, BattleState, Stance } from '../../src/rules/types.ts';

export interface BuildOption {
  id: string;
  name: string;
  arts: string[];
  note: string;
}

export const BUILD_OPTIONS: BuildOption[] = [
  { id: 'starter', name: '初始两门', arts: ['break_strike', 'return_breath'], note: '开局手稿给的两门：断势击破势，归息诀格挡回气' },
  ...BUILDS.map((b) => ({ id: b.id, name: b.name, arts: b.arts, note: b.question })),
];

export interface EnemyOption {
  id: string;
  name: string;
  note: string;
}

export const ENEMY_OPTIONS: EnemyOption[] = [
  { id: 'balanced_tutorial', name: '均衡武者（引导）', note: '低压练习对手，只循环一个段落' },
  { id: 'balanced_standard', name: '均衡武者', note: '教学对手：先学会读节奏，一直出招也能赢' },
  { id: 'guard_standard', name: '高架势守卫', note: '架招时会借力反击，硬攻会被打穿；等它调息再出手' },
  { id: 'resonance_standard', name: '蓄震守卫', note: '出招很重，要架招；多段主招打中它两次以上会被反震' },
];

export interface Setup {
  buildId: string;
  enemyId: string;
  seed: number;
}

export interface RoundRecord {
  round: number;
  stance: Stance;
  events: BattleEvent[];
}

export interface Session {
  setup: Setup;
  state: BattleState;
  rounds: RoundRecord[];
}

export function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! % 1_000_000;
}

export function buildOf(id: string): BuildOption {
  return BUILD_OPTIONS.find((b) => b.id === id)!;
}

export function enemyName(id: string): string {
  return findEnemy(id)?.name ?? id;
}

export function capacityOf(arts: string[]): number {
  return arts.reduce((n, id) => n + (findArt(id)?.capacity ?? 0), 0);
}

/** 建立一场实验室对局：玩家满气血、满架势，开场内力按 V1.9 上限 10。 */
export function startSession(setup: Setup): Session {
  const build = buildOf(setup.buildId);
  const state = createBattle({
    battleId: `lab/${setup.buildId}/${setup.enemyId}/${setup.seed}`,
    seed: setup.seed,
    player: { name: '你', hp: 30, hpMax: 30, qi: OPENING_QI_CAP, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts: build.arts, reserve: 0 },
    enemy: { config: setup.enemyId },
  });
  return { setup, state, rounds: [] };
}

export function playRound(session: Session, stance: Stance): Session {
  const r = runRound(session.state, { stance });
  return { ...session, state: r.state, rounds: [...session.rounds, { round: session.state.round, stance, events: r.events }] };
}

export interface Preview {
  stance: Stance;
  player: { hp: number; qi: number; posture: number };
  enemy: { hp: number; posture: number };
  outcome: 'victory' | 'defeat' | null;
}

/** 本轮预览：在状态副本上结算，不改变原状态。确定性规则下与实际结果一致。 */
export function preview(state: BattleState, stance: Stance): Preview {
  const r = runRound(state, { stance });
  const o = r.state.over?.reason;
  return {
    stance,
    player: { hp: r.state.player.hp, qi: r.state.player.qi, posture: r.state.player.posture },
    enemy: { hp: r.state.enemy.hp, posture: r.state.enemy.posture },
    outcome: o === 'victory' || o === 'defeat' ? o : null,
  };
}

export interface Tally {
  dealt: [string, number][];
  taken: [string, number][];
}

/** 整场按来源统计的实际气血伤害。 */
export function tally(rounds: RoundRecord[]): Tally {
  const dealt = new Map<string, number>();
  const taken = new Map<string, number>();
  for (const r of rounds) {
    for (const e of r.events) {
      if (e.type !== 'hit') continue;
      const map = e.side === 'player' ? dealt : taken;
      const key = e.art ?? 'basic';
      map.set(key, (map.get(key) ?? 0) + (e.data.hp as number));
    }
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return { dealt: sorted(dealt), taken: sorted(taken) };
}
