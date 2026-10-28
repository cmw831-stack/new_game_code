// 变招：每战两次，在本轮确认前临时做一项调整（战斗细则 V1.2 4.4 节）。
// 本组件只编辑“待用的变招”；是否合法由引擎在预览与结算时检查。

import type { BattleState, Decision } from '../../../src/rules/types.ts';

export type Change = NonNullable<Decision['change']>;
type Kind = 'priority' | 'pause' | 'reserve';

const KIND_NAME: Record<Kind, string> = { priority: '调整本轮优先级', pause: '暂停一门武学', reserve: '调整本轮留力' };

function kindOf(c: Change | undefined): Kind | null {
  return !c ? null : c.priority ? 'priority' : c.pause ? 'pause' : 'reserve';
}

/** 与原编排相同的调整不算变招，避免白白用掉一次。 */
export function effectiveChange(state: BattleState, c: Change | undefined): Change | undefined {
  if (!c) return undefined;
  const order = state.player.arts.map((a) => a.art.id);
  if (c.priority && c.priority.every((id, i) => id === order[i])) return undefined;
  if (c.reserve !== undefined && c.reserve === state.player.reserve) return undefined;
  return c;
}

export function ChangePanel({ state, pending, onPending }: { state: BattleState; pending: Change | undefined; onPending: (c: Change | undefined) => void }) {
  const arts = state.player.arts.map((a) => a.art);
  const left = state.changesLeft;
  const kind = kindOf(pending);
  const start = (k: Kind) => {
    if (k === 'priority') onPending({ priority: arts.map((a) => a.id) });
    else if (k === 'pause') onPending({ pause: [arts[0]!.id] });
    else onPending({ reserve: state.player.reserve });
  };
  const move = (i: number, d: -1 | 1) => {
    const p = [...pending!.priority!];
    [p[i], p[i + d]] = [p[i + d]!, p[i]!];
    onPending({ priority: p });
  };
  const name = (id: string) => arts.find((a) => a.id === id)?.name ?? id;
  const noop = pending && !effectiveChange(state, pending);

  return (
    <div class="change">
      <div class="change-head">
        <strong>变招</strong>
        <span class="small muted">本场还剩 {left} 次 · 只影响本轮，不改秘籍与装备 · 当前留力 {state.player.reserve}</span>
      </div>
      {left === 0 ? (
        <p class="small muted">本场变招已经用完。</p>
      ) : (
        <>
          <div class="presets">
            {(Object.keys(KIND_NAME) as Kind[]).map((k) => (
              <button
                type="button"
                key={k}
                class={`ghost small ${kind === k ? 'on' : ''}`}
                aria-pressed={kind === k}
                disabled={arts.length === 0 && k !== 'reserve'}
                onClick={() => (kind === k ? onPending(undefined) : start(k))}
              >
                {KIND_NAME[k]}
              </button>
            ))}
            {pending && <button type="button" class="ghost small" onClick={() => onPending(undefined)}>不用变招</button>}
          </div>
          {pending?.priority && (
            <ol class="change-list">
              {pending.priority.map((id, i) => (
                <li key={id}>
                  <span>{i + 1}. {name(id)}</span>
                  <button type="button" class="ghost small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${name(id)}上移`}>↑</button>
                  <button type="button" class="ghost small" disabled={i === pending.priority!.length - 1} onClick={() => move(i, 1)} aria-label={`${name(id)}下移`}>↓</button>
                </li>
              ))}
            </ol>
          )}
          {pending?.pause && (
            <div class="change-list" role="radiogroup" aria-label="本轮暂停的武学">
              {arts.map((a) => (
                <label key={a.id}>
                  <input type="radio" name="pause" checked={pending.pause![0] === a.id} onChange={() => onPending({ pause: [a.id] })} /> {a.name}
                </label>
              ))}
            </div>
          )}
          {pending?.reserve !== undefined && (
            <label class="change-list">
              本轮留力
              <input
                type="number"
                min={0}
                max={state.player.qiMax}
                value={pending.reserve}
                onInput={(ev) => {
                  const v = Number((ev.target as HTMLInputElement).value);
                  if (Number.isInteger(v) && v >= 0 && v <= state.player.qiMax) onPending({ reserve: v });
                }}
              />
            </label>
          )}
          {pending && (
            <p class="small">{noop ? <span class="muted">与原编排相同，确认时不会用掉变招。</span> : <span class="good">预览已按这次变招计算；确认本轮时用掉一次。</span>}</p>
          )}
        </>
      )}
    </div>
  );
}
