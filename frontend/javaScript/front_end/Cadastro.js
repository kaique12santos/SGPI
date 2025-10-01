import { ativar } from "../utils/alerts.js";
import { cadastrarUsuario } from "../services/CadastroService.js";

const form = document.querySelector('.signup-info'); 

// Variável para controlar se os termos foram aceitos
let termosAceitos = false;
// Variáveis para controlar as etapas de validação
let dadosUsuarioTemp = {};
let etapaValidacao = false;

// Função para processar o cadastro inicial (enviar email de validação)
async function processarCadastroInicial() {
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

    // Validações básicas
    if (!nome || !email || !senha || !confirmarSenha || !perfil) {
        ativar('Por favor, preencha todos os campos.','erro','');
        return false;
    }

    if (!email.endsWith("@fatec.sp.gov.br")) {
        document.getElementById('emailError').textContent = 'E-mail Institucional Inválido';
        return false;
    }

    // ===== VALIDAÇÕES COMENTADAS PARA IMPLEMENTAÇÃO FUTURA =====
    
    // VALIDAÇÃO DE MATÉRIAS PARA ALUNO
    // if (perfil === 'aluno' && materias.length === 0) {
    //     ativar("Selecione pelo menos uma matéria.", "erro", "");
    //     return false;
    // }

    // VALIDAÇÃO DE PALAVRA-CHAVE PARA PROFESSOR
    // if (perfil === 'professor' && !chaveProfessor) {
    //     ativar("Insira a palavra-chave fornecida pelo coordenador.", "erro", "");
    //     return false;
    // }

    if (perfil === 'professor' && chaveProfessor) {
        try {
            const validacao = await validarChaveProfessor(chaveProfessor);
            if (!validacao.success) {
                ativar(validacao.message || "Palavra‑chave inválida!", "erro", "");
                return false;
            }
        } catch {
            ativar("Erro ao validar palavra‑chave.", "erro", "");
            return false;
        }
    }

    // ===== FIM DAS VALIDAÇÕES COMENTADAS =====

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

    // Validar se os termos foram aceitos
    if (!termosAceitos) {
        ativar('Você deve aceitar os termos de uso para continuar.', 'erro', '');
        return false;
    }

    // Se chegou até aqui, todas as validações passaram
    try {
        // ===== PREPARAR DADOS COMPLETOS PARA O BACKEND =====
        const dadosCompletos = { 
            nome, 
            email, 
            senha,
            tipo: perfil.charAt(0).toUpperCase() + perfil.slice(1), // 'aluno' → 'Aluno'
            ra: perfil === 'aluno' ? (document.getElementById('ra')?.value || `RA${Date.now()}`) : null,
            disciplinas: perfil === 'aluno' ? materias : [],
            termos_aceitos: termosAceitos ? 1 : 0,   // boolean → int para MySQL
            tipo: perfil.charAt(0).toUpperCase() + perfil.slice(1),
            chaveProfessor: perfil === 'professor' ? chaveProfessor : null
        };

        // ===== NOVA LÓGICA: INICIAR CADASTRO COM VALIDAÇÃO DE EMAIL =====
        const response = await fetch('/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosCompletos)
        });

        const data = await response.json();
        
        // ===== LOG PARA DEBUG (remover em produção) =====
        console.log("=== DADOS ENVIADOS PARA O BACKEND ===");
        console.log("Nome:", nome);
        console.log("Email:", email);
        console.log("Tipo:", dadosCompletos.tipo);
        console.log("RA:", dadosCompletos.ra);
        console.log("Termos aceitos:", dadosCompletos.termos_aceitos);
        
        if (perfil === 'aluno') {
            console.log("Disciplinas selecionadas:", dadosCompletos.disciplinas);
            console.log("Quantidade de disciplinas:", dadosCompletos.disciplinas.length);
        }
        
        if (perfil === 'professor') {
            console.log("Palavra-chave informada:", chaveProfessor ? "***" + chaveProfessor.slice(-3) : "não informada");
        }
        console.log("=====================================");
        
        if (data.success) {
            // Guardar dados temporariamente para possível reenvio de email
            dadosUsuarioTemp = {
                nome,
                email,
                tipo: dadosCompletos.tipo
            };
            
          // Só mostrar etapa de validação se TODAS passaram
            if (etapaValidacao) {
                mostrarEtapaValidacao();
                ativar(data.message || "E-mail de validação enviado! Verifique sua caixa de entrada.", "sucesso", "");
            }
        } else {
            ativar(data.message || "Erro ao iniciar cadastro", "erro", "");
        }
        return true;
    } catch (error) {
        console.error("Erro na requisição:", error);
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
        const response = await fetch('/validar-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigo })
        });

        const data = await response.json();

        if (data.success) {
            ativar("🎉 Cadastro concluído! Redirecionando para login...", "sucesso", "/index");
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
        const response = await fetch('/reenviar-validacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: dadosUsuarioTemp.email })
        });

        const data = await response.json();

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

