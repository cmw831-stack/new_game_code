// 武学工坊：精通单槽替换、补全卷首残页、命名保存为不可变版本、管理已存秘籍。
// 界面依据教学细则 V1.2 第 4.2 节线框：改良显示一槽替换与费用／容量加总，残页在候选旁直接显示演算差异。

import { useState } from 'preact/hooks';
import { compileArt, type ArtSpec } from '../../../src/content/components.ts';
import { findArt } from '../../../src/content/catalog.ts';
import { exportArchive, importArchive, saveVersion, sourceName, versionProblems, defaultName, type LabArchive, type ManualSource } from '../../../src/edit/manual.ts';
import { fillPage, PAGE_PREFACE } from '../../../src/edit/page.ts';
import { checkVariant, componentKey, findTemplate, replaceSlot, SLOT_LABEL, SLOT_NAMES, slotValue, type SlotName, type SlotValue } from '../../../src/edit/variant.ts';
import { componentLabel, describeArt } from '../../../src/narrate/narrate.ts';
import { researchFor } from '../lab.ts';
import { pageOpen } from '../../../src/teach/progress.ts';
import type { EditResearch } from '../../../src/edit/variant.ts';
import type { SaveStatus } from '../store.ts';

const PREFIX: Record<SlotName, string> = { trigger: 'T_', action: 'A_', modifier: 'M_', followup: 'F_', recovery: 'R_' };
const OPTIONAL: SlotName[] = ['modifier', 'followup', 'recovery'];

function parseKey(key: string | null): SlotValue {
  if (key === null) return { id: null };
  const [id, param] = key.split(':');
  if (param === '甲' || param === '乙') return { id: id!, tier: param };
  if (param === undefined) return { id: id! };
  return { id: id!, param: /^\d+$/.test(param) ? Number(param) : (param as 'cold2' | 'freeze') };
}

/** 某槽可换成的组件：全局组件库中该槽类型的条目，可选槽另有“无”；不含当前值。 */
function optionsFor(research: EditResearch, source: ArtSpec, slot: SlotName): (string | null)[] {
  const current = componentKey(slot, slotValue(source, slot));
  const keys: (string | null)[] = research.library.filter((k) => k.startsWith(PREFIX[slot]));
  if (OPTIONAL.includes(slot)) keys.unshift(null);
  return keys.filter((k) => k !== current);
}

function SaveBox({ archive, source, onSave }: { archive: LabArchive; source: ManualSource; onSave: (name: string, note: string, manualId: string | undefined) => string[] }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [target, setTarget] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const families = [...new Map(archive.versions.filter((v) => JSON.stringify(v.source) === JSON.stringify(source)).map((v) => [v.manualId, v])).values()];
  return (
    <div class="savebox">
      <label>
        名字
        <input type="text" value={name} placeholder={defaultName(source)} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>
      <label>
        备注
        <input type="text" value={note} placeholder="这一版想验证什么" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
      </label>
      <label>
        保存为
        <select value={target} onChange={(e) => setTarget((e.target as HTMLSelectElement).value)}>
          <option value="">一门新秘籍</option>
          {families.map((v) => <option value={v.manualId} key={v.manualId}>{v.name} 的新版本</option>)}
        </select>
      </label>
      <button
        type="button"
        class="primary"
        onClick={() => {
          const ps = onSave(name, note, target || undefined);
          setProblems(ps);
          if (ps.length === 0) { setName(''); setNote(''); }
        }}
      >
        保存版本
      </button>
      {problems.map((p) => <p class="warn small" key={p}>{p}</p>)}
    </div>
  );
}

function Delta({ before, after }: { before: { cost: number; capacity: number }; after: { cost: number; capacity: number } | null }) {
  if (!after) return null;
  return <span>费用 {before.cost} → {after.cost}，容量 {before.capacity} → {after.capacity}</span>;
}

