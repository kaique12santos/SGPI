//import { fetchJsonComAuth } from "../utils/fetchHelper.js";

function normalizarGrupo(g) {
  if (!g) return null;
  return {
    id: g.id,
    nome: g.nome,
    semestre: g.semestre,
    descricao: g.descricao || null,
    dataCriacao: g.data_criacao || null,
    dataAtualizacao: g.data_atualizacao || null
  };
}

function normalizarMembro(m) {
  if (!m) return null;
  return {
    id: m.id,
    nome: m.nome,
    email: m.email,
    papel: m.papel || "Aluno",
    dataEntrada: m.data_entrada || null
  };
}

// ========================
// 📌 Grupos
// ========================
export async function obterGrupos() {
  const data = await fetchJsonComAuth("/grupos", null, "GET");
  return Array.isArray(data) ? data.map(normalizarGrupo) : [];
}

export async function obterGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}`, null, "GET");
  return normalizarGrupo(data);
}

export async function criarGrupo(dados) {
  const data = await fetchJsonComAuth("/grupos", dados, "POST");
  return {
    message: data.message || "Grupo criado com sucesso!",
    success: data.success,
  };
}

export async function atualizarGrupo(id, dados) {
  const data = await fetchJsonComAuth(`/grupos/${id}`, dados, "PUT");
  return {
    message: data.message || "Grupo atualizado com sucesso!",
    success: data.success,
  };
}

export async function excluirGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}`, null, "DELETE");
  return {
    message: data.message || "Grupo excluído com sucesso!",
    success: data.success,
  };
}

// ========================
// 📌 Membros
// ========================
export async function obterMembrosDoGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}/membros`, null, "GET");
  return Array.isArray(data) ? data.map(normalizarMembro) : [];
}

// ========================
// 📌 Alunos
// ========================
export async function obterAlunosPorSemestre(semestre) {
    const data = await fetchJsonComAuth(`/alunos/semestre/${semestre}`, null, "GET");
  
    return Array.isArray(data)
      ? data.map(a => ({
          id: a.ID ?? a.id,
          nome: a.NOME ?? a.nome
        }))
      : [];
  }
  
