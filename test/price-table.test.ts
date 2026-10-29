// 组件价表逐项核对：预期抄自组件细则 V1.2 第二至五章的表格与第八章“合法改造实例”的重算结果。
// E1 变异测试发现十二门预设没用到的组件档位（重击、反击、变化、复架势等）改错了也没有测试发现，这里逐项补上。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileArt, specProblems, type ArtSpec } from '../src/content/components.ts';

const spec = (s: Partial<ArtSpec>): ArtSpec => ({ id: 't', name: 't', category: '绝学', trigger: 'T_contact', action: 'A_single', modifier: null, followup: null, recovery: null, ...s });
const hits = (...xs: [number, number][]) => xs.map(([hp, posture]) => ({ hp, posture }));

test('第三章主招表：每类每档的原始内力、容量、威力与剑专用标签（接触起势，修正 0）', () => {
  const rows: [ArtSpec['action'], '甲' | '乙', number, number, ReturnType<typeof hits>, string, boolean][] = [
    ['A_single', '甲', 2, 2, hits([4, 0]), 'single', false],
    ['A_single', '乙', 2, 2, hits([3, 2]), 'single', false],
    ['A_combo', '甲', 2, 3, hits([2, 1], [2, 1]), 'combo', true],
    ['A_combo', '乙', 4, 4, hits([2, 2], [2, 2], [2, 2]), 'combo', true],
    ['A_heavy', '甲', 4, 4, hits([8, 2]), 'heavy', false],
    ['A_heavy', '乙', 4, 4, hits([6, 5]), 'heavy', false],
    ['A_break', '甲', 3, 4, hits([2, 8]), 'break', false],
    ['A_break', '乙', 3, 4, hits([3, 6]), 'break', false],
  ];
  for (const [action, tier, cost, capacity, h, type, swordOnly] of rows) {
    const art = compileArt(spec({ action, tier }));
    assert.deepEqual([art.cost, art.capacity, art.action], [cost, capacity, { kind: 'attack', type, hits: h, swordOnly }], `${action} ${tier}`);
  }
});

test('第三章主招表：反击（只接受格挡或闪避起势，修正 −1）、护势、身法、回气', () => {
  for (const [tier, h] of [['甲', hits([6, 2])], ['乙', hits([4, 5])]] as const) {
    const art = compileArt(spec({ trigger: 'T_block', action: 'A_counter', tier }));
    assert.deepEqual([art.cost, art.capacity, art.action], [4 - 1, 3, { kind: 'attack', type: 'counter', hits: h, swordOnly: false }], `反击 ${tier}`);
  }
  assert.deepEqual(specProblems(spec({ action: 'A_counter' })), ['反击主招只接受格挡或闪避起势'], '第九章：基础接触起势直接配反击主招');
  const ward = compileArt(spec({ action: 'A_ward', tier: '甲' }));
  assert.deepEqual([ward.cost, ward.capacity, ward.action], [2, 3, { kind: 'ward' }]);
  const step = compileArt(spec({ action: 'A_step', tier: '甲' }));
  assert.deepEqual([step.cost, step.capacity, step.action], [3, 3, { kind: 'step' }]);
  for (const [tier, cost, amount] of [['甲', 0, 1], ['乙', 1, 2]] as const) {
    const qi = compileArt(spec({ action: 'A_qi', tier }));
    assert.deepEqual([qi.cost, qi.capacity, qi.action], [cost, 2, { kind: 'qi', amount }], `回气 ${tier}`);
  }
});

test('第二章起势修正与 1.1 节最低费用：格挡、闪避、崩溃让 1；攻击最低 1，非攻击最低 0', () => {
  for (const trigger of ['T_dodge', 'T_block', 'T_break'] as const) assert.equal(compileArt(spec({ trigger, action: 'A_break' })).cost, 3 - 1, trigger);
  assert.equal(compileArt(spec({ trigger: 'T_qi', triggerParam: 8, action: 'A_break' })).cost, 3);
  assert.equal(compileArt(spec({ trigger: 'T_status', triggerParam: 'cold2', action: 'A_break' })).cost, 3);
  // 单击甲 2 − 1 ＝ 1；再加柔劲 0 仍是 1。
  assert.equal(compileArt(spec({ trigger: 'T_dodge', action: 'A_single', modifier: 'M_soft' })).cost, 1);
  // 回气甲 0 − 1 ＝ −1，非攻击最低 0。
  assert.equal(compileArt(spec({ trigger: 'T_block', action: 'A_qi', tier: '甲' })).cost, 0);
  assert.equal(specProblems(spec({ trigger: 'T_qi', triggerParam: 9 })).length, 1, 'T_qi 阈值只能是 8 或 10');
  assert.equal(specProblems(spec({ trigger: 'T_status', triggerParam: 8 })).length, 1, 'T_status 只能是寒意跨 2 或冻结出现');
});

