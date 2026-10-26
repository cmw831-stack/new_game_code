// 策划书 V1.9 的手算用例（战斗细则 V1.2 第十一章、敌人细则 V1.2 第八章）。
// 预期值按 V1.9 规则逐项手算，写在文档里，不由引擎输出反推。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, encounterOpeningQi } from '../src/engine/setup.ts';
import { battle, damageBy, fixture, items, of, player, round, rootOf } from './helpers.ts';

test('战斗细则 V1.2 §11.5：叠寒剑攻入架招的对手——整条攻击链都被护势减半，崩溃后的追击不再减半', () => {
  // 对手架招（玩家先手）；玩家内力 8，轮初恢复后 10。
  const s0 = battle(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10, items: items('guard') }) });
  const { state, events } = round(s0);
  const root = rootOf(events, 'player');
  // 基础 4→2；叠寒三段各 2→1；第三段打崩架势；崩势追击消费破绽 4＋2＝6，对手已崩溃不再格挡。
  assert.deepEqual(of(root, 'hit', 'player').map((e) => e.data.hp), [2, 1, 1, 1, 6]);
  assert.equal(damageBy(root, 'player'), 11);
  assert.equal(state.enemy.hp, 19);
  assert.equal(state.player.qi, 4, '10 − 5 − 3 ＋ 2');
  assert.equal(state.enemy.status.freezePending, true, '本轮架招已用掉行动，冻结作用于下一轮');
  assert.equal(state.enemy.posture, 4, '轮末恢复到上限 10 的 40%');
  assert.equal(of(root, 'wardConsumed', 'enemy').length, 1, '护势在玩家这根连锁结束后才消费');
});

test('敌人细则 V1.2 §8.1：满架势架招承受标准刀客基础＋沉刃，护势减半整条攻击链，总损血 9，剩架势 12', () => {
  const s0 = battle(player([]), { config: 'blade_standard', startItem: 1, fixedSegment: true });
  const { state, events } = round(s0, 'guard');
  assert.equal(state.player.hp, 21);
  assert.equal(state.player.posture, 12);
  assert.equal(of(events, 'hit', 'enemy', 'npc_heavy')[0]!.data.blocked, true);
});

test('战斗细则 V1.2 §4.1：敌方本轮意图为出招时敌方先手，玩家先挨打再出手', () => {
  const s0 = battle(player([]), { config: fixture({ items: items('attack') }) });
  const { state, events } = round(s0);
  const attacks = of(events, 'basicAttack');
  assert.deepEqual(attacks.map((e) => e.side), ['enemy', 'player']);
  assert.equal(state.player.hp, 26);
  assert.equal(state.enemy.hp, 26);
});

test('敌人细则 V1.2 §4.1：高架势守卫与蓄震守卫的基础出招气血 +3，均衡武者不变', () => {
  const mk = (id: string) => createBattle({ seed: 1, player: player([]), enemy: { config: id } }).enemy;
  assert.deepEqual([mk('guard_standard').hpMax, mk('guard_standard').weapon.base.hp], [43, 6]);
  assert.deepEqual([mk('resonance_standard').hpMax, mk('resonance_standard').weapon.base.hp], [40, 7]);
  assert.deepEqual([mk('balanced_standard').hpMax, mk('balanced_standard').weapon.base.hp], [39, 4]);
});

test('主计划 V1.9 §4.2：每场遭遇开场内力取结转值与 10 中较小者', () => {
  assert.equal(encounterOpeningQi(20), 10);
  assert.equal(encounterOpeningQi(10), 10);
  assert.equal(encounterOpeningQi(6), 6);
});
