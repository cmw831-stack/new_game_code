// 课程列表：按顺序解锁，可随时补做；已完成的课可以回看（教学细则 V1.2 2.2、2.3 节）。

import { useState } from 'preact/hooks';
import { findArt } from '../../../src/content/catalog.ts';
import { acquiredArts, LESSON_IDS, lessonStatus, missingFor, type GrantId, type LessonId, type TeachingProgress } from '../../../src/teach/progress.ts';
import { INTRO_GOALS, LESSON_TEXT } from '../teach.ts';

const STATUS: Record<string, string> = { notStarted: '未开始', inProgress: '进行中', conditionMet: '已完成', granted: '已完成' };

export const GRANT_NAME: Record<GrantId, string> = {
  grant_chase_intro_v1: '崩势追击',
  grant_counter_intro_v1: '借力诀',
  grant_cold_intro_v1: '叠寒剑',
  grant_step_intro_v1: '踏风步',
  grant_edit_intro_v1: '断势击、叠寒剑精通（可做单槽改良）',
  grant_page_preface_v1: '卷首残页·折锋',
};

export function Lessons({ progress, onStart, onIntroDone, onBack }: {
  progress: TeachingProgress;
  onStart: (id: LessonId) => void;
  onIntroDone: () => void;
  onBack: () => void;
}) {
  const [intro, setIntro] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);

  if (intro) {
    return (
      <section class="lessons">
        <h1>{LESSON_TEXT.teach_intro_v1.title}</h1>
        <ul class="arts">
          <li><strong>气血</strong>：归零就败退。最大 30。</li>
          <li><strong>内力</strong>：武学发动要付。每轮开始自然 +2，调息再 +4。最大 20。</li>
          <li><strong>架势</strong>：被打到 0 就崩溃，对方取得一份破绽。最大 20。</li>
          <li><strong>四个武学位、容量 12</strong>：现在装着断势击（容量 4）和归息诀（容量 2），共 6。兵器铁剑容量 0。</li>
        </ul>
        <h2>我这次想验证的事</h2>
        <div class="cards">
          {INTRO_GOALS.map((g) => (
            <button type="button" key={g} class={`card ${goal === g ? 'selected' : ''}`} aria-pressed={goal === g} onClick={() => setGoal(g)}>{g}</button>
          ))}
        </div>
        <div class="actions">
          <button type="button" class="primary" disabled={!goal} onClick={() => { setIntro(false); onIntroDone(); }}>记下，回到课程</button>
          <button type="button" class="ghost" onClick={() => setIntro(false)}>返回</button>
        </div>
      </section>
    );
  }

  return (
    <section class="lessons">
      <div class="battle-bar">
        <span>课程</span>
        <span class="muted small">已取得：{acquiredArts(progress).map((id) => findArt(id)!.name).join('、')}</span>
        <button type="button" class="ghost small" onClick={onBack}>回到构筑</button>
      </div>
      <ol class="lesson-list">
        {LESSON_IDS.map((id) => {
          const t = LESSON_TEXT[id];
          const st = lessonStatus(progress, id);
          const missing = missingFor(progress, id);
          const done = st === 'conditionMet' || st === 'granted';
          return (
            <li key={id} class={done ? 'done' : missing.length ? 'locked' : ''}>
              <div>
                <strong>{t.title}</strong>
                <span class={`chip ${done ? 'good' : ''}`}>{STATUS[st]}</span>
                <div class="small">{t.brief}</div>
                {missing.length > 0 && <div class="small muted">需要先取得：{missing.map((g) => GRANT_NAME[g]).join('、')}</div>}
                {t.later && <div class="small muted">这一课的界面下一步接入。</div>}
              </div>
              <button
                type="button"
                class={done ? 'ghost' : 'primary'}
                disabled={missing.length > 0 || !!t.later}
                onClick={() => (id === 'teach_intro_v1' ? setIntro(true) : onStart(id))}
              >
                {done ? '再做一次' : st === 'inProgress' ? '继续' : '开始'}
              </button>
            </li>
          );
        })}
      </ol>
      <p class="small muted">课程只看实际发生的事实，不看你点了哪个按钮。授业只结算一次，重做不会重复发放；没完成的课随时可以免费补做。</p>
    </section>
  );
}
