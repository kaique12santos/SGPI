const activeMessages = new Set();
const MESSAGE_SPACING = 10;
const DEFAULT_TIMEOUT_DURATION = 7000; // Novo tempo de exibição padrão: 7 segundos

function closeMessage(messageElement, redirectUrl = null) {
    // Inicia a animação de saída (slideout)
    messageElement.style.animation = 'slideout 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';

    messageElement.addEventListener('animationend', () => {
        messageElement.remove();
        activeMessages.delete(messageElement); // Remove do conjunto de mensagens ativas
        repositionMessages(); // Reposiciona as mensagens restantes
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    }, { once: true });
}

function ativar(msg, tipo = 'info', redirectUrl = null, duration = DEFAULT_TIMEOUT_DURATION) {
    const message = document.createElement("div");
    message.classList.add("message");
    let icone = '';

    const icones = {
        erro: `<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink: 0;">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
               </svg>`,
        sucesso: `<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink: 0;">
                   <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                  </svg>`,
        info: `<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink: 0;">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
               </svg>`
    };
    
    switch (tipo) {
        case 'erro': 
            icone = icones.erro;
            message.style.backgroundColor = 'rgba(244, 63, 94, 0.9)';
            break;
        case 'sucesso': 
            icone = icones.sucesso;
            message.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
            break;
        case 'info': 
        default:       
            icone = icones.info;
            message.style.backgroundColor = 'rgba(14, 165, 233, 0.9)';
    }

    // Cria o botão de fechar
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('message-close-btn');
    closeBtn.innerHTML = '&times;'; // Caractere 'x' para fechar

    // Adiciona o conteúdo e o botão de fechar
    message.innerHTML = `${icone} <span class="text_color">${msg}</span>`; // Adicionei um span para envolver a msg e manter o layout flex intacto
    message.appendChild(closeBtn); // Adiciona o botão de fechar ao final da mensagem
    
    document.body.appendChild(message);
    activeMessages.add(message);

    let currentTop = 20;
    
    const sortedMessages = Array.from(activeMessages).sort((a, b) => {
        const topA = parseFloat(a.style.top) || 0;
        const topB = parseFloat(b.style.top) || 0;
        return topA - topB;
    });

    for (const activeMsg of sortedMessages) {
        if (activeMsg === message) continue; 
        
        const msgHeight = activeMsg.offsetHeight;
        if (msgHeight > 0) {
             currentTop = Math.max(currentTop, parseFloat(activeMsg.style.top) + msgHeight + MESSAGE_SPACING);
        }
    }
    
    message.style.top = `${currentTop}px`;

    // Configura o setTimeout para fechar automaticamente
    const timeoutId = setTimeout(() => {
        closeMessage(message, redirectUrl);
    }, duration); // Usa a duração passada ou o DEFAULT_TIMEOUT_DURATION

    // Adiciona um listener de clique ao botão "X"
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId); // Limpa o setTimeout automático
        closeMessage(message, redirectUrl); // Fecha a mensagem manualmente
    });
}

function repositionMessages() {
    let currentTop = 20;
    
    const sortedMessages = Array.from(activeMessages).sort((a, b) => {
        const topA = parseFloat(a.style.top) || 0;
        const topB = parseFloat(b.style.top) || 0;
        return topA - topB;
    });

    for (const activeMsg of sortedMessages) {
        activeMsg.style.top = `${currentTop}px`;
        currentTop += activeMsg.offsetHeight + MESSAGE_SPACING;
    }
}

export { ativar };

// Exemplo de uso:
// ativar('Este é um alerta de sucesso!', 'sucesso', null, 10000); // 10 segundos
// ativar('Uma mensagem de erro importante!', 'erro'); // Usará a duração padrão (7s)
// ativar('Informação para o usuário.', 'info', '/pagina-inicial'); // Redireciona após fechar