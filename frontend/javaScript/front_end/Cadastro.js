import { ativar } from "../utils/alerts.js";
import { cadastrarUsuario, 
    validarTokenCadastro, 
    reenviarTokenCadastro,
    validarChaveProfessor } from "../services/CadastroService.js";

const form = document.querySelector('.signup-info'); 

// Variável para controlar se os termos foram aceitos
let termosAceitos = false;
let politicaPrivacidade= false;
// Variáveis para controlar as etapas de validação
let dadosUsuarioTemp = {};
let etapaValidacao = false;

// Função para processar o cadastro inicial (enviar email de validação)
async function processarCadastroInicial() {
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
  
    const perfil = document.querySelector('input[name="perfil"]:checked')?.value;
    const materias = perfil === 'aluno'
      ? Array.from(document.querySelectorAll('input[name="materias"]:checked')).map(c => c.value)
      : [];
    const chaveProfessor = perfil === 'professor' ? document.getElementById('chaveProfessor').value : "";
  
    document.getElementById('passwordError').textContent = '';
    document.getElementById('emailError').textContent = '';
  
    const minLength = 6;
    const maxLength = 12;
  
    // ======= VALIDAÇÕES BÁSICAS =======
    if (!nome || !email || !senha || !confirmarSenha || !perfil) {
      ativar('Por favor, preencha todos os campos.', 'erro', '');
      return false;
    }
  
    if (!email.endsWith("@fatec.sp.gov.br")) {
      document.getElementById('emailError').textContent = 'E-mail Institucional Inválido';
      return false;
    }
  
    if (perfil === 'aluno' && materias.length === 0) {
      ativar("Selecione pelo menos uma matéria.", "erro", "");
      return false;
    }
  
    if (perfil === 'professor' && chaveProfessor) {
        try {
          const validacao = await validarChaveProfessor(chaveProfessor);
          if (!validacao.success) {
            ativar(validacao.message || "Palavra-chave inválida!", "erro", "");
            return false;
          }
        } catch {
          ativar("Erro ao validar palavra-chave.", "erro", "");
          return false;
        }
    }
      
  
    if (senha.length < minLength) {
      document.getElementById('passwordError').textContent = `A senha deve ter pelo menos ${minLength} caracteres.`;
      return false;
    }
  
    if (senha.length > maxLength) {
      document.getElementById('passwordError').textContent = `A senha deve ter no máximo ${maxLength} caracteres.`;
      return false;
    }
  
    if (senha !== confirmarSenha) {
      document.getElementById('passwordError').textContent = 'As senhas não coincidem.';
      return false;
    }
  
    // ======= VERIFICA ACEITE DOS TERMOS =======
    if (!termosAceitos || !politicaPrivacidade) {
      ativar('Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar.', 'erro', '');
      return false;
    }
  
    // ======= MONTAR DADOS PARA O BACKEND =======
    const dadosCompletos = {
      nome,
      email,
      senha,
      tipo: perfil.charAt(0).toUpperCase() + perfil.slice(1), // Ex: "Aluno", "Professor"
      disciplinas: perfil === 'aluno' ? materias : [],
      termos_aceitos: termosAceitos ? 1 : 0,
      politica_privacidade: politicaPrivacidade ? 1 : 0,
      chaveProfessor: perfil === 'professor' ? chaveProfessor : null
    };
  
    try {
      console.log("📤 Enviando dados para o backend:", dadosCompletos);
      const data = await cadastrarUsuario(dadosCompletos);
  
      console.log("📥 Resposta do backend:", data);
  
      if (data.success) {
        dadosUsuarioTemp = { nome, email, tipo: dadosCompletos.tipo };
  
        if (etapaValidacao) {
          mostrarEtapaValidacao();
          ativar(data.message || "E-mail de validação enviado! Verifique sua caixa de entrada.", "sucesso", "");
        }
      } else {
        ativar(data.message || "Erro ao iniciar cadastro.", "erro", "");
      }
  
      return true;
    } catch (error) {
      console.error("❌ Erro na requisição de cadastro:", error);
      ativar("Erro ao conectar com o servidor.", "erro", "");
      return false;
    }
  }

