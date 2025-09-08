import { ativar } from "../utils/alerts.js";
import {
  obterGruposPorSemestre,
  obterProjetosPorOrientador,
  criarProjetoAPI
} from "../services/projetosServices.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formProjeto');
  if (form) form.addEventListener('submit', criarProjeto);

  const semestreSelect = document.getElementById('semestre');
  if (semestreSelect) {
    semestreSelect.addEventListener('change', function () {
      const semestreSelecionado = this.value;
      if (semestreSelecionado) {
        carregarGruposPorSemestre(semestreSelecionado);
      } else {
        const grupoSelect = document.getElementById('grupo');
        if (grupoSelect) grupoSelect.innerHTML = '<option value="">Selecione um grupo</option>';
      }
    });
  }

  // carregamento inicial (sem filtro)
  carregarGruposPorSemestre();
});

async function carregarGruposPorSemestre(semestre) {
  const grupoSelect = document.getElementById('grupo');
  if (!grupoSelect) return;
  grupoSelect.innerHTML = '<option value="">Carregando grupos...</option>';

  try {
    const orientadorId = localStorage.getItem('usuarioId');
    const [resGrupos, resProjetos] = await Promise.all([
      obterGruposPorSemestre(semestre),
      obterProjetosPorOrientador(orientadorId)
    ]);

    grupoSelect.innerHTML = '';

    if (resGrupos && resGrupos.success && Array.isArray(resGrupos.grupos) && resGrupos.grupos.length > 0) {
      const gruposUsados = Array.isArray(resProjetos.projetos) ? resProjetos.projetos.map(p => p.grupo_id) : [];
      const gruposDisponiveis = resGrupos.grupos.filter(g => !gruposUsados.includes(g.ID));

      if (gruposDisponiveis.length === 0) {
        grupoSelect.innerHTML = '<option value="">Nenhum grupo disponível</option>';
        return;
      }

      grupoSelect.innerHTML = '<option value="">Selecione um grupo</option>';
      gruposDisponiveis.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.ID;
        opt.textContent = g.NOME;
        grupoSelect.appendChild(opt);
      });
    } else {
      grupoSelect.innerHTML = '<option value="">Nenhum grupo encontrado</option>';
    }
  } catch (e) {
    console.error('Erro ao carregar grupos:', e);
    grupoSelect.innerHTML = '<option value="">Erro ao buscar grupos</option>';
  }
}

async function criarProjeto(event) {
  event.preventDefault();

  const tituloEl = document.getElementById('titulo');
  const descricaoEl = document.getElementById('descricao');
  const semestreEl = document.getElementById('semestre');
  const grupoEl = document.getElementById('grupo');

  const titulo = tituloEl ? tituloEl.value.trim() : '';
  const descricao = descricaoEl ? descricaoEl.value.trim() : '';
  const semestre = semestreEl ? semestreEl.value.trim() : '';
  const grupo_id = grupoEl ? grupoEl.value : '';
  const orientador_id = localStorage.getItem('usuarioId'); // já salvo no login

  if (!titulo || !grupo_id || !semestre || !descricao) {
    ativar('Preencha todos os campos obrigatórios.','info','');
    return;
  }

  try {
    const result = await criarProjetoAPI({ titulo, descricao, grupo_id, orientador_id, semestre });

    if (result && result.success) {
      const form = document.getElementById('formProjeto');
      if (form) form.reset();
      ativar('Projeto criado com sucesso!', 'sucesso', '/projetos');
    } else {
      ativar(result?.message || 'Erro ao criar projeto', 'erro', '');
    }
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
    ativar('Erro na requisição','erro','');
  }
}