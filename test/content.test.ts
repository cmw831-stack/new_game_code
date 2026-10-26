// 内容数据与价表一致性：组件细则第六、十章；敌人细则第四章。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allEnemyIds, findArt, findEnemy, PAGE_SPECS, TEMPLATE_SPECS, TEMPLATE_TOTALS } from '../src/content/catalog.ts';
import { createBattle } from '../src/engine/setup.ts';
import { player } from './helpers.ts';

test('十二门预设逐项相加等于组件细则 V1.2 第六章的总价（V1.9）', () => {
  assert.equal(TEMPLATE_SPECS.length, 12);
  for (const spec of TEMPLATE_SPECS) {
    const art = findArt(spec.id)!;
    const want = TEMPLATE_TOTALS[spec.id]!;
    assert.deepEqual({ cost: art.cost, capacity: art.capacity }, want, spec.name);
  }
});

test('卷首残页三种补法的价目与组件细则 10.2 节一致', () => {
  const want: Record<string, [number, number]> = {
    page_preface_gang: [3, 3],
    page_preface_shock: [3, 3],
    page_preface_soft: [2, 3],
  };
  for (const spec of PAGE_SPECS) {
    const art = findArt(spec.id)!;
    assert.deepEqual([art.cost, art.capacity], want[spec.id], spec.name);
  }
});

test('每份敌人配置都合法：四武学位、容量不超过 12；非引导配置有两个段落，段落 3–4 项', () => {
  for (const id of allEnemyIds()) {
    const config = findEnemy(id)!;
    createBattle({ seed: 1, player: player(['break_strike']), enemy: { config: id } });
    if (config.fixedSegment) {
      assert.equal(config.segments.length, 1, id);
    } else {
      assert.equal(config.segments.length, 2, id);
    }
    for (const sg of config.segments) assert.ok(sg.items.length >= 3 && sg.items.length <= 4, `${id} 段落 ${sg.id}`);
  }
});

test('敌人配置总容量与敌人细则 4.1 节一致', () => {
  const want: Record<string, number> = {
    balanced_standard: 6, guard_standard: 9, resonance_standard: 6, swift_standard: 10, blade_standard: 11,
  };
  for (const [id, cap] of Object.entries(want)) {
    const s = createBattle({ seed: 1, player: player(['break_strike']), enemy: { config: id } });
    assert.equal(s.enemy.arts.reduce((sum, a) => sum + a.art.capacity, 0) + s.enemy.weapon.capacity, cap, id);
  }
});

test('疾步剑客的段落无论怎样衔接，踏风步都不会连续两轮可用', () => {
  const config = findEnemy('swift_standard')!;
  const allowsStep = (it: { stance: string; disabled: string[] }) => it.stance === 'attack' && !it.disabled.includes('wind_step');
  for (const a of config.segments) {
    for (const b of config.segments) {
      const seq = [...a.items, ...b.items];
      for (let i = 1; i < seq.length; i++) assert.ok(!(allowsStep(seq[i - 1]!) && allowsStep(seq[i]!)), `${a.id}→${b.id} 第 ${i} 项`);
    }
  }
});

test('蓄力刀客每次允许沉刃斩之前一轮都是调息', () => {
  const config = findEnemy('blade_standard')!;
  for (const a of config.segments) {
    for (const b of config.segments) {
      const seq = [...a.items, ...b.items];
      seq.forEach((it, i) => {
        if (it.stance === 'attack' && !it.disabled.includes('npc_heavy') && i > 0) {
          assert.equal(seq[i - 1]!.stance, 'breathe', `${a.id}→${b.id} 第 ${i} 项`);
        }
      });
    }
  }
});
