// E1 对拍：把 docs/engine/oracle-io.md 格式的对局交给本引擎结算，输出同样格式的逐轮快照。
// 本文件只做格式转换，不含任何规则；规则全部来自引擎本身。

import { allArtIds, findArt, findWeapon } from '../content/catalog.ts';
import { createBattle, ValidationError, type BattleInput } from '../engine/setup.ts';
import { runRound } from '../engine/round.ts';
import type { BattleState, Decision, EnemyConfig, FighterState, Stance, Weapon, WeaponClass } from '../rules/types.ts';

export interface OracleWeapon { hp: number; posture: number; class: WeaponClass }

interface OracleFighter {
  hp: number; hpMax: number; qi: number; qiMax: number; posture: number; postureMax: number;
  weapon: OracleWeapon;
  arts: string[];
}

export interface OracleCase {
  player: OracleFighter & { reserve: number };
  enemy: OracleFighter & { cycle: { stance: Stance; disabled: string[] }[]; startItem: number };
  decisions: { stance: Stance; change?: { pause?: string[]; priority?: string[]; reserve?: number } }[];
}

export interface OracleFighterSnap { hp: number; qi: number; posture: number; ward: boolean; step: boolean; cold: number; frozen: boolean; opening: boolean }
export interface OracleRound { player: OracleFighterSnap; enemy: OracleFighterSnap; over: 'victory' | 'defeat' | 'safetyLimit' | null }
export type OracleResult = { rounds: OracleRound[] } | { error: string };

/** 武学名称 → 内容目录 ID（十二门预设、卷首残页、敌方专用武学）。 */
export function artIdByName(name: string): string | undefined {
  return allArtIds().find((id) => findArt(id)!.name === name);
}

/** 玩家兵器按类别与威力对应到内容目录中的铁剑、长柄铁棍、铁柄刀。 */
function catalogWeapon(w: OracleWeapon): string | undefined {
  return ['iron_sword', 'iron_staff', 'iron_blade'].find((id) => {
    const x = findWeapon(id)!;
    return x.weaponClass === w.class && x.base.hp === w.hp && x.base.posture === w.posture;
  });
}

function ids(names: string[], problems: string[]): string[] {
  return names.map((n) => {
    const id = artIdByName(n);
    if (!id) problems.push(`未知武学：${n}`);
    return id ?? n;
  });
}

export function toEngine(c: OracleCase): { input: BattleInput; decisions: Decision[] } | { error: string } {
  const problems: string[] = [];
  const pWeapon = catalogWeapon(c.player.weapon);
  if (!pWeapon) problems.push('玩家兵器不在内容目录中');
  const eArts = ids(c.enemy.arts, problems);
  const config: EnemyConfig = {
    id: 'oracle_enemy', templateId: 'oracle', name: '对手',
    hpMax: c.enemy.hpMax, qi: c.enemy.qi, qiMax: c.enemy.qiMax, postureMax: c.enemy.postureMax,
    weaponId: 'iron_sword', artIds: eArts, fixedSegment: true,
    segments: [{ id: 'A', name: '循环', items: c.enemy.cycle.map((it) => ({ stance: it.stance, disabled: ids(it.disabled, problems) })) }],
  };
  const eWeapon: Weapon = { id: 'oracle_weapon', name: '兵器', weaponClass: c.enemy.weapon.class, base: { hp: c.enemy.weapon.hp, posture: c.enemy.weapon.posture }, capacity: 0 };
  const decisions: Decision[] = c.decisions.map((d) => {
    if (!d.change) return { stance: d.stance };
    const ch = d.change;
    return {
      stance: d.stance,
      change: {
        ...(ch.pause ? { pause: ids(ch.pause, problems) } : {}),
        ...(ch.priority ? { priority: ids(ch.priority, problems) } : {}),
        ...(ch.reserve !== undefined ? { reserve: ch.reserve } : {}),
      },
    };
  });
  const pArts = ids(c.player.arts, problems);
  if (problems.length > 0) return { error: problems.join('；') };
  return {
    input: {
      seed: 1,
      player: { hp: c.player.hp, hpMax: c.player.hpMax, qi: c.player.qi, qiMax: c.player.qiMax, posture: c.player.posture, postureMax: c.player.postureMax, weaponId: pWeapon!, arts: pArts, reserve: c.player.reserve },
      enemy: { config, weapon: eWeapon, hp: c.enemy.hp, qi: c.enemy.qi, posture: c.enemy.posture, startItem: c.enemy.startItem },
    },
    decisions,
  };
}

function snap(f: FighterState): OracleFighterSnap {
  const s = f.status;
  return { hp: f.hp, qi: f.qi, posture: f.posture, ward: s.ward !== null, step: s.step !== null, cold: s.cold, frozen: s.freezePending, opening: s.opening !== null };
}

function overOf(s: BattleState): OracleRound['over'] {
  const r = s.over?.reason;
  return r === 'victory' || r === 'defeat' || r === 'safetyLimit' ? r : null;
}

/** 按 oracle-io.md 第一、三节结算并输出逐轮快照。 */
export function runEngineCase(c: OracleCase): OracleResult {
  const conv = toEngine(c);
  if ('error' in conv) return conv;
  try {
    let s = createBattle(conv.input);
    const rounds: OracleRound[] = [];
    for (const d of conv.decisions) {
      if (s.over) break;
      s = runRound(s, d).state;
      rounds.push({ player: snap(s.player), enemy: snap(s.enemy), over: overOf(s) });
    }
    return { rounds };
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.problems.join('；') };
    throw e;
  }
}
