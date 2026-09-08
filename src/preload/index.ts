import { contextBridge, ipcRenderer } from 'electron';
import type { ReviewerAPI } from '../shared/contracts';
const invoke = (name: string, ...args: unknown[]) =>
  ipcRenderer.invoke(`reviewer:${name}`, ...args);
const listen = (name: string, callback: (...args: any[]) => void) => {
  const listener = (_event: unknown, ...args: any[]) => callback(...args);
  ipcRenderer.on(name, listener);
  return () => ipcRenderer.removeListener(name, listener);
};
if (location.pathname.endsWith('/thumbnail.html')) {
  contextBridge.exposeInMainWorld('thumbnails', {
    onJob: (callback: (job: unknown) => void) => listen('thumbnail:job', callback),
    complete: (result: unknown) => ipcRenderer.send('thumbnail:complete', result),
    ready: () => ipcRenderer.send('thumbnail:ready'),
  });
} else {
  const api: ReviewerAPI = {
    openProject: (id) => invoke('open', id),
    recentProjects: () => invoke('recent'),
    queryAssets: (q) => invoke('query', q),
    summary: () => invoke('summary'),
    getAsset: (id) => invoke('get', id),
    getReview: (id) => invoke('review', id),
    saveReview: (input) => invoke('save', input),
    rescan: () => invoke('rescan'),
    cancelScan: () => invoke('cancel'),
    revealAsset: (id) => invoke('reveal', id),
    retryPreview: (id) => invoke('retry', id),
    prioritize: (ids) => invoke('prioritize', ids),
    clearCache: () => invoke('clearCache'),
    setExclusions: (x) => invoke('exclusions', x),
    grantResourceFolder: () => invoke('grantResourceFolder'),
    revokeResourceFolder: (index) => invoke('revokeResourceFolder', index),
    reattach: (orphan, id) => invoke('reattach', orphan, id),
    onChange: (callback) => listen('reviewer:change', callback),
    onError: (callback) => listen('reviewer:error', callback),
  };
  contextBridge.exposeInMainWorld('reviewer', api);
}
