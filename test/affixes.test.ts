// 首批六个公开词缀：敌人细则 V1.3 第 9.1 节（规则边界）、9.2 节（效果与补偿、适用模板）；配置数值见同文件第四章（V1.9.1）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, ValidationError } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { battle, fixture, items, of, player } from './helpers.ts';

const mk = (config: string, affixes: string[], arts: string[] = ['break_strike', 'return_breath']) =>
  createBattle({ seed: 1, player: player(arts), enemy: { config, affixes } });

test('寒体：高架势守卫气血上限 52 → 46（−10% 向下取整），冻结阈值 3 → 4、保护期间上限 2 → 3', () => {
  const s = mk('guard_standard', ['AFX_COLD_BODY']);
  assert.deepEqual([s.enemy.hp, s.enemy.hpMax], [46, 46]);
  assert.deepEqual([s.enemy.coldThreshold, s.enemy.coldCapProtected], [4, 3]);
  assert.deepEqual([s.player.coldThreshold, s.player.coldCapProtected], [3, 2], '玩家不受影响');
});

test('寒体：叠寒剑一次三连只积寒 3，不冻结；无词缀时同一轮冻结', () => {
  const base = (affixes: string[]) => createBattle({ seed: 1, player: player(['cold_sword']), enemy: { config: 'balanced_standard', affixes } });
  const plain = runRound(base([]), { stance: 'attack' });
  assert.equal(of(plain.events, 'freeze', 'enemy').length, 1);
  const cold = runRound(base(['AFX_COLD_BODY']), { stance: 'attack' });
  assert.equal(of(cold.events, 'freeze', 'enemy').length, 0);
  assert.equal(cold.state.enemy.status.cold, 3);
});

test('铁衣：高架势守卫架势上限 28 → 32；崩溃后轮末只恢复到 30%（9），而不是 40%（12）', () => {
  const s = mk('guard_standard', ['AFX_IRON_GUARD']);
  assert.deepEqual([s.enemy.posture, s.enemy.postureMax, s.enemy.crashFloorPct], [32, 32, 30]);
  // 简化对手：架势上限 20、开场架势 1、本轮出招；玩家基础出招打崩它，轮末恢复到下限。
  // 无词缀：floor(20×40%)＝8；铁衣：上限 24，floor(24×30%)＝7。
  const crash = (affixes: string[]) =>
    runRound(battle(player([]), { config: { ...fixture({ postureMax: 20, items: items('attack') }), fixedSegment: false, templateId: 'guard' }, posture: 1, affixes }), { stance: 'attack' }).state.enemy.posture;
  assert.equal(crash([]), 8);
  assert.equal(crash(['AFX_IRON_GUARD']), 7);
});

test('重手：高架势守卫基础出招 6／5（长柄铁棍 3／5 ＋ 配置 +3）→ 5／7', () => {
  assert.deepEqual(mk('guard_standard', []).enemy.weapon.base, { hp: 6, posture: 5 });
  assert.deepEqual(mk('guard_standard', ['AFX_HEAVY_HAND']).enemy.weapon.base, { hp: 5, posture: 7 });
});

test('厚气：开场内力 +4，不超过上限 20（高架势守卫 10 → 14）', () => {
  assert.equal(mk('guard_standard', ['AFX_DEEP_QI']).enemy.qi, 14);
});

test('身轻：开场一份身法准备、第 1 轮末到期，架势上限 −2（高架势守卫 28 → 26）；不用于疾步剑客', () => {
  const s = mk('guard_standard', ['AFX_LIGHT_STEP']);
  assert.deepEqual(s.enemy.status.step, { expiresRound: 1 });
  assert.deepEqual([s.enemy.posture, s.enemy.postureMax], [26, 26]);
  const r = runRound(s, { stance: 'guard' });
  assert.equal(r.state.enemy.status.step, null, '第 1 轮末到期');
  assert.throws(() => mk('swift_standard', ['AFX_LIGHT_STEP']), ValidationError);
});

test('伤疲：开场气血为上限的 70%，向下取整（高架势守卫 52 → 36）', () => {
  const s = mk('guard_standard', ['AFX_WEARY']);
  assert.deepEqual([s.enemy.hp, s.enemy.hpMax], [36, 52]);
});

test('两个词缀可以同时生效：寒体＋伤疲，上限 46、开场 floor(46×70%)＝32', () => {
  const s = mk('guard_standard', ['AFX_COLD_BODY', 'AFX_WEARY']);
  assert.deepEqual([s.enemy.hp, s.enemy.hpMax, s.enemy.coldThreshold], [32, 46, 4]);
});

test('每个敌人最多 2 个词缀，同名不叠加，未知词缀与引导配置都拒绝（敌人细则 9.1 节）', () => {
  assert.throws(() => mk('guard_standard', ['AFX_COLD_BODY', 'AFX_WEARY', 'AFX_DEEP_QI']), ValidationError);
  assert.throws(() => mk('guard_standard', ['AFX_DEEP_QI', 'AFX_DEEP_QI']), ValidationError);
  assert.throws(() => mk('guard_standard', ['AFX_NOPE']), ValidationError);
  assert.throws(() => mk('balanced_tutorial', ['AFX_DEEP_QI']), ValidationError);
  assert.deepEqual(mk('guard_standard', ['AFX_DEEP_QI']).enemy.affixes, ['AFX_DEEP_QI']);
});

test('因果记录标注词缀来源：寒体下三连积寒 3 未冻结（敌人细则 9.1 节示例）', async () => {
  const { battleNames, narrate } = await import('../src/narrate/narrate.ts');
  const s0 = createBattle({ seed: 1, player: player(['cold_sword']), enemy: { config: 'balanced_standard', affixes: ['AFX_COLD_BODY'] } });
  const text = narrate(runRound(s0, { stance: 'attack' }).events, battleNames(s0)).map((l) => l.text);
  assert.ok(text.some((t) => t.includes('叠寒剑') && t.includes('寒意 3') && t.includes('冻结未生效：寒体，需 4 寒意')), text.join('\n'));
});
