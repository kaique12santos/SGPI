// import { ativar } from "../utils/alerts.js";

// let currentPage = 1;
// const itemsPerPage = 5;
// let filteredUsers = [];
// let selectedUserId = null;
// let selectedUserStatus = null;
// let allUsers = [];

// const userTableBody = document.getElementById('users-table-body');
// const pagination = document.getElementById('pagination');
// const editTypeModal = document.getElementById('edit-type-modal');
// const confirmStatusModal = document.getElementById('confirm-status-modal');
// const closeEditBtn = editTypeModal.querySelector('.close');
// const closeStatusBtn = confirmStatusModal.querySelector('.close');
// const cancelEditBtn = document.getElementById('cancel-edit-btn');
// const cancelStatusBtn = document.getElementById('cancel-status-btn');
// const searchBtn = document.getElementById('search-btn');
// const confirmStatusBtn = document.getElementById('confirm-status-btn');
// const editTypeForm = document.getElementById('edit-type-form');

// document.addEventListener('DOMContentLoaded', async () => {
//     await carregarUsuarios();
//     aplicarFiltros();
//     exibirUsuarios();
// });

// searchBtn.addEventListener('click', () => {
//     currentPage = 1;
//     aplicarFiltros();
//     exibirUsuarios();
// });

// closeEditBtn.addEventListener('click', fecharModalEditarTipo);
// cancelEditBtn.addEventListener('click', fecharModalEditarTipo);
// closeStatusBtn.addEventListener('click', fecharModalStatus);
// cancelStatusBtn.addEventListener('click', fecharModalStatus);

// editTypeForm.addEventListener('submit', async function (e) {
//     e.preventDefault();
//     const userId = document.getElementById('edit-user-id').value;
//     const newType = document.getElementById('edit-user-type').value;

//     const res = await fetch(`/usuarios/${userId}/tipo`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ tipo: newType })
//     });

//     if (res.ok) {
//         await carregarUsuarios();
//         aplicarFiltros();
//         exibirUsuarios();
//         fecharModalEditarTipo();
//         ativar(`Tipo de usuário alterado com sucesso para ${newType}`, 'sucesso');
//     } else {
//         ativar('Erro ao atualizar tipo do usuário.', 'erro');
//     }
// });

// confirmStatusBtn.addEventListener('click', async function () {
//     const novoStatus = selectedUserStatus === 1 ? 0 : 1;
//     const res = await fetch(`/usuarios/${selectedUserId}/status`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ ativo: novoStatus })
//     });

//     if (res.ok) {
//         await carregarUsuarios();
//         aplicarFiltros();
//         exibirUsuarios();
//         fecharModalStatus();
//         ativar(`Usuário ${novoStatus === 1 ? 'ativado' : 'desativado'} com sucesso!`, 'sucesso');
//     } else {
//         ativar('Erro ao atualizar status.', 'erro');
//     }
// });

// async function carregarUsuarios() {
//     try {
//         const res = await fetch('/usuarios');
//         allUsers = await res.json();
//     } catch {
//         ativar('Erro ao carregar usuários', 'erro');
//     }
// }

// function aplicarFiltros() {
//     const semestre = document.getElementById('semester-filter').value;
//     const nomeOuEmail = document.getElementById('name-filter').value.toLowerCase();
//     const tipo = document.getElementById('type-filter').value;
//     const status = document.getElementById('status-filter').value;

//     filteredUsers = allUsers.filter(user => {
//         return (!semestre || user.SEMESTRE == semestre) &&
//                (!nomeOuEmail || user.NOME.toLowerCase().includes(nomeOuEmail) || user.EMAIL.toLowerCase().includes(nomeOuEmail)) &&
//                (!tipo || user.TIPO === tipo) &&
//                (status === '' || user.ATIVO == status);
//     });
// }

// function exibirUsuarios() {
//     userTableBody.innerHTML = '';
//     pagination.innerHTML = '';

//     if (filteredUsers.length === 0) {
//         const row = document.createElement('tr');
//         row.innerHTML = `<td colspan="8" style="text-align: center;">Nenhum usuário encontrado.</td>`;
//         userTableBody.appendChild(row);
//         return;
//     }

//     const start = (currentPage - 1) * itemsPerPage;
//     const end = Math.min(start + itemsPerPage, filteredUsers.length);
//     const pagina = filteredUsers.slice(start, end);

//     pagina.forEach(user => {
//         const tr = document.createElement('tr');

//         const statusClass = user.ATIVO === 1 ? 'badge-active' : 'badge-inactive';
//         const statusText = user.ATIVO === 1 ? 'Ativo' : 'Inativo';

//         let badgeClass = '', badgeLabel = '';
//         switch (user.TIPO) {
//             case 'Aluno': badgeClass = 'badge-aluno'; badgeLabel = 'Aluno'; break;
//             case 'Professor': badgeClass = 'badge-professor'; badgeLabel = 'Professor'; break;
//             case 'Professor_Orientador': badgeClass = 'badge-orientador'; badgeLabel = 'Prof. Orientador'; break;
//             case 'Coordenador': badgeClass = 'badge-coordenador'; badgeLabel = 'Coordenador'; break;
//         }

//         tr.innerHTML = `
//             <td>${user.ID}</td>
//             <td>${user.NOME}</td>
//             <td>${user.EMAIL}</td>
//             <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
//             <td>${user.SEMESTRE || ''}º</td>
//             <td><span class="badge ${statusClass} user-status-toggle" data-id="${user.ID}" data-status="${user.ATIVO}">${statusText}</span></td>
//             <td>${user.ULTIMO_ACESSO || '-'}</td>
//             <td class="action-cell">
//                 <button class="btn btn-warning edit-type-btn" data-id="${user.ID}"><i class="fas fa-user-edit"></i></button>
//             </td>
//         `;

