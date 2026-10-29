// 规则边界：E1 变异测试发现这些比较符改成“≤”“≥”后没有测试发现。预期都按文档原文推导。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRound } from '../src/engine/round.ts';
import type { ArtSpec } from '../src/content/components.ts';
import { battle, fixture, items, of, player } from './helpers.ts';

const skillWard = { ward: { source: 'skill' as const, expiresRound: 2, lockedCast: null, lockedRoot: null } };

test('格挡要求击前仍有架势（战斗细则 5.2 节）：架势 0 时护势不减半，基础出招 4 全额；架势 1 时减半为 2', () => {
  const enemy = { config: fixture({ items: items('attack') }) };
  const at0 = runRound(battle(player([], { posture: 0, status: skillWard }), enemy), { stance: 'breathe' });
  assert.equal(of(at0.events, 'block', 'player').length, 0);
  assert.equal(at0.state.player.hp, 30 - 4);
  const at1 = runRound(battle(player([], { posture: 1, status: skillWard }), enemy), { stance: 'breathe' });
  assert.equal(of(at1.events, 'block', 'player').length, 1);
  assert.equal(at1.state.player.hp, 30 - 2);
});

test('内力起势要“从阈值下方向上跨越”（组件细则第二章 T_qi）：守拙诀阈值 8，轮初 6→8 发动，8→10 与 5→7 不发动', () => {
  // 对手架招不出手，玩家出招不改变内力；只看轮初恢复 2 内力是否让守拙诀建立技能护势。
  const enemy = { config: fixture({ items: items('guard') }) };
  const after = (qi: number) => runRound(battle(player(['guard_humble'], { qi }), enemy), { stance: 'attack' }).state.player.status.ward?.source ?? null;
  assert.equal(after(6), 'skill', '6→8：恰好到达阈值，算跨越');
  assert.equal(after(8), null, '8→10：本来就在阈值上，不算跨越');
  assert.equal(after(5), null, '5→7：没到阈值');
});

test('“寒意跨 2”起势（组件细则第二章 T_status）：敌方寒意 1→2 那一轮发动；0→1、2→3（冻结）的轮次不发动', () => {
  // 接触寒击：每轮基础出招接触后发动一次单击甲配寒劲，积寒 1；寒意持续，到 3 层清空并冻结（战斗细则第七章）。
  const coldHit: ArtSpec = { id: 'cold_hit', name: '接触寒击', category: '绝学', trigger: 'T_contact', action: 'A_single', tier: '甲', modifier: 'M_cold', followup: null, recovery: null };
  const onCold2: ArtSpec = { id: 'on_cold2', name: '寒二追击', category: '绝学', trigger: 'T_status', triggerParam: 'cold2', action: 'A_single', tier: '甲', modifier: null, followup: null, recovery: null };
  let s = battle(player([coldHit, onCold2]), { config: fixture({ hpMax: 60, items: items('breathe') }) });
  const fired: number[] = [];
  const cold: number[] = [];
  for (let r = 0; r < 3; r++) {
    const res = runRound(s, { stance: 'attack' });
    fired.push(of(res.events, 'hit', 'player', 'on_cold2').length);
    cold.push(res.state.enemy.status.cold);
    s = res.state;
  }
  assert.deepEqual(cold, [1, 2, 0], '第三轮积满 3 层，清空并冻结');
  assert.deepEqual(fired, [0, 1, 0]);
});
