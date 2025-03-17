
function setTheme(themeName) {
  localStorage.setItem('theme', themeName);
  document.documentElement.className = themeName;
}

function applyTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
      document.documentElement.className = savedTheme;
  } else {
      document.documentElement.className = 'light-mode'; // Tema padrão
  }
}

applyTheme(); // Aplicar tema ao carregar

const themeButton = document.querySelector('.theme');
if (themeButton) {
  themeButton.addEventListener('click', () => {
      // Alternar entre 'dark-mode' e 'light-mode'
      if (document.documentElement.classList.contains('dark-mode')) {
          setTheme('light-mode');
      } else {
          setTheme('dark-mode');
      }
  });
}

window.addEventListener('storage', (event) => {
  if (event.key === 'theme') {
      applyTheme();
  }
});