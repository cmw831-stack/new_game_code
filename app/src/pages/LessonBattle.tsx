// 战斗课：固定输入开局，每轮后按实际事实判定是否完成；完成即结算授业，之后输赢都不撤销（教学细则 V1.2 2.2、2.3 节）。

import { useState } from 'preact/hooks';
import { createBattle } from '../../../src/engine/setup.ts';
import type { BattleLesson } from '../../../src/teach/lessons.ts';
import { LESSON_GRANT, type LessonId } from '../../../src/teach/progress.ts';
import { RoundLog } from '../components/RoundLog.tsx';
import { battleNames } from '../../../src/narrate/narrate.ts';
import type { Session } from '../lab.ts';
import { LESSON_TEXT } from '../teach.ts';
import { Battle } from './Battle.tsx';
import { GRANT_NAME } from './Lessons.tsx';

function fresh(l: BattleLesson): Session {
  const state = createBattle({ battleId: `lesson/${l.id}`, seed: 1, player: structuredClone(l.player), enemy: l.enemy() });
  return { setup: { arts: [], reserve: 0, enemyId: '', seed: 1 }, state, rounds: [] };
}

export function LessonBattle({ lesson, onComplete, onExit }: { lesson: BattleLesson; onComplete: (id: LessonId) => void; onExit: () => void }) {
  const text = LESSON_TEXT[lesson.id as LessonId];
  const needsRead = lesson.id === 'teach_resonance_v1';
  const [read, setRead] = useState(!needsRead);
  const [session, setSession] = useState(() => fresh(lesson));
  const [done, setDone] = useState(false);
  const grant = LESSON_GRANT[lesson.id as LessonId];

  const update = (s: Session) => {
    setSession(s);
    if (!done && lesson.done(s.rounds.flatMap((r) => r.events))) {
      setDone(true);
      onComplete(lesson.id as LessonId);
    }
  };
  const retry = () => {
    setSession(fresh(lesson));
    setDone(false);
    // 焦点留在“重试”上时，紧接着按 Enter 会再次重试，而不是确认姿态。
    (document.activeElement as HTMLElement | null)?.blur();
  };
  const hint = text.hint?.(session.state) ?? null;

  if (!read) {
    return (
      <section class="lesson">
        <h1>{text.title}</h1>
        <p class="lead">{text.brief}</p>
        <div class="actions">
          <button type="button" class="primary" onClick={() => setRead(true)}>读过了，开始</button>
          <button type="button" class="ghost" onClick={onExit}>回课程</button>
        </div>
      </section>
    );
  }

  const over = session.state.over;
  return (
    <section class="lesson">
      <div class={`lesson-goal ${done ? 'met' : ''}`}>
        <strong>{text.title}</strong>
        <span class="small">目标：{lesson.goal}</span>
        {done ? (
          <span class="small good">本课完成。{grant ? `取得：${GRANT_NAME[grant]}。` : ''}可以继续打完，也可以回课程。</span>
        ) : (
          <span class="small muted">{text.brief}</span>
        )}
        {!done && hint && <span class="small warn">{hint}</span>}
        <span class="actions">
          <button type="button" class="ghost small" onClick={retry}>按本课输入重试</button>
          <button type="button" class="ghost small" onClick={onExit}>回课程</button>
        </span>
      </div>
      {!over && <Battle session={session} onChange={update} onQuit={onExit} />}
      {over && (
        <div class="lesson-end">
          <h2 class={done ? 'good' : 'warn'}>
            {over.reason === 'victory' ? '你赢了' : over.reason === 'defeat' ? '你败退了' : '对局中止'}
            {done ? '，本课已完成' : '，但本课目标还没完成'}
          </h2>
          {!done && <p>目标是：{lesson.goal}。按本课输入重试一次，不收任何代价。</p>}
          <div class="actions">
            <button type="button" class={done ? 'ghost' : 'primary'} onClick={retry}>按本课输入重试</button>
            <button type="button" class={done ? 'primary' : 'ghost'} onClick={onExit}>回课程</button>
          </div>
          <h2>逐轮记录</h2>
          <RoundLog rounds={session.rounds} names={battleNames(session.state)} />
        </div>
      )}
    </section>
  );
}
