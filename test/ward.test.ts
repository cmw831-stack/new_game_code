// 护势：战斗细则 V1.2 4.2 节（架招“建立一层本轮护势”）、5.2 节（护势最多一层；基础架招护势覆盖整条攻击链）；
// 负责人决定 Q17（2026-10-29）：已持有技能护势时再架招，架招一定建立本轮基础护势，取代原有技能护势。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRound } from '../src/engine/round.ts';
import { battle, fixture, items, of, player } from './helpers.ts';

const skillWard = { ward: { source: 'skill' as const, expiresRound: 2, lockedCast: null, lockedRoot: null } };

test('Q17：持有技能护势时架招，整条攻击链都被减半——基础出招 4→2、断势击 2→1，玩家剩 27 气血', () => {
  const s0 = battle(player([], { status: skillWard }), { config: fixture({ artIds: ['break_strike'], items: items('attack') }) });
  const r = runRound(s0, { stance: 'guard' });
  assert.equal(of(r.events, 'block', 'player').length, 2, '两击都被格挡');
  assert.equal(r.state.player.hp, 27);
  assert.equal(r.state.player.status.ward, null, '攻击链结束后消费，轮末不再持有');
});

test('Q17：没有技能护势时架招，结果相同（架招的保护范围与是否装备守拙诀无关）', () => {
  const s0 = battle(player([]), { config: fixture({ artIds: ['break_strike'], items: items('attack') }) });
  const r = runRound(s0, { stance: 'guard' });
  assert.equal(r.state.player.hp, 27);
});

test('不架招时，技能护势只保护一门主招：基础出招减半，断势击不减半，剩 26 气血（主计划 4.3 节）', () => {
  const s0 = battle(player([], { status: skillWard }), { config: fixture({ artIds: ['break_strike'], items: items('attack') }) });
  const r = runRound(s0, { stance: 'breathe' });
  assert.equal(r.state.player.hp, 26);
});
