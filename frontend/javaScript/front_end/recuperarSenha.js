import { ativar } from "../utils/alerts.js";
import { solicitarRecuperacaoSenha, redefinirSenha } from "../services/AuthService.js";

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
        const data = await solicitarRecuperacaoSenha(email);

        if (data.success) {
          if (data.emailEnviado) {
            ativar(data.message, "sucesso", 'index');
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
        const data = await redefinirSenha(token, newPassword);
        
        if (data.success) {
          ativar("Senha redefinida com sucesso! Redirecionando para o login...", "sucesso");
          setTimeout(() => {
            window.location.href = "/index";
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