export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const download =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>';
const github =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4.3 1.3-4.3-2-6-2m12 5v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.9A5.4 5.4 0 0 0 18.8 5a5 5 0 0 0-.1-3.7S17.5.9 15 2.7a13.1 13.1 0 0 0-7 0C5.5.9 4.3 1.3 4.3 1.3A5 5 0 0 0 4.2 5a5.4 5.4 0 0 0-1.5 3.7c0 5.3 3.2 6.6 6.2 6.9A3.4 3.4 0 0 0 8 18.2V22"/></svg>';
const logo = (light = false) =>
  `<img src="/brand/mark-${light ? 'white' : 'plum'}.svg" width="54" height="54" alt=""><span>voro</span>`;
const faqs = [
  [
    'What is VORO?',
    'VORO is a desktop workspace for browsing local 3D assets, inspecting models, and saving review feedback. It’s made for the little decisions that help a game world come together.',
  ],
  [
    'Which 3D formats can I preview?',
    'GLB and glTF models support interactive previews, including supported animations and Draco, Meshopt, and KTX2 compression. FBX, OBJ, Blender, and USD files can be cataloged and reviewed, but don’t have a built-in preview yet. Use the Preview available filter to focus on models you can inspect.',
  ],
  [
    'Do I need an account or an internet connection?',
    'The desktop review workflow runs locally and offline. There’s no VORO account to create and no project upload. An internet connection is needed to download the app.',
  ],
  [
    'Where do my notes go?',
    'Saved feedback lives in versioned JSON sidecar files next to the source asset, such as .Arc chair.glb.notes.json. Your project’s usual file and version-control workflow can carry the notes with it.',
  ],
  [
    'Can I use the feedback in other tools?',
    'Yes. Export reviews collects saved reviews into structured JSON with asset paths, review status, comments, stable IDs, and revisions. It’s readable by people, scripts, and AI tools you choose to use. Linear and Jira integrations are not available.',
  ],
  [
    'When can I download VORO?',
    'Public builds aren’t available yet. The platform section will link to verified releases as they become available. macOS, Windows, and Linux availability is listed separately; there’s no promised release date.',
  ],
];
export function renderPage(config, releases) {
  const e = escapeHtml;
  const repositoryUrl = config.publicRepository
    ? `https://github.com/${config.publicRepository}`
    : null;
  const githubUrl = repositoryUrl || config.organizationUrl;
  const hasBuild = releases.targets.some((t) => t.status === 'available');
  const cta = hasBuild ? 'Get VORO' : 'View platform availability';
  const star =
    releases.stars === null
      ? ''
      : `<span class="star-count" aria-label="${e(releases.stars)} GitHub stars">${e(new Intl.NumberFormat('en').format(releases.stars))} stars</span>`;
  const title = 'VORO — Local 3D Asset Review for Game Developers';
  const description =
    'Preview GLB and glTF models, leave useful feedback, and save review notes beside your assets. VORO is a local, offline 3D review workspace for game developers.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${config.origin}/#organization`,
        name: 'VORO',
        url: config.origin,
        logo: `${config.origin}/brand/icon.png`,
        sameAs: [config.organizationUrl],
      },
      {
        '@type': 'WebSite',
        '@id': `${config.origin}/#website`,
        name: 'VORO',
        url: config.origin,
        description,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'VORO',
        applicationCategory: 'DesignApplication',
        description,
        url: config.origin,
        creator: { '@id': `${config.origin}/#organization` },
        screenshot: `${config.origin}/images/inspection.jpg`,
        featureList: [
          'Local GLB and glTF preview',
          '3D asset review comments',
          'Versioned JSON sidecars',
          'Structured JSON review export',
        ],
        ...(hasBuild
          ? {
              operatingSystem: [
                ...new Set(
                  releases.targets.filter((t) => t.status === 'available').map((t) => t.platform),
                ),
              ].join(', '),
            }
          : {}),
      },
    ],
  };
  const platform = (name, detail) =>
    `<article class="platform" id="${name.toLowerCase()}"><div class="platform-heading"><h3>${name}</h3><p>${detail}</p></div><div class="build-list">${releases.targets
      .filter((t) => t.platform === name)
      .map(
        (t) =>
          `<div class="build"><h4>${e(t.architecture)}</h4>${t.status === 'available' ? `<p class="release-detail">v${e(t.version)} · ${e(t.channel === 'stable' ? 'Stable' : 'Early access')}<br>${e(t.minimumOS)} · ${e(t.fileType)} · ${e((t.sizeBytes / 1024 / 1024).toFixed(1))} MB</p><p class="signing">${e(t.signing)}</p><a class="button download" href="${e(t.url)}">${download}Download for ${e(t.architecture)}</a><p class="release-links"><a href="${e(t.releaseNotesUrl)}">Release notes</a>${t.checksumUrl ? ` · <a href="${e(t.checksumUrl)}">Checksum</a>` : ''}</p>` : '<p class="unavailable">Not available yet</p>'}</div>`,
      )
      .join('')}</div></article>`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${config.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}"><meta name="theme-color" content="#332a3c">
