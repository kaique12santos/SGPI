import { fetchJsonComAuth } from "../utils/fetchHelper.js";
export async function obterUsuarios() {
  return await fetchJsonComAuth('/usuarios', null, 'GET');
}

export async function atualizarTipoUsuario(userId, tipo) {
  return await fetchJsonComAuth(`/usuarios/${userId}/tipo`, { tipo }, 'PUT');
}

export async function atualizarStatusUsuario(userId, ativo) {
  return await fetchJsonComAuth(`/usuarios/${userId}/status`, { ativo }, 'PUT');
}