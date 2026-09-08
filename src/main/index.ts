import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  shell,
  utilityProcess,
  session,
  powerMonitor,
} from 'electron';
import { realpath, stat, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorizePath } from '../catalog/paths';
import {
  assetUrl,
  querySchema,
  reviewExportSchema,
  saveSchema,
  type Asset,
  type Project,
  type ThumbnailJob,
} from '../shared/contracts';
protocol.registerSchemesAsPrivileged(
  ['reviewer', 'asset', 'thumbnail'].map((scheme) => ({
    scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  })),
);
// Keep the established storage location across the VORO display-name change.
// This preserves recent projects, drafts, catalog state, and preview cache.
app.setPath(
  'userData',
  process.env.ASSET_REVIEWER_DATA ||
    path.join(app.getPath('appData'), app.isPackaged ? 'Asset Reviewer' : 'asset-reviewer'),
);
app.setName('VORO');
let window: BrowserWindow | null = null,
  thumbWindow: BrowserWindow | null = null;
let worker: Electron.UtilityProcess;
let project: Project | null = null;
let quitting = false,
  thumbReady = false,
  pumping = false,
  generation = 0;
let active: { job: ThumbnailJob; timer: NodeJS.Timeout; generation: number } | null = null;
const pending = new Map<
  string,
  { resolve(value: any): void; reject(error: Error): void; timer: NodeJS.Timeout }
