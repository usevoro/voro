// Static HTML is the baseline. With JS, the screenshots become a compact switcher.
const views = [...document.querySelectorAll('.app-view')];
const links = [...document.querySelectorAll('[data-view]')];
function selectView(id) {
  if (!views.some((view) => view.id === id)) return;
  for (const view of views) {
    view.hidden = view.id !== id;
    view.classList.toggle('view-enter', view.id === id);
  }
  for (const link of links) {
    if (link.dataset.view === id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}
selectView(location.hash === '#collection' ? 'collection' : 'inspection');
for (const link of links)
  link.addEventListener('click', (event) => {
    // Preserve open-in-new-tab and native navigation modifiers.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectView(link.dataset.view);
    history.replaceState(null, '', `#${link.dataset.view}`);
  });
window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));
// Suggest an OS only; generic Mac user agents cannot identify CPU architecture.
const ua = navigator.userAgent;
const mobile =
  /Android|iPhone|iPad|Mobile/i.test(ua) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const platform =
  !mobile &&
  (/Windows/i.test(ua)
    ? 'Windows'
    : /Macintosh|Mac OS X/i.test(ua)
      ? 'macOS'
      : /Linux/i.test(ua)
        ? 'Linux'
        : null);
const hint = document.querySelector('#platform-suggestion');
if (platform && hint) {
  hint.hidden = false;
  hint.textContent = `Looks like you’re on ${platform}. Choose your architecture below; all platforms are listed.`;
}
