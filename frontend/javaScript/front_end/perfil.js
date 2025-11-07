import { ativar } from "../utils/alerts.js";
import { obterPerfil, atualizarPerfilService } from "../services/perfilServices.js";
import { confirmarAcao } from "../utils/confirmDialog.js";
import { 
  invalidarCacheImagemPerfil, 
  atualizarImagensPerfil,
  buscarImagemPerfil 
} from "../front_end/imagemPerfil.js";

let userId = null;
let userNome = null;
let userFoto = null;

// ✅ Função para comprimir/redimensionar imagem antes do upload
async function comprimirImagem(file, maxWidth = 500, quality = 0.7) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');

        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function carregarPerfil() {
  try {
    userId = parseInt(localStorage.getItem("usuarioId"));
    if (!userId) {
      ativar("Usuário não autenticado.", "erro", "/TelaPrincipal");
      return;
    }

    const resp = await obterPerfil();

    if (resp.ok) {
      const data = await resp.json();
      const userData = data.usuario;

      document.getElementById("nome").value = userData.usuario_nome;

      // ✅ Usa o cache para buscar a foto
      const fotoUrl = await buscarImagemPerfil(userId);

      const previewFoto = document.getElementById("preview-foto");
      if (previewFoto) {
        previewFoto.src = fotoUrl;
        previewFoto.onerror = function () {
          this.onerror = null;
          this.src = './imagens/avatar-default.png';
        };
      }

      const headerProfilePic = document.querySelector(".profile-pic img");
      if (headerProfilePic) {
        headerProfilePic.src = fotoUrl;
        headerProfilePic.onerror = function () {
          this.onerror = null;
          this.src = './imagens/avatar-default.png';
        };
      }

      userNome = userData.usuario_nome;
      userFoto = fotoUrl;

    } else {
      const errorData = await resp.json(); 
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

  const confirmar = await confirmarAcao(
    "Confirmar alteração?",
    "Deseja realmente salvar as alterações no perfil?",
    "Confirmar",
    "Cancelar"
  );

  if (!confirmar) return;

  const formData = new FormData();
  formData.append("nome", nome);
  if (senha) formData.append("senha", senha);

  // ✅ Compressão da imagem antes do upload
  if (fotoInput.files.length > 0) {

    const original = fotoInput.files[0];
    console.log("📸 Tamanho original:", (original.size / 1024).toFixed(1), "KB");

    const comprimida = await comprimirImagem(original, 500, 0.7);

    console.log("✅ Tamanho após compressão:", (comprimida.size / 1024).toFixed(1), "KB");

    formData.append("foto", comprimida);
  }

  try {
    const response = await atualizarPerfilService(formData);
    const data = await response.json();

    if (data.success) {

      // ✅ Se a foto mudou: reinicia cache + atualiza imagens
      if (fotoInput.files.length > 0) {
        invalidarCacheImagemPerfil(userId);
        await atualizarImagensPerfil();

        const headerProfilePic = document.querySelector(".profile-pic img");
        if (headerProfilePic) {
          headerProfilePic.src = URL.createObjectURL(fotoInput.files[0]);
        }
      }

      ativar(data.message, "sucesso", "/perfil");

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

  document.querySelectorAll('.perfil-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;

      document.querySelectorAll('.perfil-nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.perfil-section').forEach(s => s.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`section-${section}`).classList.add('active');
    });
  });
});
