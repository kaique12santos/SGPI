
import { fetchComAuth } from "../utils/fetchHelper.js";
// Admin
export const getAdminTotalUsuarios = () => fetchComAuth('/dashboard/admin/total-usuarios');
export const getAdminLogs = () => fetchComAuth('/dashboard/admin/logs');

// Coordenador
export const getCoordTotalProjetos = () => fetchComAuth('/dashboard/coordenador/total-projetos');
export const getCoordTaxaConclusao = () => fetchComAuth('/dashboard/coordenador/taxa-conclusao');
export const getCoordProjetosStatus = () => fetchComAuth('/dashboard/coordenador/projetos-status');

// Professor
export const getProfTotalAtividades = (id) => fetchComAuth(`/dashboard/professor/total-atividades/${id}`);
export const getProfEntregas = (id) => fetchComAuth(`/dashboard/professor/entregas/${id}`);
export const getProfMediaNotas = (id) => fetchComAuth(`/dashboard/professor/media-notas/${id}`);
export const getProfReconsideracoes = (id) => fetchComAuth(`/dashboard/professor/reconsideracoes/${id}`);
export const getProfSemestresAnteriores = (id) => fetchComAuth(`/dashboard/professor/semestres-anteriores/${id}`);

// Orientador
export const getOriProjetosAtivos = (id) => fetchComAuth(`/dashboard/orientador/projetos-ativos/${id}`);
export const getOriProjetosStatus = (id) => fetchComAuth(`/dashboard/orientador/projetos-status/${id}`);
export const getOriTotalGrupos = (id) => fetchComAuth(`/dashboard/orientador/total-grupos/${id}`);
export const getOriTotalAlunos = (id) => fetchComAuth(`/dashboard/orientador/total-alunos/${id}`);
export const getOriTaxaConclusao = (id) => fetchComAuth(`/dashboard/orientador/taxa-conclusao/${id}`);
export const getOriHistoricoSemestres = (id) => fetchComAuth(`/dashboard/orientador/historico-semestres/${id}`);
