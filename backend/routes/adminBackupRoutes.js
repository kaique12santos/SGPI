const express = require('express');
const router = express.Router();
const DriveService = require('../services/googleDriveService');
const archiver = require('archiver');
require('dotenv').config();

// 1. Listar Anos Disponíveis
router.get('/anos', async (req, res) => {
    try {
        const rootId = process.env.DRIVE_ID_ACADEMIC; // ID da pasta SGPI_ACADEMIC
        if (!rootId) return res.status(500).json({ message: 'ID da pasta raiz não configurado.' });

        const pastas = await DriveService.listarPastasNaRaiz(rootId);
        res.json({ success: true, anos: pastas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao listar anos.' });
    }
});

// 2. Gerar e Baixar ZIP
router.get('/download/:folderId', async (req, res) => {
    const folderId = req.params.folderId;
    const nomeZip = req.query.nome || 'backup';

    // Aumenta o timeout da requisição para 10 minutos (backups podem demorar)
    req.setTimeout(600000);

    try {
        // Configura o Header para o navegador entender que é um download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeZip}.zip"`);

        const archive = archiver('zip', {
            zlib: { level: 9 } // Compressão máxima
        });

        // Se der erro no processo de zipagem
        archive.on('error', function(err) {
            console.error('Erro no Archiver:', err);
            if (!res.headersSent) res.status(500).send({error: err.message});
        });

        // Conecta o ZIP à resposta (Pipe)
        archive.pipe(res);

        // Inicia a mágica recursiva
        console.log(`📦 Iniciando backup da pasta ${folderId}...`);
        await DriveService.downloadFolderAsZip(folderId, archive);
        
        // Finaliza o ZIP (isso encerra o download no navegador)
        await archive.finalize();
        console.log(`✅ Backup finalizado: ${nomeZip}.zip`);

    } catch (error) {
        console.error('Erro na rota de backup:', error);
        if (!res.headersSent) res.status(500).send('Erro ao gerar backup.');
    }
});

// 3. Excluir Pasta da Nuvem (Com trava de segurança de 5 anos)
router.delete('/delete/:folderId', async (req, res) => {
    const folderId = req.params.folderId;

    try {
        const drive = require('../services/googleDriveService').drive; // Acesso direto para checagem extra
        
        // 1. Busca metadados da pasta para verificar a data de criação
        const fileInfo = await drive.files.get({
            fileId: folderId,
            fields: 'createdTime, name'
        });

        const dataCriacao = new Date(fileInfo.data.createdTime);
        const agora = new Date();
        
        // Cálculo de 5 anos em milissegundos
        // (5 anos * 365 dias * 24h * 60m * 60s * 1000ms)
        const CINCO_ANOS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
        const idadePasta = agora - dataCriacao;

        // TRAVA DE SEGURANÇA: Se tiver menos de 5 anos, rejeita.
        // Dica: Para testar hoje, você pode diminuir esse valor temporariamente, mas vamos deixar o código final fixo.
        if (idadePasta < CINCO_ANOS_MS) {
            return res.status(403).json({ 
                success: false, 
                message: 'Ação bloqueada. Por segurança, só é permitido excluir pastas com mais de 5 anos de existência.' 
            });
        }

        // 2. Se passou na validação, executa a exclusão
        await DriveService.deleteFile(folderId);
        
        console.log(`🗑️ Pasta ${fileInfo.data.name} (ID: ${folderId}) excluída por obsolescência.`);
        res.json({ success: true, message: 'Pasta excluída da nuvem com sucesso.' });

    } catch (error) {
        console.error('Erro na rota de exclusão:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir pasta.' });
    }
});

module.exports = router;