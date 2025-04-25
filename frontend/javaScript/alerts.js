function ativar(msg, tipo = 'info', redirectUrl = null) {
    const message = document.createElement("div");
    message.classList.add("message");

    
    switch (tipo) {
        case 'erro': 
            message.style.backgroundColor = 'rgba(187, 0, 0, 0.6)';
            break;
        case 'sucesso': 
            message.style.backgroundColor = 'rgba(0, 255, 0, 0.6)'; 
            break;
        case 'info': 
        default:       
            message.style.backgroundColor = 'blue'; 
    }
    
    message.innerText = msg;
    
   
    document.body.appendChild(message);
    setTimeout(() => {
        message.style.display = "none";
        if (redirectUrl) { 
            window.location.href = redirectUrl;
        }
    }, 3000); 
}
export { ativar };
