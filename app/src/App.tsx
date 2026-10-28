import { useState } from 'preact/hooks';
import { saveVersion, type LabArchive } from '../../src/edit/manual.ts';
import { buildOf, randomSeed, startSession, type Session, type Setup } from './lab.ts';
import { loadArchive, storeArchive, type SaveStatus } from './store.ts';
import { Home } from './pages/Home.tsx';
import { Battle } from './pages/Battle.tsx';
import { Result } from './pages/Result.tsx';
import { Workshop } from './pages/Workshop.tsx';
import { Lessons } from './pages/Lessons.tsx';
import { LessonBattle } from './pages/LessonBattle.tsx';
import { BATTLE_LESSONS } from '../../src/teach/lessons.ts';
import { completeLesson, editResearch, enterLesson, type LessonId } from '../../src/teach/progress.ts';
import { CompareLesson, EditOneLesson, PageLesson, type Save } from './pages/LessonEdit.tsx';

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
  // 课程里保存版本：改良版按教学授予的权限检查；保存与完成课程写在同一次存档里。
  const saveInLesson: Save = (input, complete) => {
    const r = saveVersion(archive, input, editResearch(archive.teaching));
    if (!r.ok) return { problems: r.problems };
    updateArchive({ ...r.archive, teaching: complete ? completeLesson(r.archive.teaching, complete) : r.archive.teaching });
    return { problems: [], spec: r.saved.spec };
  };
  const exitLesson = () => setLesson(null);
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
        {!session && view === 'lessons' && lesson === null && (
          <Lessons
            progress={archive.teaching}
            onStart={startLesson}
            onIntroDone={() => teach((t) => completeLesson(enterLesson(t, 'teach_intro_v1'), 'teach_intro_v1'))}
            onBack={() => setView('home')}
          />
        )}
        {!session && view === 'lessons' && battleLesson && (
          <LessonBattle key={battleLesson.id} lesson={battleLesson} onComplete={(id) => teach((t) => completeLesson(t, id))} onExit={exitLesson} />
        )}
        {!session && view === 'lessons' && lesson === 'teach_edit_one_v1' && (
          <EditOneLesson progress={archive.teaching} onComplete={() => teach((t) => completeLesson(t, 'teach_edit_one_v1'))} onExit={exitLesson} />
        )}
        {!session && view === 'lessons' && lesson === 'teach_compare_versions_v1' && <CompareLesson onSave={saveInLesson} onExit={exitLesson} />}
        {!session && view === 'lessons' && lesson === 'teach_manuscript_page_v1' && (
          <PageLesson onSave={saveInLesson} onComplete={(id) => teach((t) => completeLesson(t, id))} onExit={exitLesson} />
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
