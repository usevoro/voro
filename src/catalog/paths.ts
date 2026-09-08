import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
export function isWithin(root: string, target: string, platform = path): boolean {
  const relative = platform.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith(`..${platform.sep}`) &&
      relative !== '..' &&
      !platform.isAbsolute(relative))
  );
}
export async function authorizePath(
  root: string,
  relative: string,
  externalRoots: string[] = [],
): Promise<string> {
  if (relative.includes('\0') || relative.includes('\\') || path.isAbsolute(relative))
    throw new Error('Invalid resource path');
  const canonicalRoot = await realpath(root);
  const target = await realpath(path.resolve(canonicalRoot, relative));
  const approvedRoots = [
    canonicalRoot,
    ...(await Promise.all(externalRoots.map((root) => realpath(root)))),
  ];
  if (!approvedRoots.some((root) => isWithin(root, target)))
    throw new Error('Resource is outside the approved project folders');
  if (!(await stat(target)).isFile()) throw new Error('Resource is not a file');
  return target;
}
export const posixPath = (value: string) => value.split(path.sep).join('/');
export const DEFAULT_EXCLUSIONS = [
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  'dist',
  'build',
  '.cache',
  '.next',
  '.asset-reviewer',
];
export function excluded(relative: string, exclusions: string[]) {
  return relative.split('/').some((part) => exclusions.includes(part));
}
