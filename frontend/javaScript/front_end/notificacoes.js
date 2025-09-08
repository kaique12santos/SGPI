import { listarNotificacoes, marcarTodasNotificacoesLidas, marcarNotificacaoLida } from "../services/notificacoesServices.js";

document.addEventListener('DOMContentLoaded', function() {
  const usuarioId = localStorage.getItem("usuarioId");
  if (!usuarioId) {
    console.warn("ID do usuário não encontrado. Notificações não serão carregadas.");
    return;
  }

  const notificacaoBotao = document.getElementById('notificacao-toggle');
  const notificacoesContainer = document.getElementById('notificacoes-container');
  const notificacoesLista = document.getElementById('notificacoes-lista');
  const contadorNotificacoes = document.getElementById('contador-notificacoes');
  const marcarTodasLidasBtn = document.getElementById('marcar-todas-lidas');

  let notificacoesAbertas = false;

  notificacaoBotao.addEventListener('click', function(event) {
    event.stopPropagation();
    notificacoesAbertas = !notificacoesAbertas;
    notificacoesContainer.style.display = notificacoesAbertas ? 'block' : 'none';
    if (notificacoesAbertas) carregarNotificacoes();
  });

  document.addEventListener('click', function(event) {
    if (notificacoesAbertas && 
        !notificacoesContainer.contains(event.target) && 
        event.target !== notificacaoBotao) {
      notificacoesContainer.style.display = 'none';
      notificacoesAbertas = false;
    }
  });

  marcarTodasLidasBtn.addEventListener('click', async function() {
    try {
      const data = await marcarTodasNotificacoesLidas(usuarioId);
      if (data.success) {
        document.querySelectorAll('.notificacao-item.nao-lida')
          .forEach(el => el.classList.remove('nao-lida'));
        contadorNotificacoes.textContent = '0';
        contadorNotificacoes.style.display = 'none';
      }
    } catch (e) {
      console.error('Erro ao marcar todas como lidas:', e);
    }
  });

  function formatarData(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    if (data.toDateString() === hoje.toDateString()) {
      return `Hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    }
    if (data.toDateString() === ontem.toDateString()) {
      return `Ontem às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    }
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
  }

  async function carregarNotificacoes() {
    try {
      const data = await listarNotificacoes(usuarioId);
      const { total_nao_lidas, notificacoes } = data;

      contadorNotificacoes.style.display = total_nao_lidas > 0 ? 'block' : 'none';
      contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;

      notificacoesLista.innerHTML = '';

      if (notificacoes.length === 0) {
        notificacoesLista.innerHTML = `
          <div class="notificacao-item notificacao-vazia">
            <p>Nenhuma notificação disponível.</p>
          </div>
        `;
        return;
      }

      notificacoes.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notificacao-item ${!notif.lida ? 'nao-lida' : ''}`;
        item.dataset.id = notif.id;
        item.innerHTML = `
          <div class="notificacao-titulo">${notif.titulo}</div>
          <div class="notificacao-mensagem">${notif.mensagem}</div>
          <div class="notificacao-data">${formatarData(notif.data_criacao)}</div>
        `;

        item.addEventListener('click', async function() {
          try {
            const res = await marcarNotificacaoLida(usuarioId, notif.id);
            if (res.success) {
              this.classList.remove('nao-lida');
              const atual = parseInt(contadorNotificacoes.textContent);
              if (atual > 1) contadorNotificacoes.textContent = atual - 1;
              else contadorNotificacoes.style.display = 'none';
            }
          } catch (e) {
            console.error('Erro ao marcar como lida:', e);
          }
        });

        notificacoesLista.appendChild(item);
      });
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
      notificacoesLista.innerHTML = `
        <div class="notificacao-item notificacao-vazia">
          <p>Erro ao carregar notificações.</p>
        </div>
      `;
    }
  }

  async function verificarNotificacoesPeriodicamente() {
    try {
      const data = await listarNotificacoes(usuarioId);
      const { total_nao_lidas } = data;

      contadorNotificacoes.style.display = total_nao_lidas > 0 ? 'block' : 'none';
      contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;
    } catch (e) {
      console.error('Erro ao verificar notificações:', e);
    }
  }

  verificarNotificacoesPeriodicamente();
  setInterval(verificarNotificacoesPeriodicamente, 120000);
});