// Função para mostrar a etapa de validação de email
function mostrarEtapaValidacao() {
    etapaValidacao = true;
    
    // Esconder formulário de cadastro
    document.getElementById('formCadastro').style.display = 'none';
    
    // Mostrar formulário de validação
    document.getElementById('formValidacaoEmail').style.display = 'flex';
}

// Função para validar o código/token
async function validarCodigo() {
    const codigo = document.getElementById('codigoValidacao').value.trim();
    
    if (!codigo || codigo.length < 8) {
        ativar("Digite o código de 8 caracteres enviado ao seu e-mail.", "erro", "");
        return;
    }

    try {
        const data = await validarTokenCadastro(codigo);

        if (data.success) {
            ativar("Cadastro concluído!...", "sucesso", "/index");
        } else {
            ativar(data.message || "Código inválido ou expirado", "erro", "");
        }
    } catch (error) {
        console.error("Erro ao validar código:", error);
        ativar("Erro ao conectar com o servidor.", "erro", "");
    }
}

// Função para reenviar email de validação
async function reenviarEmail() {
    if (!dadosUsuarioTemp.email) {
        ativar("Email não encontrado.", "erro", "");
        return;
    }

    try {
        const data = await reenviarTokenCadastro(dadosUsuarioTemp.email);


        if (data.success) {
            ativar("📧 Novo email de validação enviado!", "sucesso", "");
        } else {
            ativar(data.message || "Erro ao reenviar email", "erro", "");
        }
    } catch (error) {
        console.error("Erro ao reenviar email:", error);
        ativar("Erro ao conectar com o servidor.", "erro", "");
    }
}

// Event listener para o submit do formulário (agora só processa se termos foram aceitos)
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Se os termos foram aceitos, processa o cadastro inicial
    if (termosAceitos) {
        await processarCadastroInicial();
        termosAceitos = false; // Reset para próxima tentativa
    }
});

// Mostrar/esconder inputs dinâmicos
document.getElementById('perfilAluno').addEventListener('change', () => {
    document.getElementById('materiasBox').style.display = 'block';
    document.getElementById('chaveProfessorBox').style.display = 'none';
    
    // ===== LOG PARA DEBUG =====
    console.log("Perfil alterado para: ALUNO");
    console.log("Campo de matérias exibido, campo de chave oculto");
});

document.getElementById('perfilProfessor').addEventListener('change', () => {
    document.getElementById('materiasBox').style.display = 'none';
    document.getElementById('chaveProfessorBox').style.display = 'block';
    
    // ===== LOG PARA DEBUG =====
    console.log("Perfil alterado para: PROFESSOR");
    console.log("Campo de chave exibido, campo de matérias oculto");
});


document.addEventListener('DOMContentLoaded', function() {
    const checkboxesMaterias = document.querySelectorAll('input[name="materias"]');
   
    checkboxesMaterias.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const materiasSelecionadas = Array.from(document.querySelectorAll('input[name="materias"]:checked')).map(c => c.value);
            console.log("Matérias selecionadas:", materiasSelecionadas);
        });
    });
});

