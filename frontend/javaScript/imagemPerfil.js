document.addEventListener('DOMContentLoaded', () => {
    const profileImages = document.querySelectorAll('.profile-image'); 
    const userId = localStorage.getItem('usuarioId');

    profileImages.forEach(imgElement => { 
        if (userId && imgElement) {
            const imgUrl = `http://localhost:3000/imagens/perfil/user_${userId}.png`;
            imgElement.src = imgUrl;
            imgElement.onerror = function () {
                this.src = 'https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg';
            };
        }
    });
});
