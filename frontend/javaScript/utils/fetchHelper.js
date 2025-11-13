import { ativar } from "../utils/alerts.js";

/**
 * Função para fazer requisições autenticadas com JWT
 * @param {string} url - URL da requisição
 * @param {object} options - Opções do fetch (method, body, headers, etc.)
 * @returns {Promise<Response>} - Promise do fetch
 */
function fetchComAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...options.headers
  };
  
  // Só adiciona Authorization se o token existir
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  
  return fetch(url, { ...options, headers });
}

/**
* Função para requisições JSON autenticadas (POST/PUT/GET com JSON)
* Melhorado para tratar erros HTTP e garantir o retorno de JSON válido.
* @param {string} url - URL da requisição
* @param {object | null} data - Dados para enviar no body (null para GET sem body)
* @param {string} method - Método HTTP (GET, POST, PUT, etc.)
* @param {object} extraOptions - Opções extras do fetch
* @returns {Promise<object | Array>} - Promise que resolve para um objeto JSON ou array.
*                                      Em caso de erro na API ou rede, lança um erro.
*/
async function fetchJsonComAuth(url, data = null, method = 'GET', extraOptions = {}) { // Adicionado default para data e method
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...extraOptions.headers,
    },
    ...extraOptions,
  };

  // só adiciona body se NÃO for GET e se tiver data válida
  if (method !== 'GET' && data !== null && data !== undefined) {
    options.body = JSON.stringify(data);
  }

  try {
      const res = await fetchComAuth(url, options);

      // --- INÍCIO DO TRATAMENTO DE ERROS HTTP E RETORNO DE JSON ---
      if (!res.ok) {
          let errorBody = {};
          try {
              // Tenta parsear o corpo da resposta para JSON mesmo em caso de erro HTTP
              errorBody = await res.json();
          } catch (e) {
              // Se não conseguir parsear, o corpo não é JSON, usa uma mensagem padrão
              errorBody = { message: `Erro HTTP ${res.status}: ${res.statusText || 'Erro desconhecido.'}` };
          }
          // Lança um erro para ser capturado pelo .catch() do chamador
          throw new Error(errorBody.message || `Erro desconhecido: Status ${res.status}`);
      }

      // Se a resposta for OK, tenta parsear o JSON
      const responseData = await res.json();
      if (url.includes('/usuarios') && method === 'GET' && !Array.isArray(responseData)) {
        console.warn(`A API para ${url} (GET) não retornou um array. Retornando array vazio.`);
        return []; // Retorna um array vazio aqui!
      }
      return responseData;

  } catch (error) {
      console.error(`Erro em fetchJsonComAuth para URL ${url}:`, error);
      // Re-lança o erro para que a função chamadora (ex: obterUsuarios) possa tratá-lo.
      // if (typeof ativar === 'function') {
      //    ativar(`Falha na comunicação com o servidor: ${error.message}`, 'erro','');
      // }
      throw error; // É importante re-lançar para que o try-catch em 'carregarUsuarios' funcione
  }
}

/**
* Função para upload de arquivos autenticado (FormData)
* @param {string} url - URL da requisição
* @param {FormData} formData - FormData com os arquivos
* @param {string} method - Método HTTP (POST, PUT, etc.)
* @param {object} extraOptions - Opções extras do fetch
* @returns {Promise<Response>} - Promise do fetch
*/
function fetchFormDataComAuth(url, formData, method = 'POST', extraOptions = {}) {
  return fetchComAuth(url, {
    method,
    body: formData,
    // NÃO definir Content-Type para FormData (o browser define automaticamente)
    ...extraOptions
  });
}

// Mantenha esta versão se você quiser o response.json() já feito para FormData
async function fetchFormDataComAuthVersaoFormatada(url, formData, method = 'POST', extraOptions = {}) {
  const res = await fetchComAuth(url, {
    method,
    body: formData,
    ...extraOptions
  });

  if (!res.ok) {
      let errorBody = {};
      try {
          errorBody = await res.json();
      } catch (e) {
          errorBody = { message: `Erro HTTP ${res.status}: ${res.statusText || 'Erro desconhecido.'}` };
      }
      throw new Error(errorBody.message || `Erro desconhecido: Status ${res.status}`);
  }

  return res.json();
}

// Exporta as funções (se usar módulos ES6)
export { fetchComAuth, fetchJsonComAuth, fetchFormDataComAuth, fetchFormDataComAuthVersaoFormatada };


// window.fetchComAuth = fetchComAuth;
// window.fetchJsonComAuth = fetchJsonComAuth;
// window.fetchFormDataComAuth = fetchFormDataComAuth;
// window.fetchFormDataComAuthVersaoFormatada = fetchFormDataComAuthVersaoFormatada;