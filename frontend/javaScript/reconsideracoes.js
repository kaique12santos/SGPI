import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', async () => {
  const professorId = localStorage.getItem('usuarioId');
  const container = document.getElementById('container-reconsideracoes');
  
  // Valida se o professorId existe e é um número válido
  if (!professorId || isNaN(professorId)) {
    container.innerHTML = '<p>Erro: ID do professor não encontrado. Faça login novamente.</p>';
    console.error('Professor ID inválido:', professorId);
    return;
  }

  await carregarReconsideracoes();

  async function carregarReconsideracoes() {
    container.innerHTML = '<p>Carregando pedidos de reconsideração...</p>';

    try {
      // Garantir que o professorId seja um número válido
      const profId = parseInt(professorId);
      if (isNaN(profId)) {
        throw new Error('ID do professor inválido');
      }

      const res = await fetch(`/api/professor/reconsideracoes?professor_id=${profId}`);
      const data = await res.json();

      if (!data.success || data.reconsideracoes.length === 0) {
        container.innerHTML = '<p>Sem pedidos de reconsideração pendentes.</p>';
        return;
      }

      container.innerHTML = '';

      data.reconsideracoes.forEach(item => {
        const card = document.createElement('div');
        card.className = 'reconsideracao-card';
        card.onclick = () => abrirModal(item);

        card.innerHTML = `
          <h3>${item.ALUNO_NOME}</h3>
          <div class="info-item">
            <span class="info-label">Atividade:</span>
            <span class="info-value">${item.ATIVIDADE}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Nota Atual:</span>
            <span class="info-value">${item.NOTA}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status:</span>
            <span class="info-value">Pendente</span>
          </div>
          <div class="motivo">
            <strong>Motivo:</strong> ${item.MOTIVO}
          </div>
        `;

        container.appendChild(card);
      });

    } catch (err) {
      console.error('Erro ao buscar reconsiderações:', err);
      container.innerHTML = '<p>Erro ao carregar reconsiderações.</p>';
    }
  }

  function abrirModal(item) {
    const modal = document.createElement('div');
    modal.className = 'modal-reconsideracao';
    modal.id = 'modal-reconsideracao';

    modal.innerHTML = `
      <div class="modal-reconsideracao-content">
        <h3>Pedido de Reconsideração</h3>
        
        <div class="modal-info-section">
          <h4>Informações do Pedido</h4>
          <div class="modal-info-item">
            <span class="label">Aluno:</span>
            <span class="value">${item.ALUNO_NOME}</span>
          </div>
          <div class="modal-info-item">
            <span class="label">Atividade:</span>
            <span class="value">${item.ATIVIDADE}</span>
          </div>
          <div class="modal-info-item">
            <span class="label">Nota Atual:</span>
            <span class="value">${item.NOTA}</span>
          </div>
          <div class="modal-info-item">
            <span class="label">Comentário Anterior:</span>
            <span class="value">${item.COMENTARIO || 'Nenhum comentário'}</span>
          </div>
          <div class="modal-info-item">
            <span class="label">Motivo do Aluno:</span>
            <span class="value modalMotivo">${item.MOTIVO}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="resposta-professor">Resposta do Professor *</label>
          <textarea id="resposta-professor" rows="4" placeholder="Digite sua resposta para o aluno..." required></textarea>
        </div>

        <div class="form-group">
          <label for="nova-nota">Nova Nota (opcional)</label>
          <input type="number" id="nova-nota" min="0" max="10" step="0.1" placeholder="Digite a nova nota (0-10)" />
          <small style="color: #6b7280; font-size: 0.875rem;">Deixe em branco para manter a nota atual</small>
        </div>

        <div class="modal-actions">
          <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
          <button class="btn-recusar" onclick="processarResposta(${item.ID}, 'recusar')">Recusar</button>
          <button class="btn-aprovar" onclick="processarResposta(${item.ID}, 'aprovar')">Aprovar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModal();
      }
    });
  }

  window.fecharModal = function() {
    const modal = document.getElementById('modal-reconsideracao');
    if (modal) {
      modal.classList.remove('show');
      modal.classList.add('hidden');
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    }
  }

  window.processarResposta = async function(id, acao) {
    const resposta = document.getElementById('resposta-professor').value.trim();
    const notaInput = document.getElementById('nova-nota').value.trim();
    
    if (!resposta) {
      ativar('Por favor, digite uma resposta para o aluno.','info','');
      return;
    }

    const novaNota = notaInput === '' ? null : Number(notaInput);
    
    if (novaNota !== null && (isNaN(novaNota) || novaNota < 0 || novaNota > 10)) {
      ativar('Nota inválida. Use um valor entre 0 e 10.','info','');
      return;
    }

    const confirmar = confirm(`Tem certeza que deseja ${acao} este pedido de reconsideração?`);
    if (!confirmar) return;

    try {
      const endpoint = `/api/professor/reconsideracoes/${id}/${acao}`;
      const payload = acao === 'aprovar' ? { resposta, novaNota } : { resposta };

      console.log('Enviando:', payload);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        ativar(data.message || `Pedido ${acao === 'aprovar' ? 'aprovado' : 'recusado'} com sucesso!`,'sucesso','');
        fecharModal();
        carregarReconsideracoes();
      } else {
        ativar(data.message || 'Erro ao processar pedido.','erro','');
      }

    } catch (err) {
      console.error('Erro ao processar resposta:', err);
      ativar('Erro ao processar pedido. Tente novamente.','erro','');
    }
  }

  window.carregarReconsideracoes = carregarReconsideracoes;
});