// E2 求解器自身的验证（目标 V2 第四节 E2 第 1 步“先在小局面上用穷举验证求解器本身”）：
// 预期来自朴素穷举——枚举轮数上限内的全部决策序列、逐条结算、按同一价值排序取最好——与带记忆、剪枝的求解器比较。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { createBattle } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { battleInput, MATRIX_ENEMIES } from '../src/sim/matrix.ts';
import { BUILDS } from '../src/sim/strategies.ts';
import { oracleCase } from '../src/sim/oracle-gen.ts';
import { toEngine } from '../src/sim/oracle-io.ts';
import { compareOutcome, decisionsAt, DEFAULT_SOLVE, Solver, STANCES, type Outcome, type SolveOptions } from '../src/sim/solver.ts';
import type { BattleState } from '../src/rules/types.ts';

/** 朴素穷举：不记忆、不剪枝、不去重。 */
function bruteForce(s: BattleState, opts: SolveOptions): Outcome {
  const probe = new Solver(opts);
  const t = probe.terminal(s);
  if (t) return t;
  let best: Outcome | null = null;
  for (const d of decisionsAt(s, opts)) {
    const o = bruteForce(runRound(s, d).state, opts);
    if (!best || compareOutcome(o, best) > 0) best = o;
  }
  return best!;
}

const starts = BUILDS.flatMap((b) => MATRIX_ENEMIES.map((e) => ({ name: `${b.name}／${e}`, s0: createBattle(battleInput(b, e, 1001)) })));

test('求解器＝朴素穷举：三套先行构筑 × 三类标准敌人，只选姿态，7 轮上限（结果既有获胜也有未分胜负）', () => {
  const opts = { ...DEFAULT_SOLVE, horizon: 7 };
  for (const { name, s0 } of starts) assert.deepEqual(new Solver(opts).solve(s0).outcome, bruteForce(s0, opts), name);
});

test('求解器＝朴素穷举：同上，含两次变招，2 轮上限', () => {
  const opts = { ...DEFAULT_SOLVE, horizon: 2, changes: true };
  for (const { name, s0 } of starts) assert.deepEqual(new Solver(opts).solve(s0).outcome, bruteForce(s0, opts), name);
});

test('求解器＝朴素穷举：随机合法开局（对拍生成器）40 局，只选姿态，4 轮上限', () => {
  const opts = { ...DEFAULT_SOLVE, horizon: 4 };
  const cases = fc.sample(oracleCase, { numRuns: 80, seed: 20261029 }).map(toEngine).flatMap((x) => ('error' in x ? [] : [x])).slice(0, 40);
  assert.equal(cases.length, 40);
  for (const [i, c] of cases.entries()) {
    const s0 = createBattle(c.input);
    assert.deepEqual(new Solver(opts).solve(s0).outcome, bruteForce(s0, opts), `#${i}`);
  }
});

test('三种姿态各自的最好结果＝朴素穷举中以该姿态开头的最好结果（含变招，2 轮上限；只选姿态，6 轮上限）', () => {
  for (const opts of [{ ...DEFAULT_SOLVE, horizon: 2, changes: true }, { ...DEFAULT_SOLVE, horizon: 6 }]) {
    for (const { name, s0 } of starts) {
      const got = new Solver(opts).stanceBest(s0);
      for (const stance of STANCES) {
        const want = decisionsAt(s0, opts).filter((d) => d.stance === stance).map((d) => bruteForce(runRound(s0, d).state, opts)).reduce((a, b) => (compareOutcome(b, a) > 0 ? b : a));
        assert.deepEqual(got[stance], want, `${name} ${stance}`);
      }
    }
  }
});

test('最优打法上每个决策点的“唯一最优姿态”与“关键轮”＝按三种姿态的精确最好结果直接比较（e2-solver.md 第三节定义；含变招 6 轮、只选姿态 10 轮，三种姿态都出现过唯一最优）', () => {
  for (const opts of [{ ...DEFAULT_SOLVE, horizon: 6, changes: true }, { ...DEFAULT_SOLVE, horizon: 10 }]) {
    for (const { name, s0 } of starts) {
      const solver = new Solver(opts);
      for (const step of solver.line(s0)) {
        const v = new Solver(opts).stanceBest(step.state);
        const unique = STANCES.find((x) => STANCES.every((y) => y === x || compareOutcome(v[x], v[y]) > 0)) ?? null;
        const key = v[step.best.stance].tier === 'victory' && STANCES.some((y) => v[y].tier !== 'victory');
        assert.deepEqual([step.unique, step.key], [unique, key], `${name} 第 ${step.state.round} 轮`);
        assert.deepEqual(v[step.best.stance], step.outcome);
      }
    }
  }
});

test('最优打法重放：按 line() 给出的决策从开局结算，得到 solve() 报告的结果', () => {
  const opts = { ...DEFAULT_SOLVE, horizon: 12, changes: true };
  for (const { name, s0 } of starts.slice(0, 3)) {
    const solver = new Solver(opts);
    const want = solver.solve(s0).outcome;
    let s = s0;
    for (const step of solver.line(s0)) s = runRound(s, step.best).state;
    assert.deepEqual(solver.terminal(s), want, name);
  }
});

test('变招选项：暂停每一门、其余全部优先级排列、其余留力档位，各配三种姿态（战斗细则 4.4 节）', () => {
  const s0 = starts[0]!.s0; // 寒霜连锁三门，留力 0
  const n = decisionsAt(s0, { ...DEFAULT_SOLVE, changes: true }).length;
  assert.equal(n, 3 + 3 * (3 + (6 - 1) + (4 - 1)));
  assert.equal(decisionsAt({ ...s0, changesLeft: 0 }, { ...DEFAULT_SOLVE, changes: true }).length, 3);
});
