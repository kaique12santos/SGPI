import { obterEntregasRecebidas } from "../services/EntregasRecebidasService.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarEntregasRecebidas();
});

async function carregarEntregasRecebidas() {
  const professorId = localStorage.getItem("usuarioId");
  const role = localStorage.getItem("userRole") || "professor";
  const container = document.getElementById("entregas-container");
  const baseEndpoint = (role === "professor_orientador") ? "/professor_orientador" : "/professor";

  if (!professorId || (role !== "professor" && role !== "professor_orientador")) {
    container.innerHTML = "<p>Usuário não autorizado.</p>";
    return;
  }

  try {
    const data = await obterEntregasRecebidas(professorId, baseEndpoint);

    if (!data.success || data.entregas.length === 0) {
      container.innerHTML = "<p>Nenhuma entrega pendente de avaliação.</p>";
      return;
    }

    data.entregas.forEach((e) => {
      const prazo = new Date(e.prazo_entrega);
      const hoje = new Date();
      const podeAvaliar = hoje >= prazo; 

      const botaoAvaliar = document.createElement("button");
      botaoAvaliar.textContent = "Avaliar";
      botaoAvaliar.classList.add("botao-avaliar");

      if (!podeAvaliar) {
        botaoAvaliar.disabled = true;
        botaoAvaliar.title = "Aguarde o prazo de entrega terminar para avaliar.";
      } else {
        botaoAvaliar.addEventListener("click", () => {
          localStorage.setItem("entrega_id", e.entrega_id);
          window.location.href = "avaliar";
        });
      }

      const parts = e.caminho_arquivo.split(/[\\\/]/);
      const filename = parts[parts.length - 1];
      const nomeExibicao = e.nome_arquivo_original || filename;

      // Card da entrega
      const card = document.createElement("div");
      card.classList.add("entrega-card");
      card.innerHTML = `
        <div class="entrega-info">
          <span><strong>Atividade:</strong> ${e.atividade_titulo}</span>
          <span><strong>Disciplina:</strong> ${e.disciplina_nome} (${e.semestre_periodo}º/${e.semestre_ano})</span>
          <span><strong>Grupo:</strong> ${e.grupo_nome}</span>
          <span><strong>Enviado por:</strong> ${e.aluno_responsavel_nome}</span>
          <span><strong>Data da Entrega:</strong> ${new Date(e.data_entrega).toLocaleString("pt-BR")}</span>
        </div>
        <div class="entrega-acoes">
          <a class="link-arquivo" href="#">${nomeExibicao}</a>
        </div>
      `;
      
      // --- CORREÇÃO DO DOWNLOAD ---
      // 1. Adiciona o listener de clique ao link
      const linkDownload = card.querySelector(".link-arquivo");
      linkDownload.addEventListener("click", (evt) => {
        evt.preventDefault();
        handleDownload(e.entrega_id, nomeExibicao, baseEndpoint, linkDownload);
      });
      // -----------------------------

      card.querySelector(".entrega-acoes").appendChild(botaoAvaliar);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Erro ao carregar entregas:", err);
    container.innerHTML = "<p>Erro ao carregar entregas.</p>";
  }
}

/**
 * NOVA FUNÇÃO: Cuida do download de arquivos de forma híbrida (Drive ou Local).
 */
async function handleDownload(entregaId, nomeOriginal, baseEndpoint, link) {
  const originalText = link.innerText;
  
  try {
    link.innerText = 'Processando...'; // Mudamos para "Processando" pois pode não ser um download direto
    link.style.pointerEvents = 'none';
    
    const token = localStorage.getItem('token'); 
    if (!token) {
      throw new Error("Usuário não autenticado.");
    }

    // 1. Faz a requisição ao backend
    const response = await fetch(`${baseEndpoint}/entregas/download/${entregaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 2. Verifica o tipo de conteúdo que o backend devolveu
    const contentType = response.headers.get("content-type");

    // CASO A: Backend retornou JSON (Link do Drive ou Erro)
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        // Se houve erro HTTP (404, 500, etc)
        if (!response.ok) {
            throw new Error(data.message || 'Falha no download');
        }

        // Se for arquivo do Drive, abre em nova aba
        if (data.isDrive && data.url) {
            window.open(data.url, '_blank');
        } else {
            // Caso raro (JSON de sucesso mas sem URL)
            alert(data.message || "Erro: Link não encontrado.");
        }
    } 
    // CASO B: Backend retornou Blob (Arquivo Local - Legado)
    else {
        if (!response.ok) throw new Error('Falha no download do arquivo local');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = nomeOriginal;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

  } catch (err) {
    console.error("Erro no download:", err);
    alert(`Erro ao acessar arquivo: ${err.message}`);
  } finally {
    link.innerText = originalText;
    link.style.pointerEvents = 'auto';
  }
}