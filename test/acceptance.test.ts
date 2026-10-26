// 执行契约 V1.1 第四章的验收案例。每条预期都来自契约或战斗细则的手算，
// 注释里注明出处；不以被测函数的当前输出作为“正确答案”。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, ValidationError } from '../src/engine/setup.ts';
import { runBattle, runRound } from '../src/engine/round.ts';
import { battle, damageBy, fixture, items, of, player, round, rootOf } from './helpers.ts';

// ---------- 寒霜破势同根（战斗细则 11.1） ----------

test('寒霜破势同根：整根伤血 19，玩家内力 5，敌方被冻结跳过', () => {
  // 玩家内力 10 已含轮初恢复，所以输入为恢复前的 8（教学细则 2.1 节同口径）。
  const s0 = battle(player(['cold_sword', 'break_chase'], { qi: 8 }), { config: fixture({ hpMax: 30, postureMax: 10 }) });
  const { state, events } = round(s0);
  assert.equal(damageBy(rootOf(events, 'player'), 'player'), 19);
  assert.equal(state.enemy.hp, 11);
  assert.equal(state.player.qi, 5);
  assert.equal(of(events, 'freeze', 'enemy').length, 1);
  assert.equal(of(events, 'freezeSkip', 'enemy').length, 1, '敌方尚未执行的出招被跳过');
  assert.equal(of(events, 'basicAttack', 'enemy').length, 0);
  assert.equal(state.enemy.posture, 4, '轮末架势恢复到上限 10 的 40%');
  assert.equal(of(events, 'openingConsumed', 'player', 'break_chase').length, 1);
});

test('留力阻止追击：敌剩 17，玩家内力 6，破绽保留；下一轮自然恢复后两案内力分别为 7 与 8', () => {
  const mk = (reserve: number) => battle(player(['cold_sword', 'break_chase'], { qi: 8, reserve }), { config: fixture({ hpMax: 30, postureMax: 10, items: items('attack', 'guard') }) });
  const a = round(mk(0));
  const b = round(mk(4));
  assert.equal(b.state.enemy.hp, 17);
  assert.equal(b.state.player.qi, 6);
  assert.notEqual(b.state.player.status.opening, null, '未消费的破绽保留');
  const skips = of(b.events, 'skip', 'player', 'break_chase');
  assert.equal(skips.length, 1);
  assert.equal(skips[0]!.data.reason, 'reserve', '记录为低于留力，而非内力不足');
  assert.equal(of(b.events, 'pay', 'player', 'break_chase').length, 0, '跳过不扣费');
  const regenQi = (r: { events: { type: string; side: string | null; phase: string; data: Record<string, unknown> }[] }) =>
    r.events.find((e) => e.type === 'qi' && e.side === 'player' && e.phase === 'regen')?.data.after;
  assert.equal(regenQi(round(a.state, 'guard')), 7);
  assert.equal(regenQi(round(b.state, 'guard')), 8);
});

// ---------- 受击方先响应（敌人细则 8.1、战斗细则 11.3） ----------

test('受击反震优先：守卫先付 2 反震威力 6，再轮到玩家后续接招', () => {
  const s0 = battle(player(['cold_sword', 'break_chase']), { config: fixture({ postureMax: 10, artIds: ['npc_resonance'] }) });
  const { state, events } = round(s0);
  const resonance = of(events, 'hit', 'enemy', 'npc_resonance');
  assert.equal(resonance.length, 1);
  assert.equal(resonance[0]!.data.hpPower, 6);
  const chase = of(events, 'cast', 'player', 'break_chase')[0]!;
  assert.ok(resonance[0]!.seq < chase.seq, '反震在崩势追击之前');
  assert.equal(of(events, 'pay', 'enemy', 'npc_resonance')[0]!.data.cost, 2);
  assert.equal(state.player.hp, 24);
});

test('受击反震致死：玩家先败退，崩势追击不付款、不执行', () => {
  const s0 = battle(player(['cold_sword', 'break_chase'], { hp: 6 }), { config: fixture({ postureMax: 10, artIds: ['npc_resonance'] }) });
  const { state, events } = round(s0);
  assert.equal(state.over?.reason, 'defeat');
  assert.equal(of(events, 'cast', 'player', 'break_chase').length, 0);
  assert.equal(of(events, 'pay', 'player', 'break_chase').length, 0);
});

