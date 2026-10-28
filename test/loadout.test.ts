// 出战构筑检查：主计划 V1.9.1 3.5 节（四武学位、总容量 12）；教学细则 V1.2 第一章、4.2 节与第五章；
// 组件细则 V1.2 第六章（各武学容量）与第九章（剑专用连击不能用于刀棍）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLoadout, LAB_ART_IDS, STARTER_ART_IDS } from '../src/edit/loadout.ts';
import { createBattle } from '../src/engine/setup.ts';
import { player } from './helpers.ts';

const ALL = LAB_ART_IDS;
const kinds = (arts: string[], over: { weaponId?: string; acquired?: readonly string[] } = {}) =>
  checkLoadout({ arts, weaponId: over.weaponId ?? 'iron_sword', acquired: over.acquired ?? ALL }).problems.map((p) => p.kind);

test('开场两门：断势击＋归息诀，容量 6（教学细则 V1.2 teach_intro_v1）', () => {
  const r = checkLoadout({ arts: [...STARTER_ART_IDS], weaponId: 'iron_sword', acquired: STARTER_ART_IDS });
  assert.equal(r.ok, true);
  assert.equal(r.capacity, 6);
});

test('断势击→崩势追击→归息诀：3／4，容量 10／12（教学细则 V1.2 4.2 节线框）', () => {
  const r = checkLoadout({ arts: ['break_strike', 'break_chase', 'return_breath'], weaponId: 'iron_sword', acquired: ALL });
  assert.equal(r.ok, true);
  assert.equal(r.capacity, 10);
});

test('叠寒剑→崩势追击→归息诀恰好容量 12，合法（教学细则 V1.2 teach_cold_chain_v1）', () => {
  const r = checkLoadout({ arts: ['cold_sword', 'break_chase', 'return_breath'], weaponId: 'iron_sword', acquired: ALL });
  assert.equal(r.ok, true);
  assert.equal(r.capacity, 12);
});

test('不装武学也合法，容量 0（教学细则 V1.2 fixture_cold_example_v1）', () => {
  assert.deepEqual(checkLoadout({ arts: [], weaponId: 'iron_sword', acquired: [] }), { ok: true, capacity: 0, maxCapacity: 12, maxArts: 4, problems: [] });
});

test('叠寒剑 6＋断势击 4＋崩势追击 4＝14 超容量，逐项列出各占多少（教学细则 V1.2 4.2 节）', () => {
  const r = checkLoadout({ arts: ['cold_sword', 'break_strike', 'break_chase'], weaponId: 'iron_sword', acquired: ALL });
  assert.equal(r.ok, false);
  assert.equal(r.capacity, 14);
  assert.deepEqual(r.problems.map((p) => p.kind), ['overCapacity']);
  const msg = r.problems[0]!.message;
  for (const part of ['叠寒剑 6', '断势击 4', '崩势追击 4', '铁剑 0', '减少 2']) assert.ok(msg.includes(part), `${msg} 应包含 ${part}`);
});

test('第五门武学超过四个武学位（主计划 V1.9.1 3.5 节）', () => {
  assert.ok(kinds(['return_breath', 'borrow_force', 'wind_step', 'break_strike', 'break_chase']).includes('tooMany'));
});

test('未取得的武学不能装备，并指明是哪一位（教学细则 V1.2 第一章：其余四门逐项取得）', () => {
  const r = checkLoadout({ arts: ['break_strike', 'cold_sword'], weaponId: 'iron_sword', acquired: STARTER_ART_IDS });
  assert.deepEqual(r.problems.map((p) => [p.kind, p.slot]), [['notAcquired', 1]]);
});

test('同一武学不能重复装备', () => {
  assert.deepEqual(kinds(['break_strike', 'break_strike']), ['duplicate']);
});

test('叠寒剑的连击是剑专用，铁柄刀不能装备（组件细则 V1.2 第九章）', () => {
  assert.deepEqual(kinds(['cold_sword'], { weaponId: 'iron_blade' }), ['swordOnly']);
  assert.deepEqual(kinds(['break_strike'], { weaponId: 'iron_blade' }), []);
});

test('未知武学与未知兵器给出原因而不是崩溃', () => {
  assert.deepEqual(kinds(['no_such_art']), ['unknownArt']);
  assert.deepEqual(kinds([], { weaponId: 'no_such_weapon' }), ['unknownWeapon']);
});

test('检查通过的构筑 createBattle 一定接受；不通过的（除未取得外）createBattle 一定拒绝', () => {
  const cases: string[][] = [
    ['cold_sword', 'break_chase', 'return_breath'],
    ['return_breath', 'borrow_force', 'wind_step', 'break_strike'],
    ['cold_sword', 'break_strike', 'break_chase'],
    ['break_strike', 'break_strike'],
    ['return_breath', 'borrow_force', 'wind_step', 'break_strike', 'break_chase'],
  ];
  for (const arts of cases) {
    const ok = checkLoadout({ arts, weaponId: 'iron_sword', acquired: ALL }).ok;
    const run = () => createBattle({ seed: 1, player: player(arts), enemy: { config: 'balanced_standard' } });
    if (ok) assert.doesNotThrow(run, arts.join('、'));
    else assert.throws(run, arts.join('、'));
  }
});

test('保存的秘籍版本按版本 ID 装备，计入容量与剑类限制（主计划 9.1 节；组件细则第八章教学寒劲破势容量 6）', async () => {
  const { compileArt } = await import('../src/content/components.ts');
  const { findTemplate, replaceSlot } = await import('../src/edit/variant.ts');
  const art = compileArt(replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'm1@v1'));
  const r = checkLoadout({ arts: ['m1@v1', 'break_chase', 'return_breath'], weaponId: 'iron_sword', acquired: STARTER_ART_IDS, custom: [art] });
  assert.equal(r.capacity, 12);
  assert.deepEqual(r.problems.map((p) => p.kind), ['notAcquired'], '崩势追击未取得；自己的秘籍视为已取得');
  assert.deepEqual(checkLoadout({ arts: ['m1@v1'], weaponId: 'iron_blade', acquired: [], custom: [art] }).problems.map((p) => p.kind), ['swordOnly']);
});
