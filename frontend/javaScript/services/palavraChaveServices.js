/**
 * Serviço para gerenciamento de palavras-chave de acesso
 * Responsável pela lógica de negócio e comunicação com backend
 */
class PalavraChaveService {
    constructor() {
        this.baseUrl = '/api/chaves'; // URL base para API
        this.historico = this.carregarHistoricoLocal();
        this.inicializarDadosTeste();
    }

    /**
     * Inicializa dados de teste se não houver histórico
     */
    inicializarDadosTeste() {
        if (this.historico.length === 0) {
            this.historico = [
                {
                    id: 1,
                    chave: 'RXF4-AS5G',
                    tipo: 'professor',
                    dataGeracao: new Date('2024-09-15T10:30:00'),
                    status: 'ativo',
                    criadoPor: 'admin'
                },
                {
                    id: 2,
                    chave: 'MNP8-QW2E',
                    tipo: 'orientador',
                    dataGeracao: new Date('2024-09-14T14:15:00'),
                    status: 'usado',
                    criadoPor: 'admin'
                },
                {
                    id: 3,
                    chave: 'ZXC9-VBN3',
                    tipo: 'professor',
                    dataGeracao: new Date('2024-09-13T09:45:00'),
                    status: 'ativo',
                    criadoPor: 'admin'
                },
                {
                    id: 4,
                    chave: 'LKJ7-HGF6',
                    tipo: 'orientador',
                    dataGeracao: new Date('2024-09-12T16:20:00'),
                    status: 'usado',
                    criadoPor: 'admin'
                },
                {
                    id: 5,
                    chave: 'POI5-UYT4',
                    tipo: 'professor',
                    dataGeracao: new Date('2024-09-11T11:10:00'),
                    status: 'ativo',
                    criadoPor: 'admin'
                }
            ];
            this.salvarHistoricoLocal();
        }
    }

    /**
     * Gera uma nova chave alfanumérica
     * @param {string} tipo - 'professor' ou 'orientador'
     * @returns {Promise<string>} Nova chave gerada
     */
    async gerarChave(tipo) {
        return new Promise((resolve) => {
            // Simula delay de API
            setTimeout(() => {
                const novaChave = this.gerarChaveAleatoria();
                resolve(novaChave);
            }, 500);
        });
    }

    /**
     * Salva uma chave no sistema
     * @param {string} chave - Chave a ser salva
     * @param {string} tipo - Tipo da chave
     * @returns {Promise<Object>} Resultado da operação
     */
    async salvarChave(chave, tipo) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    // Verifica se a chave já existe
                    const chaveExistente = this.historico.find(item => item.chave === chave);
                    if (chaveExistente) {
                        resolve({
                            sucesso: false,
                            mensagem: 'Esta chave já foi salva anteriormente!'
                        });
                        return;
                    }

                    // Valida formato da chave
                    if (!this.validarFormatoChave(chave)) {
                        resolve({
                            sucesso: false,
                            mensagem: 'Formato de chave inválido!'
                        });
                        return;
                    }

                    // Adiciona ao histórico
                    const novoItem = {
                        id: this.gerarProximoId(),
                        chave: chave,
                        tipo: tipo,
                        dataGeracao: new Date(),
                        status: 'ativo',
                        criadoPor: 'usuario_atual' // Em produção, pegar do contexto
                    };

                    this.historico.unshift(novoItem); // Adiciona no início
                    this.salvarHistoricoLocal();

