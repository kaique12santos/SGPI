document.addEventListener('DOMContentLoaded', () => {
    const profileImages = document.querySelectorAll('.profile-image'); // Seleciona todos os elementos com a classe 'profile-image'
    const userId = localStorage.getItem('professorId');

    profileImages.forEach(imgElement => { // Itera sobre cada elemento encontrado
        if (userId && imgElement) {
            const imgUrl = `http://localhost:3000/imagens/perfil/user_${userId}.png`;
            imgElement.src = imgUrl;
            // Fallback: se imagem não carregar, mostra avatar padrão
            imgElement.onerror = function () {
                this.src = 'https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg';
            };
        }
    });
});
