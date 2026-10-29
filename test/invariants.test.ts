// E1 不变式（目标 V2 第四节）：用随机生成的合法对局检查规则核心必须始终成立的性质。
// 依据：主计划 V1.9.1 12.3 节（同输入重放一致）、12.4 节（必需的自动化检查）、4.2–4.4 节（资源上下限、支付）；
// 执行契约 V1.2 第三章（预览不改变正式状态、事件序号稳定）。预期都是性质本身，不来自引擎输出。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { createBattle } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { oracleCase } from '../src/sim/oracle-gen.ts';
import { toEngine } from '../src/sim/oracle-io.ts';
import type { BattleEvent, BattleState, Decision, Side } from '../src/rules/types.ts';

const RUNS = Number(process.env.INVARIANT_RUNS ?? 300);
const opts = { numRuns: RUNS, seed: 20261029 };

function play(input: Parameters<typeof createBattle>[0], decisions: Decision[]) {
  const states: BattleState[] = [createBattle(structuredClone(input))];
  const events: BattleEvent[][] = [];
  for (const d of decisions) {
    const s = states.at(-1)!;
    if (s.over) break;
    const r = runRound(s, d);
    states.push(r.state);
    events.push(r.events);
  }
  return { states, events };
}

const engineCase = oracleCase.map((c) => toEngine(c)).filter((x): x is Exclude<ReturnType<typeof toEngine>, { error: string }> => !('error' in x));

test('预览不改变输入状态：runRound 前后输入状态逐字段相同（执行契约第三章）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    let s = createBattle(structuredClone(input));
    for (const d of decisions) {
      if (s.over) break;
      const before = structuredClone(s);
      const r = runRound(s, d);
      assert.deepEqual(s, before);
      s = r.state;
    }
  }), opts);
});

test('同输入重放一致：两次结算的全部状态与事件相同（主计划 12.3 节）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    const a = play(input, decisions);
    const b = play(input, decisions);
    assert.deepEqual(a, b);
  }), opts);
});

test('资源始终在 0 与上限之间；寒意不超过冻结阈值（主计划 4.3 节）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    for (const s of play(input, decisions).states) {
      for (const f of [s.player, s.enemy]) {
        assert.ok(f.hp >= 0 && f.hp <= f.hpMax, `气血 ${f.hp}/${f.hpMax}`);
        assert.ok(f.qi >= 0 && f.qi <= f.qiMax, `内力 ${f.qi}/${f.qiMax}`);
        assert.ok(f.posture >= 0 && f.posture <= f.postureMax, `架势 ${f.posture}/${f.postureMax}`);
        assert.ok(f.status.cold >= 0 && f.status.cold < f.coldThreshold, `寒意 ${f.status.cold}`);
      }
    }
  }), opts);
});

test('账本守恒：每轮每方的内力、气血、架势变化都等于本轮事件记录的增减之和（主计划 11.2 节资源账本）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    const { states, events } = play(input, decisions);
    events.forEach((evs, r) => {
      const [before, after] = [states[r]!, states[r + 1]!];
      for (const side of ['player', 'enemy'] as Side[]) {
        const sum = (type: string, f: (e: BattleEvent) => number) => evs.filter((e) => e.type === type).reduce((n, e) => n + f(e), 0);
        const mine = (e: BattleEvent) => e.side === side;
        const hitOnMe = (e: BattleEvent) => e.data.target === side;
        const qi = sum('qi', (e) => (mine(e) ? (e.data.after as number) - (e.data.before as number) : 0)) - sum('pay', (e) => (mine(e) ? (e.data.cost as number) : 0));
        assert.equal(after[side].qi - before[side].qi, qi, `第 ${r + 1} 轮 ${side} 内力`);
        const hp = 0 - sum('hit', (e) => (hitOnMe(e) ? (e.data.hp as number) : 0));
        assert.equal(after[side].hp - before[side].hp, hp, `第 ${r + 1} 轮 ${side} 气血`);
        const posture = sum('posture', (e) => (mine(e) ? (e.data.after as number) - (e.data.before as number) : 0)) - sum('hit', (e) => (hitOnMe(e) ? (e.data.posture as number) : 0));
        assert.equal(after[side].posture - before[side].posture, posture, `第 ${r + 1} 轮 ${side} 架势`);
      }
    });
  }), opts);
});

test('事件序号在整场中逐一递增，没有重复或跳号（执行契约第三章）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    const seqs = play(input, decisions).events.flat().map((e) => e.seq);
    seqs.forEach((s, i) => assert.equal(s, i + 1));
  }), opts);
});

test('支付不会让内力低于 0，也不会低于本轮生效的留力（主计划 4.4 节）', () => {
  fc.assert(fc.property(engineCase, ({ input, decisions }) => {
    const { states, events } = play(input, decisions);
    events.forEach((evs, r) => {
      const d = decisions[r]!;
      const reserve = d.change?.reserve ?? states[r]!.player.reserve;
      for (const e of evs) {
        if (e.type !== 'pay') continue;
        assert.ok((e.data.after as number) >= 0);
        const isAttack = (art: string | null) => evs.some((x) => x.type === 'hit' && x.art === art && x.cast === e.cast);
        if (e.side === 'player' && isAttack(e.art)) assert.ok((e.data.after as number) >= reserve, `留力 ${reserve}，付款后 ${e.data.after}`);
      }
    });
  }), opts);
});
