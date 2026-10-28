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

test('组件中文名：档位跟在名后，空槽显示“无”（组件细则第三章、教学细则 4.2 节线框“主招[三连 → 破势]”）', async () => {
  const { componentLabel } = await import('../src/narrate/narrate.ts');
  assert.equal(componentLabel('A_break:甲'), '破势甲');
  assert.equal(componentLabel('M_cold'), '寒劲');
  assert.equal(componentLabel('T_qi:8'), '内力升过阈值 8');
  assert.equal(componentLabel(null), '无');
});

test('因果记录用秘籍自己的名字，而不是版本 ID（主计划 9.1 节：名称负责展示）', async () => {
  const { battleNames } = await import('../src/narrate/narrate.ts');
  const { findTemplate, replaceSlot } = await import('../src/edit/variant.ts');
  const spec = { ...replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'm1@v1'), name: '寒锋' };
  const s0 = battle18(player([spec], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const text = narrate(round(s0).events, battleNames(s0)).map((l) => l.text);
  assert.ok(text.some((t) => t.startsWith('你·寒锋（付 4 内力）')), text.join('\n'));
  assert.ok(!text.some((t) => t.includes('m1@v1')), text.join('\n'));
});

// ---------- 停招原因细分（教学细则 V1.2 4.4 节） ----------

test('起势未成立：没打崩对手时，崩势追击写明“需要对方架势崩溃”', async () => {
  const { battleNames } = await import('../src/narrate/narrate.ts');
  const s0 = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 20 }) });
  const text = narrate(round(s0).events, battleNames(s0)).map((l) => l.text);
  assert.ok(text.includes('没有机会发动：崩势追击（起势未成立：需要对方架势崩溃）'), text.join('\n'));
});

test('变招暂停的武学写明“本轮变招暂停”，不混同为起势未成立', async () => {
  const { battleNames } = await import('../src/narrate/narrate.ts');
  const s0 = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const text = narrate(runRound(s0, { stance: 'attack', change: { pause: ['break_chase'] } }).events, battleNames(s0)).map((l) => l.text);
  assert.ok(text.includes('没有机会发动：崩势追击（本轮变招暂停）'), text.join('\n'));
});

test('目标已败退：基础出招击败对手后，后续武学写明战斗已结束，且这行在结局之前', async () => {
  const { battleNames } = await import('../src/narrate/narrate.ts');
  const s0 = battle18(player(['cold_sword']), { config: fixture({ hpMax: 4 }) });
  const text = narrate(round(s0).events, battleNames(s0)).map((l) => l.text);
  const i = text.indexOf('没有机会发动：叠寒剑（测试对手已败退，战斗结束）');
  assert.ok(i >= 0, text.join('\n'));
  assert.ok(i < text.indexOf('你获胜'), text.join('\n'));
});

test('每门武学都有动静时不加这一行；安全上限写明“不算胜负”（教学细则 4.4 节）', async () => {
  const { battleNames } = await import('../src/narrate/narrate.ts');
  const s0 = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  assert.ok(!narrate(round(s0).events, battleNames(s0)).some((l) => l.text.startsWith('没有机会发动')));
  const capped = battle18(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) }, 1, { limits: { eventsPerRoot: 5 } });
  const text = narrate(round(capped).events, battleNames(capped)).map((l) => l.text);
  assert.ok(text.includes('达到安全上限，对局中止（不算胜负）'), text.join('\n'));
});

test('状态已存在无增量：内力已满时归息诀写明没有收益，不写“发动失败”（教学细则 4.4 节）', () => {
  const s0 = battle18(player(['return_breath'], { qi: 20 }), { config: fixture() });
  const text = narrate(round(s0, 'guard').events, names).map((l) => l.text);
  assert.ok(text.includes('你·归息诀没有发动：内力已满，没有收益'), text.join('\n'));
  assert.ok(!text.some((t) => t.includes('失败')), text.join('\n'));
});
