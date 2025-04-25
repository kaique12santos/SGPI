document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('userRole');
            window.location.href = '/index.html';
            
            
        });
    }
});

