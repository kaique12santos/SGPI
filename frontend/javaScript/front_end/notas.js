import { ativar } from "../utils/alerts.js";
import { listarNotas, pedirReconsideracao } from "../services/notasServices.js";

/* ---------- FILTRO ---------- */
function filtrarNotas() {
  const statusEscolhido = document.getElementById('filtro-reconsideracao').value;
  const container = document.getElementById('notas-container');

  container.querySelectorAll('.card-nota').forEach(card => {
    const statusCard = card.dataset.statusReconsideracao;
    card.style.display = (statusEscolhido === 'todos' || statusCard === statusEscolhido) ? '' : 'none';
  });
}

/* ---------- DOWNLOAD DEVOLUTIVA ---------- */
async function handleDownloadDevolutiva(avaliacaoId, nomeOriginal, link) {
  const originalText = link.innerText;
  try {
    link.innerText = 'Baixando...';
    link.style.pointerEvents = 'none';

    const token = localStorage.getItem('token');
    if (!token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/aluno/avaliacoes/download/${avaliacaoId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Erro ${response.status}: falha no download`);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeOriginal;
    a.click();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    ativar(`Erro ao baixar: ${err.message}`, 'erro', '');
  } finally {
    link.innerText = originalText;
    link.style.pointerEvents = 'auto';
  }
}
/**
 * Função que cria e exibe o modal de comentário completo.
 */
function abrirModalComentario(comentarioCompleto) {
  // 1. Cria o 'backdrop' do modal
  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'modal-backdrop'; // Use esta classe para estilizar

  // 2. Cria o conteúdo do modal
  modalBackdrop.innerHTML = `
    <div class="modal-conteudo">
      <h2>Comentário Completo</h2>
      <p>${comentarioCompleto}</p>
      <button id="modal-fechar">Fechar</button>
    </div>
  `;

  // 3. Adiciona ao body
  document.body.appendChild(modalBackdrop);
  document.body.style.overflow = 'hidden'; // Trava o scroll da página

  // 4. Adiciona listeners para fechar
  const btnFechar = document.getElementById('modal-fechar');
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop || e.target === btnFechar) {
      document.body.removeChild(modalBackdrop);
      document.body.style.overflow = 'auto';
    }
  });
}
/* ---------- EVENTO PRINCIPAL ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('notas-container');
  const modalRecons = document.getElementById('modal-reconsideracao');
  const comentarioInput = document.getElementById('comentario-reconsideracao');
  const btnEnviar = document.getElementById('enviar-reconsideracao');
  const btnCancelar = document.getElementById('cancelar-reconsideracao');
  const filtro = document.getElementById('filtro-reconsideracao');
  let avaliacaoSelecionada = null;

  // 🔹 Modal novo para visualizar comentário completo
  const modalComentario = document.createElement('div');
  modalComentario.className = 'modal hidden';
  modalComentario.innerHTML = `
    <div class="modal-content">
      <h2>Comentário Completo</h2>
      <p id="texto-comentario-completo"></p>
      <button id="fechar-comentario">Fechar</button>
    </div>
  `;
  document.body.appendChild(modalComentario);

  try {
    const data = await listarNotas();

    if (!data.success || !Array.isArray(data.avaliacoes) || !data.avaliacoes.length) {
      container.innerHTML = '<p>Nenhuma avaliação disponível para o semestre ativo.</p>';
      return;
    }

    data.avaliacoes.forEach(av => {
      const card = document.createElement('div');
      card.className = 'card-nota';
      const dentroPrazo = av.dentro_prazo;
      const jaSolicitado = av.status_reconsideracao !== null;
      const notaFloat = parseFloat(av.nota);
      const statusFiltro = jaSolicitado ? (av.status_reconsideracao || 'pendente').toLowerCase() : 'nenhum';
      card.dataset.statusReconsideracao = statusFiltro;

      /* ---- HTML do Card ---- */
      const devolutivaHtml = av.nome_original_devolutiva ? `
        <p class="devolutiva-container">
          <strong>Devolutiva:</strong>
          <a href="#" class="link-devolutiva" data-id="${av.id}" data-nome="${av.nome_original_devolutiva}">
            ${av.nome_original_devolutiva}
          </a>
        </p>` : '';

      const comentarioResumido = av.comentario ? av.comentario.substring(0, 120) + (av.comentario.length > 120 ? '...' : '') : 'Nenhum comentário';

      card.innerHTML = `
        <div class="nota-badge">${notaFloat.toFixed(1)}</div>
        <p><strong>Atividade:</strong> ${av.atividade}</p>
        <p><strong>Comentário:</strong> 
          <span class="comentario-resumido" data-comentario="${av.comentario || 'Nenhum comentário'}">${comentarioResumido}</span>
        </p>
        ${devolutivaHtml}
        <p><strong>Data da Avaliação:</strong> ${new Date(av.data_avaliacao).toLocaleDateString('pt-BR')}</p>
      `;

      // Status da reconsideração
      if (jaSolicitado) {
        let badgeClass = '';
        switch (av.status_reconsideracao) {
          case "Pendente": badgeClass = 'status-pendente'; break;
          case "Negado": badgeClass = 'status-reprovado'; break;
          case "Aprovado": badgeClass = 'status-aprovado'; break;
        }
        card.innerHTML += `<p><strong>Reconsideração:</strong> <span class="status-badge ${badgeClass}">${av.status_reconsideracao}</span></p>`;
      }

      // Botão de reconsideração
      const podePedir = dentroPrazo && !jaSolicitado;
      const botao = document.createElement('button');
      botao.className = 'btn-reconsiderar';
      botao.textContent = 'Pedir Reconsideração';
      botao.disabled = !podePedir;
      if (!podePedir) {
        botao.style.opacity = 0.6;
        botao.title = jaSolicitado ? `Já solicitado (${av.status_reconsideracao})` : 'Fora do prazo (15 dias)';
      }
      botao.addEventListener('click', () => {
        avaliacaoSelecionada = av.id;
        modalRecons.classList.remove('hidden');
      });

      card.appendChild(botao);
      container.appendChild(card);
    });

    // 🔹 Evento: abrir modal de comentário completo
    container.querySelectorAll('.comentario-resumido').forEach(el => {
      el.addEventListener('click', () => {
        const texto = el.dataset.comentario;
        document.getElementById('texto-comentario-completo').innerText = texto;
        modalComentario.classList.remove('hidden');
      });
    });

    // 🔹 Fechar modal de comentário
    document.getElementById('fechar-comentario').onclick = () => modalComentario.classList.add('hidden');

    // 🔹 Links de download
    container.querySelectorAll('.link-devolutiva').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        handleDownloadDevolutiva(e.target.dataset.id, e.target.dataset.nome, e.target);
      });
    });

    // 🔹 Modal de reconsideração
    btnCancelar.onclick = () => { modalRecons.classList.add('hidden'); comentarioInput.value = ''; };
    btnEnviar.onclick = async () => {
      const comentario = comentarioInput.value.trim();
      if (!comentario) return ativar('Por favor, escreva um motivo.', 'info', '');
      try {
        const r = await pedirReconsideracao(avaliacaoSelecionada, comentario);
        ativar(r.message, r.success ? 'sucesso' : 'erro', '');
        if (r.success) window.location.reload();
      } catch (err) {
        ativar(err.message, 'erro', '');
      } finally {
        modalRecons.classList.add('hidden');
        comentarioInput.value = '';
      }
    };

  } catch (err) {
    container.innerHTML = `<p>Erro ao carregar avaliações: ${err.message}</p>`;
  }

  filtro.addEventListener('change', filtrarNotas);
  filtrarNotas();
});
