import { ativar } from "../utils/alerts.js";
import { cadastrarUsuario } from "../services/CadastroService.js";

const form = document.querySelector('.signup-info'); 

form.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const semestre = document.getElementById('semestre').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    document.getElementById('passwordError').textContent = '';
    document.getElementById('emailError').textContent = '';
    document.getElementById('semestreError').textContent = '';
    const minLength = 6;
    const maxLength = 12;

    if (!nome || !email || !semestre || !senha || !confirmarSenha) {
        ativar('Por favor, preencha todos os campos.','erro','')
        return;
    }

    if (!email.endsWith("@fatec.sp.gov.br")) {
        document.getElementById('emailError').textContent = 'E-mail Institucional Inválido';
        return;
    }
    if (semestre < 1){
        document.getElementById('semestreError').textContent = 'Selecione um Semestre';
        return;
    }

    if (senha.length < minLength) {
        document.getElementById('passwordError').textContent = `A senha deve ter pelo menos ${minLength} caracteres.`;
        return;
    }

    if (senha.length > maxLength) {
        document.getElementById('passwordError').textContent = `A senha deve ter no máximo ${maxLength} caracteres.`;
        return;
    }


    if (senha !== confirmarSenha) {
        document.getElementById('passwordError').textContent = 'As senhas não coincidem.';
        return;
    }

    try {
        const data =await cadastrarUsuario({ nome, email, semestre, senha });
        
        if (data.success) {
          ativar(data.message || "Cadastro realizado com sucesso!", "sucesso", "/index");
        } else {
          ativar(data.message || "Erro ao cadastrar", "erro", "");
        }
      } catch (error) {
        console.error("Erro na requisição:", error);
        ativar("Erro ao conectar com o servidor.", "erro", "");
      }
});