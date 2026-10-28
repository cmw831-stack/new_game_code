import { useState } from 'preact/hooks';
import { buildOf, randomSeed, startSession, type Session, type Setup } from './lab.ts';
import { Home } from './pages/Home.tsx';
import { Battle } from './pages/Battle.tsx';
import { Result } from './pages/Result.tsx';

export function App() {
  const [setup, setSetup] = useState<Setup>({ arts: [...buildOf('cold_chain').arts], reserve: 0, enemyId: 'balanced_standard', seed: randomSeed() });
  const [session, setSession] = useState<Session | null>(null);

  const start = (s: Setup) => {
    setSetup(s);
    setSession(startSession(s));
  };

  return (
    <div class="shell">
      <header class="top">
        <span class="brand">武林·自创绝学</span>
        <span class="tag">构筑实验室 · 实验版本</span>
      </header>
      <main>
        {!session && <Home setup={setup} onStart={start} />}
        {session && !session.state.over && <Battle session={session} onChange={setSession} onQuit={() => setSession(null)} />}
        {session && session.state.over && (
          <Result
            session={session}
            onRetry={() => start(session.setup)}
            onNewSeed={() => start({ ...session.setup, seed: randomSeed() })}
            onHome={() => setSession(null)}
          />
        )}
      </main>
    </div>
  );
}
