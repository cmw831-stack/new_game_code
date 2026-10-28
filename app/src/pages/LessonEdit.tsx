// 改良三课：单槽改良（teach_edit_one_v1）、版本对照（teach_compare_versions_v1）、卷首残页（teach_manuscript_page_v1）。
// 依据：教学细则 V1.2 第三章对应三行、3.1 节（首份改良的解释口径）、4.2 节线框；组件细则 V1.2 第八章“教学寒劲破势”。

import { useState } from 'preact/hooks';
import { compileArt, type ArtSpec } from '../../../src/content/components.ts';
import { createBattle } from '../../../src/engine/setup.ts';
import { defaultName, type SaveInput } from '../../../src/edit/manual.ts';
import { fillPage, PAGE_PREFACE } from '../../../src/edit/page.ts';
import { checkVariant, findTemplate, replaceSlot } from '../../../src/edit/variant.ts';
import { componentLabel, describeArt } from '../../../src/narrate/narrate.ts';
import { compareVersions, type Snapshot } from '../../../src/sim/compare.ts';
import { compareLessonInputs, pageLesson } from '../../../src/teach/lessons.ts';
import { editResearch, type LessonId, type TeachingProgress } from '../../../src/teach/progress.ts';
import { LESSON_TEXT } from '../teach.ts';
import { LessonBattle } from './LessonBattle.tsx';
import type { Session } from '../lab.ts';

/** 本课唯一开放的改良：叠寒剑主招三连 → 已知破势主招，保留寒劲（教学细则 teach_edit_one_v1）。 */
export function lessonDraft(): ArtSpec {
  return { ...replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'cold_sword~lesson'), name: '叠寒剑·改' };
}

/** 保存版本；成功时返回保存后的装配（带版本 ID），可选同时完成某一课。 */
export type Save = (input: SaveInput, complete: LessonId | null) => { problems: string[]; spec?: ArtSpec };

function Header({ id, onExit }: { id: LessonId; onExit: () => void }) {
  const t = LESSON_TEXT[id];
  return (
    <div class="battle-bar">
      <span>{t.title}</span>
      <span class="muted small">{t.brief}</span>
      <button type="button" class="ghost small" onClick={onExit}>回课程</button>
    </div>
  );
}

export function EditOneLesson({ progress, onComplete, onExit }: { progress: TeachingProgress; onComplete: () => void; onExit: () => void }) {
  const source = findTemplate('cold_sword')!;
  const draft = lessonDraft();
  const check = checkVariant('cold_sword', draft, editResearch({ ...progress, grants: [...progress.grants, 'grant_edit_intro_v1'] }));
  const [saved, setSaved] = useState(false);
  const before = compileArt(source);
  const after = compileArt(draft);
  return (
    <section class="lesson">
      <Header id="teach_edit_one_v1" onExit={onExit} />
      <p>授业：断势击、叠寒剑精通，组件库加入破势甲与连击乙。精通只能改一个槽；这一课只开放下面这一处。</p>
      <div class="loadout">
        <ol class="five">
          <li><span class="slot-no">起势</span><span>{componentLabel('T_contact')}</span></li>
          <li class="on"><span class="slot-no">主招</span><span>{componentLabel('A_combo:乙')} → <strong>{componentLabel('A_break:甲')}</strong></span></li>
          <li><span class="slot-no">劲力</span><span>{componentLabel('M_cold')}（保留）</span></li>
          <li><span class="slot-no">变化</span><span>无</span></li>
          <li><span class="slot-no">收势</span><span>无</span></li>
        </ol>
        <p>费用 {check.before.cost} → {check.after?.cost}，秘籍容量 {check.before.capacity} → {check.after?.capacity}（组件加总：破势甲 3／4 ＋ 寒劲 1／2）。{check.ok ? '合法。' : check.problems.map((p) => p.message).join('；')}</p>
        <div class="small">原版：{describeArt(before)}</div>
        <div class="small">改良：{describeArt(after)}；仍要求用剑</div>
        <p class="small">得：只有一次接触，蓄震守卫不会反震；削架势略多。失：直接伤血更低，每次只积寒 1，冻结更慢。</p>
      </div>
      <div class="actions">
        <button type="button" class="primary" disabled={!check.ok || saved} onClick={() => { setSaved(true); onComplete(); }}>{saved ? '草稿已保存' : '保存草稿'}</button>
        {saved && <span class="small good">下一课把原版和这份草稿各打一轮，再决定是否保存为正式版本。</span>}
      </div>
    </section>
  );
}

const ROWS: [string, (s: Snapshot) => string][] = [
  ['你的气血', (s) => `${s.player.hp}`],
  ['你的内力', (s) => `${s.player.qi}`],
  ['对手气血', (s) => `${s.enemy.hp}`],
  ['对手架势', (s) => `${s.enemy.posture}`],
  ['反震', (s) => `${s.resonance} 次`],
  ['寒意／冻结', (s) => (s.enemy.frozen ? '冻结' : `积寒 ${s.enemy.cold}`)],
];

