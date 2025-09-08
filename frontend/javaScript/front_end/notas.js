import { ativar } from "../utils/alerts.js";
import { listarNotas, pedirReconsideracao } from "../services/notasServices.js";

document.addEventListener('DOMContentLoaded', async () => {
  const alunoId = localStorage.getItem('usuarioId');
  const container = document.getElementById('notas-container');
  const modal = document.getElementById('modal-reconsideracao');
  const comentarioInput = document.getElementById('comentario-reconsideracao');
  const btnEnviar = document.getElementById('enviar-reconsideracao');
  const btnCancelar = document.getElementById('cancelar-reconsideracao');
  let avaliacaoSelecionada = null;

  if (!alunoId) {
    container.innerHTML = '<p>Usuário não autenticado.</p>';
    return;
  }

  try {
    const data = await listarNotas(alunoId);

    if (!data.success || !Array.isArray(data.avaliacoes) || data.avaliacoes.length === 0) {
      container.innerHTML = '<p>Nenhuma avaliação disponível.</p>';
      return;
    }

    data.avaliacoes.forEach(av => {
      const card = document.createElement('div');
      card.className = 'card-nota';
      const dentroDoPrazo = av.dentro_prazo;
      const jaSolicitado = av.status_reconsideracao !== null;

      card.innerHTML = `
        <p><strong>Atividade:</strong><span> ${av.atividade}</span></p>
        <p><strong>Nota:</strong><span> ${av.nota}</span></p>
        <p><strong>Comentário do Professor:</strong><span> ${av.comentario || 'Nenhum'}</span></p>
        <p><strong>Data da Avaliação:</strong> ${new Date(av.data_avaliacao).toLocaleDateString('pt-BR')}</p>
      `;

      // Status de reconsideração
      if (jaSolicitado) {
        let badgeClass = '';
        switch (av.status_reconsideracao) {
          case "Pendente": badgeClass = 'status-pendente'; break;
          case "Entregue": badgeClass = 'status-entregue'; break;
          case "Negado":   badgeClass = 'status-reprovado'; break;
          case "Aprovado": badgeClass = 'status-aprovado';  break;
        }
        card.innerHTML += `<p><strong>Reconsideração:</strong><span class="status-badge ${badgeClass}">${av.status_reconsideracao}</span></p>`;
      }

      // Botão de reconsideração
      const podePedir = dentroDoPrazo && !jaSolicitado;
      const botao = document.createElement('button');
      botao.className = 'btn-reconsiderar';
      botao.textContent = 'Pedir Reconsideração';
      botao.disabled = !podePedir;

      if (!podePedir) {
        botao.style.opacity = 0.6;
        botao.title = jaSolicitado 
          ? `Já solicitado (${av.status_reconsideracao})`
          : 'Fora do prazo (7 dias)';
      }

      botao.addEventListener('click', () => {
        avaliacaoSelecionada = av.id;
        modal.classList.remove('hidden');
      });

      card.appendChild(botao);
      container.appendChild(card);
    });

    // Cancelar modal
    btnCancelar.onclick = () => {
      modal.classList.add('hidden');
      comentarioInput.value = '';
    };

    // Enviar reconsideração
    btnEnviar.onclick = async () => {
      const comentario = comentarioInput.value.trim();
      if (!comentario) return;

      const resposta = await pedirReconsideracao(avaliacaoSelecionada, parseInt(alunoId), comentario);

      ativar(resposta.message, 'sucesso', '/notas');
      modal.classList.add('hidden');
      comentarioInput.value = '';
    };

  } catch (err) {
    console.error('Erro ao carregar notas:', err);
    container.innerHTML = '<p>Erro ao carregar avaliações.</p>';
  }
});