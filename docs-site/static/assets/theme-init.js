// Sets the colour mode before the page paints. Docusaurus does this with an inline
// script, which the site's CSP (script-src 'self') blocks, so without this file every
// page would render in light mode until the toggle is clicked. Mirrors that script:
// ?docusaurus-theme=, then the saved choice ("theme", or "theme-<namespace>"), then dark.
(function () {
  var choice;
  try { choice = new URLSearchParams(window.location.search).get('docusaurus-theme'); } catch (e) {}
  if (!choice) {
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (/^theme(-[\w-]+)?$/.test(key)) { choice = window.localStorage.getItem(key); break; }
      }
    } catch (e) {}
  }
  var theme = choice === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme-choice', theme);
})();
