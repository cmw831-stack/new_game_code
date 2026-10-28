import { useState } from 'preact/hooks';
import { findArt } from '../../../src/content/catalog.ts';
import { describeArt } from '../../../src/narrate/narrate.ts';
import { ACQUIRED_ART_IDS, BUILD_OPTIONS, checkArts, ENEMY_OPTIONS, loadoutName, randomSeed, type Setup } from '../lab.ts';

export function Home({ setup, onStart }: { setup: Setup; onStart: (s: Setup) => void }) {
  const [s, set] = useState(setup);
  const check = checkArts(s.arts);
  const setArts = (arts: string[]) => set({ ...s, arts });
  const move = (i: number, d: -1 | 1) => {
    const arts = [...s.arts];
    [arts[i], arts[i + d]] = [arts[i + d]!, arts[i]!];
    setArts(arts);
  };
  const slotProblems = (i: number) => check.problems.filter((p) => p.slot === i);
  const unequipped = ACQUIRED_ART_IDS.filter((id) => !s.arts.includes(id));
  const slots = Array.from({ length: check.maxArts }, (_, i) => s.arts[i]);

  return (
    <section class="home">
      <h1>选一套武学，找一个对手</h1>
      <p class="lead">每轮先看对手要做什么，再选出招、架招或调息。你装备的武学会自己接招。输了就看看是哪一步出的问题。</p>

      <h2>构筑</h2>
      <p class="small muted">从预设开始，或者自己组合。武学按从上到下的顺序结算，排在前面的先接招。</p>
      <div class="presets">
        {BUILD_OPTIONS.map((b) => {
          const on = loadoutName(s.arts) === b.name;
          return (
            <button type="button" class={`ghost small ${on ? 'on' : ''}`} onClick={() => setArts([...b.arts])} key={b.id} aria-pressed={on} title={b.note}>
              {b.name}
            </button>
          );
        })}
        <button type="button" class="ghost small" onClick={() => setArts([])} disabled={s.arts.length === 0}>清空</button>
      </div>

      <div class="loadout">
        <div class="loadout-head">
          <strong>{loadoutName(s.arts)}</strong>
          <span>武学 {s.arts.length} / {check.maxArts}</span>
          <span class={check.capacity > check.maxCapacity ? 'warn' : ''}>容量 {check.capacity} / {check.maxCapacity}</span>
          <span class="muted">兵器：铁剑（容量 0）</span>
        </div>
        <div class="meter" role="meter" aria-label="容量" aria-valuemin={0} aria-valuemax={check.maxCapacity} aria-valuenow={check.capacity}>
          <span class={`meter-fill ${check.capacity > check.maxCapacity ? 'over' : ''}`} style={{ width: `${Math.min(100, (check.capacity / check.maxCapacity) * 100)}%` }} />
        </div>
        <ol class="slots">
          {slots.map((id, i) => {
            if (!id) return <li class="slot empty" key={`empty-${i}`}><span class="slot-no">{i + 1}</span><span class="muted">空位</span></li>;
            const art = findArt(id);
            const bad = slotProblems(i);
            return (
              <li class={`slot ${bad.length ? 'bad' : ''}`} key={id + i}>
                <span class="slot-no">{i + 1}</span>
                <div class="slot-body">
                  <strong>{art?.name ?? id}</strong>
                  {art && <span class="muted small"> · {art.cost} 内力 · 容量 {art.capacity}</span>}
                  {art && <div class="small">{describeArt(art)}</div>}
                  {bad.map((p) => <div class="small warn" key={p.kind}>{p.message}</div>)}
                </div>
                <div class="slot-tools">
                  <button type="button" class="ghost small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${art?.name ?? id}上移`}>↑</button>
                  <button type="button" class="ghost small" onClick={() => move(i, 1)} disabled={i === s.arts.length - 1} aria-label={`${art?.name ?? id}下移`}>↓</button>
                  <button type="button" class="ghost small" onClick={() => setArts(s.arts.filter((_, j) => j !== i))} aria-label={`卸下${art?.name ?? id}`}>卸下</button>
                </div>
              </li>
            );
          })}
        </ol>

        {unequipped.length > 0 && (
          <>
            <h3>已取得、未装备</h3>
            <ul class="arts">
              {unequipped.map((id) => {
                const art = findArt(id)!;
                const full = s.arts.length >= check.maxArts;
                const after = check.capacity + art.capacity;
                return (
                  <li key={id} class="pick">
                    <div>
                      <strong>{art.name}</strong>
                      <span class="muted small"> · {art.cost} 内力 · 容量 {art.capacity}</span>
                      {after > check.maxCapacity && <span class="warn small"> · 装上后容量 {after}，超出上限</span>}
                      <div class="small">{describeArt(art)}</div>
                    </div>
                    <button type="button" class="ghost small" onClick={() => setArts([...s.arts, id])} disabled={full} title={full ? '四个武学位已满，先卸下一门' : undefined} aria-label={`装上${art.name}`}>
                      装上
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {check.problems.filter((p) => p.slot === undefined).map((p) => (
          <p class="warn small" key={p.kind}>{p.message}</p>
        ))}
      </div>

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

      <div class="actions">
        <button type="button" class="primary" onClick={() => onStart(s)} disabled={!check.ok}>开始对局</button>
        {!check.ok && <span class="small warn">构筑不合法，按上面的提示修改后才能开打。</span>}
      </div>
    </section>
  );
}
