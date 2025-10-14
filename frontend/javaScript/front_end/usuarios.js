import { ativar } from "../utils/alerts.js";
import { 
  obterUsuarios, 
  atualizarTipoUsuario, 
  atualizarStatusUsuario 
} from "../services/UsuariosService.js";

let currentPage = 1;
const itemsPerPage = 5;
let filteredUsers = [];
let selectedUserId = null;
let selectedUserStatus = null;
let allUsers = [];

const userTableBody = document.getElementById('users-table-body');
const pagination = document.getElementById('pagination');
const editTypeModal = document.getElementById('edit-type-modal');
const confirmStatusModal = document.getElementById('confirm-status-modal');
const closeEditBtn = editTypeModal.querySelector('.close');
const closeStatusBtn = confirmStatusModal.querySelector('.close');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const cancelStatusBtn = document.getElementById('cancel-status-btn');
const searchBtn = document.getElementById('search-btn');
const confirmStatusBtn = document.getElementById('confirm-status-btn');
const editTypeForm = document.getElementById('edit-type-form');

document.addEventListener('DOMContentLoaded', async () => {
  await carregarUsuarios();
  aplicarFiltros();
  exibirUsuarios();
});

searchBtn.addEventListener('click', () => {
  currentPage = 1;
  aplicarFiltros();
  exibirUsuarios();
});

closeEditBtn.addEventListener('click', fecharModalEditarTipo);
cancelEditBtn.addEventListener('click', fecharModalEditarTipo);
closeStatusBtn.addEventListener('click', fecharModalStatus);
cancelStatusBtn.addEventListener('click', fecharModalStatus);

editTypeForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const userId = document.getElementById('edit-user-id').value;
  const newType = document.getElementById('edit-user-type').value;

  try {
    const data = await atualizarTipoUsuario(userId, newType);
    
    if (data.success) {
      await carregarUsuarios();
      aplicarFiltros();
      exibirUsuarios();
      fecharModalEditarTipo();
      ativar(`Tipo de usuário alterado com sucesso para ${newType}`, 'sucesso');
    } else {
      ativar('Erro ao atualizar tipo do usuário.', 'erro');
    }
  } catch (error) {
    console.error('Erro ao atualizar tipo:', error);
    ativar('Erro ao atualizar tipo do usuário.', 'erro');
  }
});