<link rel="canonical" href="${e(config.origin)}/"><link rel="icon" type="image/svg+xml" href="/brand/mark-plum.svg"><link rel="apple-touch-icon" href="/brand/icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="VORO"><meta property="og:title" content="VORO — Small details. Bigger worlds."><meta property="og:description" content="${description}"><meta property="og:url" content="${e(config.origin)}/"><meta property="og:image" content="${e(config.origin)}/images/social.jpg"><meta property="og:image:width" content="1600"><meta property="og:image:height" content="900"><meta property="og:image:alt" content="VORO’s sprout mascot and a painted miniature game world"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="VORO — Small details. Bigger worlds."><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${e(config.origin)}/images/social.jpg">
<link rel="preload" href="/brand/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script><script type="module" src="/main.js"></script>
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="header wrap"><a class="logo" href="/" aria-label="VORO home">${logo()}</a><nav aria-label="Main navigation"><a href="#workflow">How it works</a><a href="#downloads">Downloads</a><a class="github-link" href="${e(githubUrl)}">${github}<span>GitHub</span>${star}</a></nav><a class="button header-cta" href="#downloads">${hasBuild ? 'Get VORO' : 'Find your platform'}${arrow}</a></header>
<main id="main">
<section class="hero wrap" aria-labelledby="hero-heading"><div class="hero-copy"><h1 id="hero-heading">Small details.<br><span>Bigger worlds.</span></h1><p class="hero-description">A little room to explore your 3D assets, leave feedback, and get back to making games.</p><p class="product-definition">Your local 3D review workspace.</p><div class="hero-actions"><a class="button" href="#downloads">${cta}${arrow}</a><a class="text-link" href="#in-action">See it in action <span aria-hidden="true">↓</span></a></div><p class="hero-note">Your files. Your machine. Your little universe.</p></div><figure class="hero-art"><img src="/images/little-world.jpg" width="1100" height="1100" alt="A tiny mushroom cottage, a curious forest sprite, and a winding stream in VORO’s painted world" fetchpriority="high"><figcaption>Big worlds start with little things.</figcaption></figure></section>
<section class="demo-section wrap" id="in-action" aria-labelledby="demo-title"><div class="section-intro"><div><h2 id="demo-title">Give every asset<br>a little attention.</h2><p>From the whole collection to the edge of a chair.<br class="desktop-break"> Find the detail. Leave a clear next step.</p></div><div class="view-switch" aria-label="App screenshots"><a href="#inspection" data-view="inspection" aria-current="true">Inspect &amp; review</a><a href="#collection" data-view="collection">Browse the collection</a></div></div>
<div class="demo-stage"><figure id="inspection" class="app-view"><a href="/images/inspection.jpg" aria-label="Open the full-size asset inspection screenshot"><img src="/images/inspection.jpg" width="1480" height="960" alt="VORO’s full 3D viewer showing an Arc chair, with Needs changes status and a note to soften the seat’s front edge" loading="lazy"></a><figcaption><span>Room to look closer. Space to leave useful feedback.</span><a href="/images/inspection.jpg">View full size ${arrow}</a></figcaption></figure><figure id="collection" class="app-view"><a href="/images/collection.jpg" aria-label="Open the full-size asset collection screenshot"><img src="/images/collection.jpg" width="1480" height="960" alt="VORO’s asset gallery with local furniture, props, folder navigation, thumbnails, and review status filters" loading="lazy"></a><figcaption><span>Your project folder, ready to explore.</span><a href="/images/collection.jpg">View full size ${arrow}</a></figcaption></figure></div><p class="demo-note">Actual VORO app. Sample models and review notes.</p></section>
<section class="workflow wrap section" id="workflow" aria-labelledby="workflow-title"><div class="workflow-title"><h2 id="workflow-title">Less managing files.<br>More making worlds.</h2><p>Keep the feedback loop small, so your imagination can stay big.</p></div><ol class="steps"><li><span class="step-number" aria-hidden="true">1</span><div><h3>Open your folder.</h3><p>Point VORO at a project. Browse your assets where they already live, without importing or uploading a thing.</p></div></li><li><span class="step-number" aria-hidden="true">2</span><div><h3>Find the detail.</h3><p>Orbit and zoom into GLB and glTF models. Filter by folder, review status, or preview availability to find what needs a closer look.</p></div></li><li><span class="step-number" aria-hidden="true">3</span><div><h3>Leave a useful note.</h3><p>Approve the asset or explain what needs changing. Save the feedback beside the source, ready for the next pass.</p></div></li></ol></section>
<section class="notes-section" id="notes"><div class="wrap notes-grid"><div class="notes-copy"><h2>Good feedback <br>belongs with <br>the work.</h2><p>A note shouldn’t get lost in a chat thread. VORO saves readable JSON files beside your assets, so the context travels with your project.</p><p>Export saved reviews in one structured file for scripts, AI tools, or whatever you build next.</p><a class="text-link" href="/example-review.notes.json" download>Download a sample review ${download}</a></div><div class="review-paper"><div class="paper-heading"><span>Arc chair.glb</span><span class="review-status">Needs changes</span></div><blockquote>“Soften the front edge of the seat. Keep the profile light.”</blockquote><p class="saved-line">Saved beside asset</p><div class="file-pair"><span>Arc chair.glb</span><span>.Arc chair.glb.notes.json</span></div><p class="paper-caption">Illustrative feedback · real sidecar format</p></div></div></section>
<section class="downloads wrap section" id="downloads" aria-labelledby="downloads-title"><div class="section-intro"><div><h2 id="downloads-title">A home for your<br>next little world.</h2><p>${hasBuild ? 'Choose the build for your desktop and start exploring.' : 'VORO is taking shape. Choose your platform to see what’s available.'}</p></div><p class="availability-note">${hasBuild ? 'Each build lists its own version and requirements.' : 'Public downloads aren’t available yet.<br>Verified builds will appear here when they’re ready.'}</p></div><p id="platform-suggestion" class="platform-suggestion" hidden></p><div class="platforms">${platform('macOS', 'For the Mac on your desk.')}${platform('Windows', 'For your Windows workspace.')}${platform('Linux', 'For your Linux workspace.')}</div><div class="download-foot"><p>No account needed for the desktop review workflow.</p><a class="text-link" href="${e(githubUrl)}">${repositoryUrl ? 'Explore the repository' : 'Follow VORO on GitHub'} ${arrow}</a></div></section>
<section class="faq wrap section" id="faq" aria-labelledby="faq-title"><div><h2 id="faq-title">A few little <br>questions.</h2><p>Before you open your next world.</p></div><div class="questions">${faqs.map(([q, a]) => `<details><summary>${e(q)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><p>${e(q === 'When can I download VORO?' && hasBuild ? 'Available builds are listed above with their version, platform requirements, and release notes. Platforms without a verified release are marked Not available yet.' : a)}</p></details>`).join('')}</div></section>
<section class="closing"><div class="wrap closing-inner"><div><img src="/brand/mark-white.svg" width="76" height="76" alt=""><h2>Go make<br>something wonderful.</h2></div><a class="button button-light" href="#downloads">${hasBuild ? 'Find your download' : 'Find your platform'}${arrow}</a></div></section>
</main><footer class="footer wrap"><a class="logo" href="/" aria-label="VORO home">${logo()}</a><p>A little workspace for people making worlds.</p><nav aria-label="Footer navigation"><a href="${e(config.organizationUrl)}">GitHub organization</a>${repositoryUrl ? `<a href="${e(repositoryUrl)}">Repository</a><a href="${e(repositoryUrl)}/releases">Releases</a>` : ''}${config.docsUrl ? `<a href="${e(config.docsUrl)}">Documentation</a>` : ''}${config.issuesUrl ? `<a href="${e(config.issuesUrl)}">Report an issue</a>` : ''}<a href="#faq">Questions</a></nav></footer>
</body></html>`;
}
