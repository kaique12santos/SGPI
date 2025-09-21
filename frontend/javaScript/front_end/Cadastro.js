import { ativar } from "../utils/alerts.js";
import { cadastrarUsuario } from "../services/CadastroService.js";

const form = document.querySelector('.signup-info'); 

// Variável para controlar se os termos foram aceitos
let termosAceitos = false;

// Função para processar o cadastro (extraída do event listener)
async function processarCadastro() {
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

    // VALIDAÇÃO DA PALAVRA-CHAVE NO BACKEND (exemplo de implementação futura)
    // if (perfil === 'professor') {
    //     try {
    //         const validacaoChave = await validarChaveProfessor(chaveProfessor);
    //         if (!validacaoChave.success) {
    //             ativar("Palavra-chave inválida. Verifique com a coordenação.", "erro", "");
    //             return false;
    //         }
    //     } catch (error) {
    //         console.error("Erro ao validar chave do professor:", error);
    //         ativar("Erro ao validar palavra-chave. Tente novamente.", "erro", "");
    //         return false;
    //     }
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

    // Se chegou até aqui, todas as validações passaram
    try {
        // ===== DADOS COMENTADOS PARA ENVIO FUTURO =====
        
        // Dados básicos (já implementados)
        const dadosBasicos = { nome, email, senha };
        
        // Dados adicionais para implementação futura
        // const dadosCompletos = { 
        //     nome, 
        //     email, 
        //     senha, 
        //     perfil,
        //     materias: perfil === 'aluno' ? materias : null,
        //     chaveProfessor: perfil === 'professor' ? chaveProfessor : null
        // };

        // Por enquanto, enviando apenas dados básicos
        const data = await cadastrarUsuario(dadosBasicos);
        
        // ===== IMPLEMENTAÇÃO FUTURA COM DADOS COMPLETOS =====
        // const data = await cadastrarUsuario(dadosCompletos);
        
        // ===== LOG PARA DEBUG (remover em produção) =====
        console.log("=== DADOS CAPTURADOS PARA CADASTRO ===");
        console.log("Nome:", nome);
        console.log("Email:", email);
        console.log("Perfil selecionado:", perfil);
        
        if (perfil === 'aluno') {
            console.log("Matérias selecionadas:", materias);
            console.log("Quantidade de matérias:", materias.length);
        }
        
        if (perfil === 'professor') {
            console.log("Palavra-chave informada:", chaveProfessor ? "***" + chaveProfessor.slice(-3) : "não informada");
        }
        console.log("=====================================");
        
        if (data.success) {
            ativar(data.message || "Cadastro realizado com sucesso!", "sucesso", "/index");
        } else {
            ativar(data.message || "Erro ao cadastrar", "erro", "");
        }
        return true;
    } catch (error) {
        console.error("Erro na requisição:", error);
        ativar("Erro ao conectar com o servidor.", "erro", "");
        return false;
    }
}

// Event listener para o submit do formulário (agora só processa se termos foram aceitos)
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Se os termos foram aceitos, processa o cadastro
    if (termosAceitos) {
        await processarCadastro();
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
        
        // Dispara o evento de submit do formulário
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
    });
});

// ===== FUNÇÃO COMENTADA PARA VALIDAÇÃO DE CHAVE NO BACKEND =====
// async function validarChaveProfessor(chave) {
//     try {
//         const response = await fetch('/api/validar-chave-professor', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ chaveProfessor: chave })
//         });
//         
//         const data = await response.json();
//         return data;
//     } catch (error) {
//         console.error('Erro ao validar chave do professor:', error);
//         throw error;
//     }
// }