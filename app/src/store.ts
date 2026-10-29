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

interface Downloads {
  save(req: { filename: string; data: string }): Promise<{ status: 'saved' | 'delivered' }>;
}
interface ClaudeHost {
  use(name: 'downloads'): Promise<Downloads | null>;
}

/**
 * 把一个文本文件交给浏览者保存，返回给界面显示的一句结果。
 * 在 claude.ai 的私有网页里，页面不能直接下载，要通过 downloads 能力请浏览者确认；
 * 在本机开发时没有这个宿主，就用普通的浏览器下载。
 */
export async function download(name: string, text: string): Promise<string> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host) {
    const downloads = await host.use('downloads');
    if (!downloads) return '这个页面现在不能保存文件。可以把页面在 claude.ai 里打开后再试。';
    try {
      await downloads.save({ filename: name, data: text });
      return `已交给浏览器保存：${name}`;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'declined') return '已取消保存。';
      if (code === 'rate_limited') return '已有一个保存确认还没处理，请稍后再试。';
      return '这个页面现在不能保存文件。';
    }
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return `已下载：${name}`;
}