test('只有两次接触：三连第一击被身法闪避，蓄震按两次接触反击威力 4', () => {
  // 守卫架招；玩家基础出招被格挡后，守卫回身步获得身法，正好闪开叠寒剑第一击。
  const s0 = battle(player(['cold_sword']), {
    config: fixture({ postureMax: 20, artIds: ['turn_step', 'npc_resonance'], items: items('guard') }),
  });
  const { events } = round(s0);
  const dodges = of(events, 'dodge', 'enemy');
  assert.equal(dodges.length, 1);
  assert.equal(dodges[0]!.data.hitIndex, 0);
  const mainEnd = of(events, 'mainEnd', 'player', 'cold_sword')[0]!;
  assert.equal(mainEnd.data.contacts, 2);
  const resonance = of(events, 'hit', 'enemy', 'npc_resonance');
  assert.equal(resonance.length, 1);
  assert.equal(resonance[0]!.data.hpPower, 4);
});

// ---------- 接触起势 ----------

test('完全闪避基础出招：接触起势的技能不发动、不付款', () => {
  const s0 = battle(player(['cold_sword']), { config: fixture(), status: { step: { expiresRound: 1 } } });
  const { state, events } = round(s0);
  assert.equal(of(events, 'dodge', 'enemy').length, 1);
  assert.equal(of(events, 'cast', 'player').length, 0);
  assert.equal(of(events, 'pay', 'player').length, 0);
  assert.equal(state.player.qi, 20);
});

test('格挡仍能开招：基础出招被格挡但接触，叠寒剑仍发动，并按自己的防御状态判断', () => {
  const s0 = battle(player(['cold_sword']), { config: fixture({ postureMax: 30, items: items('guard') }) });
  const { events } = round(s0);
  const basic = of(events, 'hit', 'player').filter((e) => e.data.basic === true);
  assert.equal(basic.length, 1);
  assert.equal(basic[0]!.data.blocked, true);
  assert.equal(basic[0]!.data.hp, 2);
  const cold = of(events, 'hit', 'player', 'cold_sword');
  assert.equal(cold.length, 3);
  for (const h of cold) {
    assert.equal(h.data.blocked, false, '护势只保护一门主招，已随基础出招消费');
    assert.equal(h.data.hp, 3);
  }
});

// ---------- 同批回气再反击（战斗细则 11.4） ----------

test('同批回气再反击：归息先回 2，借力付款 3；账本与手算一致', () => {
  // 玩家内力 2 已含轮初恢复，输入为恢复前的 0。
  const s0 = battle(player(['return_breath', 'borrow_force'], { qi: 0 }), {
    config: fixture({ postureMax: 10 }),
    weapon: { id: 'test_8_6', name: '手算兵器', weaponClass: 'sword', base: { hp: 8, posture: 6 }, capacity: 0 },
  });
  const { state, events } = round(s0, 'guard');
  assert.equal(state.player.hp, 26);
  assert.equal(state.player.qi, 1);
  assert.equal(state.player.posture, 14);
  assert.equal(state.enemy.hp, 24);
  assert.equal(state.enemy.posture, 8);
  const breath = of(events, 'cast', 'player', 'return_breath')[0]!;
  const borrow = of(events, 'cast', 'player', 'borrow_force')[0]!;
  assert.ok(breath.seq < borrow.seq, '同批按编排顺序：归息在借力之前');
});

// ---------- 破绽跨轮 ----------

function openingSetup(): ReturnType<typeof battle> {
  // 第 1 轮：基础 4／4 后断势 2／8，架势 12 → 0，玩家取得破绽但本根不消费。
  return round(battle(player(['break_strike']), { config: fixture({ postureMax: 12, items: items('breathe') }) })).state;
}

test('破绽跨轮：轮末仍有效，下一次基础出招消费，气血威力 6', () => {
  const s1 = openingSetup();
  assert.notEqual(s1.player.status.opening, null, '第 1 轮末破绽仍在');
  const { events } = round(s1);
  assert.equal(of(events, 'openingConsumed', 'player').length, 1);
  const basic = of(events, 'hit', 'player').find((e) => e.data.basic === true)!;
  assert.equal(basic.data.hpPower, 6);
});