test('第四章劲力：追加内力与容量（刚 1／1、柔 0／1、寒 1／2、震 1／1），只装在攻击主招上', () => {
  for (const [modifier, id, cost, capacity] of [['M_gang', 'gang', 1, 1], ['M_soft', 'soft', 0, 1], ['M_cold', 'cold', 1, 2], ['M_shock', 'shock', 1, 1]] as const) {
    const art = compileArt(spec({ action: 'A_single', modifier }));
    assert.deepEqual([art.modifier, art.cost, art.capacity], [id, 2 + cost, 2 + capacity], modifier);
  }
  assert.equal(specProblems(spec({ action: 'A_qi', modifier: 'M_cold' })).length, 1, '第九章：回气主招附寒劲');
});

test('5.1 节变化：伤血后单击（容量 3，子招一击 4／0，另付 2）与冻结追击（容量 4，两击 2／1，另付 2，剑专用，须配寒劲）', () => {
  const hit = compileArt(spec({ action: 'A_single', followup: 'F_hit_single' }));
  assert.deepEqual([hit.cost, hit.capacity, hit.followup], [2, 2 + 3, { kind: 'onHpDamage', hits: hits([4, 0]), cost: 2, swordOnly: false }]);
  const freeze = compileArt(spec({ action: 'A_single', modifier: 'M_cold', followup: 'F_freeze_combo' }));
  assert.deepEqual([freeze.cost, freeze.capacity, freeze.followup], [3, 2 + 2 + 4, { kind: 'onOwnFreeze', hits: hits([2, 1], [2, 1]), cost: 2, swordOnly: true }]);
  assert.equal(specProblems(spec({ action: 'A_single', followup: 'F_freeze_combo' })).length, 1, '冻结追击必须与本门寒劲共同装配');
  assert.equal(specProblems(spec({ action: 'A_ward', followup: 'F_hit_single' })).length, 1, '变化只兼容攻击主招');
  assert.deepEqual(specProblems(spec({ action: 'A_single', modifier: 'M_cold', followup: 'F_freeze_combo' }), 'blade'), ['该秘籍带剑专用组件，当前兵器不是剑'], '冻结追击保留 swordOnly');
});

test('5.2 节收势：伤血回气（+1 内力、容量 1、回 2，只配攻击）与复架势（+0、容量 1、恢复 2，只配回气或状态主招）', () => {
  const qi = compileArt(spec({ action: 'A_single', recovery: 'R_qi' }));
  assert.deepEqual([qi.cost, qi.capacity, qi.recovery], [3, 3, { kind: 'qiOnHpDamage', amount: 2 }]);
  const posture = compileArt(spec({ action: 'A_qi', tier: '甲', recovery: 'R_posture' }));
  assert.deepEqual([posture.cost, posture.capacity, posture.recovery], [0, 3, { kind: 'postureOnComplete', amount: 2 }]);
  assert.equal(specProblems(spec({ action: 'A_qi', recovery: 'R_qi' })).length, 1, '第九章：纯回气附伤血回气收势');
  assert.equal(specProblems(spec({ action: 'A_single', recovery: 'R_posture' })).length, 1, '攻击主招首版不接受复架势');
});

test('第八章合法改造实例的费用与容量（秘籍本身，不含兵器）', () => {
  const rows: [string, Partial<ArtSpec>, number, number][] = [
    ['教学寒劲破势', { action: 'A_break', modifier: 'M_cold', swordOnly: true }, 4, 6],
    ['轻量寒劲单击', { action: 'A_single', modifier: 'M_cold', swordOnly: true }, 3, 4],
    ['格挡震击', { trigger: 'T_block', action: 'A_break', modifier: 'M_shock' }, 3, 5],
    ['借力柔反', { trigger: 'T_block', action: 'A_counter', modifier: 'M_soft' }, 3, 4],
    ['通用寒击追招', { action: 'A_single', modifier: 'M_cold', followup: 'F_hit_single' }, 3, 7],
  ];
  for (const [name, s, cost, capacity] of rows) {
    const art = compileArt(spec(s));
    assert.deepEqual([art.cost, art.capacity], [cost, capacity], name);
  }
});
