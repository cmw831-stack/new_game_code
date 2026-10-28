// M3 第一步：按当前规则（V1.9.1）逐课走查教学细则 V1.2 第三章的战斗课。
// 对每课：按建议姿态打到完成；再穷举前 4 轮的全部姿态序列（3^4 = 81 种），看能否完成、会不会先败退。用法：npm run walk-lessons

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createBattle, RULES_VERSION } from '../src/engine/setup.ts';
import { runRound } from '../src/engine/round.ts';
import { fillPage, PAGE_PREFACE } from '../src/edit/page.ts';
import { findTemplate, replaceSlot } from '../src/edit/variant.ts';
import { compileArt } from '../src/content/components.ts';
import { BATTLE_LESSONS, compareLessonInputs, pageLesson, type BattleLesson } from '../src/teach/lessons.ts';
import type { BattleEvent, Stance } from '../src/rules/types.ts';

const STANCES: Stance[] = ['attack', 'guard', 'breathe'];
const NAME: Record<Stance, string> = { attack: '出招', guard: '架招', breathe: '调息' };
const commit = execSync('git rev-parse --short HEAD').toString().trim();

interface Play { doneAt: number | null; over: string | null; overAt: number | null; rounds: number; hp: number }

function play(l: BattleLesson, stances: Stance[]): Play {
  let s = createBattle({ seed: 1, player: structuredClone(l.player), enemy: l.enemy() });
  const events: BattleEvent[] = [];
  let doneAt: number | null = null;
  for (const [i, stance] of stances.entries()) {
    if (s.over) break;
    const r = runRound(s, { stance });
    events.push(...r.events);
    s = r.state;
    if (doneAt === null && l.done(events)) doneAt = i + 1;
  }
  return { doneAt, over: s.over?.reason ?? null, overAt: s.over ? s.round : null, rounds: s.round - 1 + (s.over ? 1 : 0), hp: s.player.hp };
}

function sequences(n: number): Stance[][] {
  return n === 0 ? [[]] : sequences(n - 1).flatMap((q) => STANCES.map((x) => [...q, x]));
}

const pages = (PAGE_PREFACE.blanks.modifier ?? []).map((c) => fillPage(PAGE_PREFACE, { modifier: c }, `page_${c.id}`, `折锋（${c.id}）`).spec!);
const lessons: BattleLesson[] = [...BATTLE_LESSONS, ...pages.map((p) => ({ ...pageLesson(p), name: `卷首残页（${p.name}）` }))];

const lines: string[] = [];
lines.push('# M3 教学走查：原始数据', '');
lines.push(`由 \`npm run walk-lessons\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。检查点只循环开场段落，结果与种子无关。`, '');
lines.push('| 课 | 完成判定 | 按建议 | 建议打法第几轮完成 | 完成前是否败退 | 81 种前 4 轮序列：4 轮内完成 | 完成前败退 | 完成前已获胜 | 尚未完成、对局继续 | 其中之后已无法完成（只能重试） |');
lines.push('| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |');
const json: unknown[] = [];
for (const l of lessons) {
  const rec = play(l, Array.from({ length: 12 }, (_, i) => l.recommended[i % l.recommended.length]!));
  const all = sequences(4).map((q) => play(l, q));
  const done = all.filter((p) => p.doneAt !== null).length;
  const lost = all.filter((p) => p.doneAt === null && p.over === 'defeat').length;
  const won = all.filter((p) => p.doneAt === null && p.over === 'victory').length;
  const stuck = all.length - done - lost - won;
  // 尚未完成的局面：之后 6 轮内无论怎么打都完成不了（多半是先把对手打败），只能按本课输入重试。
  const dead = sequences(4).filter((q, i) => all[i]!.doneAt === null && all[i]!.over === null)
    .filter((q) => !sequences(6).some((t) => play(l, [...q, ...t]).doneAt !== null)).length;
  lines.push(`| ${l.name} | ${l.goal} | ${l.recommended.map((x) => NAME[x]).join('→')} | ${rec.doneAt ?? '未完成'} | ${rec.doneAt === null && rec.over === 'defeat' ? `第 ${rec.overAt} 轮败退` : '否'} | ${done} | ${lost} | ${won} | ${stuck} | ${dead} |`);
  json.push({ id: l.id, name: l.name, recommendedDoneAt: rec.doneAt, recommendedOver: rec.over, done, lost, won, stuck, dead });
}
lines.push('');

// 版本对照课：两版各一轮
const original = 'cold_sword';
const revised = { ...replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'cold_break'), name: '叠寒剑·破势' };
const ci = compareLessonInputs(original, revised);
lines.push('## 版本对照课（一轮，双方首轮出招）', '');
lines.push('| 版本 | 玩家气血／内力／架势 | 敌气血／架势 | 反震 | 寒意／冻结 |');
lines.push('| --- | --- | --- | ---: | --- |');
for (const [label, p] of [['原三连寒劲', ci.a], ['单次破势寒劲', ci.b]] as const) {
  const r = runRound(createBattle({ seed: 1, player: p, enemy: ci.enemy() }), ci.decisions[0]!);
  const res = r.events.filter((e) => e.type === 'hit' && e.art === 'npc_resonance').length;
  lines.push(`| ${label} | ${r.state.player.hp}／${r.state.player.qi}／${r.state.player.posture} | ${r.state.enemy.hp}／${r.state.enemy.posture} | ${res} | ${r.state.enemy.status.freezePending ? '冻结' : r.state.enemy.status.cold} |`);
  json.push({ compare: label, player: [r.state.player.hp, r.state.player.qi, r.state.player.posture], enemy: [r.state.enemy.hp, r.state.enemy.posture], resonance: res, cost: compileArt(label === '原三连寒劲' ? findTemplate('cold_sword')! : revised).cost });
}
lines.push('');

writeFileSync('docs/reports/phase2-m3-lesson-walkthrough-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase2-m3-lesson-walkthrough-data.json', JSON.stringify({ commit, rules: RULES_VERSION, lessons: json }, null, 2), 'utf8');
console.log(lines.join('\n'));
