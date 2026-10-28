// A／B 对照：教学细则 V1.2 3.1 节（原三连寒劲与单次破势寒劲面对蓄震守卫一轮的独立手算，V1.8 规则与数值；
// 从相同输入重新开始，延长时用相同轮数与决策序列）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ArtSpec } from '../src/content/components.ts';
import type { Stance } from '../src/rules/types.ts';
import { compareVersions, translateDecision } from '../src/sim/compare.ts';
import { battle, battle18, player } from './helpers.ts';

const coldBreak: ArtSpec = { id: 'cold_break', name: '叠寒剑·破势改良', category: '外功', trigger: 'T_contact', action: 'A_break', tier: '甲', modifier: 'M_cold', followup: null, recovery: null, swordOnly: true };
const resonance = { config: 'resonance_standard', fixedSegment: true } as const;
const mk = (arts: (string | ArtSpec)[]) => battle18(player(arts, { qi: 10 }), resonance);

test('教学细则 3.1：两版各从相同输入开始，第一轮并列——原版 24／8／20 敌 21／10 并冻结，改良版 30／8／20 敌 28／8 积寒 1、不触发蓄震', () => {
  const c = compareVersions(mk(['cold_sword', 'return_breath']), mk([coldBreak, 'return_breath']), [{ stance: 'attack' }]);
  const { a, b } = c.rows[0]!;
  assert.deepEqual(a!.player, { hp: 24, qi: 8, posture: 20 });
  assert.deepEqual([a!.enemy.hp, a!.enemy.posture, a!.enemy.frozen], [21, 10, true]);
  assert.equal(a!.resonance, 1);
  assert.deepEqual(b!.player, { hp: 30, qi: 8, posture: 20 });
  assert.deepEqual([b!.enemy.hp, b!.enemy.posture, b!.enemy.cold, b!.enemy.frozen], [28, 8, 1, false]);
  assert.equal(b!.resonance, 0);
  assert.equal(c.firstDivergence, 1);
});

test('两版不共享状态：B 的敌人从满气血开始，与 A 已造成的伤害无关（教学细则 3.1 节）', () => {
  const a0 = mk(['cold_sword', 'return_breath']);
  const b0 = mk([coldBreak, 'return_breath']);
  const c = compareVersions(a0, b0, [{ stance: 'attack' }, { stance: 'guard' }]);
  assert.equal(c.rows.length, 2);
  assert.equal(a0.enemy.hp, 32, '输入状态未被修改');
  assert.equal(b0.enemy.hp, 32);
  assert.equal(c.rows[0]!.b!.enemy.hp, 28, 'B 第一轮只受自己的 4 点伤害');
});

test('相同构筑、相同决策序列的两份对照完全一致，没有分歧轮', () => {
  const s = () => battle(player(['cold_sword', 'break_chase', 'return_breath']), { config: 'balanced_standard' }, 7);
  const stances: Stance[] = ['attack', 'guard', 'attack', 'breathe', 'attack', 'attack', 'attack', 'attack'];
  const decisions = stances.map((stance) => ({ stance }));
  const c = compareVersions(s(), s(), decisions);
  assert.equal(c.firstDivergence, null);
  assert.deepEqual(c.a, c.b);
});

test('一方先结束后另一方继续按序列结算，到序列用完为止', () => {
  const strong = battle(player(['cold_sword', 'break_chase', 'return_breath']), { config: 'balanced_tutorial' }, 1);
  const none = battle(player([]), { config: 'balanced_tutorial' }, 1);
  const c = compareVersions(strong, none, Array.from({ length: 12 }, () => ({ stance: 'attack' }) as const));
  assert.equal(c.a.outcome, 'victory');
  assert.ok(c.a.rounds < c.b.rounds, `${c.a.rounds} < ${c.b.rounds}`);
  assert.ok(c.rows.at(-1)!.a === null);
});

test('变招按装备位翻译给 B：暂停 A 第 1 位即暂停 B 第 1 位；B 同位没有武学则只做基础姿态', () => {
  const a = mk(['cold_sword', 'return_breath']);
  const b = mk([coldBreak, 'return_breath']);
  assert.deepEqual(translateDecision({ stance: 'attack', change: { pause: ['cold_sword'] } }, a, b), { stance: 'attack', change: { pause: ['cold_break'] } });
  assert.deepEqual(translateDecision({ stance: 'attack', change: { priority: ['return_breath', 'cold_sword'] } }, a, b), { stance: 'attack', change: { priority: ['return_breath', 'cold_break'] } });
  const one = mk([coldBreak]);
  assert.deepEqual(translateDecision({ stance: 'guard', change: { pause: ['return_breath'] } }, a, one), { stance: 'guard' });
  assert.deepEqual(translateDecision({ stance: 'guard', change: { reserve: 4 } }, a, one), { stance: 'guard', change: { reserve: 4 } });
});
