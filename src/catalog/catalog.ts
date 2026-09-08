import { DatabaseSync } from 'node:sqlite';
import { readdir, stat, mkdir, readFile, writeFile, unlink, lstat } from 'node:fs/promises';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { digest, readReview, saveReview, sidecarPath } from './notes';
import { authorizePath, DEFAULT_EXCLUSIONS, excluded, posixPath } from './paths';
import { dependencies } from './dependencies';
import {
  querySchema,
  reviewSchema,
  saveSchema,
  type Asset,
  type AssetQuery,
  type ReviewExport,
  type Project,
  type ScanState,
  type Summary,
} from '../shared/contracts';
const supported = new Set(['glb', 'gltf']);
const recognized = new Set(['glb', 'gltf', 'fbx', 'obj', 'usd', 'usdz', 'usda', 'usdc', 'blend']);
const emptyScan = (): ScanState => ({
  running: false,
  canceled: false,
  discovered: 0,
  visited: 0,
  skipped: 0,
  errors: [],
});
export class Catalog {
  db: DatabaseSync;
  project: Project | null = null;
  scan = emptyScan();
  watcher?: FSWatcher;
  generation = 0;
  scanPromise: Promise<void> = Promise.resolve();
  orphans: string[] = [];
  private timer?: NodeJS.Timeout;
  private changed = new Set<string>();
  private identityPaths = new Map<string, string>();
  constructor(
    public dataDir: string,
    private notify: () => void,
  ) {
    this.db = new DatabaseSync(path.join(dataDir, 'catalog.sqlite'));
    this.db
      .exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, root TEXT UNIQUE, name TEXT, exclusions TEXT, opened INTEGER);
      CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, projectId TEXT, relativePath TEXT, name TEXT, folder TEXT, format TEXT, mtime REAL, status TEXT, commentCount INTEGER, fingerprint TEXT, data TEXT);
      CREATE INDEX IF NOT EXISTS assets_project ON assets(projectId); CREATE INDEX IF NOT EXISTS assets_status ON assets(projectId, status);
      CREATE TABLE IF NOT EXISTS dependencies (assetId TEXT, relativePath TEXT, projectId TEXT); CREATE INDEX IF NOT EXISTS dependency_path ON dependencies(projectId, relativePath);`);
    if (
      !(this.db.prepare('PRAGMA table_info(projects)').all() as any[]).some(
        (column) => column.name === 'externalRoots',
      )
    )
      this.db.exec("ALTER TABLE projects ADD COLUMN externalRoots TEXT NOT NULL DEFAULT '[]'");
  }
  recent(): Project[] {
    return (
      this.db.prepare('SELECT * FROM projects ORDER BY opened DESC LIMIT 12').all() as any[]
    ).map((p) => ({
      id: p.id,
      root: p.root,
      name: p.name,
      exclusions: JSON.parse(p.exclusions),
      externalRoots: JSON.parse(p.externalRoots),
    }));
  }
  async open(root: string) {
    this.generation++;
    clearTimeout(this.timer);
    this.changed.clear();
    await this.watcher?.close();
    await this.scanPromise;
    const id = digest(root).slice(0, 32);
    const prior = this.db
      .prepare('SELECT exclusions, externalRoots FROM projects WHERE id=?')
      .get(id) as any;
    this.project = {
      id,
      root,
      name: path.basename(root),
      exclusions: prior ? JSON.parse(prior.exclusions) : DEFAULT_EXCLUSIONS,
      externalRoots: prior ? JSON.parse(prior.externalRoots) : [],
    };
    this.orphans = [];
    this.db
      .prepare('INSERT OR REPLACE INTO projects VALUES(?,?,?,?,?,?)')
      .run(
        id,
        root,
        this.project.name,
        JSON.stringify(this.project.exclusions),
        Date.now(),
        JSON.stringify(this.project.externalRoots),
      );
    // Recover jobs interrupted by an app exit.
    for (const row of this.db
      .prepare('SELECT data FROM assets WHERE projectId=?')
      .all(id) as any[]) {
      const asset: Asset = JSON.parse(row.data);
      if (asset.preview === 'generating') {
        asset.preview = 'queued';
        this.put(asset);
      }
    }
    this.startScan();
    this.watcher = chokidar.watch([root, ...this.project.externalRoots], {
      ignoreInitial: true,
      followSymlinks: false,
      ignored: (file) => excluded(posixPath(path.relative(root, file)), this.project!.exclusions),
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });
    this.watcher.on('all', (event, file) => {
      if (file.endsWith('.tmp')) return;
      this.changed.add(posixPath(path.relative(root, file)));
      if (event === 'addDir' || event === 'unlinkDir') this.changed.add('*');
      clearTimeout(this.timer);
      this.timer = setTimeout(
        () =>
          void this.reconcileChanges().catch((e) => {
            this.scan.errors.push(String(e));
            this.notify();
          }),
        350,
      );
    });
    this.watcher.on('error', (error) => {
      this.scan.errors.push(`Watcher: ${String(error)}. Running reconciliation.`);
      this.startScan();
    });
    return this.project;
  }
  startScan() {
    const gen = ++this.generation;
    this.scanPromise = this.scanPromise
      .catch(() => {})
      .then(() => this.scanAll(gen))
      .catch((error) => {
        this.scan.running = false;
        this.scan.errors.push(String(error));
        this.notify();
      });
  }
  cancel() {
    this.generation++;
    this.scan.running = false;
    this.scan.canceled = true;
    this.notify();
  }
  async scanAll(gen: number) {
    if (!this.project || gen !== this.generation) return;
    const project = this.project;
    this.scan = { ...emptyScan(), running: true };
    const orphans: string[] = [];
    this.identityPaths.clear();
    this.notify();
    const seen = new Set<string>();
    const unreadableFolders: string[] = [];
    const directories = [''];
    let lastEmit = Date.now();
    while (directories.length && gen === this.generation) {
      const folder = directories.pop()!;
      try {
        const entries = await readdir(path.join(project.root, folder), { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
          if (gen !== this.generation) return;
          const rel = posixPath(path.join(folder, entry.name));
          this.scan.visited++;
          if (excluded(rel, project.exclusions)) continue;
          if (entry.isSymbolicLink()) {
            this.scan.skipped++;
            if (this.scan.errors.length < 200)
              this.scan.errors.push(`Skipped symbolic link: ${rel}`);
            continue;
          }
          if (entry.isDirectory()) {
            directories.push(rel);
            continue;
          }
          if (/^\..+\.notes\.json$/.test(entry.name)) {
            const source = path.join(project.root, folder, entry.name.slice(1, -11));
            if (!(await stat(source).catch(() => null))) orphans.push(rel);
          }
          if (!entry.isFile() || !recognized.has(path.extname(entry.name).slice(1).toLowerCase()))
            continue;
          try {
            const asset = await this.index(rel);
            if (asset) seen.add(asset.id);
            this.scan.discovered++;
          } catch (error) {
            const old = this.get(digest(`${project.id}:${rel}`).slice(0, 40), false);
            if (old) {
              seen.add(old.id);
              this.put({ ...old, preview: 'failed', previewError: String(error) });
            }
            if (this.scan.errors.length < 200) this.scan.errors.push(`${rel}: ${String(error)}`);
          }
          if (Date.now() - lastEmit > 100) {
            this.notify();
            lastEmit = Date.now();
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
      } catch (error) {
        unreadableFolders.push(folder);
        if (this.scan.errors.length < 200)
          this.scan.errors.push(`${folder || '.'}: ${String(error)}`);
      }
    }
    if (gen !== this.generation) return;
    const rows = this.db.prepare('SELECT id FROM assets WHERE projectId=?').all(project.id) as {
      id: string;
    }[];
    for (const row of rows)
      if (!seen.has(row.id)) {
        const asset = this.get(row.id)!;
        if (
          !unreadableFolders.some(
            (folder) => !folder || asset.relativePath.startsWith(folder + '/'),
          )
        )
          this.remove(row.id);
      }
    this.orphans = orphans;
    this.scan.running = false;
    this.notify();
  }
  private remove(id: string) {
    this.db.prepare('DELETE FROM assets WHERE id=?').run(id);
    this.db.prepare('DELETE FROM dependencies WHERE assetId=?').run(id);
  }
  async index(relativePath: string) {
    const project = this.project!;
    const id = digest(`${project.id}:${relativePath}`).slice(0, 40);
    const file = await authorizePath(project.root, relativePath);
    const info = await stat(file);
    const format = path.extname(file).slice(1).toLowerCase();
    const prior = this.get(id, false);
    const notes = await readReview(file);
    const dep = supported.has(format)
      ? await dependencies(project.root, relativePath, project.externalRoots)
      : { refs: [], errors: [], fingerprint: digest(`${info.size}:${info.mtimeMs}`) };
    let noteError = notes.error ?? null;
    if (notes.revision && !notes.error) {
      const owner = this.identityPaths.get(notes.review.assetId);
      if (owner && owner !== relativePath)
        noteError = `Duplicate review ID also found at ${owner}. Reviews remain separate by path.`;
      else this.identityPaths.set(notes.review.assetId, relativePath);
    }
    const unchanged = prior?.fingerprint === dep.fingerprint;
    const asset: Asset = {
      id,
      projectId: project.id,
      name: path.basename(file),
      relativePath,
      folder:
        posixPath(path.dirname(relativePath)) === '.' ? '' : posixPath(path.dirname(relativePath)),
      format,
      size: info.size,
      mtime: info.mtimeMs,
      fingerprint: dep.fingerprint,
      preview: !supported.has(format)
        ? 'unsupported'
        : unchanged
          ? prior!.preview
          : dep.errors.length
            ? 'failed'
            : 'queued',
      previewError: !supported.has(format)
        ? `${format.toUpperCase()} preview is not supported. You can still review this file.`
        : dep.errors.length
          ? dep.errors.join('\n')
          : unchanged
            ? prior!.previewError
            : null,
      thumbnail: unchanged ? prior!.thumbnail : null,
      status: notes.review.status,
      commentCount: notes.review.comments.length,
      noteError,
      dependencyErrors: dep.errors,
    };
    this.put(asset);
    this.db.prepare('DELETE FROM dependencies WHERE assetId=?').run(id);
    const insert = this.db.prepare('INSERT INTO dependencies VALUES(?,?,?)');
    for (const ref of dep.refs) insert.run(id, ref, project.id);
    return asset;
  }
  put(asset: Asset) {
    this.db
      .prepare('INSERT OR REPLACE INTO assets VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(
        asset.id,
        asset.projectId,
        asset.relativePath,
        asset.name,
        asset.folder,
        asset.format,
        asset.mtime,
        asset.status,
        asset.commentCount,
        asset.fingerprint,
        JSON.stringify(asset),
      );
  }
  get(id: string, required = true): Asset | null {
    const row = this.db
      .prepare('SELECT data FROM assets WHERE id=? AND projectId=?')
      .get(id, this.project?.id ?? '') as any;
    if (!row && required) throw new Error('Asset is no longer in the active project');
    return row ? JSON.parse(row.data) : null;
  }
  query(input: AssetQuery) {
    const q = querySchema.parse(input);
    const clauses = ['projectId = ?'];
    const values: (string | number)[] = [this.project?.id ?? ''];
    if (q.search) {
      clauses.push("relativePath LIKE ? ESCAPE '\\'");
      values.push(`%${q.search.replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (q.status) {
      clauses.push('status = ?');
      values.push(q.status);
    }
    if (q.format) {
      clauses.push('format = ?');
      values.push(q.format);
    }
    if (q.folder !== undefined) {
      clauses.push("(folder = ? OR folder LIKE ? ESCAPE '\\')");
      values.push(q.folder, `${q.folder.replace(/[\\%_]/g, '\\$&')}/%`);
    }
    if (q.comments) clauses.push('commentCount > 0');
    if (q.previewOnly)
      clauses.push(
        "json_extract(data, '$.preview') = 'ready' AND json_extract(data, '$.thumbnail') IS NOT NULL",
      );
    const where = clauses.join(' AND ');
    const sort = {
      name: 'name COLLATE NOCASE',
      path: 'relativePath COLLATE NOCASE',
      modified: 'mtime DESC',
    }[q.sort];
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM assets WHERE ${where}`).get(...values) as any
    ).n;
    const assets = (
      this.db
        .prepare(`SELECT data FROM assets WHERE ${where} ORDER BY ${sort}, id LIMIT ? OFFSET ?`)
        .all(...values, q.limit, q.offset) as any[]
    ).map((row) => JSON.parse(row.data));
    return { assets, total };
  }
  summary(): Summary {
    const statuses = { unreviewed: 0, needs_changes: 0, approved: 0 };
    for (const row of this.db
      .prepare('SELECT status, COUNT(*) AS n FROM assets WHERE projectId=? GROUP BY status')
      .all(this.project?.id ?? '') as any[])
      statuses[row.status as keyof typeof statuses] = row.n;
    const direct = this.db
      .prepare(
        'SELECT folder AS path, COUNT(*) AS count FROM assets WHERE projectId=? GROUP BY folder ORDER BY folder',
      )
      .all(this.project?.id ?? '') as { path: string; count: number }[];
    const counts = new Map<string, number>();
    for (const folder of direct) {
      const parts = folder.path.split('/');
      for (let depth = 1; depth <= parts.length; depth++) {
        const ancestor = parts.slice(0, depth).join('/');
        counts.set(ancestor, (counts.get(ancestor) || 0) + folder.count);
      }
    }
    const folders = [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, count]) => ({ path, count }));
    return {
      total: Object.values(statuses).reduce((a, b) => a + b, 0),
      statuses,
      folders,
      scan: this.scan,
      orphans: this.orphans,
    };
  }
  async reconcileChanges() {
    if (!this.project) return;
    const project = this.project;
    // Watcher events must not cancel a full scan halfway through reconciliation.
    // Keep collecting events while it runs, then apply them to its completed catalog.
    await this.scanPromise;
    if (this.project !== project) return;
    const changes = [...this.changed];
    this.changed.clear();
    if (changes.includes('*')) {
      this.startScan();
      return;
    }
    const affected = new Set<string>();
    for (const rel of changes) {
      for (const row of this.db
        .prepare('SELECT assetId FROM dependencies WHERE projectId=? AND relativePath=?')
        .all(this.project.id, rel) as any[]) {
        const asset = this.get(row.assetId, false);
        if (asset) affected.add(asset.relativePath);
      }
      const name = path.basename(rel);
      if (/^\..+\.notes\.json$/.test(name))
        affected.add(posixPath(path.join(path.dirname(rel), name.slice(1, -11))));
      else if (recognized.has(path.extname(rel).slice(1).toLowerCase())) affected.add(rel);
    }
    for (const rel of affected) {
      try {
        await this.index(rel);
      } catch {
        const id = digest(`${this.project.id}:${rel}`).slice(0, 40);
        this.remove(id);
      }
    }
    if (changes.some((rel) => rel.endsWith('.notes.json'))) {
      // Reconcile orphan notes after explicit moves/removals; ordinary edits stay incremental.
      for (const rel of affected)
        if (!(await stat(path.join(this.project.root, rel)).catch(() => null))) {
          this.startScan();
          break;
        }
    }
    this.notify();
  }
  async source(id: string) {
    return authorizePath(this.project!.root, this.get(id)!.relativePath);
  }
  async review(id: string) {
    return readReview(await this.source(id));
  }
  async exportReviews(): Promise<ReviewExport> {
    const project = this.project;
    if (!project) throw new Error('Open a project before exporting reviews.');
    if (this.scan.running) throw new Error('Wait for the scan to finish before exporting.');
    const rows = this.db
      .prepare('SELECT data FROM assets WHERE projectId=? ORDER BY relativePath')
      .all(project.id) as { data: string }[];
    const output: ReviewExport = {
      format: 'voro.review-export',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      project: { name: project.name },
      scope: 'all_saved_reviews_in_catalog',
      assetsWithoutSavedReview: 0,
      reviews: [],
      warnings: [],
    };
    if (this.scan.canceled || this.scan.errors.length)
      output.warnings.push({
        kind: 'incomplete_scan',
        message:
          'The last scan was canceled or encountered errors. This export covers only cataloged assets.',
      });
    for (const orphan of this.orphans)
      output.warnings.push({
        kind: 'orphan_review',
        path: orphan,
        message: 'No matching asset was found. Reattach this sidecar before exporting its review.',
      });
    for (const row of rows) {
      const asset: Asset = JSON.parse(row.data);
      const sidecar = posixPath(
        path.join(path.dirname(asset.relativePath), `.${asset.name}.notes.json`),
      );
      try {
        const source = await authorizePath(project.root, asset.relativePath);
        const state = await readReview(source);
        if (state.error) throw new Error(state.error);
        if (state.revision === null) {
          output.assetsWithoutSavedReview++;
          continue;
        }
        output.reviews.push({
          asset: { path: asset.relativePath, format: asset.format, fingerprint: asset.fingerprint },
          sidecar,
          revision: state.revision,
          review: state.review,
        });
      } catch (error) {
        output.warnings.push({
          kind: 'unreadable_review',
          path: sidecar,
          message: (error as Error).message,
        });
      }
    }
    return output;
  }
  async save(input: unknown) {
    const parsed = saveSchema.parse(input);
    const result = await saveReview(await this.source(parsed.assetId), parsed);
    await this.index(this.get(parsed.assetId)!.relativePath);
    this.notify();
    return result;
  }
  async preview(
    id: string,
    fingerprint: string,
    preview: Asset['preview'],
    thumbnail: string | null,
    error: string | null,
  ) {
    const asset = this.get(id, false);
    if (!asset || asset.fingerprint !== fingerprint) return;
    this.put({ ...asset, preview, thumbnail, previewError: error });
    this.notify();
  }
  async clearCache() {
    const cache = path.join(this.dataDir, 'thumbnails');
    await mkdir(cache, { recursive: true });
    for (const file of await readdir(cache))
      if (/^[a-f\d]{64}\.png$/.test(file)) await unlink(path.join(cache, file));
    for (const row of this.db.prepare('SELECT data FROM assets').all() as any[]) {
      const asset: Asset = JSON.parse(row.data);
      if (asset.preview === 'ready' || asset.preview === 'generating')
        this.put({ ...asset, thumbnail: null, preview: 'queued' });
    }
    this.notify();
  }
  async cacheThumbnail(key: string, data: string) {
    const cache = path.join(this.dataDir, 'thumbnails');
    await mkdir(cache, { recursive: true });
    await writeFile(
      path.join(cache, `${key}.png`),
      Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64'),
    );
    const files = await Promise.all(
      (await readdir(cache))
        .filter((f) => /^[a-f\d]{64}\.png$/.test(f))
        .map(async (f) => ({ f, s: await stat(path.join(cache, f)) })),
    );
    let size = files.reduce((n, f) => n + f.s.size, 0);
    for (const file of files.sort((a, b) => a.s.atimeMs - b.s.atimeMs)) {
      if (size <= 512 * 1024 * 1024) break;
      await unlink(path.join(cache, file.f));
      size -= file.s.size;
      for (const row of this.db
        .prepare('SELECT data FROM assets WHERE fingerprint=?')
        .all(file.f.slice(0, -4)) as any[]) {
        const asset: Asset = JSON.parse(row.data);
        this.put({ ...asset, thumbnail: null, preview: 'queued' });
      }
    }
  }
  async setExclusions(exclusions: string[]) {
    this.project!.exclusions = exclusions;
    this.db
      .prepare('UPDATE projects SET exclusions=? WHERE id=?')
      .run(JSON.stringify(exclusions), this.project!.id);
    const root = this.project!.root;
    return this.open(root);
  }
  async setExternalRoots(roots: string[]) {
    this.db
      .prepare('UPDATE projects SET externalRoots=? WHERE id=?')
      .run(JSON.stringify(roots), this.project!.id);
    return this.open(this.project!.root);
  }
  async reattach(orphan: string, assetId: string) {
    if (!this.orphans.includes(orphan))
      throw new Error('Orphan is no longer available. Rescan the project.');
    const orphanPath = await authorizePath(this.project!.root, orphan);
    if ((await lstat(path.join(this.project!.root, orphan))).isSymbolicLink())
      throw new Error('Symlink notes cannot be reattached');
    const source = await this.source(assetId);
    const target = sidecarPath(source);
    if (await stat(target).catch(() => null))
      throw new Error('The selected asset already has notes');
    const review = reviewSchema.parse(JSON.parse(await readFile(orphanPath, 'utf8')));
    // Copy first and preserve the orphan as a recovery copy. No source notes are deleted.
    await writeFile(
      target,
      JSON.stringify(
        { ...review, assetFile: path.basename(source), updatedAt: new Date().toISOString() },
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
    await this.index(this.get(assetId)!.relativePath);
    this.notify();
  }
  async close() {
    this.generation++;
    clearTimeout(this.timer);
    await this.watcher?.close();
    await this.scanPromise;
    this.db.close();
  }
}
