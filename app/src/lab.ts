// 实验室的数据层：预设构筑、对手列表、建立对局与结果统计。界面组件只调用这里与规则引擎。

import { findArt, findEnemy } from '../../src/content/catalog.ts';
import { createBattle, OPENING_QI_CAP } from '../../src/engine/setup.ts';
import { runRound } from '../../src/engine/round.ts';
import { BUILDS } from '../../src/sim/strategies.ts';
import { checkLoadout, LAB_ART_IDS, type LoadoutCheck } from '../../src/edit/loadout.ts';
import { findVersion, versionProblems, type LabArchive, type ManualVersion } from '../../src/edit/manual.ts';
import type { EditResearch } from '../../src/edit/variant.ts';
import { compileArt } from '../../src/content/components.ts';
import type { ArtDef, BattleEvent, BattleState, Decision, Stance } from '../../src/rules/types.ts';

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

/** 实验室唯一的兵器（Phase 2 方案 2.2 节：只有铁剑）。 */
export const LAB_WEAPON_ID = 'iron_sword';

/**
 * 已取得的武学。M3 接入十课教学与授业之前，实验室暂时开放先行六门；
 * 接入后改为读取授业记录（见实现说明第四节）。
 */
export const ACQUIRED_ART_IDS: readonly string[] = LAB_ART_IDS;

/**
 * 改良权限。M3 接入授业之前，实验室按教学授业 grant_edit_intro_v1 的结果开放：
 * 断势击、叠寒剑精通，组件库有破势甲与连击乙（组件细则 V1.2 7.2 节“教学先授”）。
 */
export const LAB_RESEARCH: EditResearch = { mastered: ['break_strike', 'cold_sword'], library: ['A_break:甲', 'A_combo:乙'] };

/** 当前规则下可以装备的已存版本。 */
export function usableVersions(archive: LabArchive): ManualVersion[] {
  return archive.versions.filter((v) => versionProblems(v).length === 0);
}

export function customArts(archive: LabArchive): ArtDef[] {
  return usableVersions(archive).map((v) => compileArt(v.spec));
}

/** 武学 ID 或秘籍版本 ID 对应的武学。 */
export function artOf(id: string, archive: LabArchive): ArtDef | undefined {
  const v = findVersion(archive, id);
  return v ? compileArt(v.spec) : findArt(id);
}

export function checkArts(arts: readonly string[], archive: LabArchive): LoadoutCheck {
  return checkLoadout({ arts, weaponId: LAB_WEAPON_ID, acquired: ACQUIRED_ART_IDS, custom: customArts(archive) });
}

/** 与某套预设完全相同（含优先级）时用预设名，否则是自由组合。 */
export function loadoutName(arts: readonly string[]): string {
  return BUILD_OPTIONS.find((b) => b.arts.length === arts.length && b.arts.every((id, i) => id === arts[i]))?.name ?? '自由组合';
}

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
  /** 优先级顺序。 */
  arts: string[];
  /** 追加攻击留力底线（战斗细则 V1.2 3.3 节）。 */
  reserve: number;
  enemyId: string;
  /** 对手的公开词缀（敌人细则第 9 章），0–2 个。 */
  affixes: string[];
  seed: number;
}

export interface RoundRecord {
  round: number;
  decision: Decision;
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

/** 建立一场实验室对局：玩家满气血、满架势，开场内力按 V1.9 上限 10。构筑须先通过 checkArts。 */
export function startSession(setup: Setup, archive: LabArchive): Session {
  const arts = setup.arts.map((id) => findVersion(archive, id)?.spec ?? id);
  const state = createBattle({
    battleId: `lab/${setup.arts.join('+') || 'none'}/${setup.enemyId}${setup.affixes.length ? `+${setup.affixes.join('+')}` : ''}/${setup.seed}`,
    seed: setup.seed,
    player: { name: '你', hp: 30, hpMax: 30, qi: OPENING_QI_CAP, qiMax: 20, posture: 20, postureMax: 20, weaponId: LAB_WEAPON_ID, arts, reserve: setup.reserve },
    enemy: { config: setup.enemyId, affixes: setup.affixes },
  });
  return { setup, state, rounds: [] };
}

export function playRound(session: Session, decision: Decision): Session {
  const r = runRound(session.state, decision);
  return { ...session, state: r.state, rounds: [...session.rounds, { round: session.state.round, decision, events: r.events }] };
}

export interface Preview {
  stance: Stance;
  player: { hp: number; qi: number; posture: number };
  enemy: { hp: number; posture: number };
  outcome: 'victory' | 'defeat' | null;
}

/** 本轮预览：在状态副本上结算，不改变原状态。确定性规则下与实际结果一致。 */
export function preview(state: BattleState, stance: Stance, change?: Decision['change']): Preview {
  const r = runRound(state, change ? { stance, change } : { stance });
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
