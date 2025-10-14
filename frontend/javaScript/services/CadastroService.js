import { fetchJsonComAuth } from "../utils/fetchHelper.js";

/**
 * Serviço responsável por enviar os dados do usuário
 * para o endpoint /cadastro do backend.
 */
export async function cadastrarUsuario(dados) {
  // Monta o payload conforme o backend espera
  const payload = {
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    tipo: dados.tipo || dados.perfil, // compatível com perfis do front
    disciplinas: Array.isArray(dados.disciplinas) ? dados.disciplinas : [],
    chaveProfessor: dados.chaveProfessor || null,
    termos_aceitos: dados.termos_aceitos ? 1 : 0,
    politica_privacidade: dados.politica_privacidade ? 1 : 0
  };

  try {
    // Envia requisição POST autenticada para o backend
    const response = await fetchJsonComAuth("/cadastro", payload, "POST");
    return response;
  } catch (error) {
    console.error("❌ Erro ao cadastrar usuário:", error);
    throw error;
  }
}
/**
 * Valida o token enviado por e-mail no processo de cadastro.
 * Endpoint: POST /validar-token
 */
export async function validarTokenCadastro(codigo) {
  const payload = { codigo };

  try {
    const response = await fetchJsonComAuth("/validar-token", payload, "POST");
    return response;
  } catch (error) {
    console.error("❌ Erro ao validar token de cadastro:", error);
    throw error;
  }
}

/**
 * Reenvia o e-mail de validação de token para o usuário.
 * Endpoint: POST /reenviar-validacao
 */
export async function reenviarTokenCadastro(email) {
  const payload = { email };

  try {
    const response = await fetchJsonComAuth("/reenviar-validacao", payload, "POST");
    return response;
  } catch (error) {
    console.error("❌ Erro ao reenviar token de validação:", error);
    throw error;
  }
}

/**
 * Valida a chave de professor antes do cadastro.
 * Endpoint: POST /validar-chave-professor
 */
export async function validarChaveProfessor(chaveProfessor) {
  const payload = { chaveProfessor };

  try {
    const response = await fetchJsonComAuth("/validar-chave-professor", payload, "POST");
    return response;
  } catch (error) {
    console.error("❌ Erro ao validar chave do professor:", error);
    throw error;
  }
}