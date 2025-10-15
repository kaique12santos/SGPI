import { fetchJsonComAuth } from "../utils/fetchHelper.js";

/**
 * 🔹 Busca todas as disciplinas disponíveis para o aluno,
 * marcando quais ele já está matriculado.
 * @returns {Promise<{success: boolean, disciplinas: Array}>}
 */
export async function getDisciplinasDisponiveisAluno() {
  const alunoId = localStorage.getItem("usuarioId");
  if (!alunoId) {
    console.error("❌ ID do aluno não encontrado no localStorage.");
    return { success: false, disciplinas: [] };
  }

  try {
    const response = await fetchJsonComAuth(
      `/perfilAcademico/disciplinas-disponiveis/${alunoId}`,
      null,
      "GET"
    );
    return response;
  } catch (error) {
    console.error("❌ Erro ao buscar disciplinas do aluno:", error);
    return { success: false, disciplinas: [] };
  }
}

/**
 * 🔹 Atualiza as disciplinas selecionadas pelo aluno (salvar alterações).
 * @param {Array<number>} disciplinasSelecionadas - IDs das disciplinas.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function atualizarDisciplinasAluno(disciplinasSelecionadas) {
  const alunoId = localStorage.getItem("usuarioId");
  if (!alunoId) {
    console.error("❌ ID do aluno não encontrado no localStorage.");
    return { success: false, message: "Usuário não identificado." };
  }

  try {
    const response = await fetchJsonComAuth(
      `/perfilAcademico/disciplinas/${alunoId}`,
      { disciplinas: disciplinasSelecionadas },
      "PUT"
    );
    return response;
  } catch (error) {
    console.error("❌ Erro ao atualizar disciplinas do aluno:", error);
    return { success: false, message: "Falha ao atualizar disciplinas." };
  }
}
