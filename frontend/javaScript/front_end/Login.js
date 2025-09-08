import { ativar } from "../utils/alerts.js";
import { loginUsuario } from "../services/LoginServices.js";

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const submitButton = document.querySelector('.login-button'); 

  document.getElementById('emailError').textContent = '';
  document.getElementById('passwordError').textContent = '';
  document.getElementById('formError').textContent = '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    document.getElementById('emailError').textContent = 'Por favor, insira um endereço de email válido.';
    return;
  }

  const minLength = 6;
  const maxLength = 12;
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
    const { ok, data } = await loginUsuario(username, password);
    submitButton.disabled = false;

    if (ok && data.success) {
      const payload = data.data ?? {};
      const id = payload.id ?? data.id;
      const role = payload.userRole ?? data.userRole ?? 'aluno';
      const token = payload.token ?? data.token;

      if (!id || !token) {
        document.getElementById('formError').textContent = 'Resposta inválida do servidor: ID ausente.';
        return;
      }

      localStorage.setItem('usuarioId', String(id));
      localStorage.setItem('userRole', role);
      localStorage.setItem('tipoUsuario', role);
      localStorage.setItem('token', token);

      ativar("Login realizado com sucesso!", 'sucesso', '/TelaPrincipal');
    } else {
      if (ok && data.message) {
        document.getElementById('passwordError').textContent = data.message;
      } else if (!ok && data && data.message) {
        document.getElementById('formError').textContent = data.message;
      } else if (!ok) {
        if (data && data.status === 401) {
          document.getElementById('passwordError').textContent = 'E-mail ou senha incorretos.';
        } else {
          document.getElementById('formError').textContent = 'Erro na requisição. Tente novamente.';
        }
      }
    }
  } catch (error) {
    console.error('Erro:', error);
    submitButton.disabled = false;
    ativar("Erro na comunicação com o servidor.","erro",'');
  }
});