test('破绽跨轮：下一次基础行动改为调息时，该行动结束后破绽过期', () => {
  const s1 = openingSetup();
  const { state, events } = round(s1, 'breathe');
  assert.equal(of(events, 'openingExpired', 'player').length, 1);
  assert.equal(state.player.status.opening, null);
});

// ---------- 冻结与架招 ----------

test('冻结与架招：架招已提交后冻结不撤销准备；准备前已有冻结则跳过准备；保护期不能再冻结', () => {
  const s0 = battle(player(['cold_sword']), { config: fixture({ hpMax: 60, postureMax: 40, items: items('guard', 'guard', 'attack') }) });
  const r1 = round(s0);
  assert.equal(of(r1.events, 'block', 'enemy').length, 1, '第 1 轮架招照常格挡');
  assert.equal(of(r1.events, 'freeze', 'enemy').length, 1);
  assert.equal(of(r1.events, 'freezeSkip').length, 0, '本轮架招已经用掉基础行动，冻结作用于下一次');

  const r2 = round(r1.state);
  const skip = of(r2.events, 'freezeSkip', 'enemy');
  assert.equal(skip.length, 1);
  assert.equal(skip[0]!.phase, 'prepare', '在共同准备阶段跳过架招');
  assert.equal(of(r2.events, 'guard', 'enemy').length, 0);
  assert.equal(of(r2.events, 'block', 'enemy').length, 0, '没有护势');
  assert.equal(of(r2.events, 'freeze', 'enemy').length, 0, '保护期寒意上限 2');
  assert.equal(Math.max(...of(r2.events, 'cold', 'enemy').map((e) => e.data.after as number)), 2);

  const r3 = round(r2.state);
  assert.equal(of(r3.events, 'freezeSkip').length, 0, '受保护的行动不再被跳过');
  assert.equal(of(r3.events, 'freeze', 'enemy').length, 0, '保护持续到该行动及其整根连锁结束');
  assert.equal(of(r3.events, 'basicAttack', 'enemy').length, 1, '只恢复一次正常行动，不额外赠送');
});

// ---------- 死亡与限次 ----------

test('多段中途致死：立即停止余下打击，不再积寒或执行收势', () => {
  const s0 = battle(player(['cold_sword']), { config: fixture({ hpMax: 5 }) });
  const { state, events } = round(s0);
  assert.equal(state.over?.reason, 'victory');
  assert.equal(of(events, 'hit', 'player', 'cold_sword').length, 1);
  assert.equal(of(events, 'cold').length, 0);
  assert.equal(events.at(-1)!.type, 'battleEnd');
});

test('根连锁限次：同一根内归息只成功发动一次，第二次格挡记录为根限次', () => {
  // 归息回气 6 → 8 触发守拙，新的护势挡下敌方随后的断势；第二次格挡不能再让归息回气。
  const s0 = battle(player(['return_breath', 'guard_humble'], { qi: 4 }), { config: fixture({ artIds: ['break_strike'] }) });
  const { state, events } = round(s0, 'guard');
  assert.equal(of(events, 'block', 'player').length, 2);
  assert.equal(of(events, 'cast', 'player', 'return_breath').length, 1);
  assert.equal(of(events, 'cast', 'player', 'guard_humble').length, 1);
  const skip = of(events, 'skip', 'player', 'return_breath');
  assert.equal(skip.length, 1);
  assert.equal(skip[0]!.data.reason, 'rootLimit');
  const breakHit = of(events, 'hit', 'enemy', 'break_strike')[0]!;
  assert.equal(breakHit.data.blocked, true);
  assert.equal(breakHit.data.hp, 1);
  assert.equal(state.player.qi, 6);
});

test('安全上限：预算触顶停止未执行工作，结束原因与胜负分开', () => {
  const s0 = battle(player(['cold_sword', 'break_chase']), { config: fixture() }, 1, { limits: { eventsPerRoot: 6 } });
  const { state, events } = round(s0);
  assert.equal(state.over?.reason, 'safetyLimit');
  assert.equal(state.over?.winner, null);
  assert.equal(events.at(-1)!.type, 'battleEnd');
  assert.ok(state.enemy.hp > 0);
});

