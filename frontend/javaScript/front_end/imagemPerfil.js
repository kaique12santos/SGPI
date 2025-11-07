// import { fetchComAuth } from "../utils/fetchHelper.js";

// document.addEventListener('DOMContentLoaded', async () => {
//   const profileImages = document.querySelectorAll('.profile-image');
//   const userId = localStorage.getItem('usuarioId');

//   if (!userId) return;

//   let fotoUrl = './imagens/avatar-default.png';
//   try {
//     // agora usando fetchComAuth
//     const userId = localStorage.getItem('usuarioId');
//     const resp = await fetchComAuth(`/perfil/${userId}`)
//     if (resp.ok) {
//       const data = await resp.json();
//       const userData = data.usuario ?? data;
//       fotoUrl = `/perfil/${userId}/foto`;
//     }
//   } catch (e) {
//     console.warn('Erro ao buscar imagem de perfil:', e);
//   }

//   // Atualiza todas as imagens com a foto do perfil
//   profileImages.forEach(imgElement => {
//     if (!imgElement) return;
//     imgElement.src = fotoUrl + '?t=' + Date.now();
//     imgElement.onerror = function () {
//       this.onerror = null;
//       this.src = './imagens/avatar-default.png';
//     };
//   });
// });

import { fetchComAuth } from "../utils/fetchHelper.js";

// ==========================================
// SISTEMA DE CACHE PARA IMAGEM DE PERFIL
// ==========================================

const CACHE_KEY_PREFIX = 'profile_image_';
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora em milissegundos

/**
 * Obtém a imagem do cache se ainda estiver válida
 */
function getFromCache(userId) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { url, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Verifica se o cache expirou
    if (now - timestamp > CACHE_EXPIRATION_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return url;
  } catch (error) {
    console.warn('Erro ao ler cache de imagem:', error);
    return null;
  }
}

/**
 * Salva a URL da imagem no cache
 */
function saveToCache(userId, url) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cacheData = {
      url: url,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Erro ao salvar cache de imagem:', error);
  }
}

/**
 * Invalida o cache da imagem de perfil
 * Use esta função depois de atualizar a foto de perfil
 */
export function invalidarCacheImagemPerfil(userId) {
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
  localStorage.removeItem(cacheKey);
  console.log('Cache de imagem de perfil invalidado');
}

/**
 * Busca a URL da imagem de perfil (com cache)
 */
async function buscarImagemPerfil(userId) {
  // 1. Tenta obter do cache primeiro
  const cachedUrl = getFromCache(userId);
  if (cachedUrl) {
    console.log('🎯 Imagem de perfil carregada do cache:', cachedUrl);
    return cachedUrl;
  }


  console.log('🌐 Construindo URL da imagem de perfil do servidor...');
  
  const fotoUrl = `/perfil/${userId}/foto?t=${Date.now()}`;
  
  // Salva no cache (mesmo que a foto não exista, o cache expira em 1h)
  saveToCache(userId, fotoUrl);
  
  console.log('💾 URL salva no cache:', fotoUrl);

  return fotoUrl;
}

/**
 * Atualiza todas as imagens de perfil na página
 */
async function atualizarImagensPerfil() {
  const profileImages = document.querySelectorAll('.profile-image');
  const userId = localStorage.getItem('usuarioId');

  if (!userId) {
    console.warn('⚠️ ID do usuário não encontrado');
    return;
  }

  // Busca a URL da imagem (do cache ou servidor)
  const fotoUrl = await buscarImagemPerfil(userId);
  
  console.log('🖼️ Atualizando', profileImages.length, 'imagens de perfil com URL:', fotoUrl);

  // Atualiza todas as imagens com a foto do perfil
  profileImages.forEach((imgElement, index) => {
    if (!imgElement) return;
    
    console.log(`  → Atualizando imagem ${index + 1}:`, imgElement);
    
    // Remove o onerror anterior para evitar loops
    imgElement.onerror = null;
    
    // Define a nova URL
    imgElement.src = fotoUrl;
    
    // Configura fallback para imagem padrão em caso de erro
    imgElement.onerror = function () {
      console.warn('⚠️ Erro ao carregar foto, usando avatar padrão');
      this.onerror = null; // Previne loop infinito
      this.src = './imagens/avatar-default.png';
    };
    
    imgElement.onload = function () {
      console.log('✅ Imagem carregada com sucesso:', this.src);
    };
  });
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', atualizarImagensPerfil);

// ==========================================
// EXPORTS
// ==========================================

// Exporta funções para uso em outros módulos
export { 
  atualizarImagensPerfil,
  buscarImagemPerfil 
};