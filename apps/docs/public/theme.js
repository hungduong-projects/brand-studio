// Runs before first paint so a saved dark choice never flashes light.
try {
  var saved = JSON.parse(localStorage.getItem('bs-docs-demo') || 'null');
  var dark = saved && saved.mode ? saved.mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
} catch (error) {}