// ===== LISTENERS PARA DEBUG DAS MATÉRIAS (comentados para implementação futura) =====
// document.addEventListener('DOMContentLoaded', function() {
//     const checkboxesMaterias = document.querySelectorAll('input[name="materias"]');
//     
//     checkboxesMaterias.forEach(checkbox => {
//         checkbox.addEventListener('change', function() {
//             const materiasSelecionadas = Array.from(document.querySelectorAll('input[name="materias"]:checked')).map(c => c.value);
//             console.log("Matérias selecionadas:", materiasSelecionadas);
//         });
//     });
// });

// ===== CONTROLE DO MODAL DE TERMOS =====
document.addEventListener('DOMContentLoaded', function() {
    const cadastrarBtn = document.getElementById('cadastrarBtn');
    const termosModal = document.getElementById('termosModal');
    const closeModal = document.getElementById('closeModal');
    const cancelarTermos = document.getElementById('cancelarTermos');
    const aceitarTermos = document.getElementById('aceitarTermos');
    const modalBody = document.getElementById('modalBody');
    const scrollIndicator = document.getElementById('scrollIndicator');

    // ===== NOVOS ELEMENTOS PARA VALIDAÇÃO DE EMAIL =====
    const btnValidarCodigo = document.getElementById('btnValidarCodigo');
    const btnReenviarEmail = document.getElementById('btnReenviarEmail');

    // Event listeners para os novos botões
    if (btnValidarCodigo) {
        btnValidarCodigo.addEventListener('click', validarCodigo);
    }

    if (btnReenviarEmail) {
        btnReenviarEmail.addEventListener('click', reenviarEmail);
    }

    // Abrir modal ao clicar em cadastrar
    cadastrarBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Primeiro valida os campos antes de abrir o modal
        const validacao = await validarCampos();
        if (!validacao) {
            return; // Se validação falhou, não abre o modal
        }
        
        // Se validação passou, abre o modal
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

        // Validações básicas
        if (!nome || !email || !senha || !confirmarSenha || !perfil) {
            ativar('Por favor, preencha todos os campos.','erro','');
            return false;
        }

        if (!email.endsWith("@fatec.sp.gov.br")) {
            document.getElementById('emailError').textContent = 'E-mail Institucional Inválido';
            return false;
        }

        // ===== VALIDAÇÕES COMENTADAS PARA IMPLEMENTAÇÃO FUTURA =====
        
        // VALIDAÇÃO DE MATÉRIAS PARA ALUNO (antes de abrir modal)
        // if (perfil === 'aluno' && materias.length === 0) {
        //     ativar("Selecione pelo menos uma matéria.", "erro", "");
        //     return false;
        // }

        // VALIDAÇÃO DE PALAVRA-CHAVE PARA PROFESSOR (antes de abrir modal)
        // if (perfil === 'professor' && !chaveProfessor) {
        //     ativar("Insira a palavra-chave fornecida pelo coordenador.", "erro", "");
        //     return false;
        // }

        // ===== FIM DAS VALIDAÇÕES COMENTADAS =====

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

    // Fechar modal
    function fecharModal() {
        termosModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Reset do scroll e botão
        modalBody.scrollTop = 0;
        aceitarTermos.disabled = true;
        scrollIndicator.style.display = 'block';
    }

    closeModal.addEventListener('click', fecharModal);
    cancelarTermos.addEventListener('click', fecharModal);

    // Fechar modal clicando fora
    termosModal.addEventListener('click', function(e) {
        if (e.target === termosModal) {
            fecharModal();
        }
    });

    // Detectar scroll até o final
    modalBody.addEventListener('scroll', function() {
        const scrollTop = modalBody.scrollTop;
        const scrollHeight = modalBody.scrollHeight;
        const clientHeight = modalBody.clientHeight;
        
        // Se chegou ao final (com margem de 10px)
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            aceitarTermos.disabled = false;
            scrollIndicator.style.display = 'none';
        }
    });

    // Aceitar termos e prosseguir com cadastro
    aceitarTermos.addEventListener('click', function() {
        fecharModal();
        termosAceitos = true; // Marca que os termos foram aceitos
        etapaValidacao = true;
        
        // Dispara o evento de submit do formulário
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
    });
});


async function validarChaveProfessor(chave) {
    try {
        const response = await fetch('/validar-chave-professor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chaveProfessor: chave })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao validar chave');
        }
        
        return data;
    } catch (error) {
        console.error('Erro ao validar chave do professor:', error);
        throw error;
    }
}