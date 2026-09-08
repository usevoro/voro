import { constants } from 'node:fs';
import { access, lstat, open, readFile, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { reviewSchema, type ReviewState, type SaveInput, type Review } from '../shared/contracts';
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const sidecarPath = (source: string) =>
  path.join(path.dirname(source), `.${path.basename(source)}.notes.json`);
export async function readReview(source: string): Promise<ReviewState> {
  const file = sidecarPath(source);
  const empty: Review = {
    schemaVersion: 1,
    assetId: randomUUID(),
    assetFile: path.basename(source),
    status: 'unreviewed',
    updatedAt: new Date().toISOString(),
    comments: [],
  };
  let writable = true;
  try {
    const dir = await lstat(path.dirname(source));
    if ((dir.mode & 0o222) === 0) throw new Error();
    await access(path.dirname(source), constants.W_OK);
  } catch {
    writable = false;
  }
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink())
      throw new Error('Symbolic-link sidecars cannot be read or overwritten');
    if (info.size > 8 * 1024 * 1024) throw new Error('Sidecar exceeds the 8 MB safety limit');
    const text = await readFile(file, 'utf8');
    const revision = digest(text);
    try {
      const review = reviewSchema.parse(JSON.parse(text));
      // The correctly named sidecar is authoritative after an external rename.
      review.assetFile = path.basename(source);
      if (new Set(review.comments.map((c) => c.id)).size !== review.comments.length)
        throw new Error('Duplicate comment identifiers');
      return { review, revision, writable };
    } catch {
      return {
        review: empty,
        revision,
        writable: false,
        error: 'Notes are malformed or use an unsupported schema. The original file is preserved.',
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { review: empty, revision: null, writable };
    return {
      review: empty,
      revision: null,
      writable: false,
      error: `Cannot read notes: ${(error as Error).message}`,
    };
  }
}
const locks = new Map<string, Promise<unknown>>();
export async function saveReview(source: string, input: SaveInput): Promise<ReviewState> {
  const previous = locks.get(source) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const current = await readReview(source);
      if (current.error) throw new Error(current.error);
      if (!current.writable)
        throw new Error('This folder is read-only. Notes must be saved beside the source asset.');
      if (current.revision !== input.revision)
        throw new Error(
          'CONFLICT: Notes changed on disk. Reload the latest review before saving. Your draft is preserved.',
        );
      const review = reviewSchema.parse({
        ...current.review,
        status: input.status,
        comments: input.comments,
        updatedAt: new Date().toISOString(),
      });
      const target = sidecarPath(source);
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        const handle = await open(temporary, 'wx', 0o600);
        try {
          await handle.writeFile(JSON.stringify(review, null, 2) + '\n');
          await handle.sync();
        } finally {
          await handle.close();
        }
        // Narrow the optimistic race window; third-party writers do not share our lock.
        const latest = await readReview(source);
        if (latest.error || latest.revision !== input.revision)
          throw new Error('CONFLICT: Notes changed while saving. Your draft is preserved.');
        await rename(temporary, target);
        if (process.platform === 'win32') execFile('attrib', ['+H', target], () => {});
      } finally {
        await unlink(temporary).catch(() => {});
      }
      return readReview(source);
    });
  locks.set(source, next);
  try {
    return await next;
  } finally {
    if (locks.get(source) === next) locks.delete(source);
  }
}