>();
const queue = new Map<string, Asset>();
const idSchema = z.string().regex(/^[a-f\d]{32,40}$/);
const dataDir = () => app.getPath('userData');
function broadcast() {
  if (window && !window.isDestroyed()) window.webContents.send('reviewer:change');
}
function report(error: unknown) {
  if (window && !window.isDestroyed()) window.webContents.send('reviewer:error', String(error));
}
function rpc<T = any>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Catalog operation timed out: ${method}`));
    }, 60000);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, method, args });
  });
}
async function startWorker() {
  worker = utilityProcess.fork(path.join(__dirname, '../catalog/worker.cjs'), [], {
    serviceName: 'Asset catalog',
  });
  worker.on('message', (message) => {
    if (message.event === 'change') {
      broadcast();
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error));
    else request.resolve(message.result);
  });
  worker.on('exit', () => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Catalog process exited. Recovering…'));
    }
    pending.clear();
    if (!quitting) {
      report('The catalog process restarted. Saved sidecars are safe.');
      setTimeout(
        () =>
          void startWorker()
            .then(async () => {
              if (project) project = await rpc('open', project.root);
              broadcast();
            })
            .catch(report),
        1000,
      );
    }
  });
  await rpc('init', dataDir());
}
function secureWindow(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
}
function createWindow() {
  window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1080,
    minHeight: 700,
    title: 'VORO',
    backgroundColor: '#f5f1ee',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  secureWindow(window);
  void window.loadURL('reviewer://app/index.html');
  window.on('closed', () => {
    window = null;
    if (process.platform !== 'darwin') app.quit();
  });
}
function createThumbnails() {
  thumbReady = false;
  thumbWindow = new BrowserWindow({
    width: 384,
    height: 384,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  secureWindow(thumbWindow);
  void thumbWindow.loadURL('reviewer://app/thumbnail.html');
  thumbWindow.webContents.on('render-process-gone', () => {
    void failActive('Thumbnail renderer stopped. Retry this preview.');
  });
  thumbWindow.on('closed', () => {
    thumbWindow = null;
    thumbReady = false;
  });
}
async function stopThumbnails() {
  generation++;
  queue.clear();
  const old = active;
  active = null;
  if (old) {
    clearTimeout(old.timer);
    await rpc('preview', old.job.asset.id, old.job.asset.fingerprint, 'queued', null, null).catch(
      () => {},
    );
  }
  thumbReady = false;
  thumbWindow?.destroy();
  thumbWindow = null;
}
async function failActive(error: string) {
  const old = active;
  active = null;
  if (old) {
    clearTimeout(old.timer);
    await rpc('preview', old.job.asset.id, old.job.asset.fingerprint, 'failed', null, error).catch(
      report,
    );
  }
  thumbReady = false;
  thumbWindow?.destroy();
  thumbWindow = null;
  if (!quitting) {
    createThumbnails();
  }
}
async function pump() {
  if (pumping || active || !thumbReady || !project || !queue.size) return;
  pumping = true;
  const gen = generation;
  try {
    const [id, candidate] = queue.entries().next().value!;
    queue.delete(id);
    const asset: Asset = await rpc('get', id);
    if (
      gen !== generation ||
      asset.projectId !== project?.id ||
      asset.fingerprint !== candidate.fingerprint ||
      asset.preview !== 'queued'
    )
      return;
    const cache = path.join(dataDir(), 'thumbnails', `${asset.fingerprint}.png`);
    if (await stat(cache).catch(() => null)) {
      await rpc(
        'preview',
        id,
        asset.fingerprint,
        'ready',
        `thumbnail://cache/${asset.fingerprint}.png`,
        null,
      );
      return;
    }
    if (asset.size > 256 * 1024 * 1024) {
      await rpc(
        'preview',
        id,
        asset.fingerprint,
        'failed',
        null,
        'Asset exceeds the 256 MB automatic preview limit.',
      );
      return;
    }
    await rpc('preview', id, asset.fingerprint, 'generating', null, null);
    if (gen !== generation) return;
    const job: ThumbnailJob = { asset, token: randomUUID(), url: assetUrl(asset) };
    active = {
      job,
      generation: gen,
      timer: setTimeout(
        () => void failActive('Preview timed out after 30 seconds. Retry to try again.'),
        30000,
      ),
    };
    thumbWindow!.webContents.send('thumbnail:job', job);
  } catch (error) {
    report(error);
  } finally {
    pumping = false;
    if (!active && queue.size && thumbReady) setImmediate(() => void pump());
  }
}
const csp =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: thumbnail: data: blob:; connect-src 'self' asset: data: blob:; worker-src 'self' blob:; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'";
async function serveFile(file: string) {
  const info = await stat(file);
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.gltf': 'model/gltf+json',
    '.glb': 'model/gltf-binary',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ktx2': 'image/ktx2',
  };
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>, {
    headers: {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': String(info.size),
    },
  });
}
async function protocols() {
  protocol.handle('reviewer', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'app') throw new Error('Invalid host');
      const file = await authorizePath(
        path.join(__dirname, '../renderer'),
        decodeURIComponent(url.pathname.slice(1)),
      );
      const response = await serveFile(file);
      response.headers.set(
        'Content-Security-Policy',
        url.pathname === '/ktx2-worker.js'
          ? "default-src 'none'; script-src 'unsafe-eval'; connect-src 'none'"
          : csp,
      );
      return response;
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  protocol.handle('asset', async (request) => {
    try {
      const url = new URL(request.url);
      const current = project;
      if (!current || url.host !== current.id || request.method !== 'GET')
        throw new Error('Unauthorized');
      const relative =
        url.pathname === '/resource'
          ? url.searchParams.get('path') || ''
          : decodeURIComponent(url.pathname.slice(1));
      if (!/\.(glb|gltf|bin|png|jpe?g|webp|avif|ktx2|basis|dds)$/i.test(relative))
        throw new Error('Unsupported resource type');
      const file = await authorizePath(current.root, relative, current.externalRoots);
      if (current !== project) throw new Error('Project changed');
      const response = await serveFile(file);
      response.headers.set('Access-Control-Allow-Origin', 'reviewer://app');
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return response;
    } catch (error) {
      return new Response((error as Error).message, { status: 403 });
    }
  });
  protocol.handle('thumbnail', async (request) => {
    const url = new URL(request.url);
    if (url.host !== 'cache' || !/^\/[a-f\d]{64}\.png$/.test(url.pathname))
      return new Response('Denied', { status: 403 });
    try {
      return await serveFile(path.join(dataDir(), 'thumbnails', url.pathname.slice(1)));
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
    callback({ cancel: !/^(reviewer|asset|thumbnail|data|blob):/.test(details.url) }),
  );
}
function installIPC() {
  const handle = (name: string, fn: (...args: any[]) => any) =>
    ipcMain.handle(`reviewer:${name}`, (event, ...args) => {
      if (
        !window ||
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        !event.senderFrame.url.startsWith('reviewer://app/')
      )
        throw new Error('Unauthorized IPC sender');
      return fn(...args);
    });
  handle('recent', () => rpc('recent'));
  handle('open', async (recentId: unknown) => {
    let root: string | undefined;
    if (recentId !== undefined) {
      const id = idSchema.parse(recentId);
      root = (await rpc<Project[]>('recent')).find((p) => p.id === id)?.root;
      if (!root) throw new Error('Unknown recent project');
    } else {
      const result = await dialog.showOpenDialog(window!, {
        title: 'Open asset folder',
        properties: ['openDirectory'],
      });
      if (result.canceled) return null;
      root = result.filePaths[0];
    }
    root = await realpath(root!);
    await stopThumbnails();
    project = null;
    project = await rpc<Project>('open', root);
    createThumbnails();
    return project;
  });
  handle('query', (q) => rpc('query', querySchema.parse(q)));
  handle('summary', () => rpc('summary'));
  handle('get', (id) => rpc('get', idSchema.parse(id)));
  handle('review', (id) => rpc('review', idSchema.parse(id)));
  handle('exportReviews', async () => {
    const output = reviewExportSchema.parse(await rpc('exportReviews'));
    const result = await dialog.showSaveDialog(window!, {
      title: 'Export saved reviews',
      defaultPath: `${output.project.name}-reviews.json`,
      filters: [{ name: 'JSON review export', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return null;
    const target = result.filePath;
    if (
      path.extname(target).toLowerCase() !== '.json' ||
      target.toLowerCase().endsWith('.notes.json')
    )
      throw new Error('Choose a .json export filename that is not an asset review sidecar.');
    const temporary = path.join(path.dirname(target), `.voro-export-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(output, null, 2) + '\n', {
        flag: 'wx',
        mode: 0o600,
      });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
    return { path: target, reviews: output.reviews.length, warnings: output.warnings.length };
  });
  handle('save', (value) => rpc('save', saveSchema.parse(value)));
  handle('rescan', () => rpc('rescan'));
  handle('cancel', () => rpc('cancel'));
  handle('reveal', async (id) => shell.showItemInFolder(await rpc('source', idSchema.parse(id))));
  handle('retry', async (id) => {
    const asset: Asset = await rpc('get', idSchema.parse(id));
    if (asset.preview === 'unsupported') return;
    await rpc('preview', asset.id, asset.fingerprint, 'queued', null, null);
    queue.set(asset.id, { ...asset, preview: 'queued' });
    void pump();
  });
  handle('prioritize', async (ids) => {
    const parsed = z.array(idSchema).max(200).parse(ids);
    const gen = generation;
    const assets: Asset[] = await Promise.all(parsed.map((id) => rpc('get', id).catch(() => null)));
    if (gen !== generation) return;
    const next = new Map<string, Asset>();
    for (const a of assets) if (a?.preview === 'queued') next.set(a.id, a);
    for (const [id, asset] of queue) if (next.size < 200) next.set(id, asset);
    queue.clear();
    for (const [id, asset] of next) queue.set(id, asset);
    void pump();
  });
  handle('clearCache', async () => {
    await stopThumbnails();
    await rpc('clearCache');
    createThumbnails();
  });
  handle('exclusions', async (values) => {
    const exclusions = z
      .array(
        z
          .string()
          .min(1)
          .max(100)
          .regex(/^[^/\\]+$/),
      )
      .max(100)
      .parse(values);
    await stopThumbnails();
    project = await rpc('exclusions', exclusions);
    createThumbnails();
    return project;
  });
  handle('grantResourceFolder', async () => {
    if (!project) throw new Error('Open a project first');
    const result = await dialog.showOpenDialog(window!, {
      title: 'Allow this project to load model dependencies from another folder',
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    const root = await realpath(result.filePaths[0]);
    const roots = [...new Set([...project.externalRoots, root])];
    await stopThumbnails();
    project = await rpc('externalRoots', roots);
    createThumbnails();
    return project;
  });
  handle('revokeResourceFolder', async (index) => {
    const value = z.number().int().min(0).parse(index);
    if (!project || value >= project.externalRoots.length)
      throw new Error('Unknown resource folder');
    const roots = project.externalRoots.filter((_, i) => i !== value);
    await stopThumbnails();
    project = await rpc('externalRoots', roots);
    createThumbnails();
    return project;
  });
  handle('reattach', (orphan, assetId) =>
    rpc('reattach', z.string().max(4096).parse(orphan), idSchema.parse(assetId)),
  );
  ipcMain.on('thumbnail:ready', (event) => {
    if (event.sender !== thumbWindow?.webContents) return;
    thumbReady = true;
    void pump();
  });
  ipcMain.on('thumbnail:complete', async (event, input) => {
    if (event.sender !== thumbWindow?.webContents) return;
    const parsed = z
      .object({
        token: z.uuid(),
        data: z
          .string()
          .max(4 * 1024 * 1024)
          .regex(/^data:image\/png;base64,[A-Za-z\d+/=]+$/)
          .optional(),
        error: z.string().max(2000).optional(),
      })
      .safeParse(input);
    if (!parsed.success || !active || parsed.data.token !== active.job.token) return;
    const job = active;
    active = null;
    clearTimeout(job.timer);
    try {
      if (job.generation !== generation) return;
      if (parsed.data.data) {
        await rpc('cacheThumbnail', job.job.asset.fingerprint, parsed.data.data);
        await rpc(
          'preview',
          job.job.asset.id,
          job.job.asset.fingerprint,
          'ready',
          `thumbnail://cache/${job.job.asset.fingerprint}.png`,
          null,
        );
      } else
        await rpc(
          'preview',
          job.job.asset.id,
          job.job.asset.fingerprint,
          'failed',
          null,
          parsed.data.error || 'Preview failed',
        );
    } catch (error) {
      report(error);
    } finally {
      void pump();
    }
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      await protocols();
      await startWorker();
      installIPC();
      createWindow();
      powerMonitor.on('resume', () => {
        if (project) void rpc('rescan').catch(report);
      });
      app.on('activate', () => {
        if (!window) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox('VORO could not start', String(error));
      app.quit();
    });
  app.on('before-quit', () => {
    quitting = true;
    if (active) clearTimeout(active.timer);
    thumbWindow?.destroy();
    worker?.kill();
  });
}
