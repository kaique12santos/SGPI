import { ativar } from "../utils/alerts.js";
import { confirmarAcao } from "../utils/confirmDialog.js";
import { formatarData } from "../utils/formatDate.js";
import {
  listarOfertas,
  listarAtividades,
  criarAtividade,
  atualizarAtividade,
  excluirAtividadeService
} from "../services/AtividadesService.js";


// Carrega as ofertas e preenche um <select>
async function carregarOfertasParaModal(selectId, selectedId = null) {
  try {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    const ofertas = await listarOfertas(usuarioId, baseEndpoint);
    
    // Debugging que mantivemos para garantir
    console.log('OFERTAS RECEBIDAS DO BACKEND:', ofertas);
    
    if (!Array.isArray(ofertas)) {
      console.error("A resposta de /ofertas não é um array:", ofertas);
      throw new Error("Falha ao carregar lista de ofertas.");
    }
    selectEl.innerHTML = '<option value="0">Selecione uma Oferta</option>'; // Limpa

    ofertas.forEach(oferta => {
      console.log('Processando 1 oferta:', oferta);
      const option = document.createElement('option');
      option.value = oferta.oferta_id;
      option.textContent = `${oferta.disciplina} (${oferta.periodo}º/${oferta.ano}) - ${oferta.total_alunos} alunos`;
      if (oferta.oferta_id === selectedId) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });

  } catch (error) {
    console.error('Erro ao carregar ofertas:', error);
    ativar('Falha ao carregar ofertas (disciplinas/semestres).', 'erro', '');
  }
}

// Carregar dados na inicialização
document.addEventListener("DOMContentLoaded", () => {
  carregarAtividades();
  // Pré-carrega o dropdown do formulário de *criação*
  carregarOfertasParaModal("create-oferta");
});

const usuarioId = parseInt(localStorage.getItem("usuarioId"), 10);
const usuarioRole = localStorage.getItem("userRole") || localStorage.getItem("usuarioRole") || "professor";
const baseEndpoint =
  usuarioRole === "professor_orientador" ? "/professor_orientador" : "/professor";

if (!usuarioId || isNaN(usuarioId)) {
  console.error("ID do usuário não encontrado ou inválido no localStorage.");
}

async function carregarAtividades() {
  try {
    const atividades = await listarAtividades(usuarioId, baseEndpoint);
    if (!Array.isArray(atividades)) {
      console.error("A resposta de /atividades não é um array:", atividades);
      throw new Error("Falha ao carregar lista de atividades.");
    }
    renderizarAtividades(atividades);
  } catch (error) {
    console.error("Erro ao carregar atividades:", error);
    ativar(`Falha ao carregar atividades: ${error.message}`, "erro", "");
  }
}

/**
 * Função Botão (Implementação única)
 * Cria um elemento de botão simples com um handler de clique.
 */
function criarBotao(texto, classe, onClick) {
  const btn = document.createElement("button");
  btn.className = `${classe} btn`;
  btn.textContent = texto;
  btn.addEventListener("click", onClick);
  return btn;
}

/**
 * Função Renderizar (Limpa)
 * A função createContainer() foi removida pois o HTML já possui o .atividades-criadas
 */
function renderizarAtividades(atividades) {
  const container = document.querySelector(".atividades-criadas");
  
  // Garantia de que o container existe (após a correção do HTML)
  if (!container) {
    console.error("ERRO: O <div> .atividades-criadas não foi encontrado no HTML.");
    return;
  }
  
  container.innerHTML = ""; // Limpa a lista atual

  atividades
    .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao))
    .forEach((atividade) => {
      // Passa os novos dados para o card
      const div = criarCardAtividade(atividade);
      container.appendChild(div);
    });
}

// A função createContainer() foi removida.

