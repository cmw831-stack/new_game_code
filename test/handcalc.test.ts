// 策划文档（V1.8）中的其他逐项手算，统一用 V1.8 规则与数值复现。出处写在每个用例的名称里。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBattle } from '../src/engine/round.ts';
import type { ArtSpec } from '../src/content/components.ts';
import { battle18 as battle, damageBy, of, player, round, rootOf } from './helpers.ts';

test('奖励经济细则 5.3：初始两门始终出招，四轮击败均衡武者，玩家剩 24 气血／14 内力', () => {
  // 第 4 轮无论抽到段落 A 还是 B，玩家都先手击败对手，所以结果与种子无关。
  for (let seed = 0; seed < 20; seed++) {
    const s0 = battle(player(['break_strike', 'return_breath']), { config: 'balanced_standard' }, seed);
    const run = runBattle(s0, () => ({ stance: 'attack' }));
    assert.equal(run.state.over?.reason, 'victory', `seed ${seed}`);
    assert.equal(run.rounds, 4, `seed ${seed}`);
    assert.equal(run.state.player.hp, 24, `seed ${seed}`);
    assert.equal(run.state.player.qi, 14, `seed ${seed}`);
  }
});

test('奖励经济细则 5.3：逐轮账本与表格一致', () => {
  let s = battle(player(['break_strike', 'return_breath']), { config: 'balanced_standard' });
  const expected = [
    { php: 24, pqi: 17, ehp: 20, eposture: 4, pposture: 8 },
    { php: 24, pqi: 16, ehp: 16, eposture: 6 },
    { php: 24, pqi: 15, ehp: 8, eposture: 6 },
  ];
  for (const [i, row] of expected.entries()) {
    s = round(s).state;
    assert.equal(s.player.hp, row.php, `第 ${i + 1} 轮玩家气血`);
    assert.equal(s.player.qi, row.pqi, `第 ${i + 1} 轮玩家内力`);
    assert.equal(s.enemy.hp, row.ehp, `第 ${i + 1} 轮敌气血`);
    assert.equal(s.enemy.posture, row.eposture, `第 ${i + 1} 轮敌架势`);
    if (row.pposture !== undefined) assert.equal(s.player.posture, row.pposture);
  }
  assert.notEqual(s.player.status.opening, null, '第 3 轮再次崩溃，产生下一份破绽');
});

const resonanceFixture = { config: 'resonance_standard', fixedSegment: true } as const;
const coldBreak: ArtSpec = { id: 'cold_break', name: '叠寒剑·破势改良', category: '外功', trigger: 'T_contact', action: 'A_break', tier: '甲', modifier: 'M_cold', followup: null, recovery: null };

test('教学细则 3.1：原三连寒劲面对蓄震守卫一轮，玩家 24／8／20，敌 21／10', () => {
  const s0 = battle(player(['cold_sword', 'return_breath'], { qi: 10 }), resonanceFixture);
  const { state, events } = round(s0);
  assert.deepEqual([state.player.hp, state.player.qi, state.player.posture], [24, 8, 20]);
  assert.deepEqual([state.enemy.hp, state.enemy.posture], [21, 10]);
  assert.equal(of(events, 'hit', 'enemy', 'npc_resonance')[0]!.data.hpPower, 6);
  assert.equal(of(events, 'freeze', 'enemy').length, 1);
});

test('教学细则 3.1：单次破势寒劲改良版一轮，玩家 30／8／20，敌 28／8，不触发蓄震', () => {
  const s0 = battle(player([coldBreak, 'return_breath'], { qi: 10 }), resonanceFixture);
  const { state, events } = round(s0);
  assert.deepEqual([state.player.hp, state.player.qi, state.player.posture], [30, 8, 20]);
  assert.deepEqual([state.enemy.hp, state.enemy.posture], [28, 8]);
  assert.equal(of(events, 'cast', 'enemy', 'npc_resonance').length, 0);
  assert.equal(of(events, 'cold', 'enemy').at(-1)!.data.after, 1, '积寒 1，尚未冻结');
});

test('教学细则 3.3：卷首残页·折锋四种选法的第 1 轮伤血与内力', () => {
  const tutorial = { config: 'balanced_tutorial' } as const;
  const cases: [string, string[], number, number][] = [
    ['刚劲，排在断势之后', ['break_strike', 'page_preface_gang', 'return_breath'], 11, 6],
    ['刚劲，排在断势之前', ['page_preface_gang', 'break_strike', 'return_breath'], 9, 6],
    ['震劲', ['break_strike', 'page_preface_shock', 'return_breath'], 7, 6],
    ['柔劲', ['break_strike', 'page_preface_soft', 'return_breath'], 7, 5],
  ];
  for (const [name, arts, dmg, paid] of cases) {
    const { events } = round(battle(player(arts), tutorial));
    const root = rootOf(events, 'player');
    assert.equal(damageBy(root, 'player'), dmg, name);
    const pays = of(root, 'pay', 'player').reduce((sum, e) => sum + (e.data.cost as number), 0);
    assert.equal(pays, paid, name);
  }
});

test('敌人细则 8.1：满架势架招正面承受标准刀客基础＋沉刃，总损血 15，剩架势 12，没有崩势追击', () => {
  const s0 = battle(player([]), { config: 'blade_standard', startItem: 1, fixedSegment: true });
  const { state, events } = round(s0, 'guard');
  assert.equal(state.player.hp, 15);
  assert.equal(state.player.posture, 12);
  assert.equal(of(events, 'cast', 'enemy', 'npc_heavy').length, 1);
  assert.equal(of(events, 'cast', 'enemy', 'break_chase').length, 0);
  const heavy = of(events, 'hit', 'enemy', 'npc_heavy')[0]!;
  assert.equal(heavy.data.blocked, false, '一层护势只保护基础出招');
});

test('敌人细则 8.1：同样情形若玩家只有 15 气血，会在重击后败退', () => {
  const s0 = battle(player([], { hp: 15 }), { config: 'blade_standard', startItem: 1, fixedSegment: true });
  const { state } = round(s0, 'guard');
  assert.equal(state.over?.reason, 'defeat');
});

test('敌人细则 8.1：刀客基础出招被玩家已有身法闪避，通脉与沉刃都不发动', () => {
  const s0 = battle(player([], { status: { step: { expiresRound: 1 } } }), { config: 'blade_standard', startItem: 1, fixedSegment: true });
  const { events } = round(s0, 'guard');
  assert.equal(of(events, 'dodge', 'player').length, 1);
  assert.equal(of(events, 'cast', 'enemy').length, 0);
});
