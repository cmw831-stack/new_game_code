// 精通单槽替换：组件细则 V1.2 第 7.1–7.3 节（权限与全局组件库）、第八章（合法改造实例的重算结果）、
// 第九章（明确拒绝的组合）；教学细则 V1.2 第 4.2 节与第三章 teach_edit_one_v1。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileArt, specProblems } from '../src/content/components.ts';
import { createBattle, ValidationError } from '../src/engine/setup.ts';
import { checkVariant, findTemplate, replaceSlot, slotDiff, type EditResearch } from '../src/edit/variant.ts';
import { player } from './helpers.ts';

const cold = findTemplate('cold_sword')!;
/** 教学授业 grant_edit_intro_v1：断势、叠寒精通，授破势甲与连击乙（组件细则 7.2 节“教学先授”）。 */
const TAUGHT: EditResearch = { mastered: ['break_strike', 'cold_sword'], library: ['A_break:甲', 'A_combo:乙'] };
const kinds = (r: { problems: { kind: string }[] }) => r.problems.map((p) => p.kind);

test('教学寒劲破势：叠寒剑只把连击乙换成破势甲，费用 5→4、容量 6→6，一击 2／8，保留寒劲与剑类限制（组件细则第八章）', () => {
  const draft = replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' });
  const r = checkVariant('cold_sword', draft, TAUGHT);
  assert.deepEqual(kinds(r), []);
  assert.deepEqual(r.changed, ['action']);
  assert.deepEqual(r.before, { cost: 5, capacity: 6 });
  assert.deepEqual(r.after, { cost: 4, capacity: 6 });
  const art = compileArt(draft);
  assert.equal(art.action.kind, 'attack');
  assert.deepEqual(art.action.kind === 'attack' && art.action.hits, [{ hp: 2, posture: 8 }]);
  assert.equal(art.modifier, 'cold');
  assert.ok(specProblems(draft, 'blade').length > 0, '改良版沿用来源的剑类限制，刀不能用');
});

test('改良版在实战中仍要求剑：铁剑可以开打，铁柄刀被拒绝（组件细则第九章）', () => {
  const draft = replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' });
  const run = (weaponId: string) => createBattle({ seed: 1, player: player([draft], { weaponId }), enemy: { config: 'balanced_standard' } });
  assert.doesNotThrow(() => run('iron_sword'));
  assert.throws(() => run('iron_blade'), ValidationError);
});

test('轻量寒劲单击：已精通叠寒、已从崩追取得单击甲，费用 3、容量 4，一击 4／0（组件细则第八章）', () => {
  const draft = replaceSlot(cold, 'action', { id: 'A_single', tier: '甲' });
  const r = checkVariant('cold_sword', draft, { mastered: ['cold_sword', 'break_chase'], library: ['A_single:甲', 'A_single:乙'] });
  assert.deepEqual(kinds(r), []);
  assert.deepEqual(r.after, { cost: 3, capacity: 4 });
  const art = compileArt(draft);
  assert.deepEqual(art.action.kind === 'attack' && art.action.hits, [{ hp: 4, posture: 0 }]);
  assert.ok(specProblems(draft, 'staff').length > 0, '改良版仍要求剑');
});

test('借力柔反：借力化境解锁柔劲后只替换劲力槽，费用 3、容量 4（组件细则第八章）', () => {
  const draft = replaceSlot(findTemplate('borrow_force')!, 'modifier', { id: 'M_soft' });
  const r = checkVariant('borrow_force', draft, { mastered: ['borrow_force'], library: ['A_counter:甲', 'A_counter:乙', 'T_block', 'M_soft'] });
  assert.deepEqual(kinds(r), []);
  assert.deepEqual(r.before, { cost: 3, capacity: 3 });
  assert.deepEqual(r.after, { cost: 3, capacity: 4 });
});

test('精通叠寒同时换破势主招、加伤血回气：两个槽不同，拒绝（组件细则第九章）', () => {
  const draft = { ...replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' }), recovery: 'R_qi' as const };
  const r = checkVariant('cold_sword', draft, { ...TAUGHT, library: [...TAUGHT.library, 'R_qi'] });
  assert.deepEqual(kinds(r), ['tooManySlots']);
  assert.deepEqual(r.changed, ['action', 'recovery']);
});

test('不能先换主招保存，再以改良版为原版继续换劲力：差异按来源模板计（组件细则 7.1 节）', () => {
  const first = replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' });
  const second = replaceSlot(first, 'modifier', { id: 'M_shock' });
  assert.deepEqual(slotDiff(cold, second), ['action', 'modifier']);
  assert.deepEqual(kinds(checkVariant('cold_sword', second, { ...TAUGHT, library: [...TAUGHT.library, 'M_shock'] })), ['tooManySlots']);
  assert.deepEqual(kinds(checkVariant(first.id, second, TAUGHT)), ['unknownSource'], '改良版不能当作来源');
});

test('回气主招附寒劲：非攻击动作没有接触型劲力作用点，拒绝（组件细则第九章）', () => {
  const draft = replaceSlot(findTemplate('return_breath')!, 'modifier', { id: 'M_cold' });
  const r = checkVariant('return_breath', draft, { mastered: ['return_breath'], library: ['M_cold'] });
  assert.deepEqual(kinds(r), ['incompatible']);
  assert.equal(r.after, null);
});

test('基础接触起势配反击主招：反击要求真实防御事实，拒绝（组件细则第九章）', () => {
  const draft = replaceSlot(findTemplate('borrow_force')!, 'trigger', { id: 'T_contact' });
  assert.deepEqual(kinds(checkVariant('borrow_force', draft, { mastered: ['borrow_force'], library: ['T_contact'] })), ['incompatible']);
});

test('新放入的组件必须已在全局组件库：只有教学授业时，叠寒不能换成单击（组件细则 7.3 节）', () => {
  const r = checkVariant('cold_sword', replaceSlot(cold, 'action', { id: 'A_single', tier: '甲' }), TAUGHT);
  assert.deepEqual(r.problems.map((p) => [p.kind, p.slot]), [['locked', 'action']]);
});

test('来源未精通不能替换：崩势追击未精通（组件细则 7.1 节）', () => {
  const draft = replaceSlot(findTemplate('break_chase')!, 'action', { id: 'A_break', tier: '甲' });
  assert.deepEqual(kinds(checkVariant('break_chase', draft, TAUGHT)), ['notMastered']);
});

test('把劲力设为“无”不需要解锁：叠寒去掉寒劲，费用 4、容量 4（组件细则第九章的修正建议）', () => {
  const r = checkVariant('cold_sword', replaceSlot(cold, 'modifier', { id: null }), TAUGHT);
  assert.deepEqual(kinds(r), []);
  assert.deepEqual(r.after, { cost: 4, capacity: 4 });
});

test('剑类限制不能靠改装解除；与原版相同不算一次替换', () => {
  const draft = { ...replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' }), swordOnly: false };
  assert.deepEqual(kinds(checkVariant('cold_sword', draft, TAUGHT)), ['swordOnlyLost']);
  assert.deepEqual(kinds(checkVariant('cold_sword', { ...cold, id: 'copy' }, TAUGHT)), ['noChange']);
});
