import { ativar } from "./alerts.js";

const btn = document.querySelector(".login-button");
const divMessage = document.querySelector(".alert");

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitButton = document.querySelector('.login-button'); 

    document.getElementById('emailError').textContent = ''; 
    document.getElementById('passwordError').textContent = '';

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        document.getElementById('emailError').textContent = 'Por favor, insira um endereço de email válido.';
        return;
    }

    const minLength = 6;
    const maxLength = 12;
    
    // validação da senha
    if (password.length < minLength) {
        document.getElementById('passwordError').textContent = `A senha deve ter pelo menos ${minLength} caracteres.`;
        return;
    }

    if (password.length > maxLength) {
        document.getElementById('passwordError').textContent = `A senha deve ter no máximo ${maxLength} caracteres.`;
        return;
    }
    
    try {
        submitButton.disabled = true;
    
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
    
        submitButton.disabled = false;
    
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                ativar("Login realizado com sucesso!", 'sucesso', '/TelaPrincipal');
            } else {
                
                if (data.message) {  
                     document.getElementById('passwordError').textContent = data.message;
                } else {
                     document.getElementById('passwordError').textContent = 'Login falhou. Verifique suas credenciais.'; 
                }
            }
        } else {
            
             if (response.status === 401) { 
                console.log(response.status)
                 document.getElementById('passwordError').textContent = 'E-mail ou senha incorretos.'; 
             } else {
                 document.getElementById('formError').textContent = 'Erro na requisição: ' + response.status; 
             }
        }
    } catch (error) {
         console.error('Erro:', error);
         ativar("Erro na comunicação com o servidor.","erro",'') 
    }
});
