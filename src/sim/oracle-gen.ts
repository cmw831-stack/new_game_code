// E1 对拍与不变式测试用的随机对局生成器（fast-check）。只生成合法输入：四门以内、容量 12 以内、剑专用武学配剑、
// 每场至多两次合法变招。生成器不含规则判断以外的预期，预期来自两份实现的比较或不变式本身。

import fc from 'fast-check';
import { findArt } from '../content/catalog.ts';
import type { Stance } from '../rules/types.ts';
import type { OracleCase, OracleWeapon } from './oracle-io.ts';

const STANCES: Stance[] = ['attack', 'guard', 'breathe'];

/** 玩家可用：十二门预设。 */
export const PLAYER_ARTS = ['叠寒剑', '断势击', '崩势追击', '逐影刺', '归息诀', '通脉诀', '蓄元诀', '养元功', '踏风步', '回身步', '借力诀', '守拙诀'];
/** 敌人可用：先行武学中的几门与敌方专用的蓄震诀。 */
export const ENEMY_ARTS = ['归息诀', '断势击', '借力诀', '踏风步', '崩势追击', '叠寒剑', '蓄震诀'];

const PLAYER_WEAPONS: OracleWeapon[] = [
  { hp: 4, posture: 4, class: 'sword' },
  { hp: 3, posture: 5, class: 'staff' },
  { hp: 6, posture: 2, class: 'blade' },
];

const idOf = (name: string) => {
  // 名称与目录一一对应；这里只需要容量和剑专用标记，所以按名称在目录里找。
  for (const id of ['cold_sword', 'break_strike', 'break_chase', 'shadow_thrust', 'return_breath', 'channel', 'gather_origin', 'nourish', 'wind_step', 'turn_step', 'borrow_force', 'guard_humble', 'npc_resonance']) {
    if (findArt(id)!.name === name) return id;
  }
  throw new Error(`未知武学 ${name}`);
};
const capacity = (names: string[]) => names.reduce((n, a) => n + findArt(idOf(a))!.capacity, 0);
const swordOnly = (names: string[]) => names.some((a) => {
  const art = findArt(idOf(a))!;
  return (art.action.kind === 'attack' && art.action.swordOnly) || (art.followup?.swordOnly ?? false);
});

/** 四门以内、容量 12 以内的武学列表（按优先级顺序）。 */
function loadout(pool: string[]) {
  return fc.uniqueArray(fc.constantFrom(...pool), { maxLength: 4 }).filter((xs) => capacity(xs) <= 12);
}

function resources(hpMax: [number, number], postureMax: [number, number]) {
  return fc.record({
    hpMax: fc.integer({ min: hpMax[0], max: hpMax[1] }),
    qi: fc.integer({ min: 0, max: 20 }),
    postureMax: fc.integer({ min: postureMax[0], max: postureMax[1] }),
    hpFrac: fc.integer({ min: 1, max: 100 }),
    postureFrac: fc.integer({ min: 0, max: 100 }),
  }).map((r) => ({
    hp: Math.max(1, Math.floor((r.hpMax * r.hpFrac) / 100)),
    hpMax: r.hpMax,
    qi: r.qi,
    qiMax: 20,
    posture: Math.floor((r.postureMax * r.postureFrac) / 100),
    postureMax: r.postureMax,
  }));
}

export const oracleCase: fc.Arbitrary<OracleCase> = fc
  .record({
    pRes: resources([12, 40], [6, 30]),
    pArts: loadout(PLAYER_ARTS),
    pWeapon: fc.constantFrom(...PLAYER_WEAPONS),
    reserve: fc.oneof({ weight: 3, arbitrary: fc.constant(0) }, { weight: 1, arbitrary: fc.integer({ min: 1, max: 8 }) }),
    eRes: resources([12, 50], [6, 30]),
    eArts: loadout(ENEMY_ARTS),
    eWeapon: fc.record({ hp: fc.integer({ min: 2, max: 16 }), posture: fc.integer({ min: 2, max: 8 }), class: fc.constantFrom<OracleWeapon['class']>('sword', 'blade', 'staff') }),
    cycle: fc.array(fc.record({ stance: fc.constantFrom(...STANCES), disableMask: fc.integer({ min: 0, max: 15 }), disableOn: fc.integer({ min: 0, max: 9 }) }), { minLength: 1, maxLength: 4 }),
    startPick: fc.nat(),
    stances: fc.array(fc.constantFrom(...STANCES), { minLength: 1, maxLength: 20 }),
    changes: fc.array(fc.record({ at: fc.nat(), kind: fc.constantFrom('pause', 'priority', 'reserve'), pick: fc.nat(), reserve: fc.integer({ min: 0, max: 10 }) }), { maxLength: 2 }),
  })
  // 剑专用武学必须配剑（两边都会报错，但对拍的主要目标是结算，所以不生成这类非法输入）。
  .filter((r) => !(swordOnly(r.pArts) && r.pWeapon.class !== 'sword') && !(swordOnly(r.eArts) && r.eWeapon.class !== 'sword'))
  .map((r): OracleCase => {
    const decisions: OracleCase['decisions'] = r.stances.map((stance) => ({ stance }));
    const used = new Set<number>();
    for (const ch of r.changes) {
      const i = ch.at % decisions.length;
      if (used.has(i)) continue;
      if ((ch.kind === 'pause' || ch.kind === 'priority') && r.pArts.length === 0) continue;
      used.add(i);
      const d = decisions[i]!;
      if (ch.kind === 'pause') d.change = { pause: [r.pArts[ch.pick % r.pArts.length]!] };
      else if (ch.kind === 'priority') d.change = { priority: rotate(r.pArts, ch.pick) };
      else d.change = { reserve: ch.reserve };
    }
    return {
      player: { ...r.pRes, reserve: r.reserve, weapon: r.pWeapon, arts: r.pArts },
      enemy: {
        ...r.eRes, weapon: r.eWeapon, arts: r.eArts,
        cycle: r.cycle.map((it) => ({
          stance: it.stance,
          // 大约十分之一的意图项禁用部分敌方武学。
          disabled: it.disableOn === 0 ? r.eArts.filter((_, k) => (it.disableMask >> k) & 1) : [],
        })),
        startItem: r.startPick % r.cycle.length,
      },
      decisions,
    };
  });

function rotate<T>(xs: T[], k: number): T[] {
  const n = k % xs.length;
  return [...xs.slice(n), ...xs.slice(0, n)];
}
