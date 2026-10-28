// 因果说明：默认层要能解释结果，停招原因要区分（教学与界面细则 V1.2 第 4.4 节）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeArt, describeEvent, narrate } from '../src/narrate/narrate.ts';
import { findArt } from '../src/content/catalog.ts';
import { runRound } from '../src/engine/round.ts';
import { battle18, fixture, items, player, round } from './helpers.ts';

const names = { player: '你', enemy: '测试对手' };

test('默认层：寒霜破势同根一轮写出出招、叠寒冻结、崩势消费破绽与对手被冻结', () => {
  const s0 = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const text = narrate(round(s0).events, names).map((l) => l.text);
  assert.ok(text.some((t) => t.startsWith('你出招：造成 4 气血、4 架势')), text.join('\n'));
  assert.ok(text.some((t) => t.includes('叠寒剑（付 4 内力）') && t.includes('3 击') && t.includes('打崩架势') && t.includes('冻结')), text.join('\n'));
  assert.ok(text.some((t) => t.includes('崩势追击') && t.includes('消费破绽') && t.includes('回气 +2')), text.join('\n'));
  assert.ok(text.some((t) => t === '测试对手被冻结，跳过本轮出招'), text.join('\n'));
});

test('默认层：停招原因区分留力与内力不足', () => {
  const reserve = battle18(player(['cold_sword', 'break_chase'], { qi: 8, reserve: 4 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const a = narrate(round(reserve).events, names).map((l) => l.text);
  assert.ok(a.some((t) => t.includes('崩势追击没有发动：付款后会低于留力 4')), a.join('\n'));
  const poor = battle18(player(['cold_sword'], { qi: 0 }), { config: fixture() });
  const b = narrate(round(poor).events, names).map((l) => l.text);
  assert.ok(b.some((t) => t.includes('叠寒剑没有发动：内力不足（需要 4，现有 2）')), b.join('\n'));
});

test('默认层：基础出招被身法完全闪开时写明没有接触', () => {
  const s0 = battle18(player(['cold_sword']), { config: fixture(), status: { step: { expiresRound: 1 } } });
  const text = narrate(round(s0).events, names).map((l) => l.text);
  assert.ok(text.includes('你出招：被身法闪开，没有接触'), text.join('\n'));
});

test('详细层：每条事件都有文字，并带事件序号', () => {
  const s0 = battle18(player(['cold_sword', 'break_chase']), { config: fixture({ artIds: ['npc_resonance'], items: items('attack') }) });
  for (const e of round(s0).events) {
    const line = describeEvent(e, names);
    assert.ok(line.startsWith(`#${e.seq}`), line);
    assert.ok(!line.includes('undefined'), line);
  }
});

test('武学说明：叠寒剑与崩势追击', () => {
  assert.equal(describeArt(findArt('cold_sword')!), '自身基础出招接触后 → 3 击，每击 2／2；寒劲：每次接触积寒 1');
  assert.equal(describeArt(findArt('break_chase')!), '对方架势崩溃后 → 一击 4／0；刚劲：首次接触消费己方破绽，气血 +2；造成气血伤害后回气 2');
});

test('默认层：变招写明调整了什么、本场还剩几次（战斗细则 V1.2 4.4 节）', () => {
  const s0 = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const line = (change: Parameters<typeof runRound>[1]['change']) =>
    narrate(runRound(s0, { stance: 'attack', change }).events, names).map((l) => l.text).find((t) => t.includes('变招'));
  assert.equal(line({ pause: ['break_chase'] }), '你变招：本轮暂停崩势追击（本场还剩 1 次）');
  assert.equal(line({ priority: ['break_chase', 'cold_sword'] }), '你变招：本轮优先级改为 崩势追击 → 叠寒剑（本场还剩 1 次）');
  assert.equal(line({ reserve: 4 }), '你变招：本轮留力改为 4（本场还剩 1 次）');
});
