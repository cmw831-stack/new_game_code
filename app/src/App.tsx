import { useState } from 'preact/hooks';
import type { LabArchive } from '../../src/edit/manual.ts';
import { buildOf, randomSeed, startSession, type Session, type Setup } from './lab.ts';
import { loadArchive, storeArchive, type SaveStatus } from './store.ts';
import { Home } from './pages/Home.tsx';
import { Battle } from './pages/Battle.tsx';
import { Result } from './pages/Result.tsx';
import { Workshop } from './pages/Workshop.tsx';
import { Lessons } from './pages/Lessons.tsx';
import { LessonBattle } from './pages/LessonBattle.tsx';
import { BATTLE_LESSONS } from '../../src/teach/lessons.ts';
import { completeLesson, enterLesson, type LessonId } from '../../src/teach/progress.ts';

const initial = loadArchive();

export function App() {
  const [setup, setSetup] = useState<Setup>({ arts: [...buildOf('cold_chain').arts], reserve: 0, enemyId: 'balanced_standard', seed: randomSeed() });
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'home' | 'workshop' | 'lessons'>('home');
  const [lesson, setLesson] = useState<LessonId | null>(null);
  const [archive, setArchive] = useState<LabArchive>(initial.archive);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);

  const start = (s: Setup) => {
    setSetup(s);
    setSession(startSession(s, archive));
  };
  const updateArchive = (a: LabArchive) => {
    setArchive(a);
    setSaveStatus(storeArchive(a));
  };
  const teach = (f: (t: LabArchive['teaching']) => LabArchive['teaching']) => updateArchive({ ...archive, teaching: f(archive.teaching) });
  const startLesson = (id: LessonId) => {
    teach((t) => enterLesson(t, id));
    setLesson(id);
  };
  const battleLesson = BATTLE_LESSONS.find((l) => l.id === lesson);
  const equip = (id: string) => {
    if (setup.arts.length < 4 && !setup.arts.includes(id)) setSetup({ ...setup, arts: [...setup.arts, id] });
    setView('home');
  };

  return (
    <div class="shell">
      <header class="top">
        <span class="brand">武林·自创绝学</span>
        <span class="tag">构筑实验室 · 实验版本</span>
      </header>
      <main>
        {!session && view === 'home' && <Home setup={setup} archive={archive} onChange={setSetup} onStart={start} onWorkshop={() => setView('workshop')} onLessons={() => setView('lessons')} />}
        {!session && view === 'lessons' && !battleLesson && (
          <Lessons
            progress={archive.teaching}
            onStart={startLesson}
            onIntroDone={() => teach((t) => completeLesson(enterLesson(t, 'teach_intro_v1'), 'teach_intro_v1'))}
            onBack={() => setView('home')}
          />
        )}
        {!session && view === 'lessons' && battleLesson && (
          <LessonBattle key={battleLesson.id} lesson={battleLesson} onComplete={(id) => teach((t) => completeLesson(t, id))} onExit={() => setLesson(null)} />
        )}
        {!session && view === 'workshop' && (
          <Workshop archive={archive} onArchive={updateArchive} onEquip={equip} onBack={() => setView('home')} saveStatus={saveStatus} loadProblem={initial.problem} />
        )}
        {session && !session.state.over && <Battle session={session} onChange={setSession} onQuit={() => setSession(null)} />}
        {session && session.state.over && (
          <Result
            session={session}
            archive={archive}
            onRetry={() => start(session.setup)}
            onNewSeed={() => start({ ...session.setup, seed: randomSeed() })}
            onHome={() => setSession(null)}
          />
        )}
      </main>
    </div>
  );
}
