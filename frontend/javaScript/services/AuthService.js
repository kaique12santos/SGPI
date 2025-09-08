// services/AuthService.js
// Serviço para autenticação e recuperação de senha

export async function solicitarRecuperacaoSenha(email) {
    return await fetchJsonComAuth('/recuperar-senha', { email }, 'POST');
  }
  
  export async function redefinirSenha(token, novaSenha) {
    return await fetchJsonComAuth('/redefinir-senha', { token, novaSenha }, 'POST');
  }