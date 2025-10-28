import { ativar } from "../utils/alerts.js";
import {
  obterProjetosPorOrientador,
  atualizarProjeto,
  excluirProjeto,
  obterTodosSemestres,
  obterDisciplinasPorOrientador
} from "../services/projetosServices.js";

let projetoEditandoId = null;
let projetosGlobais = [];
let cacheSemestres = [];
let cacheDisciplinas = [];

document.addEventListener('DOMContentLoaded', () => {
  carregarProjetos();
  carregarCacheModal(); 

  // NOVO: Adiciona os listeners para os botões do modal
  const btnCancelar = document.getElementById('btn-modal-cancelar');
  const btnSalvar = document.getElementById('btn-modal-salvar');

  if (btnCancelar) {
    btnCancelar.addEventListener('click', fecharModal);
  }
  if (btnSalvar) {
    btnSalvar.addEventListener('click', confirmarEdicao);
  }
});

// MODIFICADO: Adicionamos 'export' para o 'projetos.js' (formulário) poder chamá-la
export async function carregarProjetos() {
  const orientadorId = localStorage.getItem('usuarioId');
  const container = document.getElementById('container-projetos');
  if (!container) return;
  container.innerHTML = '<p>Carregando projetos...</p>';

  try {
    const data = await obterProjetosPorOrientador(orientadorId);
    if (!data.success || !data.projetos || data.projetos.length === 0) {
      container.innerHTML = '<p>Nenhum projeto encontrado.</p>';
      return;
    }

    projetosGlobais = data.projetos;
    container.innerHTML = '';

    data.projetos.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'projeto-card';
      
      // MODIFICADO: O innerHTML não tem mais os botões
      card.innerHTML = `
        <h3>${proj.titulo}</h3>
        <p><strong>Grupo:</strong> ${proj.grupo_nome || 'N/A'}</p>
        <p><strong>Disciplina:</strong> ${proj.disciplina_nome || 'N/A'}</p>
        <p><strong>Semestre:</strong> ${proj.semestre_formatado || 'N/A'}</p>
        <p><strong>Status:</strong> ${proj.status}</p>
      `;

      // NOVO: Criando botões com JavaScript e addEventListener
      const btnEditar = document.createElement('button');
      btnEditar.className = 'btn-salvar';
      btnEditar.textContent = 'Editar';
      // Adiciona o listener de evento
      btnEditar.addEventListener('click', () => {
        mostrarEdicao(proj.id);
      });

      const btnDeletar = document.createElement('button');
      btnDeletar.className = 'btn-deletar';
      btnDeletar.textContent = 'Deletar';
      // Adiciona o listener de evento
      btnDeletar.addEventListener('click', () => {
        deletarProjeto(proj.id);
      });
      
      card.appendChild(btnEditar);
      card.appendChild(btnDeletar);

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    container.innerHTML = '<p>Erro ao carregar projetos.</p>';
  }
}

/**
 * Carrega os dados para os dropdowns do modal (semestres e disciplinas)
 */
async function carregarCacheModal() {
  try {
    const orientadorId = localStorage.getItem('usuarioId');
    const [resSem, resDisc] = await Promise.all([
      obterTodosSemestres(),
      obterDisciplinasPorOrientador(orientadorId)
    ]);
    
    if (resSem.success) cacheSemestres = resSem.semestres;
    if (resDisc.success) cacheDisciplinas = resDisc.disciplinas;

    popularSelect('modal-semestre', cacheSemestres, 'id', 'descricao');
    popularSelect('modal-disciplina', cacheDisciplinas, 'id', 'nome');

  } catch (e) {
    console.error('Erro ao carregar cache do modal:', e);
  }
}

// Função utilitária para popular selects
function popularSelect(selectId, data, valorKey, textoKey) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="0">Selecione</option>`;
  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item[valorKey];
    opt.textContent = item[textoKey];
    select.appendChild(opt);
  });
}

/**
 * Preenche os novos campos do modal
 */
function mostrarEdicao(id) {
  const projeto = projetosGlobais.find(p => p.id === id);
  if (!projeto) return;
  projetoEditandoId = id;

  document.getElementById('modal-titulo').value = projeto.titulo;
  document.getElementById('modal-descricao').value = projeto.descricao || '';
  
  document.getElementById('modal-semestre').value = projeto.semestre_id;
  document.getElementById('modal-disciplina').value = projeto.disciplina_id;
  document.getElementById('modal-status').value = projeto.status;

  const modal = document.getElementById('modal-edicao');
  modal.classList.remove('hidden');
  modal.classList.add('show');
}

// MODIFICADO: Função agora é local, não precisa de 'window'
function fecharModal() {
  const modal = document.getElementById('modal-edicao');
  modal.classList.remove('show');
  modal.classList.add('hidden');
  projetoEditandoId = null;
}

/**
 * Envia os novos dados (disciplina_id) ao atualizar
 */
// MODIFICADO: Função agora é local, não precisa de 'window'
async function confirmarEdicao() {
  const titulo = document.getElementById('modal-titulo').value;
  const descricao = document.getElementById('modal-descricao').value;
  const semestre_id = document.getElementById('modal-semestre').value;
  const disciplina_id = document.getElementById('modal-disciplina').value; 
  const status = document.getElementById('modal-status').value;
  const orientador_id = localStorage.getItem('usuarioId'); 

  try {
    const data = await atualizarProjeto(projetoEditandoId, { 
      titulo, 
      descricao, 
      semestre_id, 
      status, 
      disciplina_id,
      orientador_id
    });

    ativar(data.message || 'Projeto atualizado!', data.success ? 'sucesso' : 'erro', '');
    fecharModal();
    carregarProjetos();
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);
    ativar('Erro ao salvar alterações.', 'erro', '');
  }
}

// MODIFICADO: Função agora é local, não precisa de 'window'
async function deletarProjeto(id) {
  const confirmacao = confirm('Tem certeza que deseja deletar este projeto? Essa ação não poderá ser desfeita.');
  if (!confirmacao) return;

  try {
    const orientadorId = localStorage.getItem('usuarioId');
    const data = await excluirProjeto(`${id}?orientador_id=${orientadorId}`);
    
    ativar(data.message || (data.success ? 'Sucesso' : 'Erro'), data.success ? 'sucesso' : 'erro', '');
    if (data.success) carregarProjetos();
  } catch (err) {
    console.error('Erro ao deletar projeto:', err);
    ativar('Erro ao deletar projeto.', 'erro', '');
  }
}
