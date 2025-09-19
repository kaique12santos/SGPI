// Sistema de Notificações Flutuantes - Integrado com Services Existentes
import { listarNotificacoes, marcarTodasNotificacoesLidas, marcarNotificacaoLida } from "../services/notificacoesServices.js";

class NotificacoesFlutuante {
    constructor() {
        this.usuarioId = localStorage.getItem("usuarioId");
        this.notificacoes = [];
        this.container = null;
        this.notificacoesAbertas = false;
        this.intervalId = null;
        
        if (!this.usuarioId) {
            console.warn("ID do usuário não encontrado. Notificações flutuantes não serão carregadas.");
            return;
        }
        
        this.inicializar();
    }

    inicializar() {
        this.criarElementoFlutuante();
        this.configurarEventListeners();
        this.carregarNotificacoes();
        this.iniciarVerificacaoPeriodica();
        this.ocultarNotificacoesHeader();
    }

    ocultarNotificacoesHeader() {
        // Remove/oculta as notificações do header para evitar duplicação
        const notificacoesHeader = document.querySelector('.notificacoes-dropdown');
        if (notificacoesHeader) {
            notificacoesHeader.style.display = 'none';
        }
    }

    criarElementoFlutuante() {
        // Remove elemento existente se houver
        const existente = document.querySelector('.notificacoes-flutuante');
        if (existente) {
            existente.remove();
        }

        // Cria o container principal
        this.container = document.createElement('div');
        this.container.className = 'notificacoes-flutuante';

        // Cria o ícone de notificação
        const icone = document.createElement('button');
        icone.className = 'notificacao-icone';
        icone.id = 'notificacao-toggle-flutuante';
        icone.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
        `;

        // Cria o contador de notificações
        const contador = document.createElement('span');
        contador.className = 'contador-notificacoes-flutuante';
        contador.id = 'contador-notificacoes-flutuante';
        contador.textContent = '0';
        contador.style.display = 'none';

        // Cria o container das notificações
        const containerNotif = document.createElement('div');
        containerNotif.className = 'notificacoes-container-flutuante';
        containerNotif.id = 'notificacoes-container-flutuante';
        containerNotif.style.display = 'none';

        // Header das notificações
        const header = document.createElement('div');
        header.className = 'notificacoes-header-flutuante';
        header.innerHTML = `
            <h3>Notificações</h3>
            <button id="marcar-todas-lidas-flutuante">Marcar todas como lidas</button>
        `;

        // Lista das notificações
        const lista = document.createElement('div');
        lista.className = 'notificacoes-lista-flutuante';
        lista.id = 'notificacoes-lista-flutuante';

        // Loading inicial
        const loading = document.createElement('div');
        loading.className = 'notificacao-item-flutuante notificacao-loading';
        loading.innerHTML = '<p>Carregando notificações...</p>';
        lista.appendChild(loading);

        // Monta a estrutura
        containerNotif.appendChild(header);
        containerNotif.appendChild(lista);
        
        this.container.appendChild(icone);
        this.container.appendChild(contador);
        this.container.appendChild(containerNotif);

        // Adiciona ao body
        document.body.appendChild(this.container);
    }

    configurarEventListeners() {
        const toggle = document.getElementById('notificacao-toggle-flutuante');
        const container = document.getElementById('notificacoes-container-flutuante');
        const marcarLidas = document.getElementById('marcar-todas-lidas-flutuante');

        // Toggle das notificações
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleNotificacoes();
        });

        // Marcar todas como lidas
        marcarLidas.addEventListener('click', () => {
            this.marcarTodasComoLidas();
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (event) => {
            if (this.notificacoesAbertas && 
                !container.contains(event.target) && 
                event.target !== toggle) {
                this.fecharNotificacoes();
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.notificacoesAbertas) {
                this.fecharNotificacoes();
            }
        });
    }

    toggleNotificacoes() {
        this.notificacoesAbertas = !this.notificacoesAbertas;
        const container = document.getElementById('notificacoes-container-flutuante');
        
        if (this.notificacoesAbertas) {
            this.abrirNotificacoes();
        } else {
            this.fecharNotificacoes();
        }
    }

    abrirNotificacoes() {
        const container = document.getElementById('notificacoes-container-flutuante');
        container.style.display = 'block';
        
        // Animação suave
        container.style.opacity = '0';
        container.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 10);

        // Carrega notificações ao abrir
        this.carregarNotificacoes();
    }

    fecharNotificacoes() {
        const container = document.getElementById('notificacoes-container-flutuante');
        container.style.display = 'none';
        this.notificacoesAbertas = false;
    }

    // === INTEGRAÇÃO COM SERVICES EXISTENTES ===

    async carregarNotificacoes() {
        const lista = document.getElementById('notificacoes-lista-flutuante');
        
        try {
            const data = await listarNotificacoes(this.usuarioId);
            const { total_nao_lidas, notificacoes } = data;

            // Atualiza contador
            this.atualizarContador(total_nao_lidas);

            // Limpa lista
            lista.innerHTML = '';

            if (notificacoes.length === 0) {
                lista.innerHTML = `
                    <div class="notificacao-item-flutuante notificacao-vazia-flutuante">
                        <p>Nenhuma notificação disponível.</p>
                    </div>
                `;
                return;
            }

            // Adiciona notificações
            notificacoes.forEach(notif => {
                const item = this.criarItemNotificacao(notif);
                lista.appendChild(item);
            });

        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
            lista.innerHTML = `
                <div class="notificacao-item-flutuante notificacao-erro">
                    <p style="color: #ff4444;">Erro ao carregar notificações.</p>
                    <button onclick="window.notificacoesFlutuante.carregarNotificacoes()" 
                            style="background: none; border: 1px solid #970000; color: #970000; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    criarItemNotificacao(notif) {
        const item = document.createElement('div');
        item.className = `notificacao-item-flutuante ${!notif.lida ? 'nao-lida' : ''}`;
        item.dataset.id = notif.id;

        const dataFormatada = this.formatarData(notif.data_criacao);

        item.innerHTML = `
            <div class="notificacao-titulo-flutuante">${this.escaparHTML(notif.titulo)}</div>
            <div class="notificacao-mensagem-flutuante">${this.escaparHTML(notif.mensagem)}</div>
            <div class="notificacao-data-flutuante">${dataFormatada}</div>
        `;

        // Adiciona evento de clique para marcar como lida
        item.addEventListener('click', async () => {
            if (!notif.lida) {
                await this.marcarComoLida(notif.id, item);
            }
            this.processarClique(notif);
        });

        return item;
    }

