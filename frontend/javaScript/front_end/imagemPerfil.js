import { fetchComAuth } from "../utils/fetchHelper.js";

document.addEventListener('DOMContentLoaded', async () => {
  const profileImages = document.querySelectorAll('.profile-image');
  const userId = localStorage.getItem('usuarioId');

  if (!userId) return;

  let fotoUrl = './imagens/avatar-default.png';
  try {
    // agora usando fetchComAuth
    const userId = localStorage.getItem('usuarioId');
    const resp = await fetchComAuth(`/perfil/${userId}`)
    if (resp.ok) {
      const data = await resp.json();
      const userData = data.usuario ?? data;
      fotoUrl = `/perfil/${userId}/foto`;
    }
  } catch (e) {
    console.warn('Erro ao buscar imagem de perfil:', e);
  }

  // Atualiza todas as imagens com a foto do perfil
  profileImages.forEach(imgElement => {
    if (!imgElement) return;
    imgElement.src = fotoUrl + '?t=' + Date.now();
    imgElement.onerror = function () {
      this.onerror = null;
      this.src = './imagens/avatar-default.png';
    };
  });
});