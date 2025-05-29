document.addEventListener('DOMContentLoaded', () => {
    carregarProjetos();
});
  

  let projetoEditandoId = null;
  let projetosGlobais = [];
  async function carregarProjetos() {
    const orientadorId = localStorage.getItem('usuarioId');
    const container = document.getElementById('container-projetos');
    container.innerHTML = '<p>Carregando projetos...</p>';
  
    try {
      const res = await fetch(`/api/projetos?orientador_id=${orientadorId}`);
      const data = await res.json();
  
      if (!data.success || data.projetos.length === 0) {
        container.innerHTML = '<p>Nenhum projeto encontrado.</p>';
        return;
      }
      projetosGlobais = data.projetos;
  
      container.innerHTML = ''; // limpar
  
      data.projetos.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'projeto-card';
        card.innerHTML = `
          <h3>${proj.titulo}</h3>
          <p><strong>Grupo:</strong> ${proj.grupo_nome}</p>
          <p><strong>Semestre:</strong> ${proj.semestre}</p>
          <p><strong>Status:</strong> ${proj.status}</p>
          <button onclick="mostrarEdicao(${proj.id})" class="btn-salvar">Editar</button>
          <button onclick="deletarProjeto(${proj.id})" class="btn-deletar" >Deletar</button>
          <div id="edicao-${proj.id}" style="display:none; margin-top:10px;">
            <label>Título</label>
            <input type="text" id="edit-titulo-${proj.id}" value="${proj.titulo}" />
  
            <label>Descrição</label>
            <textarea id="edit-descricao-${proj.id}" rows="3">${proj.descricao || ''}</textarea>
  
            <label>Semestre</label>
            <select id="edit-semestre-${proj.id}">
                <option value="1" ${proj.semestre === '1' ? 'selected' : ''}>1º Semestre</option>
                <option value="2" ${proj.semestre === '2' ? 'selected' : ''}>2º Semestre</option>
                <option value="3" ${proj.semestre === '3' ? 'selected' : ''}>3º Semestre</option>
                <option value="4" ${proj.semestre === '4' ? 'selected' : ''}>4º Semestre</option>
                <option value="5" ${proj.semestre === '5' ? 'selected' : ''}>5º Semestre</option>
                <option value="6" ${proj.semestre === '6' ? 'selected' : ''}>6º Semestre</option>
            </select>

  
            <label>Status</label>
            <select id="edit-status-${proj.id}">
              <option ${proj.status === 'Em Proposta' ? 'selected' : ''}>Em Proposta</option>
              <option ${proj.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
              <option ${proj.status === 'Aguardando Avaliação' ? 'selected' : ''}>Aguardando Avaliação</option>
              <option ${proj.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
            </select>
  
            <button onclick="salvarProjeto(${proj.id})" class="btn-salvar">Salvar</button>
          </div>
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
    console.log('Editando projeto:', id);
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
    console.log('Confirmando edição para ID:', projetoEditandoId);
    try {
      const res = await fetch(`/api/projetos/${projetoEditandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descricao, semestre, status })
      });
  
      const data = await res.json();
      alert(data.message || 'Projeto atualizado!');
      fecharModal();
      carregarProjetos();
    } catch (err) {
      alert('Erro ao salvar alterações.');
      console.error(err);
    }
  }
  
  async function deletarProjeto(id) {
    const confirmar = confirm('Tem certeza que deseja deletar este projeto? Essa ação não poderá ser desfeita.');
    if (!confirmar) return;
  
    try {
      const res = await fetch(`/api/projetos/${id}`, {
        method: 'DELETE'
      });
  
      const data = await res.json();
  
      if (data.success) {
        alert(data.message);
        carregarProjetos();
      } else {
        alert(data.message || 'Erro ao deletar.');
      }
    } catch (err) {
      console.error('Erro ao deletar projeto:', err);
      alert('Erro ao deletar projeto.');
    }
  }
  
  
  
//   async function salvarProjeto(id) {
//     const titulo = document.getElementById(`edit-titulo-${id}`).value;
//     const descricao = document.getElementById(`edit-descricao-${id}`).value;
//     const semestre = document.getElementById(`edit-semestre-${id}`).value;
//     const status = document.getElementById(`edit-status-${id}`).value;
  
//     try {
//       const res = await fetch(`/api/projetos/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ titulo, descricao, semestre, status })
//       });
  
//       const data = await res.json();
//       alert(data.message || 'Projeto atualizado!');
//       carregarProjetos(); // recarregar a lista atualizada
//     } catch (err) {
//       alert('Erro ao salvar projeto.');
//       console.error(err);
//     }
//   }
  