// 两战路线：成长挑战细则 V1.3 第 5.1 节（气血、内力延续，新战架势回满）与第八章；主计划 V1.9.1 4.2 节（开场内力不超过 10）；
// 成长经济细则 V1.4（止血散战间恢复 12，不超上限，最多带 2 剂）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runRoute } from '../src/sim/route.ts';
import { STRATEGIES } from '../src/sim/strategies.ts';

const attack = STRATEGIES[0]!;
const guardCounter = { id: 'guard_counter', arts: ['return_breath', 'borrow_force', 'wind_step', 'break_strike'] };

test('第二场开场气血等于第一场结束气血，内力取结转值与 10 中较小者', () => {
  for (let seed = 1001; seed < 1006; seed++) {
    const r = runRoute(guardCounter, ['balanced_standard', 'guard_standard'], attack, seed, 0);
    if (r.fights.length < 2) continue;
    const [f1, f2] = r.fights as [typeof r.fights[0], typeof r.fights[0]];
    assert.equal(f2.hpStart, f1.hpEnd, `seed ${seed}`);
    assert.equal(f2.qiStart, Math.min(f1.qiEnd, 10), `seed ${seed}`);
  }
});

test('止血散每剂恢复 12、不超过上限 30，满血时不用', () => {
  const r0 = runRoute(guardCounter, ['balanced_standard', 'guard_standard'], attack, 1001, 0);
  const r2 = runRoute(guardCounter, ['balanced_standard', 'guard_standard'], attack, 1001, 2);
  const end1 = r0.fights[0]!.hpEnd;
  const want = Math.min(30, end1 + 12 * Math.min(2, Math.ceil((30 - end1) / 12)));
  assert.equal(r2.fights[1]!.hpStart, want);
  assert.equal(r2.potionsUsed, Math.min(2, Math.ceil((30 - end1) / 12)));
  assert.throws(() => runRoute(guardCounter, ['balanced_standard'], attack, 1, 3));
});

test('第一场输了就不再进入第二场', () => {
  const r = runRoute({ id: 'none', arts: [] }, ['guard_standard', 'balanced_standard'], attack, 1001, 2);
  assert.equal(r.fights.length, 1);
  assert.equal(r.cleared, false);
});
