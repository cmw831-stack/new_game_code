// 浏览器本地存档。读写都可能失败（隐私模式、存储被禁用），失败时页面照常可用，并如实显示“未保存”。

import { emptyArchive, exportArchive, importArchive, type LabArchive } from '../../src/edit/manual.ts';
import { parsePlaylog, type PlayLog } from '../../src/sim/playlog.ts';

const KEY = 'wulin-lab-archive-v1';

export type SaveStatus = { ok: true; at: string } | { ok: false; reason: string } | null;

export function loadArchive(): { archive: LabArchive; problem: string | null } {
  let text: string | null = null;
  try {
    text = localStorage.getItem(KEY);
  } catch {
    return { archive: emptyArchive(), problem: '浏览器不允许读取本地存档；本次修改只保存在当前页面' };
  }
  if (!text) return { archive: emptyArchive(), problem: null };
  const r = importArchive(text);
  // 本地存档损坏时不覆盖它，留给玩家导出排查。
  return r.ok ? { archive: r.archive, problem: null } : { archive: emptyArchive(), problem: `本地存档无法读取（${r.reason}），已保留原数据，本次从空白开始` };
}

export function storeArchive(archive: LabArchive): SaveStatus {
  try {
    localStorage.setItem(KEY, exportArchive(archive));
    return { ok: true, at: new Date().toLocaleTimeString() };
  } catch {
    return { ok: false, reason: '浏览器不允许写入本地存档；请用“导出”保存一份文件' };
  }
}

const LOG_KEY = 'wulin-lab-playlog-v1';

export function loadPlaylog(): PlayLog {
  try {
    return parsePlaylog(localStorage.getItem(LOG_KEY));
  } catch {
    return parsePlaylog(null);
  }
}

/** 写入失败时不打断试玩；记录仍在当前页面，可以导出。 */
export function storePlaylog(log: PlayLog): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // 忽略：存储不可用时只保留在内存中。
  }
}

/** 让浏览器下载一个文本文件。 */
export function download(name: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