//         userTableBody.appendChild(tr);
//     });

//     document.querySelectorAll('.edit-type-btn').forEach(btn => {
//         btn.addEventListener('click', () => abrirModalEditarTipo(btn.dataset.id));
//     });

//     document.querySelectorAll('.user-status-toggle').forEach(badge => {
//         badge.addEventListener('click', () => abrirModalStatus(badge.dataset.id, parseInt(badge.dataset.status)));
//     });

//     atualizarPaginacao();
// }

// function atualizarPaginacao() {
//     const total = Math.ceil(filteredUsers.length / itemsPerPage);

//     const btnPrev = document.createElement('button');
//     btnPrev.textContent = '<<';
//     btnPrev.disabled = currentPage === 1;
//     btnPrev.onclick = () => { currentPage--; exibirUsuarios(); };
//     pagination.appendChild(btnPrev);

//     for (let i = 1; i <= total; i++) {
//         const btn = document.createElement('button');
//         btn.textContent = i;
//         btn.classList.toggle('active', i === currentPage);
//         btn.onclick = () => { currentPage = i; exibirUsuarios(); };
//         pagination.appendChild(btn);
//     }

//     const btnNext = document.createElement('button');
//     btnNext.textContent = '>>';
//     btnNext.disabled = currentPage === total || total === 0;
//     btnNext.onclick = () => { currentPage++; exibirUsuarios(); };
//     pagination.appendChild(btnNext);
// }

// function abrirModalEditarTipo(userId) {
//     const user = allUsers.find(u => u.ID == userId);
//     if (user) {
//         document.getElementById('edit-user-id').value = user.ID;
//         document.getElementById('edit-user-name').value = user.NOME;
//         document.getElementById('edit-user-email').value = user.EMAIL;
//         document.getElementById('edit-user-type').value = user.TIPO;
//         editTypeModal.style.display = 'block';
//     }
// }

// function fecharModalEditarTipo() {
//     editTypeModal.style.display = 'none';
// }

// function abrirModalStatus(userId, status) {
//     selectedUserId = userId;
//     selectedUserStatus = status;

//     const user = allUsers.find(u => u.ID == userId);
//     const action = status === 1 ? 'desativar' : 'ativar';

//     document.getElementById('confirm-status-message').textContent =
//         `Tem certeza que deseja ${action} o usuário ${user.NOME}?`;

//     confirmStatusModal.style.display = 'block';
// }

// function fecharModalStatus() {
//     confirmStatusModal.style.display = 'none';
// }

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
    allUsers = await obterUsuarios();
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    ativar('Erro ao carregar usuários', 'erro');
  }
}

function aplicarFiltros() {
  const semestre = document.getElementById('semester-filter').value;
  const nomeOuEmail = document.getElementById('name-filter').value.toLowerCase();
  const tipo = document.getElementById('type-filter').value;
  const status = document.getElementById('status-filter').value;

  filteredUsers = allUsers.filter(user => {
    return (!semestre || user.SEMESTRE == semestre) &&
           (!nomeOuEmail || user.NOME.toLowerCase().includes(nomeOuEmail) || user.EMAIL.toLowerCase().includes(nomeOuEmail)) &&
           (!tipo || user.TIPO === tipo) &&
           (status === '' || user.ATIVO == status);
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

    const statusClass = user.ATIVO === 1 ? 'badge-active' : 'badge-inactive';
    const statusText = user.ATIVO === 1 ? 'Ativo' : 'Inativo';

    let badgeClass = '', badgeLabel = '';
    switch (user.TIPO) {
      case 'Aluno': badgeClass = 'badge-aluno'; badgeLabel = 'Aluno'; break;
      case 'Professor': badgeClass = 'badge-professor'; badgeLabel = 'Professor'; break;
      case 'Professor_Orientador': badgeClass = 'badge-orientador'; badgeLabel = 'Prof. Orientador'; break;
      case 'Coordenador': badgeClass = 'badge-coordenador'; badgeLabel = 'Coordenador'; break;
    }

    tr.innerHTML = `
      <td>${user.ID}</td>
      <td>${user.NOME}</td>
      <td>${user.EMAIL}</td>
      <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
      <td>${user.SEMESTRE || ''}º</td>
      <td><span class="badge ${statusClass} user-status-toggle" data-id="${user.ID}" data-status="${user.ATIVO}">${statusText}</span></td>
      <td>${user.ULTIMO_ACESSO || '-'}</td>
      <td class="action-cell">
        <button class="btn btn-warning edit-type-btn" data-id="${user.ID}"><i class="fas fa-user-edit"></i></button>
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
  const user = allUsers.find(u => u.ID == userId);
  if (user) {
    document.getElementById('edit-user-id').value = user.ID;
    document.getElementById('edit-user-name').value = user.NOME;
    document.getElementById('edit-user-email').value = user.EMAIL;
    document.getElementById('edit-user-type').value = user.TIPO;
    editTypeModal.style.display = 'block';
  }
}

function fecharModalEditarTipo() {
  editTypeModal.style.display = 'none';
}

function abrirModalStatus(userId, status) {
  selectedUserId = userId;
  selectedUserStatus = status;

  const user = allUsers.find(u => u.ID == userId);
  const action = status === 1 ? 'desativar' : 'ativar';

  document.getElementById('confirm-status-message').textContent =
    `Tem certeza que deseja ${action} o usuário ${user.NOME}?`;

  confirmStatusModal.style.display = 'block';
}

function fecharModalStatus() {
  confirmStatusModal.style.display = 'none';
}