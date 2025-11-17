import { ativar as mostrarAlerta } from '../utils/alerts.js';
import { PalavraChaveService } from '../services/palavraChaveServices.js';
import { confirmarAcao } from "../utils/confirmDialog.js";

/**
 * Classe responsável pela manipulação do DOM do painel de palavras-chave
 */
class PalavraChaveDOM {
    constructor() {
        this.service = new PalavraChaveService();
        this.elementos = {};
        this.modalAtivo = null;
        this.init();
    }

    /**
     * Inicializa o DOM e eventos
     */
    init() {
        this.capturarElementos();
        this.configurarEventos();
        this.carregarHistorico();
    }

    /**
     * Captura referências dos elementos DOM
     */
    capturarElementos() {
        this.elementos = {
            // Inputs das chaves
            chaveProfessor: document.getElementById('chaveProfessor'),
            chaveOrientador: document.getElementById('chaveOrientador'),
            
            // Botões Professor
            gerarProfessor: document.getElementById('gerarProfessor'),
            copiarProfessor: document.getElementById('copiarProfessor'),
            salvarProfessor: document.getElementById('salvarProfessor'),
            
            // Botões Orientador
            gerarOrientador: document.getElementById('gerarOrientador'),
            copiarOrientador: document.getElementById('copiarOrientador'),
            salvarOrientador: document.getElementById('salvarOrientador'),
            
            // Histórico
            historicoLista: document.getElementById('historicoLista'),
            
            // Modal
            modal: document.getElementById('modalConfirmacao'),
            modalMensagem: document.getElementById('modalMensagem'),
            modalConfirmar: document.getElementById('modalConfirmar'),
            modalCancelar: document.getElementById('modalCancelar'),
            modalFechar: document.querySelector('.close')
        };
    }

