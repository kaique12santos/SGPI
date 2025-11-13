import { ativar } from "../utils/alerts.js";
import {
  obterReconsideracoes,
  aprovarReconsideracao,
  recusarReconsideracao
} from "../services/ReconsideracoesService.js";
import { confirmarAcao } from "../utils/confirmDialog.js";

document.addEventListener("DOMContentLoaded", async () => {
  const professorId = localStorage.getItem("usuarioId");
  const role = localStorage.getItem("userRole") || "professor";
  const container = document.getElementById("container-reconsideracoes");
  
  // Define o endpoint dinâmico
  const baseEndpoint = (role === "professor_orientador") ? "/professor_orientador" : "/professor";

  if (!professorId || (role !== "professor" && role !== "professor_orientador")) {
    container.innerHTML = "<p>Usuário não autorizado.</p>";
    return;
  }

  await carregarReconsideracoes();

  async function carregarReconsideracoes() {
    container.innerHTML = "<p>Carregando pedidos de reconsideração...</p>";
    try {
      // Passa o baseEndpoint
      const data = await obterReconsideracoes(baseEndpoint);

      if (!data.success || data.reconsideracoes.length === 0) {
        container.innerHTML = "<p>Sem pedidos de reconsideração pendentes.</p>";
        return;
      }

      container.innerHTML = "";
      data.reconsideracoes.forEach((item) => {
        const card = document.createElement("div");
        const notaFloat = parseFloat(item.NOTA);
        card.className = "reconsideracao-card";
        // Passa o item inteiro para o modal
        card.onclick = () => abrirModal(item); 
        console.log(item)
        card.innerHTML = `
        <h3>Aluno: ${item.ALUNO_NOME}</h3>
        <div><strong>Atividade:</strong> ${item.ATIVIDADE}</div>
        <div><strong>Nota Atual:</strong> ${notaFloat.toFixed(1)}</div>
        <div><strong>Status:</strong> Pendente</div>
        
        <div><strong>Motivo:</strong></div>
        <div class="motivo truncate-text" title="${item.MOTIVO}">
          ${item.MOTIVO}
        </div>
        `;
      container.appendChild(card);
      });
    } catch (err) {
      console.error("Erro ao buscar reconsiderações:", err);
      container.innerHTML = "<p>Erro ao carregar reconsiderações.</p>";
    }
  }

  function abrirModal(item) {
    const modal = document.createElement("div");
    modal.className = "modal-reconsideracao";
    modal.id = "modal-reconsideracao";

    // Usa a nota_maxima do item para o <input>
    const notaMaxima = item.nota_maxima || 10; 
    const notaFloat = parseFloat(item.NOTA);
    modal.innerHTML = `
      <div class="modal-reconsideracao-content">
        <h3>Pedido de Reconsideração</h3>
        <p><strong>Aluno:</strong> ${item.ALUNO_NOME}</p>
        <p><strong>Atividade:</strong> ${item.ATIVIDADE}</p>
        <p><strong>Nota Atual:</strong> ${notaFloat.toFixed(1)}</p>
        <p><strong>Comentário (Avaliação):</strong> ${item.COMENTARIO || "Nenhum"}</p>
        <p><strong>Motivo do Aluno:</strong> ${item.MOTIVO}</p>

        <label>Resposta do Professor *</label>
        <textarea id="resposta-professor" rows="3"></textarea>

        <label>Nova Nota (Opcional - Max: ${notaMaxima})</label>
        <input type="number" id="nova-nota" min="0" max="${notaMaxima}" step="0.1" />

        <div class="actions">
          <button id="btn-cancelar">Cancelar</button>
          <button id="btn-recusar">Recusar</button>
          <button id="btn-aprovar">Aprovar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);

    // Adiciona listeners aos botões
    document.getElementById('btn-cancelar').onclick = fecharModal;
    document.getElementById('btn-recusar').onclick = () => processarResposta(item, 'recusar', notaMaxima);
    document.getElementById('btn-aprovar').onclick = () => processarResposta(item, 'aprovar', notaMaxima);
  }

  // Remove a função global, pois não é mais necessária
  function fecharModal() {
    const modal = document.getElementById("modal-reconsideracao");
    if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
      setTimeout(() => document.body.removeChild(modal), 300);
    }
  };

  // Remove a função global
  async function processarResposta(item, acao, notaMaxima) {
    const resposta = document.getElementById("resposta-professor").value.trim();
    const notaInput = document.getElementById("nova-nota").value.trim();
    const id = item.ID;

    if (!resposta) {
      ativar("Digite uma resposta.", "info", "");
      return;
    }

    const novaNota = (notaInput === "") ? null : Number(notaInput.replace(",", "."));
    
    // Validação de nota no frontend (usa a notaMaxima vinda do backend)
    if (novaNota !== null && (isNaN(novaNota) || novaNota < 0 || novaNota > notaMaxima)) {
      ativar(`Nota inválida. Deve ser entre 0 e ${notaMaxima}.`, "info", "");
      return;
    }

    // (Usando alert nativo, pode trocar pelo seu 'alertConfirm')
    const confirmar = await confirmarAcao(
      "Confirmar Ação",
      "Deseja realmente salvar as alterações desta atividade?",
      "Salvar Alterações",
      "Cancelar"
    );
  
    if (!confirmar) return;

    try {
      let data;
      if (acao === "aprovar") {
        data = await aprovarReconsideracao(id, resposta, novaNota, baseEndpoint);
      } else {
        data = await recusarReconsideracao(id, resposta, baseEndpoint);
      }

      if (data.success) {
        ativar(data.message, "sucesso", "");
        fecharModal();
        carregarReconsideracoes(); // Recarrega a lista
      } else {
        ativar(data.message || "Erro ao processar pedido.", "erro", "");
      }
    } catch (err) {
      console.error("Erro ao processar:", err);
      ativar(err.message || "Erro na requisição.", "erro", "");
    }
  };
});