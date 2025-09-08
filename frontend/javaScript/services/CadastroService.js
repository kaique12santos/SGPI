
// services/CadastroService.js
export async function cadastrarUsuario(dados) {
  return fetchJsonComAuth("/cadastro", dados, 'POST'); 
}