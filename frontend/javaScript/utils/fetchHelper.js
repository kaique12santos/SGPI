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
   * Função para requisições JSON autenticadas (POST/PUT com JSON)
   * @param {string} url - URL da requisição
   * @param {object} data - Dados para enviar no body
   * @param {string} method - Método HTTP (POST, PUT, etc.)
   * @param {object} extraOptions - Opções extras do fetch
   * @returns {Promise<Response>} - Promise do fetch
   */
  async function fetchJsonComAuth(url, data, method = 'POST', extraOptions = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraOptions.headers,
      },
      ...extraOptions,
    };
  
    // só adiciona body se NÃO for GET e se tiver data
    if (method !== 'GET' && data !== null && data !== undefined) {
      options.body = JSON.stringify(data);
    }
  
    const res = await fetchComAuth(url, options);
  
    return res.json();
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

  async function fetchFormDataComAuthVersaoFormatada(url, formData, method = 'POST', extraOptions = {}) {
    const res = await fetchComAuth(url, {
      method,
      body: formData,
      ...extraOptions
    });
  
    return res.json(); // 🔑 agora retorna JSON ao invés do Response cru
  }
  
  // Exporta as funções (se usar módulos ES6)
  // export { fetchComAuth, fetchJsonComAuth, fetchFormDataComAuth };
  
  // Para compatibilidade com scripts tradicionais, deixa no window
  window.fetchComAuth = fetchComAuth;
  window.fetchJsonComAuth = fetchJsonComAuth;
  window.fetchFormDataComAuth = fetchFormDataComAuth;
  window.fetchFormDataComAuthVersaoFormatada= fetchFormDataComAuthVersaoFormatada;