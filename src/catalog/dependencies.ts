import { open, stat } from 'node:fs/promises';
import path from 'node:path';
import { authorizePath, posixPath } from './paths';
import { digest } from './notes';
export async function dependencies(root: string, relative: string, externalRoots: string[] = []) {
  const errors: string[] = [],
    refs: string[] = [],
    signals: string[] = [];
  try {
    const file = await authorizePath(root, relative);
    const info = await stat(file);
    signals.push(`${info.size}:${info.mtimeMs}:${info.ctimeMs}`);
    const handle = await open(file, 'r');
    let json: any;
    try {
      if (path.extname(relative).toLowerCase() === '.glb') {
        const header = Buffer.alloc(20);
        await handle.read(header, 0, 20, 0);
        if (
          header.toString('ascii', 0, 4) !== 'glTF' ||
          header.readUInt32LE(4) !== 2 ||
          header.readUInt32LE(16) !== 0x4e4f534a
        )
          throw new Error('Invalid GLB 2.0 header');
        const length = header.readUInt32LE(12);
        if (length > 32 * 1024 * 1024 || length + 20 > info.size)
          throw new Error('Invalid or excessively large GLB metadata');
        const data = Buffer.alloc(length);
        await handle.read(data, 0, length, 20);
        json = JSON.parse(data.toString());
      } else {
        if (info.size > 32 * 1024 * 1024)
          throw new Error('glTF JSON exceeds the 32 MB safety limit');
        json = JSON.parse(await handle.readFile('utf8'));
      }
    } finally {
      await handle.close();
    }
    for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
      if (typeof item.uri !== 'string' || item.uri.startsWith('data:')) continue;
      if (
        /^[a-z][a-z\d+.-]*:/i.test(item.uri) ||
        item.uri.startsWith('//') ||
        item.uri.includes('\\') ||
        item.uri.startsWith('/')
      ) {
        errors.push(`Blocked external resource: ${item.uri}`);
        continue;
      }
      try {
        const ref = posixPath(path.join(path.dirname(relative), decodeURIComponent(item.uri)));
        refs.push(ref);
        const dep = await authorizePath(root, ref, externalRoots);
        const depStat = await stat(dep);
        signals.push(`${ref}:${depStat.size}:${depStat.mtimeMs}:${depStat.ctimeMs}`);
      } catch {
        errors.push(`Missing or unauthorized dependency: ${item.uri}`);
        signals.push(`missing:${item.uri}`);
      }
    }
  } catch (error) {
    errors.push((error as Error).message);
  }
  return {
    refs,
    errors,
    fingerprint: digest(
      `preview-v3:artbook-neutral:384:${root}:${relative}:${signals.join('|')}:${errors.join('|')}`,
    ),
  };
}
