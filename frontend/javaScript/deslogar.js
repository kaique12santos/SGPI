// logout.js
document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Limpar o localStorage
            localStorage.removeItem('userRole');
            // Você pode limpar também outros itens se necessário
            // localStorage.clear(); // Use isso para limpar tudo
            
            // Redirecionar para a página de login
            window.location.href = '/index.html';
            
            // Se você estiver usando uma SPA ou framework, pode precisar de lógica adicional aqui
        });
    }
});

