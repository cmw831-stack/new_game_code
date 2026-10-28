// 出战构筑的合法性检查：四个武学位、总容量 12、兵器剑专用限制、只用已取得的武学。
// 依据：主计划 V1.9.1 3.5 节；教学细则 V1.2 第一章、4.2 节与第五章“超容量或缺组件”。
// 界面在开打前调用本检查逐项说明原因；createBattle 仍是最终校验。

import { findArt, findWeapon } from '../content/catalog.ts';
import type { ArtDef } from '../rules/types.ts';
import { isSwordOnly, MAX_ARTS, MAX_CAPACITY } from '../engine/setup.ts';

/** Phase 2 先行六门（教学细则 V1.2 第一章）。 */
export const LAB_ART_IDS: readonly string[] = ['break_strike', 'return_breath', 'borrow_force', 'cold_sword', 'break_chase', 'wind_step'];

/** 开场手稿给的两门（教学细则 V1.2 第一章）。 */
export const STARTER_ART_IDS: readonly string[] = ['break_strike', 'return_breath'];

export type LoadoutProblemKind = 'tooMany' | 'unknownArt' | 'notAcquired' | 'duplicate' | 'swordOnly' | 'unknownWeapon' | 'overCapacity';

export interface LoadoutProblem {
  kind: LoadoutProblemKind;
  /** 出问题的武学位（从 0 计）；整体问题没有。 */
  slot?: number;
  message: string;
}

export interface LoadoutInput {
  /** 优先级顺序，靠前先结算。 */
  arts: readonly string[];
  weaponId: string;
  /** 已取得的武学 ID。 */
  acquired: readonly string[];
  /** 玩家保存的秘籍版本（已编译）；按版本 ID 装备，视为已取得。 */
  custom?: readonly ArtDef[];
}

export interface LoadoutCheck {
  ok: boolean;
  /** 武学与兵器容量合计；未知内容不计。 */
  capacity: number;
  maxCapacity: number;
  maxArts: number;
  problems: LoadoutProblem[];
}

export function checkLoadout(input: LoadoutInput): LoadoutCheck {
  const problems: LoadoutProblem[] = [];
  const weapon = findWeapon(input.weaponId);
  if (!weapon) problems.push({ kind: 'unknownWeapon', message: `未知兵器：${input.weaponId}` });
  if (input.arts.length > MAX_ARTS) {
    problems.push({ kind: 'tooMany', message: `最多装备 ${MAX_ARTS} 门武学，当前 ${input.arts.length} 门` });
  }

  const custom = new Map((input.custom ?? []).map((a) => [a.id, a]));
  const acquired = new Set([...input.acquired, ...custom.keys()]);
  const seen = new Set<string>();
  const parts: string[] = [];
  let capacity = weapon?.capacity ?? 0;
  input.arts.forEach((id, slot) => {
    const art = custom.get(id) ?? findArt(id);
    if (!art) {
      problems.push({ kind: 'unknownArt', slot, message: `第 ${slot + 1} 位：未知武学 ${id}` });
      return;
    }
    if (!acquired.has(id)) problems.push({ kind: 'notAcquired', slot, message: `第 ${slot + 1} 位：${art.name}尚未取得` });
    if (seen.has(id)) problems.push({ kind: 'duplicate', slot, message: `第 ${slot + 1} 位：${art.name}已经装备，同一武学不能重复装备` });
    seen.add(id);
    if (weapon && weapon.weaponClass !== 'sword' && isSwordOnly(art)) {
      problems.push({ kind: 'swordOnly', slot, message: `第 ${slot + 1} 位：${art.name}带剑专用组件，${weapon.name}不能使用` });
    }
    capacity += art.capacity;
    parts.push(`${art.name} ${art.capacity}`);
  });

  if (capacity > MAX_CAPACITY) {
    if (weapon) parts.push(`${weapon.name} ${weapon.capacity}`);
    problems.push({ kind: 'overCapacity', message: `总容量 ${capacity} 超过上限 ${MAX_CAPACITY}（${parts.join(' ＋ ')}），需要减少 ${capacity - MAX_CAPACITY}` });
  }

  return { ok: problems.length === 0, capacity, maxCapacity: MAX_CAPACITY, maxArts: MAX_ARTS, problems };
}
