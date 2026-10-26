// 调参实验用的规则参数与武学覆盖：默认值必须等于 V1.8 规则，开关打开后按定义生效。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, DEFAULT_RULES, ValidationError } from '../src/engine/setup.ts';
import { battle, fixture, of, player, round } from './helpers.ts';

test('默认规则参数即 V1.8：护势只保护第一门主招，玩家始终先手', () => {
  assert.deepEqual(DEFAULT_RULES, { wardScope: 'main', initiative: 'player', freezeThreshold: 3 });
  const s = createBattle({ seed: 1, player: player([]), enemy: { config: 'balanced_standard' } });
  assert.deepEqual(s.rules, DEFAULT_RULES);
});

test('护势保护整条攻击链（实验开关）：刀客基础＋沉刃都被减半，总损血 3＋6＝9', () => {
  const s0 = battle(player([]), { config: 'blade_standard', startItem: 1, fixedSegment: true }, 1, { rules: { wardScope: 'chain' } });
  const { state, events } = round(s0, 'guard');
  assert.equal(state.player.hp, 21);
  assert.equal(of(events, 'hit', 'enemy', 'npc_heavy')[0]!.data.blocked, true);
  assert.equal(of(events, 'wardConsumed', 'player').length, 1, '在敌方根连锁结束后才消费');
});

test('敌方出招轮先手（实验开关）：敌方本轮出招时先于玩家行动；其他意图仍由玩家先手', () => {
  const s0 = battle(player([]), { config: 'balanced_standard' }, 1, { rules: { initiative: 'enemyOnAttack' } });
  const r1 = round(s0);
  const first = r1.events.find((e) => e.type === 'basicAttack')!;
  assert.equal(first.side, 'enemy', '第 1 项为出招，敌方先手');
  const r2 = round(r1.state);
  const firstR2 = r2.events.find((e) => e.type === 'basicAttack')!;
  assert.equal(firstR2.side, 'player', '第 2 项为架招，玩家先手');
});

test('武学覆盖：只改指定字段，双方共用；覆盖不存在的武学会被拒绝', () => {
  const s = createBattle({ seed: 1, player: player(['wind_step']), enemy: { config: 'swift_standard' }, artOverrides: { wind_step: { cost: 3 } } });
  assert.equal(s.player.arts[0]!.art.cost, 3);
  assert.equal(s.enemy.arts.find((a) => a.art.id === 'wind_step')!.art.cost, 3);
  assert.equal(s.player.arts[0]!.art.capacity, 3, '未覆盖的字段不变');
  assert.throws(
    () => createBattle({ seed: 1, player: player([]), enemy: { config: 'balanced_standard' }, artOverrides: { nope: { cost: 1 } } }),
    ValidationError,
  );
});

test('冻结阈值（实验开关）：阈值 4 时叠寒剑一次三段只积寒 3，不冻结；阈值不足 2 会被拒绝', () => {
  const s0 = battle(player(['cold_sword']), { config: fixture({ hpMax: 60, postureMax: 40 }) }, 1, { rules: { freezeThreshold: 4 } });
  const { state, events } = round(s0);
  assert.equal(of(events, 'freeze').length, 0);
  assert.equal(state.enemy.status.cold, 3);
  assert.throws(() => battle(player([]), { config: fixture() }, 1, { rules: { freezeThreshold: 1 } }), ValidationError);
});