// ===== CONTROLE DO MODAL DE TERMOS =====
document.addEventListener('DOMContentLoaded', function() {
    const cadastrarBtn = document.getElementById('cadastrarBtn');
    const termosModal = document.getElementById('termosModal');
    const closeModal = document.getElementById('closeModal');
    const cancelarTermos = document.getElementById('cancelarTermos');
    const aceitarTermosBtn = document.getElementById('aceitarTermos');
    const modalBody = document.getElementById('modalBody');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const chkTermos = document.getElementById('aceiteTermos');
    const chkPolitica = document.getElementById('aceitePolitica');
    const erroTermos = document.getElementById('erroTermos');
    const erroPolitica = document.getElementById('erroPolitica');

    // Estado inicial
    chkTermos.disabled = true;
    chkPolitica.disabled = true;
    aceitarTermosBtn.disabled = true;
    scrollIndicator.style.display = 'block';

    // ===== NOVOS ELEMENTOS PARA VALIDAÇÃO DE EMAIL =====
    const btnValidarCodigo = document.getElementById('btnValidarCodigo');
    const btnReenviarEmail = document.getElementById('btnReenviarEmail');

    if (btnValidarCodigo) btnValidarCodigo.addEventListener('click', validarCodigo);
    if (btnReenviarEmail) btnReenviarEmail.addEventListener('click', reenviarEmail);

    // Abrir modal ao clicar em cadastrar
    cadastrarBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const validacao = await validarCampos();
        if (!validacao) return;

        termosModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
   

    // Função para validar campos antes de abrir o modal
    async function validarCampos() {
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const perfil = document.querySelector('input[name="perfil"]:checked')?.value;
        const materias = perfil === 'aluno'
            ? Array.from(document.querySelectorAll('input[name="materias"]:checked')).map(c => c.value)
            : [];
        const chaveProfessor = perfil === 'professor' ? document.getElementById('chaveProfessor').value : "";

        document.getElementById('passwordError').textContent = '';
        document.getElementById('emailError').textContent = '';

        const minLength = 6;
        const maxLength = 12;

        if (!nome || !email || !senha || !confirmarSenha || !perfil) {
            ativar('Por favor, preencha todos os campos.','erro','');
            return false;
        }

        if (!email.endsWith("@fatec.sp.gov.br")) {
            document.getElementById('emailError').textContent = 'E-mail Institucional Inválido';
            return false;
        }

        if (perfil === 'aluno' && materias.length === 0) {
            ativar("Selecione pelo menos uma matéria.", "erro", "");
            return false;
        }

        if (senha.length < minLength) {
            document.getElementById('passwordError').textContent = `A senha deve ter pelo menos ${minLength} caracteres.`;
            return false;
        }

        if (senha.length > maxLength) {
            document.getElementById('passwordError').textContent = `A senha deve ter no máximo ${maxLength} caracteres.`;
            return false;
        }

        if (senha !== confirmarSenha) {
            document.getElementById('passwordError').textContent = 'As senhas não coincidem.';
            return false;
        }

        return true;
    }

    // Fechar modal e resetar estado
    function fecharModal() {
        termosModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        modalBody.scrollTop = 0;
        chkTermos.checked = false;
        chkPolitica.checked = false;
        chkTermos.disabled = true;
        chkPolitica.disabled = true;
        aceitarTermosBtn.disabled = true;
        scrollIndicator.style.display = 'block';
        erroTermos.textContent = '';
        erroPolitica.textContent = '';
    }

    closeModal.addEventListener('click', fecharModal);
    cancelarTermos.addEventListener('click', fecharModal);
    termosModal.addEventListener('click', e => { if (e.target === termosModal) fecharModal(); });

    // Detectar scroll até o final
    modalBody.addEventListener('scroll', function() {
        const scrollTop = modalBody.scrollTop;
        const scrollHeight = modalBody.scrollHeight;
        const clientHeight = modalBody.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 10) {
            chkTermos.disabled = false;
            chkPolitica.disabled = false;
            scrollIndicator.style.display = 'none';
        }
    });

    // Validação dos checkboxes
    function validarCheckboxes() {
        const termosOk = chkTermos.checked;
        const politicaOk = chkPolitica.checked;

        erroTermos.textContent = termosOk ? '' : 'Você deve aceitar os Termos de Uso.';
        erroPolitica.textContent = politicaOk ? '' : 'Você deve aceitar a Política de Privacidade.';

        aceitarTermosBtn.disabled = !(termosOk && politicaOk);
    }

    chkTermos.addEventListener('change', validarCheckboxes);
    chkPolitica.addEventListener('change', validarCheckboxes);

    // Aceitar termos e prosseguir com cadastro
    aceitarTermosBtn.addEventListener('click', function() {
        const termosOk = chkTermos.checked;
        const politicaOk = chkPolitica.checked;

        if (!termosOk || !politicaOk) {
            validarCheckboxes();
            return;
        }

        termosAceitos = true;
        politicaPrivacidade = true;
        etapaValidacao = true;

        fecharModal();

        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
    });
});

