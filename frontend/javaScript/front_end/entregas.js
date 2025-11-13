import { obterDetalhesAtividade, enviarEntregaService } from "../services/EntregasService.js";
import { ativar } from "../utils/alerts.js";
import { confirmarAcao } from "../utils/confirmDialog.js";

// Elementos do DOM
const dom = {
  tituloPagina: document.getElementById('titulo-pagina'),
  infoAtividade: document.getElementById('info-atividade'),
  loadingDetalhes: document.getElementById('loading-detalhes'),
  titulo: document.getElementById('titulo'),
  descricao: document.getElementById('descricao'),
  professor: document.getElementById('professor'),
  prazo: document.getElementById('prazo'),
  notaMaxima: document.getElementById('nota-maxima'),
  grupoNome: document.getElementById('grupo-nome'),
  
  loadingEntrega: document.getElementById('loading-entrega'),
  entregaExistente: document.getElementById('entrega-existente'),
  novaEntrega: document.getElementById('nova-entrega'),
  prazoVencido: document.getElementById('prazo-vencido'),
  
  linkDownload: document.getElementById('link-download'),
  responsavelNome: document.getElementById('responsavel-nome'),
  dataEntrega: document.getElementById('data-entrega'),
  btnTrocarArquivo: document.getElementById('btn-trocar-arquivo'),
  
  tituloUpload: document.getElementById('titulo-upload'),
  fileInput: document.getElementById('arquivo'),
  nomeArquivo: document.getElementById('nome-arquivo'),
  btnEnviar: document.getElementById('btn-enviar'),
  
  sucesso: document.getElementById('sucesso'),
  erro: document.getElementById('erro')
};

// IDs da URL/Storage
const atividadeId = localStorage.getItem("atividade_id");
const alunoId = localStorage.getItem("usuarioId"); // O service não usa, mas guardamos por via das dúvidas
let prazoGlobal = null;

