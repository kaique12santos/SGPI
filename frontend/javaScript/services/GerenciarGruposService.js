import { fetchJsonComAuth } from "../utils/fetchHelper.js";

/**
 * Normaliza dados de grupo recebidos do backend
 */
function normalizarGrupo(g) {
  if (!g) return null;
  return {
    id: g.id,
    nome: g.nome,
    semestreId: g.semestre_id,
    periodo: g.periodo,
    ano: g.ano,
    totalMembros: g.total_membros || 0,
    semestreAtivo: g.semestre_ativo || 0,
    semestrePadrao: g.semestre_padrao || null,
    dataCriacao: g.data_criacao || null,
    dataAtualizacao: g.data_atualizacao || null
  };
}

/**
 * Normaliza dados de membro recebidos do backend
 */
function normalizarMembro(m) {
  if (!m) return null;
  return {
    id: m.id,
    nome: m.nome,
    email: m.email,
    papel: m.papel || "Membro",
    dataEntrada: m.data_entrada || null
  };
}

/**
 * Normaliza dados de aluno recebidos do backend
 */
function normalizarAluno(a) {
  if (!a) return null;
  return {
    id: a.id,
    nome: a.nome,
    email: a.email || null,
    semestrePadrao: a.semestre_padrao || null
  };
}

// ========================
// 🔌 GRUPOS
// ========================

/**
 * Obter todos os grupos
 */
export async function obterGrupos() {
  const data = await fetchJsonComAuth("/grupos", null, "GET");
  return Array.isArray(data) ? data.map(normalizarGrupo) : [];
}

/**
 * Obter detalhes de um grupo específico
 */
export async function obterGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}`, null, "GET");
  return normalizarGrupo(data);
}

/**
 * Criar novo grupo
 */
export async function criarGrupo(dados) {
  const data = await fetchJsonComAuth("/grupos", dados, "POST");
  return {
    message: data.message || "Grupo criado com sucesso!",
    success: data.success,
    grupoId: data.grupoId
  };
}

/**
 * Atualizar grupo existente
 */
export async function atualizarGrupo(id, dados) {
  // 'dados' agora será { nome: "...", membros: [{id: 1, papel: "Líder"}] }
  const data = await fetchJsonComAuth(`/grupos/${id}`, dados, "PUT");
  return {
    message: data.message || "Grupo atualizado com sucesso!",
    success: data.success,
  };
}

/**
 * Excluir grupo
 */
export async function excluirGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}`, null, "DELETE");
  return {
    message: data.message || "Grupo excluído com sucesso!",
    success: data.success,
  };
}

// ========================
// 🔌 MEMBROS
// ========================

/**
 * Obter membros de um grupo
 */
export async function obterMembrosDoGrupo(id) {
  const data = await fetchJsonComAuth(`/grupos/${id}/membros`, null, "GET");
  return Array.isArray(data) ? data.map(normalizarMembro) : [];
}

// ========================
// 🔌 ALUNOS DISPONÍVEIS
// ========================

// NOVO: Função para buscar as disciplinas de orientação do professor
/**
 * Obter disciplinas de orientação do orientador logado no semestre ativo
 */
export async function obterMinhasOrientacoes(orientadorId) {
  const data = await fetchJsonComAuth(
    `/grupos/minhas-orientacoes/${orientadorId}`,
    null,
    "GET"
  );
  
  return {
    success: data.success || false,
    disciplinas: Array.isArray(data.disciplinas) ? data.disciplinas : []
  };
}


/**
 * Obter alunos disponíveis para formar grupos
 * Baseado no orientador logado E no semestre padrão selecionado
 */
// MODIFICADO: Adicionado parâmetro semestrePadrao
export async function obterAlunosDisponiveis(orientadorId, semestrePadrao) {
  // MODIFICADO: Adicionado parâmetro semestrePadrao na URL
  const data = await fetchJsonComAuth(
    `/grupos/alunos-disponiveis/${orientadorId}/${semestrePadrao}`, 
    null, 
    "GET"
  );
  
  return {
    success: data.success || false,
    semestreAtivo: data.semestreAtivo || null,
    alunos: Array.isArray(data.alunos) ? data.alunos.map(normalizarAluno) : []
  };
}
/**
 * Obter informações do semestre ativo
 */
export async function obterSemestreAtivo() {
  const data = await fetchJsonComAuth("/grupos/semestre-ativo", null, "GET");
  return {
    success: data.success || false,
    semestre: data.semestre || null
  };
}