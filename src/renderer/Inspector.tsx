import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
  ArrowLeft,
  Maximize2,
  Minimize2,
  AlertCircle,
} from 'lucide-react';
import type { Asset, Comment, ReviewState, ReviewStatus } from '../shared/contracts';
import { Viewer } from './Viewer';
export const statusNames: Record<ReviewStatus, string> = {
  unreviewed: 'Unreviewed',
  needs_changes: 'Needs changes',
  approved: 'Approved',
};
const date = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
type Draft = { text: string; editingId?: string; revision: string | null };
export function Inspector({
  asset,
  close,
  refresh,
  version,
  expanded,
  toggleExpanded,
}: {
  asset: Asset;
  close(): void;
  refresh(): void;
  version: number;
  expanded: boolean;
  toggleExpanded(): void;
}) {
  const [notes, setNotes] = useState<ReviewState | null>(null),
    [draft, setDraft] = useState<Draft>({ text: '', revision: null }),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    back.current?.focus();
  }, [asset.id]);
  const key = `draft:${asset.projectId}:${asset.id}`;
  const current = useRef({ draft, notes, saving });
  current.current = { draft, notes, saving };
  const persist = (next: Draft) => {
    current.current.draft = next;
    setDraft(next);
    if (next.text || next.editingId) localStorage.setItem(key, JSON.stringify(next));
    else localStorage.removeItem(key);
  };
  const load = useCallback(
    async (explicit = false) => {
      try {
        const incoming = await window.reviewer.getReview(asset.id);
        if (current.current.saving) return;
        const local = current.current.draft;
        if (!explicit && (local.text || local.editingId) && local.revision !== incoming.revision) {
          setConflict(true);
          if (!current.current.notes) setNotes(incoming);
          return;
        }
        setNotes(incoming);
        if (explicit) {
          setConflict(false);
          setError('');
          const next = { ...local, revision: incoming.revision };
          setDraft(next);
          if (next.text || next.editingId) localStorage.setItem(key, JSON.stringify(next));
        }
      } catch (e) {
        setError(String(e));
      }
    },
    [asset.id, key],
  );
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (stored && typeof stored.text === 'string') {
        setDraft(stored);
        current.current.draft = stored;
      }
    } catch {}
    void load();
  }, [key, load]);
  useEffect(() => {
    void load();
  }, [version, load]);
  async function save(status: ReviewStatus, comments: Comment[], clearDraft = false) {
    if (!notes || conflict) return;
    setSaving(true);
    current.current.saving = true;
    setError('');
    setSaved(false);
    const submittedDraft = current.current.draft;
    try {
      const result = await window.reviewer.saveReview({
        assetId: asset.id,
        revision: notes.revision,
        status,
        comments,
      });
      setNotes(result);
      // A status save can finish after the user starts typing. Rebase the current
      // draft, and only clear a submitted comment if it has not changed in flight.
      const latestDraft = current.current.draft;
      if (clearDraft && latestDraft === submittedDraft)
        persist({ text: '', revision: result.revision });
      else persist({ ...latestDraft, revision: result.revision });
      setSaved(true);
      refresh();
    } catch (e) {
      setError(String(e));
      if (String(e).includes('CONFLICT')) setConflict(true);
    } finally {
      setSaving(false);
      current.current.saving = false;
    }
  }
  const submit = () => {
    if (!notes || !draft.text.trim()) return;
    const now = new Date().toISOString();
    if (draft.editingId && !notes.review.comments.some((c) => c.id === draft.editingId)) {
      setError(
        'The original comment was deleted externally. Copy your draft into a new comment or cancel editing.',
      );
      return;
    }
    const comments = draft.editingId
      ? notes.review.comments.map((c) =>
          c.id === draft.editingId ? { ...c, text: draft.text.trim(), updatedAt: now } : c,
        )
      : [
          ...notes.review.comments,
          { id: crypto.randomUUID(), text: draft.text.trim(), createdAt: now, updatedAt: now },
        ];
    void save(notes.review.status, comments, true);
  };
  const disabled = saving || !notes?.writable || Boolean(notes?.error) || conflict;
  return (
    <aside className={`inspector ${expanded ? 'expanded' : ''}`} aria-label="Asset inspector">
      <header className="inspector-heading">
        {expanded && (
          <button ref={back} className="back-to-assets" onClick={close}>
            <ArrowLeft size={16} /> Back to assets
          </button>
        )}
        <div className="inspector-title">
          <h2>{asset.name}</h2>
        </div>
        <button
          aria-label={expanded ? 'Compact preview' : 'Full view preview'}
          title={expanded ? 'Show the asset grid beside the inspector' : 'Open a larger preview'}
          onClick={toggleExpanded}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          <span>{expanded ? 'Compact view' : 'Full view'}</span>
        </button>
        {!expanded && (
          <button ref={back} aria-label="Close inspector" onClick={close}>
            <X size={18} />
          </button>
        )}
      </header>
      <Viewer asset={asset} />
      <div className="inspector-content">
        <div className="file-info">
          <span className="format">{asset.format.toUpperCase()}</span>
          <span>
            {(asset.size / 1024 / (asset.size >= 1048576 ? 1024 : 1)).toFixed(1)}{' '}
            {asset.size >= 1048576 ? 'MB' : 'KB'}
          </span>
          <button
            title="Reveal source in file manager"
            onClick={() =>
              void window.reviewer.revealAsset(asset.id).catch((e) => setError(String(e)))
            }
          >
            Reveal file <ArrowUpRight size={13} />
          </button>
        </div>
        <p className="file-path">{asset.relativePath}</p>
        <div className="review-heading">
          <label htmlFor="review-status">Review status</label>
          <span className="save-state" aria-live="polite">
            {saving ? (
              'Saving…'
            ) : saved ? (
              <>
                <Check size={12} /> Saved beside asset
              </>
            ) : (
              ''
            )}
          </span>
        </div>
        <select
          id="review-status"
          className={`status-select ${notes?.review.status || asset.status}`}
          value={notes?.review.status || asset.status}
          disabled={disabled}
          onChange={(e) => void save(e.target.value as ReviewStatus, notes!.review.comments)}
        >
          {Object.entries(statusNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {(notes?.error || (notes && !notes.writable)) && (
          <div className="notice">
            <AlertCircle size={15} />
            <span>
              {notes.error ||
                'This folder is read-only. Browsing is available; notes cannot be saved.'}
            </span>
          </div>
        )}
        {asset.noteError && !notes?.error && <div className="notice">{asset.noteError}</div>}
        {conflict && (
          <div className="notice conflict">
            <strong>Notes changed outside the app</strong>
            <p>
              Your draft is preserved. Load the latest review, then check your draft before saving.
            </p>
            <button onClick={() => void load(true)}>Load latest review</button>
          </div>
        )}
        {error && (
          <div role="alert" className="notice">
            {error}
          </div>
        )}
        <div className="comments-heading">
          <h3>
            Comments <span>{notes?.review.comments.length || 0}</span>
          </h3>
          <MessageSquare size={15} />
        </div>
        {!notes ? (
          <p className="muted">Loading review…</p>
        ) : notes.review.comments.length === 0 ? (
          <div className="empty-comments">
            <MessageSquare size={23} />
            <strong>No notes. A clear starting point.</strong>
            <p>Flag a detail or leave a next step. Your review stays with this asset.</p>
          </div>
        ) : (
          <div className="comments">
            {notes.review.comments.map((comment) => (
              <article className="comment" key={comment.id}>
                <div className="comment-top">
                  <span className="avatar">
                    <Pencil size={12} />
                  </span>
                  <strong>You</strong>
                  <time
                    title={`Created ${date(comment.createdAt)} · Updated ${date(comment.updatedAt)}`}
                  >
                    {date(comment.updatedAt)}
                    {comment.updatedAt !== comment.createdAt ? ' · edited' : ''}
                  </time>
                  <button
                    aria-label="Edit comment"
                    disabled={disabled}
                    onClick={() =>
                      persist({
                        text: comment.text,
                        editingId: comment.id,
                        revision: notes.revision,
                      })
                    }
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    aria-label="Delete comment"
                    disabled={disabled}
                    onClick={() => setDeleteId(comment.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p>{comment.text}</p>
                {deleteId === comment.id && (
                  <div className="delete-confirm">
                    <span>Delete this comment?</span>
                    <button
                      onClick={() => {
                        setDeleteId(null);
                        void save(
                          notes.review.status,
                          notes.review.comments.filter((c) => c.id !== comment.id),
                        );
                      }}
                    >
                      Delete
                    </button>
                    <button onClick={() => setDeleteId(null)}>Keep</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="comment-editor">
          {draft.editingId && (
            <div className="editing-label">
              Editing comment{' '}
              <button onClick={() => persist({ text: '', revision: notes?.revision ?? null })}>
                Cancel
              </button>
            </div>
          )}
          <textarea
            aria-label="Comment"
            placeholder="What could be improved?"
            maxLength={20000}
            value={draft.text}
            onChange={(e) => {
              persist({
                ...draft,
                text: e.target.value,
                revision:
                  draft.text || draft.editingId ? draft.revision : (notes?.revision ?? null),
              });
              setSaved(false);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
            }}
          />
          <div>
            <span>{draft.text ? 'Draft saved on this device' : '⌘ Enter to submit'}</span>
            <button className="primary" disabled={disabled || !draft.text.trim()} onClick={submit}>
              <Send size={13} />
              {draft.editingId ? 'Save edit' : 'Add comment'}
            </button>
          </div>
        </div>
        <p className="sidecar-hint">
          Reviews stay with your files. Saved to <code>.{asset.name}.notes.json</code>
        </p>
      </div>
    </aside>
  );
}
