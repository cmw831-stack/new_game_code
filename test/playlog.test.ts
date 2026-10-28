// 试玩记录：主计划 V1.9.1 12.3 节（同种子在相同规则、内容、构筑和决策下重现同一结果；回放记录变招、留力与版本）、
// 9.3 节（回放日志需要保留策略）；Phase 2 方案 2.1 节“试玩支持：一键导出决策、结果、改良历史”。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, type BattleInput } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { emptyArchive } from '../src/edit/manual.ts';
import { appendEntry, emptyPlaylog, exportPlaytest, makeEntry, parsePlaylog, replayEntry, type PlayEntry } from '../src/sim/playlog.ts';
import type { BattleEvent, Decision } from '../src/rules/types.ts';
import { player } from './helpers.ts';

function play(input: BattleInput, decisions: Decision[]) {
  let s = createBattle(structuredClone(input));
  const events: BattleEvent[] = [];
  const used: Decision[] = [];
  for (const d of decisions) {
    if (s.over) break;
    const r = runRound(s, d);
    events.push(...r.events);
    used.push(d);
    s = r.state;
  }
  return { state: s, events, used };
}

const input: BattleInput = { seed: 1007, player: player(['cold_sword', 'break_chase', 'return_breath'], { qi: 10, reserve: 2 }), enemy: { config: 'guard_standard', affixes: ['AFX_DEEP_QI'] } };
const decisions: Decision[] = [
  { stance: 'guard' },
  { stance: 'attack', change: { pause: ['break_chase'] } },
  { stance: 'breathe' },
  ...Array.from({ length: 30 }, (_, i): Decision => ({ stance: (['attack', 'guard', 'attack'] as const)[i % 3]! })),
];

test('记录按同输入重放得到同一结束状态，含变招、留力与词缀（主计划 12.3 节）', () => {
  const r = play(input, decisions);
  const e = { ...makeEntry('lab', input, r.used, r.events, r.state, 't'), id: 1 } as PlayEntry;
  assert.deepEqual(replayEntry(JSON.parse(JSON.stringify(e))), r.state);
  assert.equal(e.outcome, r.state.over?.reason ?? 'abandoned');
  assert.equal(e.rounds, r.used.length);
  assert.match(e.segments, /^[AB](-[AB])*$/, '记录段落序列');
});

test('中途放弃的对局记为 abandoned，同样可以重放到放弃时的状态', () => {
  const r = play(input, decisions.slice(0, 2));
  const e = { ...makeEntry('lab', input, r.used, r.events, r.state, 't'), id: 1 } as PlayEntry;
  assert.equal(e.outcome, 'abandoned');
  assert.deepEqual(replayEntry(e), r.state);
});

test('规则或内容版本不同的记录明确拒绝重放，不用新规则伪装原结果（主计划 9.3、12.3 节）', () => {
  const r = play(input, decisions.slice(0, 1));
  const e = { ...makeEntry('lab', input, r.used, r.events, r.state, 't'), id: 1, contentVersion: 'design-v1.8' } as PlayEntry;
  assert.throws(() => replayEntry(e), /不能按现规则重放/);
});

test('记录有上限，超出时丢弃最早的（主计划 9.3 节保留策略）', () => {
  const r = play(input, decisions.slice(0, 1));
  const one = makeEntry('lab', input, r.used, r.events, r.state, 't');
  let log = emptyPlaylog();
  for (let i = 0; i < 5; i++) log = appendEntry(log, one, 3);
  assert.deepEqual(log.entries.map((e) => e.id), [3, 4, 5]);
  assert.equal(log.nextId, 6);
});

test('导出包含对局、秘籍版本、教学进度与汇总；本地记录损坏时从空白开始', () => {
  const r = play(input, decisions);
  const log = appendEntry(emptyPlaylog(), makeEntry('lab', input, r.used, r.events, r.state, 't'));
  const out = JSON.parse(exportPlaytest(log, emptyArchive(), 'now'));
  assert.equal(out.format, 'wulin-playtest');
  assert.equal(out.summary.battles, 1);
  assert.equal(out.summary.changesUsed, 1);
  assert.deepEqual(Object.keys(out).sort(), ['battles', 'contentVersion', 'exportedAt', 'format', 'rulesVersion', 'summary', 'teaching', 'versions'].sort());
  assert.deepEqual(parsePlaylog('{oops'), emptyPlaylog());
  assert.deepEqual(parsePlaylog(JSON.stringify(log)), log);
});