function criarCardAtividade(atividade) {
  const { id, titulo, prazo_entrega, disciplina_nome, semestre_periodo, semestre_ano } = atividade;
  const div = document.createElement("div");
  div.className = "atividade-card";
  div.dataset.atividadeId = id;

  div.innerHTML = `
    <strong>${titulo}</strong><br>
    Prazo de Entrega: ${formatarData(prazo_entrega)}<br>
    Disciplina: ${disciplina_nome || 'N/A'}<br>
    Semestre: ${semestre_periodo || 'N/A'}º / ${semestre_ano || 'N/A'}<br>
  `;

  div.appendChild(criarBotao("Ver", "btn-Ver", () =>
    // Passa a atividade inteira
    mostrarDetalhes(div, atividade)
  ));
  div.appendChild(criarBotao("Alterar", "btn-alterar", () =>
    abrirModalEdicao(div, atividade)
  ));
  div.appendChild(criarBotao("Excluir", "btn-excluir", () => excluirAtividade(div, id)));

  return div;
}

// A função duplicada de criarBotao() foi removida.

function mostrarDetalhes(wrapper, detalhes) {
  // Usa os novos campos
  const { titulo, descricao, disciplina_nome, semestre_periodo, semestre_ano, prazo_entrega, nota_maxima } = detalhes;
  const overlay = document.createElement("div");
  overlay.className = "div-zindex";
  const modal = document.createElement("div");
  modal.className = "div-mostrar";
  modal.innerHTML = `
    <h2>Título: ${titulo}</h2>
    <p><strong>Descrição:</strong> ${descricao}</p>
    <p><strong>Disciplina:</strong> ${disciplina_nome || 'N/A'}</p>
    <p><strong>Semestre:</strong> ${semestre_periodo || 'N/A'}º / ${semestre_ano || 'N/A'}</p>
    <p><strong>Prazo de Entrega:</strong> ${formatarData(prazo_entrega)}</p>
    <p><strong>Nota Máxima:</strong> ${nota_maxima} Pontos</p>
    <button id="fecharModal" class='send-button' style="margin-top:1rem;">Fechar</button>
  `;
  modal.querySelector("#fecharModal").onclick = () => document.body.removeChild(overlay);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Esta função mudou bastante
async function abrirModalEdicao(div, atividade) {
  const { id, titulo, descricao, prazo_entrega, nota_maxima, oferta_id } = atividade;
  const overlay = document.createElement("div");
  overlay.className = "div-zindex";

  const dataISO = new Date(prazo_entrega);
  const dataFormatada = dataISO.toISOString().slice(0, 16);

  const modal = document.createElement("div");
  modal.className = "div-mostrar modal-edicao";
  modal.innerHTML = `
    <form id="editar-atividade">
      <h2>Editar Atividade</h2>
      <label>Nome da atividade<input type="text" id="edit-titulo" class="input-atividade" value="${titulo}" required></label>
      <label>Descrição<textarea id="edit-descricao" class="input-atividade textarea-tamanho" required>${descricao}</textarea></label>
      
      <label>Oferta (Disciplina/Semestre)
        <select id="edit-oferta" class="input-atividade" required>
          <option value="0">Carregando ofertas...</option>
        </select>
      </label>
      
      <label>Data de entrega<input type="datetime-local" id="edit-prazo" class="input-atividade" value="${dataFormatada}" required></label>
      
      <label>Nota Máxima<input type="number" id="edit-nota-maxima" class="input-atividade" value="${nota_maxima}" min="0" max="10" step="0.1" required></label>
      
      <div class="btn-group">
        <button type="submit" class="btn send-button">Salvar</button>
        <button type="button" id="cancelar-edicao" class="btn btn-cancelar">Cancelar</button>
      </div>
    </form>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Carrega as ofertas e seleciona a atual
  await carregarOfertasParaModal("edit-oferta", oferta_id);

  document.getElementById("cancelar-edicao").addEventListener("click", () => document.body.removeChild(overlay));

  document.getElementById("editar-atividade").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      titulo: document.getElementById("edit-titulo").value,
      descricao: document.getElementById("edit-descricao").value,
      oferta_id: parseInt(document.getElementById("edit-oferta").value, 10), // MUDOU
      prazo_entrega: document.getElementById("edit-prazo").value,
      nota_maxima: parseFloat(document.getElementById("edit-nota-maxima").value), // MUDOU
      professor_id: usuarioId,
    };
    
    if (dados.oferta_id === 0) {
      ativar("Por favor, selecione uma oferta válida.", "erro", "");
      return;
    }
    const confirmar = await confirmarAcao(
      "Confirmar alteração?",
      "Deseja realmente salvar as alterações desta atividade?",
      "Salvar Alterações",
      "Cancelar"
    );
  
    if (!confirmar) return;
    try {
      const data = await atualizarAtividade(id, dados, baseEndpoint);
      if (!data.success) {
        throw new Error(data.message || "Erro ao atualizar atividade");
      }
      ativar(data.message || "Atividade atualizada com sucesso!", "sucesso", "");
      document.body.removeChild(overlay);
      carregarAtividades(); // Recarrega para mostrar mudanças
    } catch (err) {
      console.error("Erro:", err);
      ativar(`Falha ao atualizar atividade: ${err.message}`, "erro", "");
    }
  });
}

/**
 * Função Excluir (Implementada)
 * Pede confirmação e exclui a atividade.
 */
async function excluirAtividade(div, atividadeId) {

  // ✅ NOVA CONFIRMAÇÃO CUSTOMIZADA
  const confirmado = await confirmarAcao(
    "Excluir atividade?",
    "Esta ação é permanente e não poderá ser desfeita.",
    "Excluir",
    "Cancelar"
  );

  if (!confirmado) return;

  try {
    const data = await excluirAtividadeService(atividadeId, usuarioId, baseEndpoint);

    if (!data.success) {
      throw new Error(data.message || "Erro desconhecido ao excluir");
    }

    ativar("Atividade excluída com sucesso!", "sucesso", "");
    div.remove();

  } catch (err) {
    console.error("Erro ao excluir atividade:", err);
    ativar(`Falha ao excluir: ${err.message}`, "erro", "");
  }
}

// Formulário de criação
const form = document.querySelector("#create-task");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  // MUDANÇAS AQUI
  const titulo = document.getElementById("nomeAtividade").value;
  const descricao = document.getElementById("descricao").value;
  const selectOferta = document.getElementById("create-oferta");
  const oferta_id = parseInt(document.getElementById("create-oferta").value, 10); // MUDOU
  const oferta_texto = selectOferta.options[selectOferta.selectedIndex]?.textContent?.trim() || "";
 
  const prazo_entrega = document.getElementById("dataEntrega").value;
  const nota_maxima = parseFloat(document.getElementById("create-nota-maxima").value); // MUDOU
  

  // Limpa erros
  document.getElementById("ofertaError").textContent = "";
  
  if (!titulo || !descricao || !prazo_entrega || !nota_maxima) {
    ativar("Por favor, preencha todos os campos.", "erro", "");
    return;
  }
  if (oferta_id < 1) {
    document.getElementById("ofertaError").textContent = "Selecione uma Oferta válida.";
    return;
  }
  const confirmou = await confirmarAcao(
    "Confirmar criação?",
    `Você está criando esta atividade na disciplina: <strong>${oferta_texto}</strong>. Tudo certo?`,
    "Criar atividade",
    "Cancelar"
  );
  if (!confirmou) return;
  try {
    const dados = {
      titulo,
      descricao,
      oferta_id,
      prazo_entrega,
      nota_maxima,
      professor_id: usuarioId
    };
   
    const data = await criarAtividade(dados, baseEndpoint); 
    if (!data.success) throw new Error(data.message);

    ativar("Atividade criada com sucesso!", "sucesso", "");
    form.reset();
    
    // Recarrega ofertas no dropdown de criação (caso a página não seja recarregada)
    await carregarOfertasParaModal("create-oferta");
    // Recarrega a lista de atividades criadas
    carregarAtividades(); 

  } catch (error) {
    console.error("Erro na criação:", error);
    ativar(`Erro na criação: ${error.message}`, "erro", "");
  }
});