export function CompareLesson({ onSave, onExit }: { onSave: Save; onExit: () => void }) {
  const draft = lessonDraft();
  const ci = compareLessonInputs('cold_sword', draft);
  const c = compareVersions(
    createBattle({ seed: 1, player: ci.a, enemy: ci.enemy() }),
    createBattle({ seed: 1, player: ci.b, enemy: ci.enemy() }),
    ci.decisions,
  );
  const row = c.rows[0]!;
  const diffs = ROWS.filter(([, f]) => f(row.a!) !== f(row.b!)).map(([label]) => label);
  const [notes, setNotes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const source = { kind: 'template' as const, templateId: 'cold_sword' };
  return (
    <section class="lesson">
      <Header id="teach_compare_versions_v1" onExit={onExit} />
      <p>两版各开一个独立实例：30 气血、10 内力、20 架势，铁剑，留力 0；对手都是蓄震守卫的教学快照；首轮都出招，打一整轮。</p>
      <div class="table-wrap">
        <table class="cmp">
          <thead><tr><th></th><th>原版（三连寒劲）</th><th>改良（单次破势寒劲）</th></tr></thead>
          <tbody>
            {ROWS.map(([label, f]) => (
              <tr key={label}><td>{label}</td><td class={diffs.includes(label) ? 'diff' : ''}>{f(row.a!)}</td><td class={diffs.includes(label) ? 'diff' : ''}>{f(row.b!)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">改良版不一定更强：少挨反震、削架势略多，但伤血更低、冻结更慢。</p>
      <h2>选至少一项实际差异，写进版本备注</h2>
      <div class="presets">
        {diffs.map((d) => (
          <button type="button" key={d} class={`ghost small ${notes.includes(d) ? 'on' : ''}`} aria-pressed={notes.includes(d)} onClick={() => setNotes(notes.includes(d) ? notes.filter((x) => x !== d) : [...notes, d])}>{d}</button>
        ))}
      </div>
      <div class="savebox">
        <label>名字<input type="text" value={name} placeholder={defaultName(source)} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <button
          type="button"
          class="primary"
          disabled={notes.length === 0 || saved}
          onClick={() => {
            const note = notes.map((d) => `${d}：${ROWS.find(([l]) => l === d)![1](row.a!)} → ${ROWS.find(([l]) => l === d)![1](row.b!)}`).join('；');
            const r = onSave({ name, note, source, spec: draft, savedAt: new Date().toISOString() }, 'teach_compare_versions_v1');
            setProblems(r.problems);
            if (r.problems.length === 0) setSaved(true);
          }}
        >
          {saved ? '已保存' : '保存为新版本'}
        </button>
      </div>
      {problems.map((p) => <p class="warn small" key={p}>{p}</p>)}
      {saved && <p class="good small">已保存，原版与新版都保留。取得：卷首残页·折锋。</p>}
    </section>
  );
}

export function PageLesson({ onSave, onComplete, onExit, onRecord }: { onSave: Save; onComplete: (id: LessonId) => void; onExit: () => void; onRecord?: (s: Session, lesson: string) => void }) {
  const [mod, setMod] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [spec, setSpec] = useState<ArtSpec | null>(null);
  const source = { kind: 'page' as const, pageId: PAGE_PREFACE.id };
  if (spec) return <LessonBattle lesson={pageLesson(spec)} onComplete={onComplete} onExit={onExit} onRecord={onRecord} />;
  const fill = mod ? fillPage(PAGE_PREFACE, { modifier: { id: mod } }, 'page-draft', '折锋') : null;
  return (
    <section class="lesson">
      <Header id="teach_manuscript_page_v1" onExit={onExit} />
      <p class="small muted">起势：基础出招接触（固定）；主招：单击乙 3／2（固定）；劲力空着；变化、收势：无。</p>
      <div class="cards">
        {(PAGE_PREFACE.blanks.modifier ?? []).map((c) => {
          const f = fillPage(PAGE_PREFACE, { modifier: c }, 'x', 'x');
          return (
            <button type="button" key={String(c.id)} class={`card ${c.id === mod ? 'selected' : ''}`} aria-pressed={c.id === mod} onClick={() => setMod(c.id)}>
              <strong>{componentLabel(c.id)}</strong>
              <span class="muted small">费用 2 → {f.cost}，容量 2 → {f.capacity}</span>
              {f.spec && <span class="small">{describeArt(compileArt(f.spec))}</span>}
            </button>
          );
        })}
      </div>
      <p class="small">刚劲排在能打崩对手的武学之后才有收益；震劲补架势压力、伤血最低；柔劲最省内力、偏守势。</p>
      <div class="savebox">
        <label>名字<input type="text" value={name} placeholder={defaultName(source)} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <button
          type="button"
          class="primary"
          disabled={!fill?.ok}
          onClick={() => {
            const r = onSave({ name, source, spec: fill!.spec!, savedAt: new Date().toISOString() }, null);
            setProblems(r.problems);
            if (r.spec) setSpec(r.spec);
          }}
        >
          保存并演练一轮
        </button>
      </div>
      {problems.map((p) => <p class="warn small" key={p}>{p}</p>)}
    </section>
  );
}