// ---------- 轮末恢复一致与预览 ----------

test('轮末恢复一致：保存、复制、继续同一输入序列，最终状态与事件顺序一致', () => {
  const input = { seed: 7, player: player(['break_strike', 'return_breath']), enemy: { config: 'balanced_standard' } };
  const decisions = Array.from({ length: 30 }, () => ({ stance: 'attack' as const }));
  const full = runBattle(createBattle(input), decisions);

  let s = createBattle(input);
  const head: string[] = [];
  for (let i = 0; i < 2; i++) {
    const r = runRound(s, decisions[i]!);
    head.push(...r.events.map((e) => `${e.seq}:${e.type}:${e.side}:${e.art}`));
    s = r.state;
  }
  const restored = JSON.parse(JSON.stringify(s));
  const tail = runBattle(restored, decisions.slice(2));
  const resumed = [...head, ...tail.events.map((e) => `${e.seq}:${e.type}:${e.side}:${e.art}`)];
  assert.deepEqual(resumed, full.events.map((e) => `${e.seq}:${e.type}:${e.side}:${e.art}`));
  assert.deepEqual(tail.state, full.state);
});

test('本轮预览使用状态副本：不改变原状态、事件序号与随机数', () => {
  const s0 = createBattle({ seed: 3, player: player(['cold_sword', 'break_chase']), enemy: { config: 'balanced_standard' } });
  const before = structuredClone(s0);
  const preview = runRound(s0, { stance: 'attack' });
  assert.deepEqual(s0, before);
  const actual = runRound(s0, { stance: 'attack' });
  assert.deepEqual(preview.state, actual.state, '同输入的预览与实际结果一致');
  assert.deepEqual(preview.events, actual.events);
});

// ---------- 非法构筑 ----------

test('非法构筑：执行前给出可解释错误，不生成结果', () => {
  const cases: [string, () => unknown][] = [
    ['超过四门', () => createBattle({ seed: 1, player: player(['cold_sword', 'break_strike', 'break_chase', 'return_breath', 'wind_step']), enemy: { config: 'balanced_standard' } })],
    ['超容量', () => createBattle({ seed: 1, player: player(['cold_sword', 'break_chase', 'borrow_force']), enemy: { config: 'balanced_standard' } })],
    ['负资源', () => createBattle({ seed: 1, player: player(['break_strike'], { qi: -1 }), enemy: { config: 'balanced_standard' } })],
    ['无效内容 ID', () => createBattle({ seed: 1, player: player(['no_such_art']), enemy: { config: 'balanced_standard' } })],
    ['无效敌人 ID', () => createBattle({ seed: 1, player: player(['break_strike']), enemy: { config: 'no_such_enemy' } })],
    ['剑专用装到棍上', () => createBattle({ seed: 1, player: player(['cold_sword'], { weaponId: 'iron_staff' }), enemy: { config: 'balanced_standard' } })],
    ['攻击主招配复架势', () => createBattle({
      seed: 1,
      player: player([{ id: 'bad', name: '错配', category: '绝学', trigger: 'T_contact', action: 'A_single', tier: '甲', modifier: null, followup: null, recovery: 'R_posture' }]),
      enemy: { config: 'balanced_standard' },
    })],
    ['基础接触起势配反击', () => createBattle({
      seed: 1,
      player: player([{ id: 'bad2', name: '错配', category: '绝学', trigger: 'T_contact', action: 'A_counter', tier: '甲', modifier: null, followup: null, recovery: null }]),
      enemy: { config: 'balanced_standard' },
    })],
  ];
  for (const [name, fn] of cases) {
    assert.throws(fn, (e: unknown) => e instanceof ValidationError && e.problems.length > 0, name);
  }
});

test('结束原因区分决策不足：没有下一条决策不算获胜或平局', () => {
  const s0 = createBattle({ seed: 1, player: player(['break_strike']), enemy: { config: 'guard_standard' } });
  const run = runBattle(s0, [{ stance: 'attack' }]);
  assert.equal(run.state.over?.reason, 'noDecision');
  assert.equal(run.state.over?.winner, null);
});
