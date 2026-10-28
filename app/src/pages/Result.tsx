import { artName, battleNames } from '../../../src/narrate/narrate.ts';
import type { LabArchive } from '../../../src/edit/manual.ts';
import { RoundLog } from '../components/RoundLog.tsx';
import { ComparePanel } from '../components/ComparePanel.tsx';
import { enemyName, loadoutName, tally, type Session } from '../lab.ts';

const HEADLINE: Record<string, string> = {
  victory: '你赢了',
  defeat: '你败退了',
  safetyLimit: '对局中止：达到安全上限',
  roundLimit: '对局中止：达到轮数上限',
  noDecision: '对局中止',
};

export function Result({ session, archive, onRetry, onNewSeed, onHome }: { session: Session; archive: LabArchive; onRetry: () => void; onNewSeed: () => void; onHome: () => void }) {
  const { state, setup, rounds } = session;
  const over = state.over!;
  const t = tally(rounds);
  const names = battleNames(state);
  const totalTaken = t.taken.reduce((n, [, v]) => n + v, 0);
  return (
    <section class="result">
      <h1 class={over.reason === 'victory' ? 'good' : 'warn'}>{HEADLINE[over.reason]}</h1>
      <p>
        {loadoutName(setup.arts)} 对 {enemyName(setup.enemyId)}，共 {rounds.length} 轮；你剩 {state.player.hp} 气血、{state.player.qi} 内力，对手剩 {state.enemy.hp} 气血。
      </p>
      <div class="columns">
        <div>
          <h2>你的伤害来自</h2>
          <ul class="tally">{t.dealt.map(([k, v]) => <li key={k}>{artName(k === 'basic' ? null : k, names.arts)}：{v}</li>)}</ul>
        </div>
        <div>
          <h2>你受的伤来自</h2>
          {totalTaken === 0 ? <p class="small muted">一点伤都没受。</p> : <ul class="tally">{t.taken.map(([k, v]) => <li key={k}>{artName(k === 'basic' ? null : k, names.arts)}：{v}</li>)}</ul>}
        </div>
      </div>
      <div class="actions">
        <button type="button" class="primary" onClick={onRetry}>同一种子再打一次</button>
        <button type="button" class="ghost" onClick={onNewSeed}>换种子再打</button>
        <button type="button" class="ghost" onClick={onHome}>回到构筑</button>
      </div>
      <ComparePanel session={session} archive={archive} />
      <h2>逐轮记录</h2>
      <RoundLog rounds={rounds} names={names} />
    </section>
  );
}