// Função principal
document.addEventListener("DOMContentLoaded", () => {
  if (!atividadeId) {
    ativar("Erro: ID da atividade não encontrado. Volte à lista de tarefas.","info","");
    return;
  }
  carregarDetalhes();
  
  // Listeners dos botões
  dom.btnEnviar.addEventListener('click', enviarEntrega);
  dom.btnTrocarArquivo.addEventListener('click', habilitarTrocaArquivo);
  dom.fileInput.addEventListener('change', mostrarNomeArquivo);
});
async function handleDownload(entregaId, nomeOriginal) {
  const link = dom.linkDownload;
  const originalText = link.innerText;
  
  try {
    link.innerText = 'Baixando...';
    link.style.pointerEvents = 'none'; // Desabilita o link temporariamente
    
    // 1. Pega o token (assumindo que você o salva no localStorage)
    const token = localStorage.getItem('token'); 
    if (!token) {
      mostrarAlerta("Usuário não autenticado. Faça login novamente.", "erro");
      return;
    }

    // 2. Faz a requisição FETCH autenticada
    const response = await fetch(`/aluno/entregas/download/${entregaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Tenta ler a mensagem de erro que o backend enviou
      const errData = await response.json();
      throw new Error(errData.message || 'Falha no download');
    }

    // 3. Converte a resposta em um "Blob" (o arquivo)
    const blob = await response.blob();

    // 4. Cria um link "fantasma" na memória para forçar o download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeOriginal; // Usa o nome original que queremos!
    document.body.appendChild(a);
    
    a.click(); // Simula o clique no link fantasma
    
    // 5. Limpa da memória
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (err) {
    console.error("Erro no download:", err);
    mostrarAlerta(`Erro ao baixar: ${err.message}`, "erro");
  } finally {
    link.innerText = originalText;
    link.style.pointerEvents = 'auto'; // Reabilita o link
  }
}
async function carregarDetalhes() {
  mostrarLoading(true);
  try {
    const data = await obterDetalhesAtividade(atividadeId);

    if (data.success) {
      const a = data.atividade;
      prazoGlobal = new Date(a.prazo_entrega);

      // Preenche detalhes da atividade
      dom.tituloPagina.innerText = a.titulo;
      dom.titulo.innerText = a.titulo;
      dom.descricao.innerText = a.descricao;
      dom.professor.innerText = a.professor_nome || 'Não atribuído';
      dom.prazo.innerText = prazoGlobal.toLocaleString("pt-BR");
      dom.notaMaxima.innerText = `${a.nota_maxima || 10} pontos`;
      dom.grupoNome.innerText = a.grupo_nome || 'Você não está em um grupo para esta disciplina';
      
      mostrarLoading(false);

      // Agora, decide qual área de entrega mostrar
      atualizarAreaEntrega(data.entrega_existente);
      
    } else {
      ativar(data.message || "Erro ao carregar detalhes da atividade.", "erro","")
    }
  } catch (err) {
    console.error("Erro ao carregar detalhes:", err);
    // CORREÇÃO 2: Chamando a função correta
    
    ativar("Erro de conexão ao carregar detalhes da atividade.", "erro","")
  }
}

// REGRA 3: Gerencia qual 'card' de entrega mostrar
function atualizarAreaEntrega(entrega) {
  const agora = new Date();
  
  // Esconde todos os estados
  dom.loadingEntrega.style.display = 'none';
  dom.entregaExistente.style.display = 'none';
  dom.novaEntrega.style.display = 'none';
  dom.prazoVencido.style.display = 'none';

  // 1. Verifica o prazo
  if (prazoGlobal < agora && !entrega) {
    dom.prazoVencido.style.display = 'block';
    return;
  }
  
  // 2. Verifica se existe entrega
  if (entrega) {
    dom.entregaExistente.style.display = 'block';
    
    const nomeExibicao = entrega.nome_arquivo_original || entrega.caminho_arquivo.split(/[\\\/]/).pop();
    dom.linkDownload.innerText = nomeExibicao; 

    // ==== CORREÇÃO AQUI ====
    // Remove o link e o atributo download
    dom.linkDownload.href = '#'; 
    dom.linkDownload.removeAttribute('download');

    // Adiciona um listener de clique seguro
    // (A técnica de replaceWith/cloneNode previne listeners duplicados)
    const novoLink = dom.linkDownload.cloneNode(true);
    dom.linkDownload.parentNode.replaceChild(novoLink, dom.linkDownload);
    dom.linkDownload = novoLink; // Re-atribui o elemento do DOM

    dom.linkDownload.addEventListener('click', (e) => {
        e.preventDefault(); // Previne o clique no '#'
        handleDownload(entrega.id, nomeExibicao);
    });
    dom.responsavelNome.innerText = entrega.aluno_responsavel_nome || 'Não registrado';
    dom.dataEntrega.innerText = new Date(entrega.data_entrega).toLocaleString('pt-BR');
    // Se o prazo venceu, desabilita o botão de troca
    if (prazoGlobal < agora) {
        dom.btnTrocarArquivo.disabled = true;
        dom.btnTrocarArquivo.innerText = 'Prazo encerrado';
    }

  } else {
    // 3. Se não há entrega e o prazo está ok, mostra o upload
    dom.novaEntrega.style.display = 'block';
    dom.tituloUpload.innerText = 'Enviar entrega';
  }
}

// REGRA 3: Habilita a troca (apenas mostra o card de upload)
function habilitarTrocaArquivo() {
    dom.entregaExistente.style.display = 'none';
    dom.novaEntrega.style.display = 'block';
    dom.tituloUpload.innerText = 'Substituir entrega';
}

function mostrarNomeArquivo() {
    if (dom.fileInput.files.length > 0) {
        dom.nomeArquivo.innerText = `Arquivo selecionado: ${dom.fileInput.files[0].name}`;
    } else {
        dom.nomeArquivo.innerText = '';
    }
}

async function enviarEntrega() {

  if (!dom.fileInput.files[0]) {
    ativar("Selecione um arquivo.", "erro");
    return;
  }
  const confirmar = await confirmarAcao(
    "Confirmar Envio",
    "Deseja realmente enviar a tarefa?",
    "Enviar",
    "Cancelar"
  );

  if (!confirmar) return;

  const formData = new FormData();
  formData.append("arquivo", dom.fileInput.files[0]);
  formData.append("atividade_id", atividadeId);
  // O alunoId é pego pelo backend via token, não precisamos enviar

  dom.btnEnviar.disabled = true;
  dom.btnEnviar.innerText = 'Enviando...';
  
  try {
    // 1. 'response' aqui é o "envelope" (o objeto Response)
    const response = await enviarEntregaService(formData); 
    
    // ==== A CORREÇÃO ESTÁ AQUI ====
    // 2. 'result' aqui é o JSON de dentro do envelope
    const result = await response.json(); 
    // ==============================

    // 3. Agora o 'result.success' vai funcionar corretamente
    if (response.ok && result.success) { 
      ativar("Atividade enviada com sucesso!", "sucesso", "");
      // Recarrega os detalhes para mostrar o novo status de entrega
      carregarDetalhes(); 
    } else {
      // Caso o backend envie { success: false }
      console.error("Erro retornado pelo backend:", result);
      ativar(result.message || "Erro ao enviar.", "erro","");
    }
  } catch (e) {
    // Caso o response.ok seja false (erro 400, 500, etc.)
    console.error("Erro na requisição (bloco CATCH):", e);
    ativar("Erro de conexão ou falha grave.", "erro","");
  } finally {
    dom.btnEnviar.disabled = false;
    dom.btnEnviar.innerText = 'Enviar';
    dom.fileInput.value = ''; // Limpa o input de arquivo
    dom.nomeArquivo.innerText = '';
  }
}

function mostrarLoading(isLoading) {
  dom.loadingDetalhes.style.display = isLoading ? 'block' : 'none';
  dom.infoAtividade.style.display = isLoading ? 'none' : 'block';
  if(isLoading) {
    dom.loadingEntrega.style.display = 'block';
    dom.entregaExistente.style.display = 'none';
    dom.novaEntrega.style.display = 'none';
    dom.prazoVencido.style.display = 'none';
  }
}

