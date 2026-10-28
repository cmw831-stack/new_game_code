// 浏览器本地存档。读写都可能失败（隐私模式、存储被禁用），失败时页面照常可用，并如实显示“未保存”。

import { emptyArchive, exportArchive, importArchive, type LabArchive } from '../../src/edit/manual.ts';

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
