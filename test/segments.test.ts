// 套路段落：敌人细则 V1.1 第 2.2 节、执行契约 V1.1 第三章第 9 条与第四章。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../src/engine/setup.ts';
import { runBattle, runRound } from '../src/engine/round.ts';
import type { BattleState, Stance } from '../src/rules/types.ts';
import { of, player } from './helpers.ts';

function segmentTrace(seed: number, arts: string[], rounds: number, stance: Stance = 'guard'): { draws: string[]; segs: string[]; state: BattleState } {
  let s = createBattle({ seed, player: player(arts), enemy: { config: 'balanced_standard' } });
  const draws: string[] = [];
  const segs: string[] = [];
  for (let i = 0; i < rounds && !s.over; i++) {
    const r = runRound(s, { stance });
    for (const e of of(r.events, 'segmentDraw')) draws.push(`${e.round}:${e.data.next}`);
    for (const e of of(r.events, 'intent')) segs.push(`${e.round}:${e.data.segment}`);
    s = r.state;
  }
  return { draws, segs, state: s };
}

test('段落抽取：同一种子与输入得到同一段落序列', () => {
  const a = segmentTrace(42, ['return_breath'], 12);
  const b = segmentTrace(42, ['return_breath'], 12);
  assert.deepEqual(a.draws, b.draws);
  assert.deepEqual(a.segs, b.segs);
  assert.equal(a.state.rngDraws, a.draws.length, '每个段落交界恰好消耗一次随机数');
});

test('段落抽取：不同种子能抽到不同段落，两个段落都会出现', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 30; seed++) {
    for (const d of segmentTrace(seed, ['return_breath'], 4).draws) seen.add(d.split(':')[1]!);
  }
  assert.deepEqual([...seen].sort(), ['A', 'B']);
});

test('段落抽取在段落最后一项锁定时发生，并立即公开下一项', () => {
  const s0 = createBattle({ seed: 5, player: player(['return_breath']), enemy: { config: 'balanced_standard' } });
  const r1 = runRound(s0, { stance: 'guard' });
  const r2 = runRound(r1.state, { stance: 'guard' });
  assert.equal(of(r1.events, 'segmentDraw').length + of(r2.events, 'segmentDraw').length, 0, '前两项不抽取');
  const r3 = runRound(r2.state, { stance: 'guard' });
  const draw = of(r3.events, 'segmentDraw');
  assert.equal(draw.length, 1);
  assert.equal(draw[0]!.phase, 'intent');
  const nextId = draw[0]!.data.next as string;
  const nextSegment = r3.state.script.segments.find((sg) => sg.id === nextId)!;
  assert.deepEqual(r3.state.intent!.next, nextSegment.items[0], '第 3 轮锁定时，“下一项提示”已是抽中段落的第一项');
  assert.equal(r3.state.script.segments[r3.state.script.segIndex]!.id, nextId, '第 4 轮进入抽中的段落');
});

test('冻结跳过段落最后一项：段落照常推进，抽取时点与随机数消耗次数不变', () => {
  // 玩家用叠寒剑在第 2 轮末冻结对手，使其第 3 轮（段落 A 最后一项）被跳过；
  // 与一场从不冻结的对局相比，段落抽取的轮次与结果完全相同。
  const trace = (arts: string[], stances: Stance[]) => {
    let s = createBattle({ seed: 9, player: player(arts), enemy: { config: 'balanced_standard' } });
    const out: string[] = [];
    let skipped = 0;
    for (const stance of stances) {
      if (s.over) break;
      const r = runRound(s, { stance });
      for (const e of of(r.events, 'segmentDraw')) out.push(`${e.round}:${e.data.next}`);
      skipped += of(r.events, 'freezeSkip', 'enemy').length;
      s = r.state;
    }
    return { out, skipped, rngDraws: s.rngDraws };
  };
  const plain = trace(['return_breath'], ['guard', 'guard', 'guard', 'guard', 'guard', 'guard']);
  const frozen = trace(['cold_sword'], ['guard', 'attack', 'guard', 'guard', 'guard', 'guard']);
  assert.ok(frozen.skipped >= 1, '对手确实被冻结跳过一次');
  assert.deepEqual(frozen.out, plain.out);
  assert.equal(frozen.rngDraws, plain.rngDraws);
});

test('固定段落：引导配置只循环开场段落，不消耗战斗随机数', () => {
  const s0 = createBattle({ seed: 11, player: player(['return_breath']), enemy: { config: 'balanced_tutorial' } });
  const run = runBattle(s0, Array.from({ length: 7 }, () => ({ stance: 'guard' as const })));
  assert.equal(run.state.rngDraws, 0);
  assert.equal(of(run.events, 'segmentDraw').length, 0);
  const stances = of(run.events, 'intent').map((e) => e.data.stance);
  assert.deepEqual(stances.slice(0, 6), ['attack', 'guard', 'breathe', 'attack', 'guard', 'breathe']);
});

test('固定段落：具名课题可强制标准配置只循环段落 A', () => {
  const s0 = createBattle({ seed: 11, player: player(['return_breath']), enemy: { config: 'balanced_standard', fixedSegment: true } });
  const run = runBattle(s0, Array.from({ length: 6 }, () => ({ stance: 'guard' as const })));
  assert.equal(run.state.rngDraws, 0);
  assert.ok(of(run.events, 'intent').every((e) => e.data.segment === 'A'));
});

test('peekIntent：玩家承诺前看到的意图与本轮锁定的意图一致，且不改变状态', async () => {
  const { peekIntent } = await import('../src/engine/round.ts');
  let s = createBattle({ seed: 77, player: player(['return_breath']), enemy: { config: 'balanced_standard' } });
  for (let i = 0; i < 8 && !s.over; i++) {
    const before = structuredClone(s);
    const peeked = peekIntent(s);
    assert.deepEqual(s, before, 'peekIntent 不修改状态');
    const r = runRound(s, { stance: 'guard' });
    assert.deepEqual(r.state.intent, peeked);
    s = r.state;
  }
});
