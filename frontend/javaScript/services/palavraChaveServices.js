/**
 * Serviço para gerenciamento de palavras-chave de acesso
 * Responsável pela lógica de negócio e comunicação com backend
 */
class PalavraChaveService {
    constructor() {
        this.baseUrl = '/api/chaves'; // URL base para API
    }

    /**
     * Gera uma nova chave alfanumérica
     * @param {string} tipo - 'professor' ou 'orientador'
     * @returns {Promise<string>} Nova chave gerada
     */
    async gerarChave(tipo) {
        return new Promise((resolve) => {
            // Simula delay de geração
            setTimeout(() => {
                const novaChave = this.gerarChaveAleatoria();
                resolve(novaChave);
            }, 500);
        });
    }

    /**
     * Salva uma chave no sistema (banco de dados)
     * @param {string} chave - Chave a ser salva
     * @param {string} tipo - Tipo da chave
     * @returns {Promise<Object>} Resultado da operação
     */
    async salvarChave(chave, tipo) {
        try {
            const usuarioId = localStorage.getItem('usuarioId'); // coordenador logado
            const resposta = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ chave, tipo, geradoPor: usuarioId })
            });
    
            return await resposta.json();
        } catch (err) {
            return { sucesso: false, mensagem: 'Erro ao salvar chave no servidor' };
        }
    }

    /**
     * Marca uma chave como usada
     * @param {number} chaveId - ID da chave a ser marcada
     * @returns {Promise<Object>} Resultado da operação
     */
    async marcarChaveComoUsada(chaveId) {
        try {
            const resposta = await fetch(`${this.baseUrl}/${chaveId}/usar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await resposta.json();
            
            if (!resposta.ok) {
                return {
                    sucesso: false,
                    mensagem: data.mensagem || 'Erro ao marcar chave como usada'
                };
            }

            return data;
        } catch (error) {
            console.error('Erro ao marcar chave como usada:', error);
            return { 
                sucesso: false, 
                mensagem: 'Erro de conexão com o servidor' 
            };
        }
    }

    /**
     * Obtém o histórico de chaves do banco de dados
     * @returns {Promise<Array>} Lista do histórico
     */
    async obterHistorico() {
        try {
            const resposta = await fetch(`${this.baseUrl}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await resposta.json();
    
            if (!data.sucesso) return [];
    
            return data.dados.map(item => ({
                id: item.chave_id,
                chave: item.chave,
                tipo: this.mapearTipoUsuario(item.tipo_usuario),
                dataGeracao: new Date(item.data_geracao),
                status: item.usos >= item.limite_uso ? 'usado' : 'ativo',
                usos: item.usos,
                limiteUso: item.limite_uso,
                geradoPor: item.gerado_por,
                usadoPor: item.usuario_destino_id
            }));
        } catch (err) {
            return [];
        }
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
        const regex = /^[A-Z0-9]{3,4}-[A-Z0-9]{4,5}$/;
        return regex.test(chave);
    }

    /**
     * Mapeia o tipo de usuário do banco para o formato do frontend
     * @param {string} tipoUsuario - Tipo do banco ('Professor' ou 'Professor_Orientador')
     * @returns {string} Tipo formatado ('professor' ou 'orientador')
     */
    mapearTipoUsuario(tipoUsuario) {
        const mapeamento = {
            'Professor': 'professor',
            'Professor_Orientador': 'orientador'
        };
        return mapeamento[tipoUsuario] || 'professor';
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
     * @param {Array} historico - Lista do histórico
     * @returns {Object} Estatísticas
     */
    obterEstatisticas(historico) {
        if (!historico || historico.length === 0) {
            return {
                total: 0,
                ativas: 0,
                usadas: 0,
                professores: 0,
                orientadores: 0,
                percentualUso: 0
            };
        }

        const total = historico.length;
        const ativas = historico.filter(item => item.status === 'ativo').length;
        const usadas = historico.filter(item => item.status === 'usado').length;
        const professores = historico.filter(item => item.tipo === 'professor').length;
        const orientadores = historico.filter(item => item.tipo === 'orientador').length;

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
     * Verifica se há conexão com o servidor
     * @returns {Promise<boolean>} Se há conexão
     */
    async verificarConexao() {
        try {
            const resposta = await fetch(`${this.baseUrl}/ping`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return resposta.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Busca uma chave específica por valor
     * @param {string} valorChave - Valor da chave a ser buscada
     * @returns {Promise<Object|null>} Dados da chave ou null se não encontrada
     */
    async buscarChave(valorChave) {
        try {
            const historico = await this.obterHistorico();
            return historico.find(item => item.chave === valorChave) || null;
        } catch (error) {
            console.error('Erro ao buscar chave:', error);
            return null;
        }
    }

    /**
     * Valida se uma chave pode ser usada
     * @param {Object} chave - Objeto da chave
     * @returns {boolean} Se a chave pode ser usada
     */
    async usarChave(chaveId) {
        try {
            const usuarioDestinoId = localStorage.getItem('usuarioId'); // professor logado
            const resposta = await fetch(`${this.baseUrl}/${chaveId}/usar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ usuarioDestinoId })
            });
    
            return await resposta.json();
        } catch (err) {
            return { sucesso: false, mensagem: 'Erro ao consumir chave no servidor' };
        }
    }
}

export { PalavraChaveService };