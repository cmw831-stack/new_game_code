// 十课教学的战斗课：教学细则 V1.2 第 2.1 节（检查点）、2.2 节（授业条件）、第三章（固定开始状态与完成判定）。
// 每课一个“按推荐操作能完成”和一个“不按推荐也不会卡死”的测试（Phase 2 方案 4.4 节）。规则按 V1.9.1。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { fillPage, PAGE_PREFACE } from '../src/edit/page.ts';
import { findTemplate, replaceSlot } from '../src/edit/variant.ts';
import { BATTLE_LESSONS, compareLessonInputs, FIXTURES, pageLesson, type BattleLesson } from '../src/teach/lessons.ts';
import type { BattleEvent, BattleState, Stance } from '../src/rules/types.ts';

const STANCES: Stance[] = ['attack', 'guard', 'breathe'];
const start = (l: BattleLesson) => createBattle({ seed: 1, player: structuredClone(l.player), enemy: l.enemy() });

function playOut(l: BattleLesson, s0: BattleState, stances: Stance[]): { state: BattleState; events: BattleEvent[]; doneAt: number | null } {
  let s = s0;
  const events: BattleEvent[] = [];
  let doneAt: number | null = null;
  for (const [i, stance] of stances.entries()) {
    if (s.over || doneAt !== null) break;
    const r = runRound(s, { stance });
    events.push(...r.events);
    s = r.state;
    if (l.done(events)) doneAt = i + 1;
  }
  return { state: s, events, doneAt };
}

const page = fillPage(PAGE_PREFACE, { modifier: { id: 'M_gang' } }, 'page_gang', '折锋').spec!;
const ALL: BattleLesson[] = [...BATTLE_LESSONS, pageLesson(page)];

test('检查点数值与教学细则 2.1 节一致', () => {
  const intro = createBattle({ seed: 1, player: ALL[0]!.player, enemy: FIXTURES.intro_balanced() });
  assert.deepEqual([intro.enemy.hp, intro.enemy.qi, intro.enemy.posture, intro.enemy.postureMax], [18, 6, 12, 12]);
  assert.deepEqual(intro.enemy.arts.map((a) => a.art.id), ['break_strike']);
  assert.deepEqual(intro.script.segments[0]!.items.map((x) => x.stance), ['attack', 'guard', 'breathe']);
  assert.equal(createBattle({ seed: 1, player: ALL[0]!.player, enemy: FIXTURES.breath_balanced() }).script.itemIndex, 1, '从第 2 项开始');
  const cold = createBattle({ seed: 1, player: ALL[0]!.player, enemy: FIXTURES.cold_example() });
  assert.deepEqual([cold.enemy.hp, cold.enemy.qi, cold.enemy.posture, cold.enemy.arts.length], [30, 8, 10, 0]);
  const res = createBattle({ seed: 1, player: ALL[0]!.player, enemy: FIXTURES.resonance() });
  assert.deepEqual([res.enemy.hp, res.enemy.qi, res.enemy.posture, res.enemy.weapon.base.hp, res.enemy.weapon.base.posture], [32, 8, 20, 4, 4]);
  assert.deepEqual(res.enemy.arts.map((a) => a.art.id), ['return_breath', 'npc_resonance'], '归息优先于蓄震');
  for (const s of [intro, cold, res]) assert.equal(s.script.fixed, true, '只循环开场段落');
});

for (const l of ALL) {
  test(`${l.name}：按推荐操作能完成（${l.goal}）`, () => {
    const r = playOut(l, start(l), Array.from({ length: 6 }, (_, i) => l.recommended[i % l.recommended.length]!));
    assert.notEqual(r.doneAt, null, `${l.id} 按推荐 6 轮内未完成`);
    assert.notEqual(r.state.over?.reason, 'defeat');
  });

  test(`${l.name}：不按推荐也不会卡死——任意前 4 轮都不会在完成前败退；重置后按推荐一定能完成（2.3 节“按本课输入重试”）`, () => {
    for (const a of STANCES) for (const b of STANCES) for (const c of STANCES) for (const d of STANCES) {
      const pre = playOut(l, start(l), [a, b, c, d]);
      if (pre.doneAt === null) assert.notEqual(pre.state.over?.reason, 'defeat', `${l.id} ${a}/${b}/${c}/${d} 完成前败退`);
    }
    const retry = playOut(l, start(l), Array.from({ length: 6 }, (_, i) => l.recommended[i % l.recommended.length]!));
    assert.notEqual(retry.doneAt, null);
  });
}

test('首战一轮手算（V1.9.1）：敌方出招先手，断势击接招后玩家出招接断势击，打崩对手架势', () => {
  const l = BATTLE_LESSONS[0]!;
  const r = runRound(start(l), { stance: 'attack' });
  // 敌：基础 4／4、断势 2／8 → 玩家 24 气血、架势 8；玩家：基础 4／4、断势 2／8 → 敌 12 气血、架势 0 崩溃。
  assert.deepEqual([r.state.player.hp, r.state.player.posture], [24, 8]);
  assert.equal(r.state.enemy.hp, 12);
  assert.ok(r.events.some((e) => e.type === 'crash' && e.side === 'enemy'));
});

test('版本对照课按 V1.9.1 重算（教学细则 3.1 节注明需重算）：原版 24／7／20、敌 27／10 冻结、反震 1；改良版 30／8／20、敌 29／8、积寒 1、无反震', () => {
  const revised = replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'cold_break');
  const ci = compareLessonInputs('cold_sword', revised);
  const run = (p: typeof ci.a) => runRound(createBattle({ seed: 1, player: p, enemy: ci.enemy() }), ci.decisions[0]!);
  const a = run(ci.a);
  assert.deepEqual([a.state.player.hp, a.state.player.qi, a.state.player.posture, a.state.enemy.hp, a.state.enemy.posture], [24, 7, 20, 27, 10]);
  assert.equal(a.state.enemy.status.freezePending, true);
  assert.equal(a.events.filter((e) => e.type === 'hit' && e.art === 'npc_resonance').length, 1);
  const b = run(ci.b);
  assert.deepEqual([b.state.player.hp, b.state.player.qi, b.state.player.posture, b.state.enemy.hp, b.state.enemy.posture], [30, 8, 20, 29, 8]);
  assert.equal(b.state.enemy.status.cold, 1);
  assert.equal(b.events.filter((e) => e.type === 'hit' && e.art === 'npc_resonance').length, 0);
});
