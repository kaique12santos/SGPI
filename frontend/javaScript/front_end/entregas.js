import { obterDetalhesAtividade, enviarEntregaService } from "../services/EntregasService.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarDetalhes();
});

const atividadeId = localStorage.getItem("atividade_id");
const alunoId = localStorage.getItem("usuarioId");

async function carregarDetalhes() {
  try {
    const data = await obterDetalhesAtividade(atividadeId, alunoId);

    if (data.success) {
      const a = data.atividade;
      document.getElementById("titulo").innerText = a.titulo;
      document.getElementById("descricao").innerText = a.descricao;
      document.getElementById("professor").innerText = `${a.professor_nome} (${a.professor_email})`;
      document.getElementById("prazo").innerText = new Date(a.prazo_entrega).toLocaleString("pt-BR");
      document.getElementById("criterios").innerText = a.criterios_avaliacao;
    } else {
      mostrarErro(data.message || "Erro ao carregar detalhes da atividade.");
    }
  } catch (err) {
    console.error("Erro ao carregar detalhes:", err);
    mostrarErro("Erro ao carregar detalhes da atividade.");
  }
}

async function enviarEntrega() {
  const fileInput = document.getElementById("arquivo");
  const sucesso = document.getElementById("sucesso");
  const erro = document.getElementById("erro");

  sucesso.style.display = "none";
  erro.style.display = "none";

  if (!fileInput.files[0]) {
    erro.textContent = "Selecione um arquivo.";
    erro.style.display = "block";
    return;
  }

  const formData = new FormData();
  formData.append("arquivo", fileInput.files[0]);
  formData.append("atividade_id", atividadeId);
  formData.append("aluno_id", alunoId);

  try {
    const result = await enviarEntregaService(formData);

    if (result.success) {
      sucesso.style.display = "block";
    } else {
      erro.textContent = result.message || "Erro ao enviar.";
      erro.style.display = "block";
    }
  } catch (e) {
    mostrarErro("Erro de conexão.");
  }
}

function mostrarErro(msg) {
  const erro = document.getElementById("erro");
  erro.textContent = msg;
  erro.style.display = "block";
}

window.enviarEntrega = enviarEntrega;