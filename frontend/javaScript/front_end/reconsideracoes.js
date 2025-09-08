import { ativar } from "../utils/alerts.js";
import {
  obterReconsideracoes,
  aprovarReconsideracao,
  recusarReconsideracao
} from "../services/ReconsideracoesService.js";

document.addEventListener("DOMContentLoaded", async () => {
  const professorId = localStorage.getItem("usuarioId");
  const container = document.getElementById("container-reconsideracoes");

  if (!professorId || isNaN(professorId)) {
    container.innerHTML =
      "<p>Erro: ID do professor não encontrado. Faça login novamente.</p>";
    console.error("Professor ID inválido:", professorId);
    return;
  }

  await carregarReconsideracoes();

  async function carregarReconsideracoes() {
    container.innerHTML = "<p>Carregando pedidos de reconsideração...</p>";

    try {
      const profId = parseInt(professorId);
      const data = await obterReconsideracoes(profId);

      if (!data.success || data.reconsideracoes.length === 0) {
        container.innerHTML =
          "<p>Sem pedidos de reconsideração pendentes.</p>";
        return;
      }

      container.innerHTML = "";
      data.reconsideracoes.forEach((item) => {
        const card = document.createElement("div");
        card.className = "reconsideracao-card";
        card.onclick = () => abrirModal(item);

        card.innerHTML = `
          <h3>${item.ALUNO_NOME}</h3>
          <div><strong>Atividade:</strong> ${item.ATIVIDADE}</div>
          <div><strong>Nota Atual:</strong> ${item.NOTA}</div>
          <div><strong>Status:</strong> Pendente</div>
          <div class="motivo"><strong>Motivo:</strong> ${item.MOTIVO}</div>
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

    modal.innerHTML = `
      <div class="modal-reconsideracao-content">
        <h3>Pedido de Reconsideração</h3>
        <p><strong>Aluno:</strong> ${item.ALUNO_NOME}</p>
        <p><strong>Atividade:</strong> ${item.ATIVIDADE}</p>
        <p><strong>Nota Atual:</strong> ${item.NOTA}</p>
        <p><strong>Comentário:</strong> ${item.COMENTARIO || "Nenhum comentário"}</p>
        <p><strong>Motivo do Aluno:</strong> ${item.MOTIVO}</p>

        <label>Resposta do Professor *</label>
        <textarea id="resposta-professor" rows="3"></textarea>

        <label>Nova Nota (opcional)</label>
        <input type="number" id="nova-nota" min="0" max="10" step="0.1" />

        <div class="actions">
          <button onclick="fecharModal()">Cancelar</button>
          <button onclick="processarResposta(${item.ID}, 'recusar')">Recusar</button>
          <button onclick="processarResposta(${item.ID}, 'aprovar')">Aprovar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModal();
    });
  }

  window.fecharModal = function () {
    const modal = document.getElementById("modal-reconsideracao");
    if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
      setTimeout(() => document.body.removeChild(modal), 300);
    }
  };

  window.processarResposta = async function (id, acao) {
    const resposta = document
      .getElementById("resposta-professor")
      .value.trim();
    const notaInput = document.getElementById("nova-nota").value.trim();

    if (!resposta) {
      ativar("Digite uma resposta.", "info", "");
      return;
    }

    const novaNota =
      notaInput === "" ? null : Number(notaInput.replace(",", "."));
    if (novaNota !== null && (isNaN(novaNota) || novaNota < 0 || novaNota > 10)) {
      ativar("Nota inválida. Use 0–10.", "info", "");
      return;
    }

    const confirmar = confirm(
      `Tem certeza que deseja ${acao} este pedido de reconsideração?`
    );
    if (!confirmar) return;

    try {
      let data;
      if (acao === "aprovar") {
        data = await aprovarReconsideracao(id, resposta, novaNota);
      } else {
        data = await recusarReconsideracao(id, resposta);
      }

      if (data.success) {
        ativar(data.message, "sucesso", "");
        fecharModal();
        carregarReconsideracoes();
      } else {
        ativar(data.message || "Erro ao processar pedido.", "erro", "");
      }
    } catch (err) {
      console.error("Erro ao processar:", err);
      ativar("Erro na requisição.", "erro", "");
    }
  };

  window.carregarReconsideracoes = carregarReconsideracoes;
});