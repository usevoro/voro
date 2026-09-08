export function resolveConfig(input, env = process.env) {
  const config = structuredClone(input);
  const vercelOrigin = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const origin = new URL(
    env.SITE_ORIGIN ||
      config.origin ||
      (vercelOrigin ? `https://${vercelOrigin}` : 'https://localhost'),
  );
  if (
    origin.protocol !== 'https:' ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    throw new Error('SITE_ORIGIN must be an HTTPS origin without a path.');
  config.origin = origin.origin;
  const requested = env.SITE_INDEXABLE === 'true' || config.indexable === true;
  config.indexable = requested && (!env.VERCEL_ENV || env.VERCEL_ENV === 'production');
  if (config.indexable && ((!env.SITE_ORIGIN && !input.origin) || origin.hostname === 'localhost'))
    throw new Error('Public indexing requires an explicit production SITE_ORIGIN.');
  return config;
}
