import { ativar } from "../utils/alerts.js";
import {
  // Funções de serviço atualizadas
  obterSemestresAtivos,
  obterDisciplinasPorOrientador,
  obterGruposPorDisciplina, // <= MUDADO
  obterProjetosPorOrientador,
  criarProjetoAPI
} from "../services/projetosServices.js";
import { carregarProjetos } from "../front_end/projetosLista.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formProjeto');
  // MODIFICADO: O gatilho agora é o select de Disciplina
  const disciplinaSelect = document.getElementById('disciplina'); 

  if (form) form.addEventListener('submit', criarProjeto);

  // MODIFICADO: Adiciona o listener ao dropdown de DISCIPLINA
  if (disciplinaSelect) {
    disciplinaSelect.addEventListener('change', function () {
      const disciplinaId = this.value;
      if (disciplinaId) {
        carregarGruposPorDisciplina(disciplinaId); // Chama a nova função de filtro
      } else {
        const grupoSelect = document.getElementById('grupo');
        if (grupoSelect) grupoSelect.innerHTML = '<option value="">Selecione uma disciplina acima</option>';
      }
    });
  }
  
  // O listener do 'semestreSelect' foi REMOVIDO (ele não é mais um filtro)

  // Carrega os dropdowns iniciais
  carregarDisciplinas();      // Carrega o select de 'Disciplina' (como filtro)
});

/**
 * Carrega os semestres ativos (ex: "2/2025") no dropdown de DADOS.
 */
async function carregarSemestresParaForm() {
  const semestreSelect = document.getElementById('semestre');
  if (!semestreSelect) return;

  try {
    const res = await obterSemestresAtivos();
    if (res && res.success && res.semestres.length > 0) {
      semestreSelect.innerHTML = '<option value="" disabled selected>Selecione o semestre</option>';
      res.semestres.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.descricao; // (ex: "2/2025")
        semestreSelect.appendChild(opt);
      });
    } else {
      semestreSelect.innerHTML = '<option value="">Nenhum semestre ativo</option>';
    }
  } catch (e) {
    console.error('Erro ao carregar semestres:', e);
    semestreSelect.innerHTML = '<option value="">Erro ao buscar semestres</option>';
  }
}

/**
 * Carrega as disciplinas do orientador no dropdown de FILTRO.
 */
async function carregarDisciplinas() {
  const disciplinaSelect = document.getElementById('disciplina');
  const orientadorId = localStorage.getItem('usuarioId');
  if (!disciplinaSelect) return;

  try {
    const res = await obterDisciplinasPorOrientador(orientadorId);
    if (res && res.success && res.disciplinas.length > 0) {
      disciplinaSelect.innerHTML = '<option value="" disabled selected>Selecione a disciplina</option>';
      res.disciplinas.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.nome;
        disciplinaSelect.appendChild(opt);
      });
    } else {
      disciplinaSelect.innerHTML = '<option value="">Nenhuma disciplina</option>';
      ativar('Nenhuma disciplina de orientação encontrada. Crie grupos primeiro.', 'info', '');
    }
  } catch (e) {
    console.error('Erro ao carregar disciplinas:', e);
    disciplinaSelect.innerHTML = '<option value="">Erro ao buscar disciplinas</option>';
  }
}

/**
 * CORRIGIDO: Carrega grupos com base no ID da disciplina e do orientador.
 */
async function carregarGruposPorDisciplina(disciplinaId) {
  const grupoSelect = document.getElementById('grupo');
  const orientadorId = localStorage.getItem('usuarioId');
  if (!grupoSelect) return;
  
  grupoSelect.innerHTML = '<option value="">Carregando grupos...</option>';

  try {
    // Chama os serviços com os filtros corretos
    const [resGrupos, resProjetos] = await Promise.all([
      obterGruposPorDisciplina(disciplinaId, orientadorId), // <= MUDADO
      obterProjetosPorOrientador(orientadorId)
    ]);

    grupoSelect.innerHTML = '';

    if (!resGrupos || !resGrupos.success || !resGrupos.grupos || resGrupos.grupos.length === 0) {
      grupoSelect.innerHTML = '<option value="">Nenhum grupo</option>';
      ativar('Nenhum grupo encontrado para esta disciplina.', 'info', '');
      return;
    }

    // Filtra grupos que já têm projetos
    const gruposUsados = resProjetos?.projetos?.map(p => p.grupo_id) || [];
    const gruposDisponiveis = resGrupos.grupos.filter(g => !gruposUsados.includes(g.id));

    if (gruposDisponiveis.length === 0) {
      grupoSelect.innerHTML = '<option value="">Nenhum grupo disponível</option>';
      ativar('Todos os grupos desta disciplina já possuem projetos.', 'info', '');
      return;
    }

    // Popula o dropdown de grupos
    grupoSelect.innerHTML = '<option value="" disabled selected>Selecione um grupo</option>';
    gruposDisponiveis.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.nome;
      grupoSelect.appendChild(opt);
    });

  } catch (e) {
    console.error('Erro ao carregar grupos:', e);
    grupoSelect.innerHTML = '<option value="">Erro ao buscar grupos</option>';
  }
}

/**
 * Função de criar projeto (permanece a mesma, pois já enviava todos os dados)
 */
async function criarProjeto(event) {
  event.preventDefault();

  const titulo = document.getElementById('titulo')?.value.trim();
  const descricao = document.getElementById('descricao')?.value.trim();
  // REMOVIDO: const semestre_id = document.getElementById('semestre')?.value;
  const disciplina_id = document.getElementById('disciplina')?.value;
  const grupo_id = document.getElementById('grupo')?.value;
  const orientador_id = localStorage.getItem('usuarioId');

  // MODIFICADO: Validação não checa mais 'semestre_id'
  if (!titulo || !descricao || !disciplina_id || !grupo_id) {
    ativar('Preencha todos os campos obrigatórios (Título, Descrição, Disciplina e Grupo).','info','');
    return;
  }

  try {
    // MODIFICADO: Não enviamos mais 'semestre_id'
    const result = await criarProjetoAPI({ 
      titulo, 
      descricao, 
      grupo_id, 
      orientador_id, 
      // semestre_id, // REMOVIDO
      disciplina_id 
    });

    if (result && result.success) {
      document.getElementById('formProjeto').reset();
      
      // Limpa os dropdowns de filtro
      document.getElementById('disciplina').selectedIndex = 0;
      // REMOVIDO: document.getElementById('semestre').selectedIndex = 0;
      document.getElementById('grupo').innerHTML = '<option value="">Selecione uma disciplina acima</option>';

      if (typeof carregarProjetos === 'function') {
        carregarProjetos(); 
      }
      
      ativar('Projeto criado com sucesso!', 'sucesso', '');

    } else {
      ativar(result?.message || 'Erro ao criar projeto', 'erro', '');
    }
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
    ativar('Erro na requisição','erro','');
  }
}