    async marcarComoLida(notificacaoId, elemento) {
        try {
            const response = await marcarNotificacaoLida(this.usuarioId, notificacaoId);
            if (response.success) {
                elemento.classList.remove('nao-lida');
                
                // Atualiza contador
                const contadorEl = document.getElementById('contador-notificacoes-flutuante');
                const atual = parseInt(contadorEl.textContent) || 0;
                if (atual > 1) {
                    contadorEl.textContent = atual - 1;
                } else {
                    contadorEl.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Erro ao marcar como lida:', error);
        }
    }

    async marcarTodasComoLidas() {
        try {
            const response = await marcarTodasNotificacoesLidas(this.usuarioId);
            if (response.success) {
                // Remove classe 'nao-lida' de todos os itens
                document.querySelectorAll('.notificacao-item-flutuante.nao-lida')
                    .forEach(el => el.classList.remove('nao-lida'));
                
                // Zera contador
                const contador = document.getElementById('contador-notificacoes-flutuante');
                contador.textContent = '0';
                contador.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao marcar todas como lidas:', error);
        }
    }

    atualizarContador(totalNaoLidas) {
        const contador = document.getElementById('contador-notificacoes-flutuante');
        contador.style.display = totalNaoLidas > 0 ? 'flex' : 'none';
        contador.textContent = totalNaoLidas > 9 ? '9+' : totalNaoLidas;
    }

    // Reutiliza a função de formatação do arquivo original
    formatarData(dataStr) {
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

    async verificarNotificacoesPeriodicamente() {
        try {
            const data = await listarNotificacoes(this.usuarioId);
            const { total_nao_lidas } = data;
            this.atualizarContador(total_nao_lidas);
        } catch (error) {
            console.error('Erro ao verificar notificações:', error);
        }
    }

    iniciarVerificacaoPeriodica() {
        // Verifica imediatamente
        this.verificarNotificacoesPeriodicamente();
        
        // Configura verificação a cada 2 minutos (mesmo intervalo do original)
        this.intervalId = setInterval(() => {
            this.verificarNotificacoesPeriodicamente();
        }, 120000);
    }

    pararVerificacaoPeriodica() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    processarClique(notificacao) {
        // Aqui você pode adicionar lógica para redirecionar baseado no tipo da notificação
        // Por exemplo:
        if (notificacao.url) {
            window.location.href = notificacao.url;
        } else if (notificacao.tipo) {
            switch (notificacao.tipo) {
                case 'atividade':
                case 'tarefa':
                    window.location.href = '/listaTarefas';
                    break;
                case 'projeto':
                    window.location.href = '/projetos';
                    break;
                case 'nota':
                case 'avaliacao':
                    window.location.href = '/notas';
                    break;
                default:
                    console.log('Notificação clicada:', notificacao);
            }
        }
    }

    escaparHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    // === MÉTODOS PÚBLICOS ===

    recarregar() {
        this.carregarNotificacoes();
    }

    destruir() {
        this.pararVerificacaoPeriodica();
        if (this.container) {
            this.container.remove();
        }
    }

    // Método para adicionar notificações em tempo real (ex: via WebSocket)
    adicionarNotificacaoTempoReal(notificacao) {
        // Atualiza contador
        const contador = document.getElementById('contador-notificacoes-flutuante');
        const atual = parseInt(contador.textContent) || 0;
        contador.textContent = atual + 1;
        contador.style.display = 'flex';

        // Se as notificações estiverem abertas, recarrega a lista
        if (this.notificacoesAbertas) {
            this.carregarNotificacoes();
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda um pouco para garantir que outros scripts carregaram
    setTimeout(() => {
        window.notificacoesFlutuante = new NotificacoesFlutuante();
    }, 500);
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    if (window.notificacoesFlutuante) {
        window.notificacoesFlutuante.destruir();
    }
});

// Exporta para uso global
window.NotificacoesFlutuante = NotificacoesFlutuante;
export default NotificacoesFlutuante;