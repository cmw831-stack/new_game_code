import { useState } from 'preact/hooks';
import { describeEvent, narrate, STANCE_NAME, type Names } from '../../../src/narrate/narrate.ts';
import type { RoundRecord } from '../lab.ts';

function RoundBlock({ r, names, open }: { r: RoundRecord; names: Names; open: boolean }) {
  const [detail, setDetail] = useState(false);
  const lines = narrate(r.events, names);
  return (
    <details class="round" open={open}>
      <summary>第 {r.round} 轮 · 你{STANCE_NAME[r.decision.stance]}{r.decision.change ? " · 变招" : ""}</summary>
      <ol class="lines">
        {lines.map((l) => <li class={`line ${l.tone}`} key={l.seq}>{l.text}</li>)}
      </ol>
      <button type="button" class="ghost small" onClick={() => setDetail(!detail)}>{detail ? '收起详细记录' : '展开详细记录'}</button>
      {detail && (
        <ol class="detail">
          {r.events.map((e) => <li key={e.seq}>{describeEvent(e, names)}</li>)}
        </ol>
      )}
    </details>
  );
}

export function RoundLog({ rounds, names }: { rounds: RoundRecord[]; names: Names }) {
  if (rounds.length === 0) return <p class="small muted">还没有结算任何一轮。</p>;
  return (
    <div class="log">
      {[...rounds].reverse().map((r, i) => <RoundBlock r={r} names={names} open={i === 0} key={r.round} />)}
    </div>
  );
}
