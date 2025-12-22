const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getConnection } = require('../conexaoMysql');

// Configuração
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const IDADE_ARQUIVO_HORAS = 24; // Só mexe em arquivos com mais de 24h

async function verificarELimpar() {
    console.log('\n🧹 [CLEANUP] Iniciando varredura da pasta uploads...');
    
    if (!fs.existsSync(UPLOAD_DIR)) {
        console.log('📂 Pasta uploads não existe. Nada a fazer.');
        return;
    }

    const arquivos = fs.readdirSync(UPLOAD_DIR);
    let deletados = 0;
    let preservados = 0;
    let erros = 0;
    let ignorados = 0;

    let connection;
    try {
        connection = await getConnection();

        for (const arquivo of arquivos) {
            const caminhoCompleto = path.join(UPLOAD_DIR, arquivo);
            
            // 1. Obter status do arquivo
            let stats;
            try {
                stats = fs.statSync(caminhoCompleto);
            } catch (e) {
                continue; // Se arquivo sumiu ou está travado, pula
            }

            // --- CORREÇÃO AQUI: Se for pasta, ignora ---
            if (stats.isDirectory()) {
                continue;
            }
            // -------------------------------------------

            const horasDesdeCriacao = (new Date() - stats.mtime) / (1000 * 60 * 60);

            if (horasDesdeCriacao < IDADE_ARQUIVO_HORAS) {
                // Arquivo muito novo, ignora por segurança
                ignorados++;
                continue; 
            }

            // 2. Verificar se é um arquivo LEGADO (Que PRECISA ficar no disco)
            // Legado = Está no banco E google_file_id É NULO
            const [checkLegado] = await connection.query(`
                SELECT id FROM Entregas 
                WHERE (caminho_arquivo LIKE ? OR nome_arquivo_original = ?) 
                AND google_file_id IS NULL
                UNION
                SELECT id FROM Avaliacoes 
                WHERE (caminho_arquivo_devolutiva LIKE ? OR nome_original_devolutiva = ?) 
                AND google_file_id IS NULL
            `, [`%${arquivo}%`, arquivo, `%${arquivo}%`, arquivo]);

            if (checkLegado.length > 0) {
                preservados++;
                continue;
            }

            // 3. Se chegou aqui, é lixo. Deletar.
            try {
                fs.unlinkSync(caminhoCompleto);
                console.log(`🗑️ Deletado: ${arquivo}`);
                deletados++;
            } catch (err) {
                console.error(`Erro ao deletar ${arquivo}:`, err.message);
                erros++;
            }
        }

    } catch (err) {
        console.error('❌ Erro fatal no job de limpeza:', err);
    } finally {
        if (connection) connection.release();
        console.log(`🏁 [CLEANUP] Fim. Deletados: ${deletados} | Preservados: ${preservados} | Recentes: ${ignorados} | Erros: ${erros}\n`);
    }
}

function iniciarAgendamento() {
    // Agenda para rodar todo dia às 03:00 da manhã
    cron.schedule('0 3 * * *', () => {
        verificarELimpar();
    });
    console.log('🕰️ Serviço de limpeza agendado para 03:00 AM.');
}

module.exports = { iniciarAgendamento, verificarELimpar };