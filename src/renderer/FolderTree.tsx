import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { Project, Summary } from '../shared/contracts';

export function FolderTree({
  project,
  folders,
  selected,
  onSelect,
}: {
  project: Project;
  folders: Summary['folders'];
  selected: string | undefined;
  onSelect(path: string | undefined): void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const parents = new Set<string>();
  for (const folder of folders) {
    const parts = folder.path.split('/');
    for (let depth = 1; depth < parts.length; depth++) parents.add(parts.slice(0, depth).join('/'));
  }
  const visible = folders.filter(({ path }) => {
    const parts = path.split('/');
    return !parts
      .slice(0, -1)
      .some((_, index) => collapsed.has(parts.slice(0, index + 1).join('/')));
  });
  const toggle = (path: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  return (
    <nav aria-label="Project folders">
      <div className={`folder-row ${selected === undefined ? 'chosen' : ''}`}>
        <button
          className="folder-toggle"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} folders in ${project.name}`}
          aria-expanded={expanded}
          aria-controls="project-folder-list"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronRight size={12} />
        </button>
        <button
          className="folder-item"
          title={project.root}
          onClick={() => onSelect(undefined)}
          aria-current={selected === undefined ? 'location' : undefined}
        >
          <FolderOpen size={15} />
          <span>{project.name}</span>
        </button>
      </div>
      <div id="project-folder-list" hidden={!expanded}>
        {visible.map((folder) => {
          const hasChildren = parents.has(folder.path);
          return (
            <div
              key={folder.path}
              className={`folder-row nested ${selected === folder.path ? 'chosen' : ''}`}
              style={{ marginLeft: Math.min(folder.path.split('/').length, 5) * 10 }}
            >
              {hasChildren ? (
                <button
                  className="folder-toggle"
                  aria-label={`${collapsed.has(folder.path) ? 'Expand' : 'Collapse'} folder ${folder.path}`}
                  aria-expanded={!collapsed.has(folder.path)}
                  onClick={() => toggle(folder.path)}
                >
                  <ChevronRight size={12} />
                </button>
              ) : (
                <span className="folder-toggle-spacer" />
              )}
              <button
                className="folder-item nested"
                title={folder.path || '(project root)'}
                aria-label={`Show assets in ${folder.path || '(project root)'}`}
                aria-current={selected === folder.path ? 'location' : undefined}
                onClick={() => onSelect(folder.path)}
              >
                <Folder size={13} />
                <span>{folder.path.split('/').pop() || '(root)'}</span>
                <small>{folder.count}</small>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
