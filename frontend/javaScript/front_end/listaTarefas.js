import { listarAtividadesAluno } from "../services/listaTarefasService.js";

// Elementos do DOM
const atividadesContainer = document.getElementById('atividades-container');
const loading = document.getElementById('loading');
const erro = document.getElementById('mensagem-erro');
const semAtividades = document.getElementById('sem-atividades');
const filtroStatus = document.getElementById('filtro-status');
const filtroPrazo = document.getElementById('filtro-prazo');
const filtroBusca = document.getElementById('filtro-busca');

let todasAtividades = []; // Cache das atividades

// Função principal para carregar e renderizar
async function carregarEFiltrarAtividades() {
  loading.style.display = 'block';
  atividadesContainer.innerHTML = ''; // Limpa os cards antigos
  
  try {
    const data = await listarAtividadesAluno();
    loading.style.display = 'none';

    if (!data.success || !Array.isArray(data.atividades)) {
      throw new Error(data.message || 'Resposta inválida do servidor');
    }

    if (data.atividades.length === 0) {
      semAtividades.style.display = 'block';
      todasAtividades = [];
      return;
    }
    
    semAtividades.style.display = 'none';
    todasAtividades = data.atividades; // Salva no cache
    
    // Ordena pela data de criação (mais novas primeiro)
    todasAtividades.sort((a, b) => 
      new Date(b.atividade_data_criacao) - new Date(a.atividade_data_criacao)
    );
    
    renderizarCards(todasAtividades); // Renderiza tudo
    filtrarCards(); // Aplica os filtros atuais

  } catch (e) {
    console.error('Erro ao carregar atividades:', e);
    loading.style.display = 'none';
    erro.style.display = 'block';
    erro.textContent = 'Erro ao carregar atividades.';
  }
}

// Renderiza os cards na tela
function renderizarCards(atividades) {
  atividadesContainer.innerHTML = ''; // Limpa por segurança
  const agora = new Date();

  atividades.forEach(atividade => {
    const card = document.createElement('div');
    card.classList.add('atividade-card');
    
    const prazoDate = new Date(atividade.atividade_prazo);
    const isPrazoVencido = prazoDate.getTime() < agora.getTime();

    // Lógica de Status (Mais robusta)
    let statusTexto = 'Pendente';
    let statusClasse = 'pendente';

    if (atividade.entrega_status === 'Entregue') {
        statusTexto = 'Entregue';
        statusClasse = 'entregue';
    } else if (atividade.entrega_status === 'Avaliado') {
        statusTexto = `Avaliado: ${atividade.avaliacao_nota}`;
        statusClasse = 'avaliado';
    } else if (isPrazoVencido) {
        statusTexto = 'Atrasado';
        statusClasse = 'atrasado';
    }

    card.dataset.status = statusClasse; // 'pendente', 'entregue', 'atrasado', 'avaliado'
    card.dataset.prazodat = atividade.atividade_prazo;
    card.dataset.titulo = atividade.atividade_titulo.toLowerCase();

    card.innerHTML = `
      <h3>${atividade.atividade_titulo}</h3>
      <p class="disciplina">${atividade.disciplina_nome}</p>
      <p class="prazo"><strong>Prazo:</strong> ${prazoDate.toLocaleString('pt-BR')}</p>
      <p class="info-grupo"><strong>Grupo:</strong> ${atividade.grupo_nome || 'N/A'}</p>
      <p class="info-prof"><strong>Professor:</strong> ${atividade.professor_nome || 'N/A'}</p>
      <span class="status-badge status-${statusClasse}">${statusTexto}</span>
    `;

    // Lógica de clique
    // Bloqueia clique se estiver avaliado ou atrasado e não entregue
    const podeClicar = statusClasse !== 'avaliado' && !(statusClasse === 'atrasado' && statusTexto !== 'Entregue');

    if (podeClicar) {
      card.addEventListener('click', () => {
        // Salva o ID da ATIVIDADE, não da entrega
        localStorage.setItem('atividade_id', atividade.atividade_id);
        window.location.href = 'entrega'; // Redireciona para a página de entrega
      });
    } else {
      card.classList.add('card-desativado');
      card.style.cursor = 'not-allowed';
      if (statusClasse === 'avaliado') {
        card.title = 'Esta atividade já foi avaliada.';
      } else {
        card.title = 'O prazo desta atividade está vencido.';
      }
    }

    atividadesContainer.appendChild(card);
  });
}

// Filtra os cards que já estão na tela
function filtrarCards() {
  const statusEscolhido = filtroStatus.value;
  const prazoEscolhido = filtroPrazo.value;  
  const textoBusca = filtroBusca.value.toLowerCase().trim();
  const agora = new Date();
  
  let cardsVisiveis = 0;

  atividadesContainer.querySelectorAll('.atividade-card').forEach(card => {
    const statusCard = card.dataset.status;
    const prazoISO = card.dataset.prazodat;
    const tituloCard = card.dataset.titulo;
    const dataPrazo = new Date(prazoISO);

    // Lógica de filtro
    const passouStatus = statusEscolhido === 'todos' || statusCard === statusEscolhido;
    
    let passouPrazo = false;
    if (prazoEscolhido === 'todos') {
      passouPrazo = true;
    } else if (prazoEscolhido === 'proximos') {
      const seteDiasDepois = new Date(agora.getTime() + 7 * 24*60*60*1000);
      passouPrazo = (dataPrazo >= agora && dataPrazo <= seteDiasDepois);
    } else if (prazoEscolhido === 'vencidos') {
      passouPrazo = (dataPrazo < agora && statusCard !== 'entregue' && statusCard !== 'avaliado');
    }

    const passouBusca = tituloCard.includes(textoBusca);

    const deveExibir = passouStatus && passouPrazo && passouBusca;
    card.style.display = deveExibir ? '' : 'none';
    if(deveExibir) cardsVisiveis++;
  });
  
  // Mostra mensagem de "sem atividades" se o filtro não retornar nada
  if (cardsVisiveis === 0 && todasAtividades.length > 0) {
      semAtividades.style.display = 'block';
      semAtividades.querySelector('h3').textContent = 'Nenhuma atividade encontrada';
      semAtividades.querySelector('p').textContent = 'Tente ajustar seus filtros.';
  } else if (cardsVisiveis > 0) {
      semAtividades.style.display = 'none';
  }
}

// --- Ponto Chave (Sua Regra de Negócio 1) ---
// Roda o carregamento quando a página é aberta pela primeira vez
document.addEventListener('DOMContentLoaded', carregarEFiltrarAtividades);

// Roda o carregamento CADA VEZ que a página se torna visível
// Isso resolve o problema de "voltar" da página de entrega e o status estar desatualizado.
window.addEventListener('pageshow', (event) => {
  // O 'event.persisted' é true se a página foi carregada do cache (ex: botão "voltar")
  if (event.persisted) {
    console.log('Página recarregada do cache. Buscando dados atualizados...');
    carregarEFiltrarAtividades();
  }
});

// Adiciona os listeners para os filtros
filtroStatus.addEventListener('change', filtrarCards);
filtroPrazo.addEventListener('change', filtrarCards);
filtroBusca.addEventListener('input', filtrarCards);