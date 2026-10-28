// 变招：战斗细则 V1.2 4.4 节、主计划 V1.9.1 4.1 节——每战 2 次，在尚未承诺的一轮临时做一项调整
// （改变本轮武学优先级、暂停一门可选武学、调整本轮留力值），效果到轮末结束，原编排不被改写。
// 候选排序按武学优先级：主计划 V1.9.1 5.2 节。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRound } from '../src/engine/round.ts';
import { ValidationError } from '../src/engine/setup.ts';
import { battle, battle18, fixture, items, of, player } from './helpers.ts';

// 战斗细则 11.1／11.2 的同一局面（V1.8 数值）：叠寒剑→崩势追击，玩家内力 10（已含轮初恢复）。
const coldChase = () => battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10, items: items('attack', 'guard') }) });

test('变招调本轮留力为 4，结果与战斗细则 11.2 节相同：敌剩 17，玩家内力 6，破绽保留', () => {
  const r = runRound(coldChase(), { stance: 'attack', change: { reserve: 4 } });
  assert.equal(r.state.enemy.hp, 17);
  assert.equal(r.state.player.qi, 6);
  assert.notEqual(r.state.player.status.opening, null);
  assert.equal(of(r.events, 'skip', 'player', 'break_chase')[0]?.data.reason, 'reserve');
  assert.equal(r.state.changesLeft, 1, '每战 2 次，用掉 1 次');
  assert.equal(r.state.player.reserve, 0, '效果到轮末结束，原留力不被改写');
});

test('变招暂停崩势追击：本轮不追击，敌剩 17、内力 6，与 11.2 节同样少打 6', () => {
  const r = runRound(coldChase(), { stance: 'attack', change: { pause: ['break_chase'] } });
  assert.equal(r.state.enemy.hp, 17);
  assert.equal(r.state.player.qi, 6);
  assert.equal(of(r.events, 'cast', 'player', 'break_chase').length, 0);
  assert.deepEqual(r.state.player.arts.map((a) => a.art.id), ['cold_sword', 'break_chase'], '装备不变');
});

test('变招调本轮优先级：同一接触窗口里排在前面的先付款（V1.9 价：叠寒剑 5、断势击 3，内力 6 只够一门）', () => {
  // 玩家内力 4，轮初恢复 2 后为 6；对手调息，不出手。
  const s0 = battle(player(['cold_sword', 'break_strike'], { qi: 4 }), { config: fixture({ postureMax: 20, items: items('breathe') }) });
  const a = runRound(s0, { stance: 'attack' });
  assert.equal(of(a.events, 'cast', 'player', 'cold_sword').length, 1);
  assert.equal(of(a.events, 'skip', 'player', 'break_strike')[0]?.data.reason, 'insufficientQi');
  assert.equal(a.state.player.qi, 1);

  const b = runRound(s0, { stance: 'attack', change: { priority: ['break_strike', 'cold_sword'] } });
  assert.equal(of(b.events, 'cast', 'player', 'break_strike').length, 1);
  assert.equal(of(b.events, 'skip', 'player', 'cold_sword')[0]?.data.reason, 'insufficientQi');
  assert.equal(b.state.player.qi, 3);
  assert.deepEqual(b.state.player.arts.map((x) => x.art.id), ['cold_sword', 'break_strike'], '原编排不被改写');
});

test('每战只有 2 次变招，第三次被拒绝且不结算', () => {
  let s = coldChase();
  s = runRound(s, { stance: 'guard', change: { reserve: 4 } }).state;
  s = runRound(s, { stance: 'guard', change: { reserve: 4 } }).state;
  assert.equal(s.changesLeft, 0);
  assert.throws(() => runRound(s, { stance: 'guard', change: { reserve: 4 } }), ValidationError);
});

test('一次变招只能做一项调整', () => {
  assert.throws(() => runRound(coldChase(), { stance: 'attack', change: { reserve: 4, pause: ['break_chase'] } }), ValidationError);
  assert.throws(() => runRound(coldChase(), { stance: 'attack', change: {} }), ValidationError);
});

test('变招的内容必须合法：只能暂停一门已装备武学；优先级必须是已装备武学的重新排列；留力为非负整数', () => {
  const s = coldChase();
  const bad = [
    { pause: ['break_chase', 'cold_sword'] },
    { pause: ['wind_step'] },
    { priority: ['break_chase'] },
    { priority: ['break_chase', 'wind_step'] },
    { priority: ['break_chase', 'break_chase'] },
    { reserve: -1 },
    { reserve: 1.5 },
  ];
  for (const change of bad) assert.throws(() => runRound(s, { stance: 'attack', change }), ValidationError, JSON.stringify(change));
});
