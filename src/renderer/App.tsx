import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Boxes,
  FolderOpen,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  LayoutGrid,
  Folder,
  RefreshCw,
  Plus,
  X,
  MessageSquare,
  LoaderCircle,
  ArrowUpRight,
  HardDrive,
  Settings2,
  RotateCcw,
  Download,
} from 'lucide-react';
import type {
  Asset,
  AssetQuery,
  Project,
  QueryResult,
  Summary,
  ReviewStatus,
} from '../shared/contracts';
import { FolderTree } from './FolderTree';
import { Inspector, statusNames } from './Inspector';
import { BrandLockup, BrandStudy } from './Brand';
const emptySummary: Summary = {
  total: 0,
  statuses: { unreviewed: 0, needs_changes: 0, approved: 0 },
  folders: [],
  scan: { running: false, canceled: false, discovered: 0, visited: 0, errors: [], skipped: 0 },
  orphans: [],
};
const rowHeight = 260;
export function App() {
  const [project, setProject] = useState<Project | null>(null),
    [recent, setRecent] = useState<Project[]>([]),
    [summary, setSummary] = useState<Summary>(emptySummary),
    [version, setVersion] = useState(0),
    [query, setQuery] = useState<AssetQuery>({ search: '', sort: 'name' }),
    [result, setResult] = useState<QueryResult>({ assets: [], total: 0 }),
    [selected, setSelected] = useState<Asset | null>(null),
    [fullPreview, setFullPreview] = useState(true),
    [exporting, setExporting] = useState(false),
    [exportMessage, setExportMessage] = useState(''),
    [error, setError] = useState(''),
    [opening, setOpening] = useState(false),
    [settings, setSettings] = useState(false),
    [exclusions, setExclusions] = useState(''),
    [issues, setIssues] = useState(false),
    [formatFilter, setFormatFilter] = useState(false),
    [metrics, setMetrics] = useState({ width: 800, height: 600, top: 0 });
  const scroll = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null),
    revisionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const columns = Math.max(1, Math.floor((metrics.width - 32) / 224));
  const firstRow = Math.max(0, Math.floor(metrics.top / rowHeight) - 1),
    offset = firstRow * columns;
  const limit = Math.min(200, (Math.ceil(metrics.height / rowHeight) + 3) * columns);
  const patchQuery = (patch: Partial<AssetQuery>) => {
    setSelected(null);
    setQuery((q) => ({ ...q, ...patch }));
    if (scroll.current) scroll.current.scrollTop = 0;
    setMetrics((m) => ({ ...m, top: 0 }));
  };
  const run = (promise: Promise<unknown>) => void promise.catch((e) => setError(String(e)));
  useEffect(() => {
    run(window.reviewer.recentProjects().then(setRecent));
    const unsubscribe = window.reviewer.onChange(() => {
      if (revisionTimer.current) return;
      revisionTimer.current = setTimeout(() => {
        revisionTimer.current = null;
        refresh();
      }, 120);
    });
    const errors = window.reviewer.onError(setError);
    return () => {
      unsubscribe();
      errors();
      if (revisionTimer.current) clearTimeout(revisionTimer.current);
    };
  }, [refresh]);
  useEffect(() => {
    if (!project) return;
    let canceled = false;
    run(
      window.reviewer.summary().then((value) => {
        if (!canceled) setSummary(value);
      }),
    );
    return () => {
      canceled = true;
    };
  }, [project, version]);
  useEffect(() => {
    if (!project) return;
    let canceled = false;
    const timer = setTimeout(
      () =>
        run(
          window.reviewer.queryAssets({ ...query, offset, limit }).then((value) => {
            if (canceled) return;
            setResult(value);
            setSelected((old) => (old ? (value.assets.find((a) => a.id === old.id) ?? old) : null));
            run(window.reviewer.prioritize(value.assets.map((a) => a.id)));
          }),
        ),
      60,
    );
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [project, query, version, offset, limit]);
  useEffect(() => {
    if (!selected) return;
    let canceled = false;
    void window.reviewer
      .getAsset(selected.id)
      .then((asset) => {
        if (!canceled) setSelected(asset);
      })
      .catch(() => {
        if (!canceled) {
          setSelected(null);
          setError(
            'The selected asset was removed. Its unsaved draft remains stored on this device.',
          );
        }
      });
    return () => {
      canceled = true;
    };
  }, [selected?.id, version]);
  useEffect(() => {
    if (!scroll.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setMetrics((m) => ({
        ...m,
        width: entry.contentRect.width || m.width,
        height: entry.contentRect.height || m.height,
      })),
    );
    observer.observe(scroll.current);
    return () => observer.disconnect();
  }, [project]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === 'Escape' && !(e.target instanceof HTMLTextAreaElement)) {
        setSelected((old) => {
          if (old) requestAnimationFrame(() => document.getElementById(`asset-${old.id}`)?.focus());
          return null;
        });
        setSettings(false);
        setIssues(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  async function open(id?: string) {
    setOpening(true);
    setError('');
    setExportMessage('');
    try {
      const value = await window.reviewer.openProject(id);
      if (value) {
        setProject(value);
        setSelected(null);
        setSummary(emptySummary);
        setResult({ assets: [], total: 0 });
        patchQuery({
          search: '',
          status: undefined,
          format: undefined,
          folder: undefined,
          comments: false,
          previewOnly: false,
        });
        setRecent(await window.reviewer.recentProjects());
        refresh();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setOpening(false);
    }
  }
  const select = (asset: Asset) => {
    setSelected(asset);
    setFullPreview(true);
    run(window.reviewer.prioritize([asset.id]));
  };
  async function navigate(e: React.KeyboardEvent, index: number) {
    const delta: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    if (!(e.key in delta)) return;
    e.preventDefault();
    const nextIndex = Math.max(0, Math.min(result.total - 1, offset + index + delta[e.key]));
    try {
      const page = await window.reviewer.queryAssets({ ...query, offset: nextIndex, limit: 1 });
      if (page.assets[0]) {
        // Arrow keys move through the contact sheet; Enter opens the focused asset.
        scroll.current?.scrollTo({ top: Math.floor(nextIndex / columns) * rowHeight });
        setTimeout(() => document.getElementById(`asset-${page.assets[0].id}`)?.focus(), 180);
      }
    } catch (e) {
      setError(String(e));
    }
  }
  const closeInspector = () => {
    const id = selected?.id;
    setSelected(null);
    requestAnimationFrame(() => document.getElementById(`asset-${id}`)?.focus());
  };
  async function exportReviews() {
    setExporting(true);
    setExportMessage('');
    try {
      const result = await window.reviewer.exportReviews();
      if (result)
        setExportMessage(
          `Exported ${result.reviews} saved reviews${result.warnings ? ` · ${result.warnings} warnings included in the file` : ''}.`,
        );
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  }
  const statusIcon = (status: ReviewStatus) =>
    status === 'approved' ? (
      <CircleCheck size={15} />
    ) : status === 'needs_changes' ? (
      <CircleDot size={15} />
    ) : (
      <Circle size={15} />
    );
  return (
    <div className="app">
      <div className="titlebar">
        <span>
          VORO <span className="titlebar-description">/ A little room for your next world</span>
        </span>
        <span className="local-pill">
          <span /> OFFLINE BY DESIGN
        </span>
      </div>
      <div className="workspace">
        <aside className="sidebar">
          <BrandLockup />
          <button className="open-folder" onClick={() => void open()} disabled={opening}>
            <Plus size={17} />
            {opening ? 'Opening…' : 'Open folder'}
            <ArrowUpRight size={15} />
          </button>
          {project ? (
            <>
              <div className="sidebar-section">
                <span className="nav-label">WORKSPACE</span>
                <button
                  className={`nav-item ${!query.status && query.folder === undefined ? 'active' : ''}`}
                  onClick={() => patchQuery({ status: undefined, folder: undefined })}
                >
                  <LayoutGrid size={16} />
                  <span>All assets</span>
                  <b>{summary.total}</b>
                </button>
                {(Object.keys(statusNames) as ReviewStatus[]).map((status) => (
                  <button
                    className={`nav-item ${query.status === status ? 'active' : ''}`}
                    key={status}
                    onClick={() => patchQuery({ status, folder: undefined })}
                  >
                    {statusIcon(status)}
                    <span>{statusNames[status]}</span>
                    <b>{summary.statuses[status]}</b>
                  </button>
                ))}
              </div>
              <div className="sidebar-section folders">
                <div className="section-label">
                  <span className="nav-label">FOLDERS</span>
                  <Folder size={12} />
                </div>
                <FolderTree
                  key={project.id}
                  project={project}
                  folders={summary.folders}
                  selected={query.folder}
                  onSelect={(folder) => patchQuery({ folder })}
                />
              </div>
            </>
          ) : (
            <div className="sidebar-section">
              <span className="nav-label">RECENT WORKSPACES</span>
              {recent.length ? (
                recent.map((p) => (
                  <button
                    key={p.id}
                    className="nav-item"
                    title={p.root}
                    onClick={() => void open(p.id)}
                  >
                    <Folder size={16} />
                    <span>{p.name}</span>
                    <ChevronRight size={13} />
                  </button>
                ))
              ) : (
                <p className="sidebar-note">The folders you open will appear here.</p>
              )}
            </div>
          )}
          <div className="sidebar-bottom">
            {project && (
              <button
                className="nav-item"
                onClick={() => {
                  setExclusions(project.exclusions.join('\n'));
                  setSettings(true);
                }}
              >
                <Settings2 size={16} />
                <span>Project settings</span>
              </button>
            )}
            <div className="offline">
              <HardDrive size={14} />
              <div>
                Your files. Your workspace.<small>Stored locally. Never uploaded.</small>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="toolbar">
            <div className="breadcrumbs">
              <FolderOpen size={15} />
              <span>{project?.name || 'Your workspace'}</span>
              <ChevronRight size={13} />
              <strong>
                {query.folder ?? (query.status ? statusNames[query.status] : 'All assets')}
              </strong>
            </div>
            <div className="toolbar-right">
              {project && (
                <button
                  onClick={() => void exportReviews()}
                  disabled={exporting || summary.scan.running}
                  title="Export all saved project reviews as JSON; drafts are excluded"
                >
                  <Download size={15} /> {exporting ? 'Exporting…' : 'Export reviews'}
                </button>
              )}
              {project && (
                <button
                  aria-label="Rescan project"
                  title="Rescan project"
                  onClick={() => run(window.reviewer.rescan())}
                >
                  <RefreshCw size={15} className={summary.scan.running ? 'spin' : ''} />
                </button>
              )}
              <span className="workspace-mode">
                <HardDrive size={14} /> Local workspace
              </span>
            </div>
          </header>
          {exportMessage && (
            <div className="export-notice" role="status">
              <span>{exportMessage}</span>
              <button aria-label="Dismiss export message" onClick={() => setExportMessage('')}>
                <X size={14} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="global-error">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={14} />
              </button>
            </div>
          )}
          {!project ? (
            <div className="welcome">
              <div className="welcome-main">
                <div className="welcome-copy">
                  <h1>
                    Small details.
                    <br />
                    <span>Bigger worlds.</span>
                  </h1>
                  <p>
                    Every prop has a part to play. Explore your 3D assets, leave a little feedback,
                    and help your next world take shape.
                  </p>
                  <button className="primary large" onClick={() => void open()} disabled={opening}>
                    <FolderOpen size={18} /> Open a project folder <ArrowUpRight size={18} />
                  </button>
                  <p className="welcome-caption">GLB & glTF previews. No importing required.</p>
                </div>
                <BrandStudy />
              </div>
              <div className="welcome-bottom">
                {recent.length > 0 ? (
                  <div className="recent-list">
                    <h2>Pick up where you left off.</h2>
                    {recent.slice(0, 3).map((p) => (
                      <button key={p.id} title={p.root} onClick={() => void open(p.id)}>
                        <Folder size={19} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.root}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="welcome-principle">
                    <h2>
                      Good ideas
                      <br />
                      stick together.
                    </h2>
                    <p>
                      Open an existing folder. Your assets stay where they are. Saved reviews live
                      alongside them.
                    </p>
                  </div>
                )}
                <div className="workflow-note">
                  <div>
                    <span>View</span>
                    <p>Orbit, zoom, and inspect the geometry.</p>
                  </div>
                  <div>
                    <span>Review</span>
                    <p>Approve it, or leave a clear next step.</p>
                  </div>
                  <div>
                    <span>Keep</span>
                    <p>Pick up your notes when you return.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    {query.folder || (query.status ? statusNames[query.status] : 'All assets')}{' '}
                    <span className="collection-count">{result.total.toLocaleString()} files</span>
                  </h1>
                  <p>
                    {summary.scan.running
                      ? `Discovering assets · ${summary.scan.visited.toLocaleString()} files checked`
                      : project.root}
                  </p>
                </div>
                <div className="review-progress">
                  <span>
                    Review progress{' '}
                    <strong>
                      {summary.total - summary.statuses.unreviewed} / {summary.total}
                    </strong>
                  </span>
                  <div
                    className="review-track"
                    aria-label={`${summary.total - summary.statuses.unreviewed} of ${summary.total} assets reviewed`}
                  >
                    <i
                      style={{
                        width: `${summary.total ? (summary.statuses.approved / summary.total) * 100 : 0}%`,
                      }}
                    />
                    <i
                      style={{
                        width: `${summary.total ? (summary.statuses.needs_changes / summary.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="filters">
                <div className="search">
                  <Search size={16} />
                  <input
                    ref={search}
                    value={query.search}
                    placeholder="Search assets or paths…"
                    aria-label="Search assets"
                    onChange={(e) => patchQuery({ search: e.target.value })}
                  />
                  <kbd>⌘ F</kbd>
                </div>
                <button
                  aria-expanded={formatFilter}
                  aria-controls="asset-filters"
                  className={`filter-button ${formatFilter ? 'pressed' : ''}`}
                  onClick={() => setFormatFilter((v) => !v)}
                >
                  <SlidersHorizontal size={15} /> Filters
                  {(query.format || query.comments || query.previewOnly) && (
                    <span className="filter-dot" />
                  )}
                </button>
                <select
                  aria-label="Sort assets"
                  value={query.sort}
                  onChange={(e) => patchQuery({ sort: e.target.value as AssetQuery['sort'] })}
                >
                  <option value="name">Name A–Z</option>
                  <option value="path">Relative path</option>
                  <option value="modified">Recently modified</option>
                </select>
              </div>
              {formatFilter && (
                <div className="filter-tray" id="asset-filters">
                  <label>
                    Format{' '}
                    <select
                      aria-label="Filter format"
                      value={query.format || ''}
                      onChange={(e) => patchQuery({ format: e.target.value || undefined })}
                    >
                      <option value="">All formats</option>
                      {['glb', 'gltf', 'fbx', 'obj', 'blend', 'usd', 'usdz', 'usda', 'usdc'].map(
                        (f) => (
                          <option value={f} key={f}>
                            {f.toUpperCase()}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={query.comments || false}
                      onChange={(e) => patchQuery({ comments: e.target.checked })}
                    />{' '}
                    Has comments
                  </label>
                  <label title="Show assets with a successfully generated preview. Queued, failed, and unsupported assets are hidden.">
                    <input
                      type="checkbox"
                      checked={query.previewOnly || false}
                      onChange={(e) => patchQuery({ previewOnly: e.target.checked })}
                    />
                    Preview available
                  </label>
                  <button
                    onClick={() =>
                      patchQuery({
                        format: undefined,
                        comments: false,
                        previewOnly: false,
                        status: undefined,
                        folder: undefined,
                      })
                    }
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className={`content ${selected && fullPreview ? 'full-preview' : ''}`}>
                <div
                  className="gallery"
                  ref={scroll}
                  onScroll={(e) => {
                    const top = e.currentTarget.scrollTop;
                    setMetrics((m) => ({ ...m, top }));
                  }}
                >
                  {result.total === 0 ? (
                    <div className="empty-grid">
                      <Search size={30} />
                      <h3>
                        {summary.scan.running
                          ? 'Finding your assets…'
                          : query.previewOnly
                            ? 'No previews match these filters'
                            : summary.total
                              ? 'No assets match these filters'
                              : 'No assets here yet'}
                      </h3>
                      <p>
                        {query.search ||
                        query.format ||
                        query.comments ||
                        query.previewOnly ||
                        query.status
                          ? query.previewOnly
                            ? 'Previews appear here as they finish. Clear your filters to see all assets.'
                            : 'Try a different search or clear your filters.'
                          : 'This folder has no included model files. Check your exclusions or open another folder.'}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="virtual-grid"
                      role="list"
                      aria-label="Asset collection"
                      style={{ height: Math.ceil(result.total / columns) * rowHeight }}
                    >
                      {result.assets.map((asset, i) => (
                        <div
                          role="listitem"
                          key={asset.id}
                          className="card-position"
                          style={{
                            width: `calc((100% - 32px) / ${columns})`,
                            left: `calc(16px + (100% - 32px) / ${columns} * ${i % columns})`,
                            top: (firstRow + Math.floor(i / columns)) * rowHeight,
                          }}
                        >
                          <button
                            id={`asset-${asset.id}`}
                            className={`asset-card ${selected?.id === asset.id ? 'selected' : ''}`}
                            aria-pressed={selected?.id === asset.id}
                            onClick={() => select(asset)}
                            onKeyDown={(e) => void navigate(e, i)}
                            aria-label={`Inspect ${asset.name}`}
                            aria-description={`${statusNames[asset.status]}, ${asset.format.toUpperCase()}, ${asset.relativePath}, ${asset.commentCount} comments`}
                          >
                            <div className="asset-image">
                              {asset.thumbnail ? (
                                <img
                                  src={asset.thumbnail}
                                  alt=""
                                  loading="lazy"
                                  onError={() => run(window.reviewer.retryPreview(asset.id))}
                                />
                              ) : (
                                <div className="placeholder">
                                  {asset.preview === 'generating' ? (
                                    <LoaderCircle size={30} className="spin" />
                                  ) : (
                                    <Box size={42} strokeWidth={1} />
                                  )}
                                  <span>
                                    {asset.preview === 'failed'
                                      ? 'Preview failed'
                                      : asset.preview === 'unsupported'
                                        ? 'Preview unavailable'
                                        : asset.preview === 'generating'
                                          ? 'Generating preview'
                                          : 'Preview queued'}
                                  </span>
                                </div>
                              )}
                              <span className="card-format">{asset.format.toUpperCase()}</span>
                              <span
                                className={`status-dot ${asset.status}`}
                                title={statusNames[asset.status]}
                              >
                                {statusIcon(asset.status)}
                                <span>{statusNames[asset.status]}</span>
                              </span>
                            </div>
                            <div className="card-info">
                              <strong title={asset.name}>{asset.name}</strong>
                              {asset.commentCount > 0 && (
                                <span>
                                  <MessageSquare size={11} />
                                  {asset.commentCount}
                                </span>
                              )}
                              <small title={asset.relativePath}>
                                {asset.folder || project.name}
                              </small>
                            </div>
                          </button>
                          {asset.preview === 'failed' && (
                            <button
                              className="card-retry"
                              title={asset.previewError || 'Retry preview'}
                              aria-label={`Retry preview for ${asset.name}`}
                              onClick={() => run(window.reviewer.retryPreview(asset.id))}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selected && (
                  <Inspector
                    key={selected.id}
                    asset={selected}
                    close={closeInspector}
                    expanded={fullPreview}
                    toggleExpanded={() => setFullPreview((value) => !value)}
                    refresh={refresh}
                    version={version}
                  />
                )}
              </div>
              <footer className="statusbar">
                <div>
                  <span className={`connection-dot ${summary.scan.running ? 'busy' : ''}`} />
                  {summary.scan.running
                    ? `Scanning · ${summary.scan.discovered} assets discovered`
                    : summary.scan.canceled
                      ? 'Scan canceled · discovered assets are available'
                      : `${summary.total.toLocaleString()} assets in your workspace`}
                  {summary.scan.running && (
                    <button onClick={() => run(window.reviewer.cancelScan())}>Cancel scan</button>
                  )}
                </div>
                <div>
                  {(summary.scan.errors.length > 0 || summary.orphans.length > 0) && (
                    <button onClick={() => setIssues(true)}>
                      {summary.scan.errors.length} scan notices · {summary.orphans.length} orphan
                      notes
                    </button>
                  )}
                  <span>GLB / glTF</span>
                  <span className="status-separator" />
                  <span>All files stay local</span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
      {settings && project && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Project settings">
            <header>
              <h2>Project settings</h2>
              <button aria-label="Close settings" onClick={() => setSettings(false)}>
                <X size={18} />
              </button>
            </header>
            <p className="file-path">{project.root}</p>
            <label htmlFor="exclusions">Excluded folder names</label>
            <p className="muted">
              One name per line. Exclusions apply at every depth. Symbolic links are always skipped.
            </p>
            <textarea
              id="exclusions"
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
            />
            <button
              className="primary"
              onClick={() =>
                run(
                  window.reviewer
                    .setExclusions(
                      exclusions
                        .split('\n')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                    .then((p) => {
                      setProject(p);
                      setSettings(false);
                      refresh();
                    }),
                )
              }
            >
              Save and rescan
            </button>
            <hr />
            <h3>Additional resource folders</h3>
            <p className="muted">
              Allow this project to read model dependencies outside its root. Only folders you
              choose in the native picker are authorized.
            </p>
            {project.externalRoots.map((root, index) => (
              <div className="resource-folder" key={root}>
                <code>{root}</code>
                <button
                  onClick={() => run(window.reviewer.revokeResourceFolder(index).then(setProject))}
                >
                  Remove access
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                run(
                  window.reviewer.grantResourceFolder().then((p) => {
                    if (p) {
                      setProject(p);
                      refresh();
                    }
                  }),
                )
              }
            >
              Allow resource folder…
            </button>
            <hr />
            <h3>Thumbnail cache</h3>
            <p className="muted">
              Up to 512 MB, stored outside your project. Clearing it regenerates previews as you
              browse.
            </p>
            <button
              onClick={() =>
                run(
                  window.reviewer.clearCache().then(() => {
                    setSettings(false);
                    refresh();
                  }),
                )
              }
            >
              Clear thumbnail cache
            </button>
          </section>
        </div>
      )}
      {issues && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Scan notices">
            <header>
              <h2>Scan notices</h2>
              <button aria-label="Close notices" onClick={() => setIssues(false)}>
                <X size={18} />
              </button>
            </header>
            <p className="muted">
              {summary.scan.skipped} symbolic links skipped. Displaying up to 200 scan notices.
            </p>
            {summary.scan.errors.map((issue, i) => (
              <p className="issue" key={i}>
                {issue}
              </p>
            ))}
            {summary.orphans.length > 0 && (
              <>
                <h3>Orphaned notes</h3>
                <p className="muted">
                  Select an asset in the grid, then explicitly copy an orphan’s notes to it. The
                  orphan is kept as a recovery copy. Existing notes are never replaced.
                </p>
                {summary.orphans.map((orphan) => (
                  <div className="orphan" key={orphan}>
                    <code>{orphan}</code>
                    <button
                      disabled={!selected}
                      onClick={() =>
                        run(
                          window.reviewer.reattach(orphan, selected!.id).then(() => {
                            setIssues(false);
                            refresh();
                          }),
                        )
                      }
                    >
                      Attach to {selected?.name || 'selected asset'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
