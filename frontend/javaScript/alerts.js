function ativar(msg, tipo = 'info', redirectUrl = null) {
    const message = document.createElement("div");
    message.classList.add("message");

    // Define a cor do alert baseado no tipo
    switch (tipo) {
        case 'erro': // Para erros de servidor, cadastro, login, etc.
            message.style.backgroundColor = 'rgba(187, 0, 0, 0.6)';
            break;
        case 'sucesso': // Para login, cadastro, etc.
            message.style.backgroundColor = 'rgba(0, 255, 0, 0.6)'; 
            break;
        case 'info': // Cor padrão, caso nenhum tipo seja especificado
        default:       
            message.style.backgroundColor = 'blue'; 
    }
    
    message.innerText = msg;
    
    // Adiciona ao corpo da página
    document.body.appendChild(message);
    setTimeout(() => {
        message.style.display = "none";
        if (redirectUrl) { 
            window.location.href = redirectUrl;
        }
    }, 3000); 
}
export { ativar };
