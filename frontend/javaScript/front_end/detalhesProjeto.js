import { ativar } from "../utils/alerts.js";
import { obterAtividadesDoProjeto } from "../services/DetalhesProjetoService.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tabela = document.getElementById("tabelaAtividades");
  const loading = document.getElementById("loading");
  const erro = document.getElementById("mensagem-erro");
  const semProjetos = document.getElementById("sem-projetos");

  function getQueryParam(chave) {
    const params = new URLSearchParams(window.location.search);
    return params.get(chave);
  }

  const projetoId = getQueryParam("projetoId");
  if (!projetoId) {
    ativar("ID do projeto não fornecido na URL.", "erro", "");
    return;
  }

  tabela.style.display = "none";
  semProjetos.style.display = "none";
  erro.style.display = "none";
  loading.style.display = "block";

  try {
    const dados = await obterAtividadesDoProjeto(projetoId);

    loading.style.display = "none";

    if (!dados.success) {
      throw new Error(dados.message || "Erro ao obter atividades.");
    }

    const atividades = dados.atividades;
    const tbody = tabela.querySelector("tbody");
    tbody.innerHTML = "";

    if (atividades.length === 0) {
      semProjetos.style.display = "block";
      return;
    }

    atividades.forEach((atv) => {
      const tr = document.createElement("tr");

      // 1) Título da Atividade
      const tdTitulo = document.createElement("td");
      tdTitulo.textContent = atv.TITULO_ATIVIDADE;
      tr.appendChild(tdTitulo);

      // 2) Nome do Professor Avaliador
      const tdProf = document.createElement("td");
      tdProf.textContent = atv.NOME_PROFESSOR;
      tr.appendChild(tdProf);

      // 3) Nota
      const tdNota = document.createElement("td");
      tdNota.textContent =
        atv.NOTA_AVALIACAO !== null ? atv.NOTA_AVALIACAO : "-";
      tr.appendChild(tdNota);

      // 4) Comentário
      const tdComent = document.createElement("td");
      tdComent.textContent = atv.COMENTARIO_AVALIACAO || "-";
      tr.appendChild(tdComent);

      // 5) Data de Avaliação
      const tdData = document.createElement("td");
      if (atv.DATA_AVALIACAO) {
        const dt = new Date(atv.DATA_AVALIACAO);
        tdData.textContent = dt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } else {
        tdData.textContent = "-";
      }
      tr.appendChild(tdData);

      tbody.appendChild(tr);
    });

    tabela.style.display = "table";
  } catch (e) {
    console.error("Erro ao carregar atividades:", e);
    loading.style.display = "none";
    erro.style.display = "block";
    erro.textContent =
      "Erro ao carregar atividades. Tente novamente mais tarde.";
  }
});