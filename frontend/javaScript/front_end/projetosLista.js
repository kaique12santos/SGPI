import { ativar } from "../utils/alerts.js";
import {
  obterProjetosPorOrientador,
  atualizarProjeto,
  excluirProjeto
} from "../services/projetosServices.js";

let projetoEditandoId = null;
let projetosGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  carregarProjetos();
});

async function carregarProjetos() {
  const orientadorId = localStorage.getItem('usuarioId');
  const container = document.getElementById('container-projetos');
  container.innerHTML = '<p>Carregando projetos...</p>';

  try {
    const data = await obterProjetosPorOrientador(orientadorId);
    if (!data.success || data.projetos.length === 0) {
      container.innerHTML = '<p>Nenhum projeto encontrado.</p>';
      return;
    }

    projetosGlobais = data.projetos;
    container.innerHTML = '';

    data.projetos.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'projeto-card';
      card.innerHTML = `
        <h3>${proj.titulo}</h3>
        <p><strong>Grupo:</strong> ${proj.grupo_nome}</p>
        <p><strong>Semestre:</strong> ${proj.semestre}</p>
        <p><strong>Status:</strong> ${proj.status}</p>
        <button onclick="mostrarEdicao(${proj.id})" class="btn-salvar">Editar</button>
        <button onclick="deletarProjeto(${proj.id})" class="btn-deletar">Deletar</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    container.innerHTML = '<p>Erro ao carregar projetos.</p>';
  }
}

function mostrarEdicao(id) {
  const projeto = projetosGlobais.find(p => p.id === id);
  if (!projeto) return;
  projetoEditandoId = id;

  document.getElementById('modal-titulo').value = projeto.titulo;
  document.getElementById('modal-descricao').value = projeto.descricao || '';
  document.getElementById('modal-semestre').value = projeto.semestre;
  document.getElementById('modal-status').value = projeto.status;

  const modal = document.getElementById('modal-edicao');
  modal.classList.remove('hidden');
  modal.classList.add('show');
}

function fecharModal() {
  const modal = document.getElementById('modal-edicao');
  modal.classList.remove('show');
  modal.classList.add('hidden');
  projetoEditandoId = null;
}

async function confirmarEdicao() {
  const titulo = document.getElementById('modal-titulo').value;
  const descricao = document.getElementById('modal-descricao').value;
  const semestre = document.getElementById('modal-semestre').value;
  const status = document.getElementById('modal-status').value;

  try {
    const data = await atualizarProjeto(projetoEditandoId, { titulo, descricao, semestre, status });
    ativar(data.message || 'Projeto atualizado!', data.success ? 'sucesso' : 'erro', '');
    fecharModal();
    carregarProjetos();
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);
    ativar('Erro ao salvar alterações.', 'erro', '');
  }
}

async function deletarProjeto(id) {
  const confirmacao = confirm('Tem certeza que deseja deletar este projeto? Essa ação não poderá ser desfeita.');
  if (!confirmacao) return;

  try {
    const data = await excluirProjeto(id);
    ativar(data.message || (data.success ? 'Sucesso' : 'Erro'), data.success ? 'sucesso' : 'erro', '');
    if (data.success) carregarProjetos();
  } catch (err) {
    console.error('Erro ao deletar projeto:', err);
    ativar('Erro ao deletar projeto.', 'erro', '');
  }
}

// Exportar para uso no HTML inline
window.mostrarEdicao = mostrarEdicao;
window.deletarProjeto = deletarProjeto;
window.fecharModal = fecharModal;
window.confirmarEdicao = confirmarEdicao;