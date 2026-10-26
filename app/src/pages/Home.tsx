import { useState } from 'preact/hooks';
import { findArt } from '../../../src/content/catalog.ts';
import { describeArt } from '../../../src/narrate/narrate.ts';
import { BUILD_OPTIONS, capacityOf, ENEMY_OPTIONS, randomSeed, type Setup } from '../lab.ts';

export function Home({ setup, onStart }: { setup: Setup; onStart: (s: Setup) => void }) {
  const [s, set] = useState(setup);
  const build = BUILD_OPTIONS.find((b) => b.id === s.buildId)!;

  return (
    <section class="home">
      <h1>选一套武学，找一个对手</h1>
      <p class="lead">每轮先看对手要做什么，再选出招、架招或调息。你装备的武学会自己接招。输了就看看是哪一步出的问题。</p>

      <h2>构筑</h2>
      <div class="cards">
        {BUILD_OPTIONS.map((b) => (
          <button type="button" class={`card ${b.id === s.buildId ? 'selected' : ''}`} onClick={() => set({ ...s, buildId: b.id })} key={b.id} aria-pressed={b.id === s.buildId} aria-label={`构筑：${b.name}`}>
            <strong>{b.name}</strong>
            <span class="muted">容量 {capacityOf(b.arts)} / 12</span>
            <span class="small">{b.note}</span>
          </button>
        ))}
      </div>
      <ul class="arts">
        {build.arts.map((id) => {
          const art = findArt(id)!;
          return (
            <li key={id}>
              <strong>{art.name}</strong>
              <span class="muted"> · {art.cost} 内力 · 容量 {art.capacity}</span>
              <div class="small">{describeArt(art)}</div>
            </li>
          );
        })}
      </ul>

      <h2>对手</h2>
      <div class="cards">
        {ENEMY_OPTIONS.map((e) => (
          <button type="button" class={`card ${e.id === s.enemyId ? 'selected' : ''}`} onClick={() => set({ ...s, enemyId: e.id })} key={e.id} aria-pressed={e.id === s.enemyId} aria-label={`对手：${e.name}`}>
            <strong>{e.name}</strong>
            <span class="small">{e.note}</span>
          </button>
        ))}
      </div>

      <div class="seed">
        <label>
          种子
          <input
            type="number"
            min={0}
            value={s.seed}
            onInput={(ev) => {
              const v = Number((ev.target as HTMLInputElement).value);
              if (Number.isInteger(v) && v >= 0) set({ ...s, seed: v });
            }}
          />
        </label>
        <button type="button" class="ghost" onClick={() => set({ ...s, seed: randomSeed() })}>换一个</button>
        <span class="small muted">同一种子与同样的选择，结果完全相同；种子只决定对手的套路段落顺序。</span>
      </div>

      <button type="button" class="primary" onClick={() => onStart(s)}>开始对局</button>
    </section>
  );
}
