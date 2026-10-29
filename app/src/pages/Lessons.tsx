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

export function Lessons({ progress, versions, onStart, onIntroDone, onGraduate, onBack }: {
  progress: TeachingProgress;
  /** 已保存的秘籍版本数。 */
  versions: number;
  onGraduate: () => void;
  onStart: (id: LessonId) => void;
  onIntroDone: () => void;
  onBack: () => void;
}) {
  const [intro, setIntro] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);
  const [graduation, setGraduation] = useState(false);

  if (graduation) {
    return (
      <section class="lessons">
        <h1>{LESSON_TEXT.teach_lab_graduation_v1.title}</h1>
        <p class="lead">课程到这里结束。下面是你在课程里得到的东西，它们都会留在实验室里。</p>
        <ul class="arts">
          <li><strong>已取得的武学</strong>：{acquiredArts(progress).map((id) => findArt(id)!.name).join('、')}</li>
          <li><strong>授业</strong>：{progress.grants.map((g) => GRANT_NAME[g]).join('；')}</li>
          <li><strong>已保存的秘籍版本</strong>：{versions} 个（在“武学工坊”查看、装备或另存新版本）</li>
        </ul>
        <h2>接下来可以做什么</h2>
        <ul class="arts">
          <li>自己组一套武学，挑高架势守卫或蓄震守卫打；一直出招多半会输，看意图打才会赢。</li>
          <li>输了以后，到武学工坊改一处，再用结果页的 A／B 对照比较两版。</li>
          <li>给对手加上词缀，看同一套武学还管不管用。</li>
        </ul>
        <p class="small muted">正式的“首次出门”需要据点、钱包和路线，留到 Phase 3。</p>
        <div class="actions">
          <button type="button" class="primary" onClick={() => { setGraduation(false); onGraduate(); }}>进入实验室</button>
          <button type="button" class="ghost" onClick={() => setGraduation(false)}>回课程</button>
        </div>
      </section>
    );
  }

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
                onClick={() => (id === 'teach_intro_v1' ? setIntro(true) : id === 'teach_lab_graduation_v1' ? setGraduation(true) : onStart(id))}
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
