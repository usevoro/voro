export const DAY = 24 * 60 * 60 * 1000;
const definitions = {
  'mac-arm64': ['macOS', 'Apple silicon'],
  'mac-x64': ['macOS', 'Intel'],
  'windows-x64': ['Windows', '64-bit (x64)'],
  'linux-x64': ['Linux', '64-bit (x64)'],
};
export function repositoryName(value) {
  if (!/^usevoro\/[a-zA-Z0-9_.-]+$/.test(value || ''))
    throw new Error('Expected an explicitly approved usevoro public repository.');
  return value;
}
export function githubUrl(value, repository, kind) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid release URL');
  }
  const prefix = `/${repository}/releases/${kind}/`;
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(prefix) ||
    url.pathname
      .slice(prefix.length)
      .split('/')
      .some((x) => !x || x === '.' || x === '..')
  )
    throw new Error('Release URL must belong to the approved GitHub repository.');
  return value;
}
function timestamp(value) {
  return typeof value === 'string' ? Date.parse(value) : NaN;
}
function recent(value, now) {
  const age = now - timestamp(value);
  return Number.isFinite(age) && age >= 0 && age <= DAY;
}
export function validateManifest(manifest) {
  if (
    manifest.schemaVersion !== 1 ||
    !Number.isFinite(timestamp(manifest.generatedAt)) ||
    !Array.isArray(manifest.targets)
  )
    throw new Error('Invalid release manifest.');
  if (manifest.repository !== null) repositoryName(manifest.repository);
  const seen = new Set();
  for (const target of manifest.targets) {
    const expected = definitions[target.id];
    if (
      !expected ||
      seen.has(target.id) ||
      target.platform !== expected[0] ||
      target.architecture !== expected[1]
    )
      throw new Error('Duplicate or invalid platform target.');
    seen.add(target.id);
    if (!['available', 'unavailable', 'planned'].includes(target.status))
      throw new Error('Invalid release status.');
    if (target.status !== 'available') continue;
    repositoryName(manifest.repository);
    for (const key of ['version', 'tag', 'assetName', 'minimumOS', 'fileType', 'signing']) {
      if (typeof target[key] !== 'string' || !target[key].trim())
        throw new Error(`Available build requires ${key}.`);
    }
    if (
      !['stable', 'prerelease'].includes(target.channel) ||
      !Number.isSafeInteger(target.sizeBytes) ||
      target.sizeBytes <= 0 ||
      !Number.isFinite(timestamp(target.verifiedAt))
    )
      throw new Error('Incomplete release metadata.');
    githubUrl(target.url, manifest.repository, 'download');
    githubUrl(target.releaseNotesUrl, manifest.repository, 'tag');
    if (target.checksumUrl) githubUrl(target.checksumUrl, manifest.repository, 'download');
  }
  if (seen.size !== Object.keys(definitions).length)
    throw new Error('Every supported platform target must be declared.');
  if (
    manifest.stars !== null &&
    (!Number.isSafeInteger(manifest.stars?.count) ||
      manifest.stars.count < 0 ||
      manifest.stars.repository !== manifest.repository ||
      !Number.isFinite(timestamp(manifest.stars.fetchedAt)))
  )
    throw new Error('Invalid star cache.');
  return manifest;
}
export function visibleReleaseData(manifest, publicRepository, now = Date.now()) {
  validateManifest(manifest);
  const approved = !!publicRepository && manifest.repository === publicRepository;
  return {
    targets: manifest.targets.map((target) => ({
      ...target,
      status:
        target.status === 'available' && (!approved || !recent(target.verifiedAt, now))
          ? 'unavailable'
          : target.status,
    })),
    stars:
      approved && manifest.stars && recent(manifest.stars.fetchedAt, now)
        ? manifest.stars.count
        : null,
  };
}
// Anonymous requests prove the target is usable by a signed-out visitor. Never send a token.
export async function refreshManifest(
  manifest,
  publicRepository,
  request = fetch,
  now = Date.now(),
) {
  validateManifest(manifest);
  if (!publicRepository) return manifest;
  repositoryName(publicRepository);
  if (publicRepository !== manifest.repository)
    throw new Error('Public repository and manifest must agree.');
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const read = async (path) =>
    request(`https://api.github.com/repos/${publicRepository}${path}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
  const result = structuredClone(manifest);
  const fetchedAt = new Date(now).toISOString();
  try {
    const response = await read('');
    if (
      response.status === 404 ||
      (response.status === 403 && response.headers.get('x-ratelimit-remaining') !== '0')
    ) {
      result.stars = null;
      result.targets.forEach((t) => {
        if (t.status === 'available') t.status = 'unavailable';
      });
      return { ...result, generatedAt: fetchedAt };
    }
    if (!response.ok) return result;
    const repo = await response.json();
    if (repo.private !== false || repo.full_name !== publicRepository)
      throw new Error('Repository is not public.');
    result.stars = Number.isSafeInteger(repo.stargazers_count)
      ? { count: repo.stargazers_count, repository: publicRepository, fetchedAt }
      : null;
    for (const target of result.targets.filter((t) => t.status === 'available')) {
      const response = await read(`/releases/tags/${encodeURIComponent(target.tag)}`);
      if (response.status === 404) {
        target.status = 'unavailable';
        continue;
      }
      if (!response.ok) continue; // Existing verification expires after 24 hours.
      const release = await response.json();
      const asset = release.assets?.find(
        (a) => a.name === target.assetName && a.state === 'uploaded',
      );
      const checksum =
        !target.checksumUrl ||
        release.assets?.some(
          (a) => a.browser_download_url === target.checksumUrl && a.state === 'uploaded',
        );
      if (
        release.draft ||
        release.tag_name !== target.tag ||
        !!release.prerelease !== (target.channel === 'prerelease') ||
        !asset ||
        !checksum
      ) {
        target.status = 'unavailable';
        continue;
      }
      target.url = githubUrl(asset.browser_download_url, publicRepository, 'download');
      target.releaseNotesUrl = githubUrl(release.html_url, publicRepository, 'tag');
      target.sizeBytes = asset.size;
      target.verifiedAt = fetchedAt;
    }
  } catch {
    /* Offline/rate-limited builds keep cache; rendering enforces its expiry. */
  }
  result.generatedAt = fetchedAt;
  return validateManifest(result);
}
