// main.js — Theme + Global utilities

function initTheme() {
  const saved = localStorage.getItem('cx_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    updateThemeBtn(true);
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('cx_theme', isLight ? 'light' : 'dark');
  updateThemeBtn(isLight);
}

function updateThemeBtn(isLight) {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.innerHTML = isLight
    ? '<i class="fas fa-moon"></i>'
    : '<i class="fas fa-sun"></i>';
  btn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
}

// Run on every page
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  // Wire theme button on pages that have it
  const btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', toggleTheme);
});
