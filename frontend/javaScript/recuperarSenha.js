import { ativar } from './alerts.js';

document.addEventListener('DOMContentLoaded', function() {
    const userForm = document.getElementById('userForm');
    
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('username').value.trim();
            
            if (!email) {
                ativar("Por favor, preencha o e-mail.", "erro");
                return;
            }

            try {
                const response = await fetch('/recuperar-senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    if (data.emailEnviado) {
                        ativar(data.message, "sucesso",'index.html');
                    } else {
                        ativar(data.message + "\n\n" + data.link, "info");
                    }
                } else {
                    ativar(data.message || "Erro ao solicitar redefinição.", "erro");
                }

            } catch (error) {
                console.error(error);
                ativar("Erro ao conectar ao servidor.", "erro");
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const resetForm = document.getElementById('resetForm');
    
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!newPassword || !confirmPassword) {
                ativar("Por favor, preencha todos os campos.", "erro");
                return;
            }
            
            if (newPassword !== confirmPassword) {
                ativar("As senhas não coincidem.", "erro");
                return;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            
            if (!token) {
                ativar("Token inválido ou ausente.", "erro");
                return;
            }
            
            try {
                const response = await fetch('/redefinir-senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        token, 
                        novaSenha: newPassword 
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    ativar("Senha redefinida com sucesso! Redirecionando para o login...", "sucesso");
                    setTimeout(() => {
                        window.location.href = "/index.html";
                    }, 3000);
                } else {
                    ativar(data.message || "Erro ao redefinir senha.", "erro");
                }
                
            } catch (error) {
                console.error(error);
                ativar("Erro ao conectar ao servidor.", "erro");
            }
        });
    }
});