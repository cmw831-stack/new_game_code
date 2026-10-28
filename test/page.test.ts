// 手稿残页：组件细则 V1.2 第十章（10.1 规则、10.2 卷首残页·折锋的三种补法）；
// 教学细则 V1.2 第 4.2 节残页线框（刚劲：费用 2 → 3，容量 2 → 3）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileArt, specProblems } from '../src/content/components.ts';
import { findArt, PAGE_SPECS } from '../src/content/catalog.ts';
import { createBattle } from '../src/engine/setup.ts';
import { fillPage, PAGE_PREFACE } from '../src/edit/page.ts';
import { player } from './helpers.ts';

const fill = (modifier: string | null | undefined, extra = {}) =>
  fillPage(PAGE_PREFACE, { ...(modifier === undefined ? {} : { modifier: { id: modifier } }), ...extra }, 'my_page', '我的折锋');

test('折锋三种补法的发动内力与容量：刚 3／3、震 3／3、柔 2／3（组件细则 10.2 节）', () => {
  const want: Record<string, [number, number]> = { M_gang: [3, 3], M_shock: [3, 3], M_soft: [2, 3] };
  for (const [m, [cost, capacity]] of Object.entries(want)) {
    const r = fill(m);
    assert.equal(r.ok, true, m);
    assert.deepEqual([r.cost, r.capacity], [cost, capacity], m);
  }
});

test('补全结果与内容目录中的三种折锋装配一致（固定槽照常计价，没有残页折扣）', () => {
  const byMod: Record<string, string> = { gang: 'page_preface_gang', shock: 'page_preface_shock', soft: 'page_preface_soft' };
  for (const spec of PAGE_SPECS) {
    const r = fill(spec.modifier);
    const mine = compileArt(r.spec!);
    const cat = findArt(byMod[mine.modifier!]!)!;
    assert.deepEqual({ ...mine, id: cat.id, name: cat.name }, cat, spec.id);
  }
});

test('劲力空槽未补时不能装备，并说明缺哪一槽、有哪些候选（组件细则 10.1 节第 2 条）', () => {
  const r = fill(undefined);
  assert.equal(r.ok, false);
  assert.equal(r.spec, null);
  assert.deepEqual(r.problems.map((p) => [p.kind, p.slot]), [['missing', 'modifier']]);
  assert.ok(r.problems[0]!.message.includes('M_gang、M_shock、M_soft'), r.problems[0]!.message);
});

test('空槽只能从本页候选中选：寒劲、“无”都不在折锋候选里（组件细则 10.1 节第 1 条）', () => {
  assert.deepEqual(fill('M_cold').problems.map((p) => p.kind), ['notCandidate']);
  assert.deepEqual(fill(null).problems.map((p) => p.kind), ['notCandidate']);
});

test('固定槽不能替换：起势与主招写定（组件细则 10.1 节第 1 条）', () => {
  const r = fill('M_gang', { action: { id: 'A_heavy', tier: '甲' } });
  assert.deepEqual(r.problems.map((p) => [p.kind, p.slot]), [['fixedSlot', 'action']]);
  assert.equal(fill('M_gang', { trigger: { id: 'T_contact' } }).ok, true, '填写与固定内容相同的值不算替换');
});

test('单击是通用持械攻击：三种补法都可配剑、刀、棍（组件细则 10.2 节）', () => {
  for (const m of ['M_gang', 'M_shock', 'M_soft']) {
    const spec = fill(m).spec!;
    for (const w of ['sword', 'blade', 'staff'] as const) assert.deepEqual(specProblems(spec, w), [], `${m} ${w}`);
    assert.doesNotThrow(() => createBattle({ seed: 1, player: player(['break_strike', spec, 'return_breath'], { weaponId: 'iron_blade' }), enemy: { config: 'balanced_standard' } }));
  }
});
