import { ativar } from "../utils/alerts.js";
import { obterPerfil, atualizarPerfilService } from "../services/perfilServices.js";

let userId = null;
let userNome = null;
let userFoto = null;

async function carregarPerfil() {
  try {
    userId = parseInt(localStorage.getItem("usuarioId"));

    if (!userId) {
      ativar("Usuário não autenticado.", "erro", "/TelaPrincipal");
      return;
    }

    const response = await obterPerfil(userId);

    if (response.ok) {
      const userData = await response.json();

      document.getElementById("nome").value = userData.nome;

      if (userData.foto) {
        document.getElementById("preview-foto").src = userData.foto;
        const headerProfilePic = document.querySelector(".profile-pic img");
        if (headerProfilePic) {
          headerProfilePic.src = userData.foto;
        }
      }

      userNome = userData.nome;
      userFoto = userData.foto;
    } else {
      const errorData = await response.json();
      ativar(errorData.message || "Erro ao carregar dados do usuário", "erro", "");
    }
  } catch (error) {
    console.error("Erro ao obter dados do usuário:", error);
    ativar("Erro ao conectar com o servidor.", "erro", "");
  }
}

function previewImagem() {
  const input = document.getElementById("fotoPerfil");
  const preview = document.getElementById("preview-foto");

  input.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => { preview.src = e.target.result; };
      reader.readAsDataURL(file);
    }
  });
}

async function atualizarPerfil(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value;
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmar-senha").value;
  const fotoInput = document.getElementById("fotoPerfil");

  document.getElementById("passwordError").textContent = "";

  if (!nome) {
    ativar("Por favor, preencha o nome.", "erro", "");
    return;
  }

  if (senha) {
    const minLength = 6, maxLength = 12;
    if (senha.length < minLength) {
      document.getElementById("passwordError").textContent = `A senha deve ter pelo menos ${minLength} caracteres.`;
      return;
    }
    if (senha.length > maxLength) {
      document.getElementById("passwordError").textContent = `A senha deve ter no máximo ${maxLength} caracteres.`;
      return;
    }
    if (senha !== confirmarSenha) {
      document.getElementById("passwordError").textContent = "As senhas não coincidem.";
      return;
    }
  }

  const formData = new FormData();
  formData.append("nome", nome);
  if (senha) formData.append("senha", senha);
  if (fotoInput.files.length > 0) formData.append("foto", fotoInput.files[0]);

  try {
    const response = await atualizarPerfilService(userId, formData);
    const data = await response.json();

    if (data.success) {
      ativar(data.message, "sucesso", "/TelaPrincipal");

      if (fotoInput.files.length > 0) {
        const headerProfilePic = document.querySelector(".profile-pic img");
        if (headerProfilePic) {
          headerProfilePic.src = URL.createObjectURL(fotoInput.files[0]);
        }
      }
    } else {
      ativar(data.message, "erro", "");
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
    ativar("Erro ao conectar com o servidor.", "erro", "");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  carregarPerfil();
  previewImagem();
  const botaoSalvar = document.querySelector(".salvar-btn");
  if (botaoSalvar) botaoSalvar.addEventListener("click", atualizarPerfil);
});