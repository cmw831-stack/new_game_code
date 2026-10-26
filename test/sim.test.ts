// 批量模拟的结构与确定性。不检查胜率等平衡结果（那是报告的内容，不是规则正确性）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCell, runMatrix, SEEDS } from '../src/sim/matrix.ts';
import { BUILDS, STRATEGIES } from '../src/sim/strategies.ts';
import { createBattle } from '../src/engine/setup.ts';

test('三套先行构筑都合法，容量与执行契约 5.1 节一致', () => {
  const want: Record<string, number> = { cold_chain: 12, guard_counter: 12, guard_break: 10 };
  for (const b of BUILDS) {
    const s = createBattle({ seed: 1, player: { hp: 30, hpMax: 30, qi: 20, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts: b.arts }, enemy: { config: 'balanced_standard' } });
    assert.equal(s.player.arts.reduce((n, a) => n + a.art.capacity, 0), want[b.id], b.name);
  }
});

test('矩阵共 27 格，每格使用同一组预先固定的种子', () => {
  const cells = runMatrix();
  assert.equal(cells.length, 27);
  for (const c of cells) assert.deepEqual(c.battles.map((b) => b.seed), SEEDS);
});

test('同一格重复运行结果完全相同', () => {
  const a = runCell(BUILDS[0]!, 'resonance_standard', STRATEGIES[1]!);
  const b = runCell(BUILDS[0]!, 'resonance_standard', STRATEGIES[1]!);
  assert.deepEqual(a, b);
});

test('策略只读取公开信息：决策与本轮锁定的敌方意图一致', () => {
  const s = createBattle({ seed: 1, player: { hp: 30, hpMax: 30, qi: 20, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts: [] }, enemy: { config: 'balanced_standard' } });
  const read = STRATEGIES.find((x) => x.id === 'read_windows')!;
  assert.equal(read.decide(s).stance, 'guard', '均衡武者第 1 项是出招，读窗口策略应架招');
});
