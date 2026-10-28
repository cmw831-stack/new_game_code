// 试玩记录：每场结束（或放弃）的对局留下完整输入与决策序列，可按同输入重放（主计划 V1.9.1 12.3 节）。
// 记录有上限，超出时丢弃最早的（9.3 节：回放日志需要保留策略，不能无限堆入小容量存储）。
// 导出时与实验存档（秘籍版本、教学进度）合成一份，供 Phase 2 方案 2.1 节“试玩支持”分析。

import { runRound } from '../engine/round.ts';
import { createBattle, RULES_VERSION, type BattleInput } from '../engine/setup.ts';
import { CONTENT_VERSION } from '../content/catalog.ts';
import type { BattleEvent, BattleState, Decision, EndReason } from '../rules/types.ts';
import type { LabArchive } from '../edit/manual.ts';

export const PLAYLOG_CAP = 200;

export interface PlayEntry {
  id: number;
  at: string;
  /** 自由对局或某一课。 */
  kind: 'lab' | 'lesson';
  lesson?: string;
  input: BattleInput;
  decisions: Decision[];
  outcome: EndReason | 'abandoned';
  rounds: number;
  /** 结束时双方的气血与玩家内力。 */
  end: { playerHp: number; playerQi: number; enemyHp: number };
  /** 实际出现的段落序列，例如 A-B-A。 */
  segments: string;
  rulesVersion: string;
  contentVersion: string;
}

export interface PlayLog {
  format: 'wulin-playlog';
  nextId: number;
  entries: PlayEntry[];
}

export function emptyPlaylog(): PlayLog {
  return { format: 'wulin-playlog', nextId: 1, entries: [] };
}

function segmentsOf(events: readonly BattleEvent[]): string {
  const out: string[] = [];
  let last = '';
  for (const e of events) {
    if (e.type !== 'intent') continue;
    const seg = e.data.segment as string;
    if (e.data.item === 0 || seg !== last) out.push(seg);
    last = seg;
  }
  return out.join('-');
}

/** 由一场对局的输入、决策与结束状态生成一条记录。 */
export function makeEntry(kind: PlayEntry['kind'], input: BattleInput, decisions: Decision[], events: readonly BattleEvent[], state: BattleState, at: string, lesson?: string): Omit<PlayEntry, 'id'> {
  return {
    at,
    kind,
    ...(lesson ? { lesson } : {}),
    input: structuredClone(input),
    decisions: structuredClone(decisions),
    outcome: state.over?.reason ?? 'abandoned',
    rounds: decisions.length,
    end: { playerHp: state.player.hp, playerQi: state.player.qi, enemyHp: state.enemy.hp },
    segments: segmentsOf(events),
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
  };
}

/** 追加一条；超过上限时丢弃最早的。返回新对象。 */
export function appendEntry(log: PlayLog, entry: Omit<PlayEntry, 'id'>, cap = PLAYLOG_CAP): PlayLog {
  const entries = [...log.entries, { ...entry, id: log.nextId }];
  return { ...log, nextId: log.nextId + 1, entries: entries.slice(Math.max(0, entries.length - cap)) };
}

/** 按记录的输入与决策重放，得到同样的结束状态（规则与内容版本相同时）。 */
export function replayEntry(e: PlayEntry): BattleState {
  if (e.rulesVersion !== RULES_VERSION || e.contentVersion !== CONTENT_VERSION) {
    throw new Error(`记录的规则或内容版本（${e.rulesVersion}／${e.contentVersion}）与当前不同，不能按现规则重放`);
  }
  let s = createBattle(structuredClone(e.input));
  for (const d of e.decisions) {
    if (s.over) break;
    s = runRound(s, d).state;
  }
  return s;
}

/** 导出给开发者分析的试玩包：对局记录、秘籍版本、教学进度与简单汇总。 */
export function exportPlaytest(log: PlayLog, archive: LabArchive, exportedAt: string): string {
  const count = (pred: (e: PlayEntry) => boolean) => log.entries.filter(pred).length;
  return JSON.stringify({
    format: 'wulin-playtest',
    exportedAt,
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
    summary: {
      battles: log.entries.length,
      victories: count((e) => e.outcome === 'victory'),
      defeats: count((e) => e.outcome === 'defeat'),
      abandoned: count((e) => e.outcome === 'abandoned'),
      changesUsed: log.entries.reduce((n, e) => n + e.decisions.filter((d) => d.change).length, 0),
      versionsSaved: archive.versions.length,
      lessonsDone: Object.values(archive.teaching.lessons).filter((s) => s === 'conditionMet' || s === 'granted').length,
    },
    battles: log.entries,
    versions: archive.versions,
    teaching: archive.teaching,
  }, null, 2);
}

/** 读取本地保存的记录；格式不对时从空白开始。 */
export function parsePlaylog(text: string | null): PlayLog {
  if (!text) return emptyPlaylog();
  try {
    const d = JSON.parse(text) as Partial<PlayLog>;
    if (d.format !== 'wulin-playlog' || !Array.isArray(d.entries) || !Number.isInteger(d.nextId)) return emptyPlaylog();
    return { format: 'wulin-playlog', nextId: d.nextId!, entries: d.entries };
  } catch {
    return emptyPlaylog();
  }
}