export function Workshop({ archive, onArchive, onEquip, onBack, saveStatus, loadProblem }: {
  archive: LabArchive;
  onArchive: (a: LabArchive) => void;
  onEquip: (versionId: string) => void;
  onBack: () => void;
  saveStatus: SaveStatus;
  loadProblem: string | null;
}) {
  const research = researchFor(archive);
  const [sourceId, setSourceId] = useState(research.mastered[1] ?? 'cold_sword');
  const [slot, setSlot] = useState<SlotName>('action');
  const source = findTemplate(sourceId)!;
  const options = optionsFor(research, source, slot);
  const [pick, setPick] = useState<string | null | undefined>(undefined);
  const chosen = pick !== undefined && options.includes(pick) ? pick : options[0];
  const draft = chosen === undefined ? null : replaceSlot(source, slot, parseKey(chosen));
  const check = draft ? checkVariant(sourceId, draft, research) : null;
  const [pageMod, setPageMod] = useState<string>('M_gang');
  const pageFill = fillPage(PAGE_PREFACE, { modifier: { id: pageMod } }, 'page-draft', '折锋');
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const save = (src: ManualSource, spec: ArtSpec | null) => (name: string, note: string, manualId: string | undefined): string[] => {
    if (!spec) return ['草稿还不完整'];
    const r = saveVersion(archive, { manualId, name, note, source: src, spec, savedAt: new Date().toISOString() }, research);
    if (!r.ok) return r.problems;
    onArchive(r.archive);
    return [];
  };

  const download = () => {
    const blob = new Blob([exportArchive(archive)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wulin-lab-archive.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const r = importArchive(await file.text());
    if (!r.ok) return setImportMsg(`没有导入：${r.reason}。现有存档未改变。`);
    if (!window.confirm(`导入会用文件中的 ${r.archive.versions.length} 个版本替换当前的 ${archive.versions.length} 个版本。建议先导出备份。继续吗？`)) return setImportMsg('已取消导入，现有存档未改变。');
    onArchive(r.archive);
    setImportMsg(`已导入 ${r.archive.versions.length} 个版本。`);
  };

  return (
    <section class="workshop">
      <div class="battle-bar">
        <span>武学工坊</span>
        <span class="muted small">实验版本 · 只存在本浏览器，可导出</span>
        <button type="button" class="ghost small" onClick={onBack}>回到构筑</button>
      </div>
      {loadProblem && <p class="warn small">{loadProblem}</p>}

      <h2>改良：替换一个槽</h2>
      {research.mastered.length === 0 ? (
        <p class="small muted">还没有精通的武学。完成课程“首份改良：替换一个槽”后，断势击与叠寒剑精通，这里开放单槽改良。</p>
      ) : (<>
      <p class="small muted">精通的武学可以替换一个槽，原书不变。现在已精通：{research.mastered.map((id) => findArt(id)!.name).join('、')}；组件库：{research.library.map(componentLabel).join('、')}。</p>
      <div class="presets">
        {research.mastered.map((id) => (
          <button type="button" key={id} class={`ghost small ${id === sourceId ? 'on' : ''}`} aria-pressed={id === sourceId} onClick={() => { setSourceId(id); setPick(undefined); }}>
            {findArt(id)!.name}
          </button>
        ))}
      </div>
      <div class="loadout">
        <ol class="five">
          {SLOT_NAMES.map((s) => {
            const cur = componentLabel(componentKey(s, slotValue(source, s)));
            const n = optionsFor(research, source, s).length;
            return (
              <li key={s} class={s === slot ? 'on' : ''}>
                <button type="button" class="ghost small" disabled={n === 0} aria-pressed={s === slot} onClick={() => { setSlot(s); setPick(undefined); }}>
                  {SLOT_LABEL[s]}
                </button>
                <span>{s === slot && chosen !== undefined ? <>{cur} → <strong>{componentLabel(chosen)}</strong></> : cur}</span>
              </li>
            );
          })}
        </ol>
        {options.length > 0 && (
          <div class="presets" role="radiogroup" aria-label={`${SLOT_LABEL[slot]}换成`}>
            {options.map((k) => (
              <button type="button" key={String(k)} role="radio" aria-checked={k === chosen} class={`ghost small ${k === chosen ? 'on' : ''}`} onClick={() => setPick(k)}>
                {componentLabel(k)}
              </button>
            ))}
          </div>
        )}
        {check && draft && (
          <>
            <p><Delta before={check.before} after={check.after} /></p>
            <div class="small">原版：{describeArt(compileArt(source))}</div>
            {check.after && <div class="small">改良：{describeArt(compileArt(draft))}{draft.swordOnly ? '；仍要求用剑' : ''}</div>}
            {check.problems.map((p) => <p class="warn small" key={p.message}>{p.message}</p>)}
            {check.ok && <SaveBox archive={archive} source={{ kind: 'template', templateId: sourceId }} onSave={save({ kind: 'template', templateId: sourceId }, draft)} />}
          </>
        )}
      </div>
      </>)}

      <h2>手稿残页：{PAGE_PREFACE.name}</h2>
      {!pageOpen(archive.teaching) ? (
        <p class="small muted">完成课程“版本对照”后开放卷首残页。</p>
      ) : (<>
      <p class="small muted">起势：基础出招接触（固定）；主招：单击乙 3／2（固定）；劲力从下面三个中选一个。变化、收势：无。</p>
      <div class="cards">
        {(PAGE_PREFACE.blanks.modifier ?? []).map((c) => {
          const f = fillPage(PAGE_PREFACE, { modifier: c }, 'x', 'x');
          return (
            <button type="button" key={String(c.id)} class={`card ${c.id === pageMod ? 'selected' : ''}`} aria-pressed={c.id === pageMod} onClick={() => setPageMod(c.id!)}>
              <strong>{componentLabel(c.id)}</strong>
              <span class="muted small">费用 2 → {f.cost}，容量 2 → {f.capacity}</span>
              {f.spec && <span class="small">{describeArt(compileArt(f.spec))}</span>}
            </button>
          );
        })}
      </div>
      {pageFill.ok && <SaveBox archive={archive} source={{ kind: 'page', pageId: PAGE_PREFACE.id }} onSave={save({ kind: 'page', pageId: PAGE_PREFACE.id }, pageFill.spec)} />}
      </>)}

      <h2>我的秘籍</h2>
      {archive.versions.length === 0 && <p class="small muted">还没有保存任何版本。</p>}
      <ul class="arts">
        {archive.versions.map((v) => {
          const problems = versionProblems(v);
          const art = problems.length === 0 ? compileArt(v.spec) : null;
          return (
            <li key={v.spec.id} class="pick">
              <div>
                <strong>{v.name}</strong>
                <span class="muted small"> · 第 {v.version} 版 · {v.spec.id} · 来源：{sourceName(v.source)}{art ? ` · ${art.cost} 内力 · 容量 ${art.capacity}` : ''}</span>
                {art && <div class="small">{describeArt(art)}</div>}
                {v.note && <div class="small muted">备注：{v.note}</div>}
                {problems.map((p) => <div class="small warn" key={p}>{p}</div>)}
              </div>
              <button type="button" class="ghost small" disabled={problems.length > 0} onClick={() => onEquip(v.spec.id)} aria-label={`装备${v.name}第 ${v.version} 版`}>装备</button>
            </li>
          );
        })}
      </ul>

      <div class="actions">
        <button type="button" class="ghost" onClick={download}>导出存档</button>
        <label class="ghost filepick">
          导入存档
          <input type="file" accept="application/json,.json" onChange={(e) => upload((e.target as HTMLInputElement).files?.[0])} />
        </label>
        <span class="small muted">
          {saveStatus === null ? '' : saveStatus.ok ? `已保存到本浏览器（${saveStatus.at}）` : <span class="warn">{saveStatus.reason}</span>}
        </span>
      </div>
      {importMsg && <p class="small">{importMsg}</p>}
    </section>
  );
}