                    resolve({
                        sucesso: true,
                        mensagem: 'Chave salva com sucesso!',
                        dados: novoItem
                    });

                } catch (error) {
                    resolve({
                        sucesso: false,
                        mensagem: 'Erro interno ao salvar chave'
                    });
                }
            }, 300);
        });
    }

    /**
     * Marca uma chave como usada
     * @param {string} chave - Chave a ser marcada
     * @returns {Promise<Object>} Resultado da operação
     */
    async marcarChaveComoUsada(chave) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const item = this.historico.find(h => h.chave === chave);
                
                if (!item) {
                    resolve({
                        sucesso: false,
                        mensagem: 'Chave não encontrada!'
                    });
                    return;
                }

                if (item.status === 'usado') {
                    resolve({
                        sucesso: false,
                        mensagem: 'Esta chave já foi marcada como usada!'
                    });
                    return;
                }

                item.status = 'usado';
                item.dataUso = new Date();
                this.salvarHistoricoLocal();

                resolve({
                    sucesso: true,
                    mensagem: 'Chave marcada como usada!',
                    dados: item
                });
            }, 200);
        });
    }

    /**
     * Obtém o histórico de chaves
     * @returns {Promise<Array>} Lista do histórico
     */
    async obterHistorico() {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Ordena por data de geração (mais recente primeiro)
                const historicoOrdenado = [...this.historico].sort((a, b) => 
                    new Date(b.dataGeracao) - new Date(a.dataGeracao)
                );
                resolve(historicoOrdenado);
            }, 100);
        });
    }

    /**
     * Gera uma chave aleatória no formato especificado
     * @returns {string} Chave no formato XXX#-XXX# (8-9 caracteres)
     */
    gerarChaveAleatoria() {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let chave = '';
        
        // Primeira parte: 3-4 caracteres
        const tamanhoPrimeiraParte = Math.random() < 0.5 ? 3 : 4;
        for (let i = 0; i < tamanhoPrimeiraParte; i++) {
            chave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        chave += '-';
        
        // Segunda parte: 4 caracteres (para totalizar 8-9)
        const tamanhoSegundaParte = 9 - tamanhoPrimeiraParte - 1; // -1 pelo hífen
        for (let i = 0; i < tamanhoSegundaParte; i++) {
            chave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        return chave;
    }

    /**
     * Valida o formato da chave
     * @param {string} chave - Chave a ser validada
     * @returns {boolean} Se a chave é válida
     */
    validarFormatoChave(chave) {
        // Formato: XXX-XXXX ou XXXX-XXXX (8-9 caracteres total)
        const regex = /^[A-Z0-9]{3,4}-[A-Z0-9]{4}$/;
        return regex.test(chave) && chave.length >= 8 && chave.length <= 9;
    }

    /**
     * Gera o próximo ID sequencial
     * @returns {number} Próximo ID
     */
    gerarProximoId() {
        if (this.historico.length === 0) return 1;
        return Math.max(...this.historico.map(item => item.id)) + 1;
    }

    /**
     * Carrega histórico do localStorage
     * @returns {Array} Histórico salvo
     */
    carregarHistoricoLocal() {
        try {
            const dados = localStorage.getItem('palavras_chave_historico');
            if (dados) {
                const historico = JSON.parse(dados);
                // Converte strings de data de volta para objetos Date
                return historico.map(item => ({
                    ...item,
                    dataGeracao: new Date(item.dataGeracao),
                    dataUso: item.dataUso ? new Date(item.dataUso) : null
                }));
            }
        } catch (error) {
            console.error('Erro ao carregar histórico local:', error);
        }
        return [];
    }

    /**
     * Salva histórico no localStorage
     */
    salvarHistoricoLocal() {
        try {
            localStorage.setItem('palavras_chave_historico', JSON.stringify(this.historico));
        } catch (error) {
            console.error('Erro ao salvar histórico local:', error);
        }
    }

    /**
     * Formata data para exibição
     * @param {Date} data - Data a ser formatada
     * @returns {string} Data formatada
     */
    formatarData(data) {
        if (!data) return '-';
        
        const dataObj = data instanceof Date ? data : new Date(data);
        
        return dataObj.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Obtém estatísticas do histórico
     * @returns {Object} Estatísticas
     */
    obterEstatisticas() {
        const total = this.historico.length;
        const ativas = this.historico.filter(item => item.status === 'ativo').length;
        const usadas = this.historico.filter(item => item.status === 'usado').length;
        const professores = this.historico.filter(item => item.tipo === 'professor').length;
        const orientadores = this.historico.filter(item => item.tipo === 'orientador').length;

        return {
            total,
            ativas,
            usadas,
            professores,
            orientadores,
            percentualUso: total > 0 ? Math.round((usadas / total) * 100) : 0
        };
    }

    /**
     * Limpa todo o histórico (apenas para desenvolvimento)
     */
    limparHistorico() {
        this.historico = [];
        this.salvarHistoricoLocal();
        this.inicializarDadosTeste(); // Recarrega dados de teste
    }

    /**
     * Simula chamada para API externa (para futuro)
     * @param {string} endpoint - Endpoint da API
     * @param {Object} dados - Dados a serem enviados
     * @returns {Promise<Object>} Resposta da API
     */
    async chamarAPI(endpoint, dados = null) {
        // Simulação de chamada HTTP
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simula sucesso/erro baseado no endpoint
                if (endpoint.includes('erro')) {
                    reject(new Error('Erro simulado da API'));
                } else {
                    resolve({
                        sucesso: true,
                        dados: dados,
                        timestamp: new Date().toISOString()
                    });
                }
            }, Math.random() * 1000 + 500); // 500-1500ms de delay
        });
    }
}

export { PalavraChaveService };