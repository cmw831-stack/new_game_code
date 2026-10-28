import { useState } from 'preact/hooks';
import type { LabArchive } from '../../src/edit/manual.ts';
import { buildOf, randomSeed, startSession, type Session, type Setup } from './lab.ts';
import { loadArchive, storeArchive, type SaveStatus } from './store.ts';
import { Home } from './pages/Home.tsx';
import { Battle } from './pages/Battle.tsx';
import { Result } from './pages/Result.tsx';
import { Workshop } from './pages/Workshop.tsx';

const initial = loadArchive();

export function App() {
  const [setup, setSetup] = useState<Setup>({ arts: [...buildOf('cold_chain').arts], reserve: 0, enemyId: 'balanced_standard', seed: randomSeed() });
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'home' | 'workshop'>('home');
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
        {!session && view === 'home' && <Home setup={setup} archive={archive} onChange={setSetup} onStart={start} onWorkshop={() => setView('workshop')} />}
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
