import { useEffect, useMemo, useState } from 'preact/hooks';
import { peekIntent } from '../../../src/engine/round.ts';
import { describeArt, STANCE_NAME } from '../../../src/narrate/narrate.ts';
import { STRATEGIES } from '../../../src/sim/strategies.ts';
import type { Stance } from '../../../src/rules/types.ts';
import { FighterCard } from '../components/FighterCard.tsx';
import { IntentPanel } from '../components/IntentPanel.tsx';
import { RoundLog } from '../components/RoundLog.tsx';
import { playRound, preview, type Session } from '../lab.ts';

const STANCES: Stance[] = ['attack', 'guard', 'breathe'];

function delta(from: number, to: number): string {
  return from === to ? `${to}` : `${from}→${to}`;
}

export function Battle({ session, onChange, onQuit }: { session: Session; onChange: (s: Session) => void; onQuit: () => void }) {
  const { state } = session;
  const [chosen, setChosen] = useState<Stance | null>(null);
  const [strategy, setStrategy] = useState(STRATEGIES[1]!.id);
  const intent = useMemo(() => peekIntent(state), [state]);
  const previews = useMemo(() => STANCES.map((s) => preview(state, s)), [state]);
  const names = { player: '你', enemy: state.enemy.name };

  const commit = (stance: Stance) => {
    setChosen(null);
    onChange(playRound(session, stance));
  };
  const auto = (all: boolean) => {
    const strat = STRATEGIES.find((s) => s.id === strategy)!;
    let s = session;
    do {
      s = playRound(s, strat.decide(s.state).stance);
    } while (all && !s.state.over);
    setChosen(null);
    onChange(s);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (ev.key === '1' || ev.key === '2' || ev.key === '3') setChosen(STANCES[Number(ev.key) - 1]!);
      else if (ev.key === 'Enter' && chosen) commit(chosen);
      else if (ev.key === 'Escape') setChosen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <section class="battle">
      <div class="battle-bar">
        <span>第 {state.round} 轮</span>
        <span class="muted small">种子 {session.setup.seed}</span>
        <button type="button" class="ghost small" onClick={onQuit}>放弃并返回</button>
      </div>

      <div class="field">
        <FighterCard f={state.player} title="你" />
        <FighterCard f={state.enemy} title="对手" />
      </div>

      <IntentPanel state={state} intent={intent} />

      <div class="choose">
        <h2>你这一轮</h2>
        <div class="stances">
          {previews.map((p, i) => (
            <button
              type="button"
              key={p.stance}
              class={`stance ${chosen === p.stance ? 'selected' : ''}`}
              onClick={() => setChosen(p.stance)}
              aria-pressed={chosen === p.stance}
            >
              <span class="stance-name"><kbd>{i + 1}</kbd> {STANCE_NAME[p.stance]}</span>
              <span class="small">你：气血 {delta(state.player.hp, p.player.hp)}，内力 {delta(state.player.qi, p.player.qi)}，架势 {delta(state.player.posture, p.player.posture)}</span>
              <span class="small">对手：气血 {delta(state.enemy.hp, p.enemy.hp)}，架势 {delta(state.enemy.posture, p.enemy.posture)}</span>
              {p.outcome && <span class={`chip ${p.outcome === 'victory' ? 'good' : 'warn'}`}>{p.outcome === 'victory' ? '本轮获胜' : '本轮败退'}</span>}
            </button>
          ))}
        </div>
        <div class="actions">
          <button type="button" class="primary" disabled={!chosen} onClick={() => chosen && commit(chosen)}>
            {chosen ? `确认：${STANCE_NAME[chosen]}（Enter）` : '先选一种姿态（1／2／3）'}
          </button>
          <span class="auto">
            <select value={strategy} onChange={(e) => setStrategy((e.target as HTMLSelectElement).value)} aria-label="自动策略">
              {STRATEGIES.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}
            </select>
            <button type="button" class="ghost" onClick={() => auto(false)}>按策略走一轮</button>
            <button type="button" class="ghost" onClick={() => auto(true)}>自动打完</button>
          </span>
        </div>
        <p class="small muted">预览在状态副本上结算，与实际结果一致；它不会推进对局。</p>
      </div>

      <div class="columns">
        <div>
          <h2>你的武学</h2>
          <ul class="arts">
            {state.player.arts.map((a, i) => (
              <li key={a.instanceId}>
                <strong>{i + 1}. {a.art.name}</strong>
                <span class="muted"> · {a.art.cost} 内力</span>
                <div class="small">{describeArt(a.art)}</div>
              </li>
            ))}
            <li class="small muted">基础出招：{state.player.weapon.base.hp} 气血／{state.player.weapon.base.posture} 架势；破绽在手时气血 +2</li>
          </ul>
        </div>
        <div>
          <h2>发生了什么</h2>
          <RoundLog rounds={session.rounds} names={names} />
        </div>
      </div>
    </section>
  );
}
