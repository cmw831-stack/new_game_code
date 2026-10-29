// A／B 对照面板：把本局构筑的一位换成另一门武学或另一版秘籍，用同一对手、种子、留力和本局的决策序列重新各打一遍。
// 依据：教学细则 V1.2 3.1 节、4.5 节。只并列事实，不替玩家下“哪版更强”的结论。

import { useState } from 'preact/hooks';
import type { LabArchive } from '../../../src/edit/manual.ts';
import { STANCE_NAME } from '../../../src/narrate/narrate.ts';
import { findAffix } from '../../../src/content/affixes.ts';
import { compareVersions, type Snapshot } from '../../../src/sim/compare.ts';
import { acquiredFor, artOf, checkArts, enemyName, startSession, usableVersions, type Session } from '../lab.ts';

const END: Record<string, string> = { victory: '获胜', defeat: '败退', safetyLimit: '中止', roundLimit: '中止', noDecision: '中止' };

type Cell = [label: string, pick: (s: Snapshot) => string];
const CELLS: Cell[] = [
  ['你', (s) => `${s.player.hp}／${s.player.qi}／${s.player.posture}`],
  ['对手', (s) => `${s.enemy.hp}／${s.enemy.posture}`],
  ['伤害', (s) => `${s.dealt} ↔ ${s.taken}`],
  ['耗气', (s) => `${s.qiSpent}`],
  ['发动', (s) => `${s.casts}`],
  ['反震', (s) => `${s.resonance}`],
  ['寒意', (s) => (s.enemy.frozen ? '冻结' : `${s.enemy.cold}`)],
];

export function ComparePanel({ session, archive }: { session: Session; archive: LabArchive }) {
  const { setup } = session;
  const [slot, setSlot] = useState(0);
  const candidates = [...acquiredFor(archive), ...usableVersions(archive).map((v) => v.spec.id)].filter((id) => !setup.arts.includes(id));
  const [pick, setPick] = useState(candidates[0] ?? '');
  const [shown, setShown] = useState(false);
  const name = (id: string) => artOf(id, archive)?.name ?? id;

  if (setup.arts.length === 0 || candidates.length === 0) return null;
  const bArts = setup.arts.map((id, i) => (i === slot ? pick : id));
  const bCheck = checkArts(bArts, archive);
  const decisions = session.rounds.map((r) => r.decision);
  const a0 = startSession(setup, archive).state;
  const result = shown && bCheck.ok ? compareVersions(a0, startSession({ ...setup, arts: bArts }, archive).state, decisions) : null;

  return (
    <div class="compare">
      <h2>A／B 对照</h2>
      <p class="small muted">
        把第
        <select value={slot} onChange={(e) => { setSlot(Number((e.target as HTMLSelectElement).value)); setShown(false); }} aria-label="替换哪一位">
          {setup.arts.map((id, i) => <option value={i} key={id}>{i + 1} 位（{name(id)}）</option>)}
        </select>
        换成
        <select value={pick} onChange={(e) => { setPick((e.target as HTMLSelectElement).value); setShown(false); }} aria-label="换成什么">
          {candidates.map((id) => <option value={id} key={id}>{name(id)}</option>)}
        </select>
        ，其余条件不变，按本局 {decisions.length} 轮的选择重新各打一遍。
      </p>
      <p class="small muted">
        条件：对手 {enemyName(setup.enemyId)}{setup.affixes.length ? `（${setup.affixes.map((id) => findAffix(id)?.name ?? id).join('、')}）` : ''} · 种子 {setup.seed} · {a0.player.weapon.name} · 开场 {a0.player.hp} 气血／{a0.player.qi} 内力／{a0.player.posture} 架势 · 留力 {setup.reserve} · 选择 {decisions.map((d) => STANCE_NAME[d.stance] + (d.change ? '＊' : '')).join(' ')}
      </p>
      {bCheck.problems.map((p) => <p class="warn small" key={p.message}>B 不合法：{p.message}</p>)}
      <button type="button" class="ghost" disabled={!bCheck.ok} onClick={() => setShown(true)}>对照</button>
      {result && (
        <>
          <p>
            A（{setup.arts.map(name).join('、')}）：{result.a.outcome ? END[result.a.outcome] : '未分胜负'}，{result.a.rounds} 轮；
            B（{bArts.map(name).join('、')}）：{result.b.outcome ? END[result.b.outcome] : '未分胜负'}，{result.b.rounds} 轮。
            {result.firstDivergence === null ? ' 两版每轮结果完全相同。' : ` 第 ${result.firstDivergence} 轮开始出现差别。`}
          </p>
          <div class="table-wrap">
            <table class="cmp">
              <thead>
                <tr><th>轮</th><th>选择</th><th></th>{CELLS.map(([l]) => <th key={l}>{l}</th>)}</tr>
              </thead>
              <tbody>
                {result.rows.flatMap((r) => (['a', 'b'] as const).map((side) => {
                  const s = r[side];
                  const other = r[side === 'a' ? 'b' : 'a'];
                  return (
                    <tr key={`${r.round}${side}`} class={side}>
                      {side === 'a' && <td rowSpan={2}>{r.round}</td>}
                      {side === 'a' && <td rowSpan={2}>{STANCE_NAME[r.decision.stance]}{r.decision.change ? '＊' : ''}</td>}
                      <td>{side.toUpperCase()}</td>
                      {CELLS.map(([l, f]) => {
                        const v = s ? f(s) : '—';
                        const diff = s && other && v !== f(other);
                        return <td key={l} class={diff ? 'diff' : ''}>{v}</td>;
                      })}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
          <p class="small muted">“你”是气血／内力／架势，“对手”是气血／架势，“伤害”是造成 ↔ 受到；＊表示这一轮用了变招。标色的格子两版不同。B 的选择照搬 A，并不是 B 自己的最佳打法。</p>
        </>
      )}
    </div>
  );
}
