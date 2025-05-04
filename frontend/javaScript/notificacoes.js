// Adicionar este script na página após carregar o DOM

document.addEventListener('DOMContentLoaded', function() {
    const usuarioId = localStorage.getItem("usuarioId");
    console.log("usuarioId carregado:", usuarioId);
    
    if (!usuarioId) {
        console.warn("ID do usuário não encontrado. Notificações não serão carregadas.");
        return;
    }
    
    const notificacaoBotao = document.getElementById('notificacao-toggle');
    const notificacoesContainer = document.getElementById('notificacoes-container');
    const notificacoesLista = document.getElementById('notificacoes-lista');
    const contadorNotificacoes = document.getElementById('contador-notificacoes');
    const marcarTodasLidas = document.getElementById('marcar-todas-lidas');
    
    let notificacoesAbertas = false;
    
    // Toggle para abrir/fechar o dropdown de notificações
    notificacaoBotao.addEventListener('click', function() {
        if (notificacoesAbertas) {
            notificacoesContainer.style.display = 'none';
            notificacoesAbertas = false;
        } else {
            notificacoesContainer.style.display = 'block';
            notificacoesAbertas = true;
            carregarNotificacoes();
        }
    });
    
    // Fechar notificações ao clicar fora
    document.addEventListener('click', function(event) {
        if (notificacoesAbertas && 
            !notificacoesContainer.contains(event.target) && 
            event.target !== notificacaoBotao) {
            notificacoesContainer.style.display = 'none';
            notificacoesAbertas = false;
        }
    });
    
    // Marcar todas as notificações como lidas
    marcarTodasLidas.addEventListener('click', function() {
        fetch(`/notificacoes/todas/lidas`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: usuarioId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Atualizar a UI
                const notificacoesNaoLidas = document.querySelectorAll('.notificacao-item.nao-lida');
                notificacoesNaoLidas.forEach(item => {
                    item.classList.remove('nao-lida');
                });
                
                // Atualizar contador
                contadorNotificacoes.textContent = '0';
                contadorNotificacoes.style.display = 'none';
            }
        })
        .catch(error => console.error('Erro ao marcar todas como lidas:', error));
    });
    
    // Função para formatar data
    function formatarData(dataStr) {
        if (!dataStr) return '';
        
        const data = new Date(dataStr);
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(hoje.getDate() - 1);
        
        // Se for hoje
        if (data.toDateString() === hoje.toDateString()) {
            return `Hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Se for ontem
        if (data.toDateString() === ontem.toDateString()) {
            return `Ontem às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Outro dia
        return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Função para carregar notificações
    function carregarNotificacoes() {
        fetch(`/notificacoes?usuario_id=${usuarioId}`)
            .then(response => response.json())
            .then(data => {
                const { total_nao_lidas, notificacoes } = data;
                
                // Atualizar contador
                if (total_nao_lidas > 0) {
                    contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;
                    contadorNotificacoes.style.display = 'block';
                } else {
                    contadorNotificacoes.style.display = 'none';
                }
                
                // Limpar lista
                notificacoesLista.innerHTML = '';
                
                // Se não houver notificações
                if (notificacoes.length === 0) {
                    notificacoesLista.innerHTML = `
                        <div class="notificacao-item notificacao-vazia">
                            <p>Nenhuma notificação disponível.</p>
                        </div>
                    `;
                    return;
                }
                
                // Renderizar notificações
                notificacoes.forEach(notificacao => {
                    const item = document.createElement('div');
                    item.className = `notificacao-item ${!notificacao.lida ? 'nao-lida' : ''}`;
                    item.setAttribute('data-id', notificacao.id);
                    
                    item.innerHTML = `
                        <div class="notificacao-titulo">${notificacao.titulo}</div>
                        <div class="notificacao-mensagem">${notificacao.mensagem}</div>
                        <div class="notificacao-data">${formatarData(notificacao.data_criacao)}</div>
                    `;
                    
                    // Marcar como lida ao clicar
                    item.addEventListener('click', function() {
                        const notificacaoId = this.getAttribute('data-id');
                        marcarComoLida(notificacaoId);
                        this.classList.remove('nao-lida');
                    });
                    
                    notificacoesLista.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar notificações:', error);
                notificacoesLista.innerHTML = `
                    <div class="notificacao-item notificacao-vazia">
                        <p>Erro ao carregar notificações.</p>
                    </div>
                `;
            });
    }
    
    // Função para marcar notificação como lida
    function marcarComoLida(notificacaoId) {
        fetch(`/notificacoes/${notificacaoId}/lida`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: usuarioId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Atualizar contador
                const contador = parseInt(contadorNotificacoes.textContent);
                if (contador > 1) {
                    contadorNotificacoes.textContent = contador - 1;
                } else {
                    contadorNotificacoes.style.display = 'none';
                }
            }
        })
        .catch(error => console.error('Erro ao marcar como lida:', error));
    }
    
    // Verificar notificações a cada 2 minutos
    function verificarNotificacoesPeriodicamente() {
        fetch(`/notificacoes?usuario_id=${usuarioId}`)
            .then(response => response.json())
            .then(data => {
                const { total_nao_lidas } = data;
                
                // Atualizar apenas o contador
                if (total_nao_lidas > 0) {
                    contadorNotificacoes.textContent = total_nao_lidas > 9 ? '9+' : total_nao_lidas;
                    contadorNotificacoes.style.display = 'block';
                } else {
                    contadorNotificacoes.style.display = 'none';
                }
            })
            .catch(error => console.error('Erro ao verificar notificações:', error));
    }
    
    // Carregar notificações inicialmente
    verificarNotificacoesPeriodicamente();
    
    // Verificar a cada 2 minutos
    setInterval(verificarNotificacoesPeriodicamente, 120000);
});