confirmStatusBtn.addEventListener('click', async function () {
  const novoStatus = selectedUserStatus === 1 ? 0 : 1;
  
  try {
    const data = await atualizarStatusUsuario(selectedUserId, novoStatus);
    
    if (data.success) {
      await carregarUsuarios();
      aplicarFiltros();
      exibirUsuarios();
      fecharModalStatus();
      ativar(`Usuário ${novoStatus === 1 ? 'ativado' : 'desativado'} com sucesso!`, 'sucesso');
    } else {
      ativar('Erro ao atualizar status.', 'erro');
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    ativar('Erro ao atualizar status.', 'erro');
  }
});

async function carregarUsuarios() {
  try {
    // obtém a resposta da API (pode ser um array ou um objeto { rows: [...] })
    const response = await obterUsuarios();

    // normaliza para um array de usuários
    let usersArray = [];
    if (Array.isArray(response)) {
      usersArray = response;
    } else if (response && Array.isArray(response.rows)) {
      usersArray = response.rows;
    } else {
      console.warn('⚠️ obterUsuarios retornou formato inesperado:', response);
      usersArray = [];
    }

    allUsers = usersArray;

    // opcional: log para depuração
    console.log('allUsers carregados:', allUsers);

  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    ativar(`Erro ao carregar usuários: ${error.message}`, 'erro');
    allUsers = [];
  }
}


function aplicarFiltros() {
  // const semestre = document.getElementById('semester-filter').value; modelo antigo trocar pela diciplina
  const nomeOuEmail = document.getElementById('name-filter').value.toLowerCase();
  const tipo = document.getElementById('type-filter').value;
  const status = document.getElementById('status-filter').value;

  filteredUsers = allUsers.filter(user => {
    // (!semestre || user.SEMESTRE == semestre) && modelo antigo trocar pela diciplina
    return (!nomeOuEmail || user.nome.toLowerCase().includes(nomeOuEmail) || user.email.toLowerCase().includes(nomeOuEmail)) &&
           (!tipo || user.tipo === tipo) &&
           (status === '' || user.ativo == status);
  });
}

function exibirUsuarios() {
  userTableBody.innerHTML = '';
  pagination.innerHTML = '';

  if (filteredUsers.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="8" style="text-align: center;">Nenhum usuário encontrado.</td>`;
    userTableBody.appendChild(row);
    return;
  }

  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, filteredUsers.length);
  const pagina = filteredUsers.slice(start, end);

  pagina.forEach(user => {
    const tr = document.createElement('tr');

    const statusClass = user.ativo === 1 ? 'badge-active' : 'badge-inactive';
    const statusText = user.ativo === 1 ? 'Ativo' : 'Inativo';

    let badgeClass = '', badgeLabel = '';
    switch (user.tipo) {
      case 'Aluno': badgeClass = 'badge-aluno'; badgeLabel = 'Aluno'; break;
      case 'Professor': badgeClass = 'badge-professor'; badgeLabel = 'Professor'; break;
      case 'Professor_Orientador': badgeClass = 'badge-orientador'; badgeLabel = 'Prof. Orientador'; break;
      case 'Coordenador': badgeClass = 'badge-coordenador'; badgeLabel = 'Coordenador'; break;
      case 'Administrador': badgeClass = 'badge-adm'; badgeLabel = 'Administrador'; break;
    }

    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.nome}</td>
      <td>${user.email}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td>${user.semestre || ''}-</td>
      <td><span class="badge ${statusClass} user-status-toggle" data-id="${user.id}" data-status="${user.ativo}">${statusText}</span></td>
      <td>${user.ultimo_acesso || '-'}</td>
      <td class="action-cell">
        <button class="btn btn-warning edit-type-btn" data-id="${user.id}"><i class="fas fa-user-edit"></i></button>
      </td>
    `;

    userTableBody.appendChild(tr);
  });

  document.querySelectorAll('.edit-type-btn').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditarTipo(btn.dataset.id));
  });

  document.querySelectorAll('.user-status-toggle').forEach(badge => {
    badge.addEventListener('click', () => abrirModalStatus(badge.dataset.id, parseInt(badge.dataset.status)));
  });

  atualizarPaginacao();
}

function atualizarPaginacao() {
  const total = Math.ceil(filteredUsers.length / itemsPerPage);

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '<<';
  btnPrev.disabled = currentPage === 1;
  btnPrev.onclick = () => { currentPage--; exibirUsuarios(); };
  pagination.appendChild(btnPrev);

  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.classList.toggle('active', i === currentPage);
    btn.onclick = () => { currentPage = i; exibirUsuarios(); };
    pagination.appendChild(btn);
  }

  const btnNext = document.createElement('button');
  btnNext.textContent = '>>';
  btnNext.disabled = currentPage === total || total === 0;
  btnNext.onclick = () => { currentPage++; exibirUsuarios(); };
  pagination.appendChild(btnNext);
}

function abrirModalEditarTipo(userId) {
  const user = allUsers.find(u => u.id == userId);
  if (user) {
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.nome;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-type').value = user.tipo;
    editTypeModal.style.display = 'block';
  }
}

function fecharModalEditarTipo() {
  editTypeModal.style.display = 'none';
}

function abrirModalStatus(userId, status) {
  selectedUserId = userId;
  selectedUserStatus = status;

  const user = allUsers.find(u => u.id == userId);
  const action = status === 1 ? 'desativar' : 'ativar';

  document.getElementById('confirm-status-message').textContent =
    `Tem certeza que deseja ${action} o usuário ${user.nome}?`;

  confirmStatusModal.style.display = 'block';
}

function fecharModalStatus() {
  confirmStatusModal.style.display = 'none';
}