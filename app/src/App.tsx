import { useState } from 'preact/hooks';
import { saveVersion, type LabArchive } from '../../src/edit/manual.ts';
import { buildOf, randomSeed, startSession, type Session, type Setup } from './lab.ts';
import { download, loadArchive, loadPlaylog, storeArchive, storePlaylog, type SaveStatus } from './store.ts';
import { appendEntry, exportPlaytest, makeEntry, type PlayLog } from '../../src/sim/playlog.ts';
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
  const [setup, setSetup] = useState<Setup>({ arts: [...buildOf('starter').arts], reserve: 0, enemyId: 'balanced_standard', affixes: [], seed: randomSeed() });
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'home' | 'workshop' | 'lessons'>('home');
  const [lesson, setLesson] = useState<LessonId | null>(null);
  const [archive, setArchive] = useState<LabArchive>(initial.archive);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [playlog, setPlaylog] = useState<PlayLog>(loadPlaylog);

  /** 一场对局结束或被放弃时记一条试玩记录。 */
  const record = (s: Session, kind: 'lab' | 'lesson', lesson?: string) => {
    if (s.rounds.length === 0) return;
    const entry = makeEntry(kind, s.input, s.rounds.map((r) => r.decision), s.rounds.flatMap((r) => r.events), s.state, new Date().toISOString(), lesson);
    setPlaylog((log) => {
      const next = appendEntry(log, entry);
      storePlaylog(next);
      return next;
    });
  };
  const changeSession = (s: Session) => {
    if (s.state.over && session && !session.state.over) record(s, 'lab');
    setSession(s);
  };
  const quit = () => {
    if (session && !session.state.over) record(session, 'lab');
    setSession(null);
  };
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const exportLog = async () => setExportMsg(await download(`wulin-playtest-${new Date().toISOString().slice(0, 10)}.json`, exportPlaytest(playlog, archive, new Date().toISOString())));

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
        <span class="seal brand-seal" aria-hidden="true">武</span>
        <span class="brand">武林·自创绝学</span>
        <span class="tag">构筑实验室 · 实验版本</span>
      </header>
      <main>
        {!session && view === 'home' && <Home setup={setup} archive={archive} onChange={setSetup} onStart={start} onWorkshop={() => setView('workshop')} onLessons={() => setView('lessons')} battles={playlog.entries.length} onExportLog={exportLog} exportMsg={exportMsg} />}
        {!session && view === 'lessons' && lesson === null && (
          <Lessons
            progress={archive.teaching}
            onStart={startLesson}
            versions={archive.versions.length}
            onIntroDone={() => teach((t) => completeLesson(enterLesson(t, 'teach_intro_v1'), 'teach_intro_v1'))}
            onGraduate={() => {
              teach((t) => completeLesson(enterLesson(t, 'teach_lab_graduation_v1'), 'teach_lab_graduation_v1'));
              setView('home');
            }}
            onBack={() => setView('home')}
          />
        )}
        {!session && view === 'lessons' && battleLesson && (
          <LessonBattle key={battleLesson.id} lesson={battleLesson} onComplete={(id) => teach((t) => completeLesson(t, id))} onExit={exitLesson} onRecord={(s, id) => record(s, 'lesson', id)} />
        )}
        {!session && view === 'lessons' && lesson === 'teach_edit_one_v1' && (
          <EditOneLesson progress={archive.teaching} onComplete={() => teach((t) => completeLesson(t, 'teach_edit_one_v1'))} onExit={exitLesson} />
        )}
        {!session && view === 'lessons' && lesson === 'teach_compare_versions_v1' && <CompareLesson onSave={saveInLesson} onExit={exitLesson} />}
        {!session && view === 'lessons' && lesson === 'teach_manuscript_page_v1' && (
          <PageLesson onSave={saveInLesson} onComplete={(id) => teach((t) => completeLesson(t, id))} onExit={exitLesson} onRecord={(s, id) => record(s, 'lesson', id)} />
        )}
        {!session && view === 'workshop' && (
          <Workshop archive={archive} onArchive={updateArchive} onEquip={equip} onBack={() => setView('home')} saveStatus={saveStatus} loadProblem={initial.problem} />
        )}
        {session && !session.state.over && <Battle session={session} onChange={changeSession} onQuit={quit} />}
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