    /**
     * Configura todos os event listeners
     */
    configurarEventos() {
        // Eventos de geração
        this.elementos.gerarProfessor.addEventListener('click', () => this.gerarChave('professor'));
        this.elementos.gerarOrientador.addEventListener('click', () => this.gerarChave('orientador'));
        
        // Eventos de cópia
        this.elementos.copiarProfessor.addEventListener('click', () => this.copiarChave('professor'));
        this.elementos.copiarOrientador.addEventListener('click', () => this.copiarChave('orientador'));
        
        // Eventos de salvamento
        this.elementos.salvarProfessor.addEventListener('click', () => this.salvarChave('professor'));
        this.elementos.salvarOrientador.addEventListener('click', () => this.salvarChave('orientador'));
        

        
        // Eventos do modal
        this.elementos.modalCancelar.addEventListener('click', () => this.fecharModal());
        this.elementos.modalFechar.addEventListener('click', () => this.fecharModal());
        this.elementos.modal.addEventListener('click', (e) => {
            if (e.target === this.elementos.modal) this.fecharModal();
        });
        this.elementos.historicoLista.addEventListener('click', (e) => this.handleHistoricoClick(e));
        
        // Escape para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalAtivo) this.fecharModal();
        });
    }

    /**
     * Gera uma nova chave para o tipo especificado
     * @param {string} tipo - 'professor' ou 'orientador'
     */
    async gerarChave(tipo) {
        const botaoGerar = this.elementos[`gerar${this.capitalize(tipo)}`];
        const inputChave = this.elementos[`chave${this.capitalize(tipo)}`];
        const botaoCopiar = this.elementos[`copiar${this.capitalize(tipo)}`];
        const botaoSalvar = this.elementos[`salvar${this.capitalize(tipo)}`];

        try {
            this.setLoadingState(botaoGerar, true);
            
            const novaChave = await this.service.gerarChave(tipo);
            
            inputChave.value = novaChave;
            botaoCopiar.disabled = false;
            botaoSalvar.disabled = false;
            
            mostrarAlerta(`Chave ${tipo} gerada com sucesso!`, 'sucesso');
            
        } catch (error) {
            console.error('Erro ao gerar chave:', error);
            mostrarAlerta('Erro ao gerar chave. Tente novamente.', 'erro');
        } finally {
            this.setLoadingState(botaoGerar, false);
        }
    }

    /**
     * Copia a chave para a área de transferência
     * @param {string} tipo - 'professor' ou 'orientador'
     */
    async copiarChave(tipo) {
        const inputChave = this.elementos[`chave${this.capitalize(tipo)}`];
        const chave = inputChave.value;

        if (!chave) {
            mostrarAlerta('Nenhuma chave para copiar!', 'erro');
            return;
        }

        try {
            await navigator.clipboard.writeText(chave);
            mostrarAlerta('Chave copiada para a área de transferência!', 'sucesso');
        } catch (error) {
            // Fallback para navegadores mais antigos
            inputChave.select();
            document.execCommand('copy');
            mostrarAlerta('Chave copiada para a área de transferência!', 'sucesso');
        }
    }

    /**
     * Salva a chave no sistema
     * @param {string} tipo - 'professor' ou 'orientador'
     */
    async salvarChave(tipo) {
        const inputChave = this.elementos[`chave${this.capitalize(tipo)}`];
        const chave = inputChave.value;

        if (!chave) {
            mostrarAlerta('Nenhuma chave para salvar!', 'erro');
            return;
        }

        const botaoSalvar = this.elementos[`salvar${this.capitalize(tipo)}`];
        const confirmar = await confirmarAcao(
            "Confirmar Criação?",
            "Deseja realmente salvar a nova chave gerada?",
            "Salvar",
            "Cancelar"
        );
        
        if (!confirmar) return;
        try {
            this.setLoadingState(botaoSalvar, true);
            
            const resultado = await this.service.salvarChave(chave, tipo);
            
            if (resultado.sucesso) {
                mostrarAlerta('Chave salva com sucesso!', 'sucesso');
                this.carregarHistorico();
                this.limparCampos(tipo);
            } else {
                mostrarAlerta(resultado.mensagem || 'Erro ao salvar chave', 'erro');
            }
            
        } catch (error) {
            console.error('Erro ao salvar chave:', error);
            mostrarAlerta('Erro ao salvar chave. Tente novamente.', 'erro');
        } finally {
            this.setLoadingState(botaoSalvar, false);
        }
    }

    /**
     * Copia uma chave do histórico
     * @param {string} chave - A chave a ser copiada
     */
    async copiarChaveHistorico(chave) {
        try {
            await navigator.clipboard.writeText(chave);
            mostrarAlerta('Chave copiada do histórico!', 'sucesso');
        } catch (error) {
            mostrarAlerta('Erro ao copiar chave', 'erro');
        }
    }

    /**
     * Marca uma chave como usada
     * @param {string} chave - A chave a ser marcada
     */
    marcarComoUsada(chave) {
        this.abrirModal(
            `Tem certeza que deseja marcar a chave "${chave}" como usada?`,
            async () => {
                try {
                    const resultado = await this.service.marcarChaveComoUsada(chave);
                    
                    if (resultado.sucesso) {
                        mostrarAlerta('Chave marcada como usada!', 'sucesso');
                        this.carregarHistorico();
                    } else {
                        mostrarAlerta(resultado.mensagem || 'Erro ao marcar chave', 'erro');
                    }
                } catch (error) {
                    console.error('Erro ao marcar chave:', error);
                    mostrarAlerta('Erro ao marcar chave como usada', 'erro');
                }
            }
        );
    }

    /**
     * Carrega e exibe o histórico de chaves
     */
    async carregarHistorico() {
        try {
            const historico = await this.service.obterHistorico();
            this.renderizarHistorico(historico);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            mostrarAlerta('Erro ao carregar histórico', 'erro');
        }
    }

    /**
     * Renderiza o histórico na interface (versão tabela)
     * @param {Array} historico - Lista de chaves do histórico
     */
    renderizarHistorico(historico) {
        if (!historico || historico.length === 0) {
            this.elementos.historicoLista.innerHTML = '<tr><td colspan="5" class="historico-vazio">Nenhuma chave gerada ainda</td></tr>';
            return;
        }

        const html = historico.map(item => `
            <tr>
                <td>
                    <span class="badge badge-${item.tipo}">${this.formatarTipo(item.tipo)}</span>
                </td>
                <td>
                    <span class="chave-codigo">${item.chave}</span>
                </td>
                <td>
                    <span class="data-item">${this.service.formatarData(item.dataGeracao)}</span>
                </td>
                <td>
                    <span class="status-badge ${item.status === 'ativo' ? 'status-ativo' : 'status-usado'}">
                        ${item.status === 'ativo' ? 'Ativo' : 'Usado'}
                    </span>
                </td>
                <td>
                    <div class="acoes-historico">
                        <button class="btn btn-secondary btn-small js-copiar-historico" data-chave="${item.chave}" title="Copiar chave">
                            📋
                        </button>
                        ${item.status === 'ativo' ? `
                            <button class="btn btn-success btn-small js-marcar-usada" data-chave="${item.chave}" title="Marcar como usada">
                                ✓
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        this.elementos.historicoLista.innerHTML = html;
    }

    /**
     * Abre o modal de confirmação
     * @param {string} mensagem - Mensagem a ser exibida
     * @param {Function} callback - Função a ser executada na confirmação
     */
    abrirModal(mensagem, callback) {
        this.elementos.modalMensagem.textContent = mensagem;
        this.elementos.modal.style.display = 'block';
        this.modalAtivo = callback;

        // Remove listener anterior e adiciona novo
        this.elementos.modalConfirmar.replaceWith(this.elementos.modalConfirmar.cloneNode(true));
        this.elementos.modalConfirmar = document.getElementById('modalConfirmar');
        
        this.elementos.modalConfirmar.addEventListener('click', () => {
            if (callback) callback();
            this.fecharModal();
        });
    }

    /**
     * Fecha o modal
     */
    fecharModal() {
        this.elementos.modal.style.display = 'none';
        this.modalAtivo = null;
    }

    /**
     * Limpa os campos após salvar
     * @param {string} tipo - 'professor' ou 'orientador'
     */
    limparCampos(tipo) {
        const inputChave = this.elementos[`chave${this.capitalize(tipo)}`];
        const botaoCopiar = this.elementos[`copiar${this.capitalize(tipo)}`];
        const botaoSalvar = this.elementos[`salvar${this.capitalize(tipo)}`];

        inputChave.value = '';
        botaoCopiar.disabled = true;
        botaoSalvar.disabled = true;
    }

    /**
     * Define o estado de loading de um botão
     * @param {HTMLElement} botao - Elemento do botão
     * @param {boolean} loading - Se está em loading
     */
    setLoadingState(botao, loading) {
        if (loading) {
            botao.disabled = true;
            botao.classList.add('loading');
        } else {
            botao.disabled = false;
            botao.classList.remove('loading');
        }
    }

    /**
     * Formata o tipo para exibição
     * @param {string} tipo - Tipo da chave
     * @returns {string} Tipo formatado
     */
    formatarTipo(tipo) {
        const tipos = {
            'professor': 'Professor',
            'orientador': 'Prof. Orientador'
        };
        return tipos[tipo] || tipo;
    }

    /**
     * Capitaliza a primeira letra
     * @param {string} str - String a ser capitalizada
     * @returns {string} String capitalizada
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
 * Manipula cliques na lista do histórico usando event delegation
 * @param {Event} e - O evento de clique
 */
    handleHistoricoClick(e) {
        // e.target é o elemento exato clicado (pode ser o ícone 📋)
        // .closest('button') encontra o botão "pai" mais próximo
        const target = e.target.closest('button');

        // Se o clique não foi em um botão, ou no ícone dentro dele, ignora
        if (!target) return;

        // Pega a chave guardada no atributo data-chave
        const chave = target.dataset.chave;
        if (!chave) return;

        // Verifica qual botão foi clicado pela classe CSS
        if (target.classList.contains('js-copiar-historico')) {
            this.copiarChaveHistorico(chave);
        } 
        else if (target.classList.contains('js-marcar-usada')) {
            this.marcarComoUsada(chave);
        }
    }
}

// Inicializa quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.palavraChaveDOM = new PalavraChaveDOM();
});

export { PalavraChaveDOM };