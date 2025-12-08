// teste-drive.js
require('dotenv').config(); // Certifique-se que tem o dotenv instalado
const DriveService = require('./services/googleDriveService.js'); // Ajuste o caminho se necessário
const path = require('path');
const fs = require('fs');

async function teste() {
    // 1. Criar um ficheiro temporário para teste
    const caminhoTeste = path.join(__dirname, 'teste.txt');
    fs.writeFileSync(caminhoTeste, 'Olá Google Drive! Isto é um teste do SGPI.');

    try {
        console.log('--- A iniciar Teste ---');
        
        // Tenta fazer upload para a pasta ACADEMIC (pegando do .env)
        const folderId = process.env.DRIVE_ID_ACADEMIC;
        
        if (!folderId) throw new Error("ID da pasta não encontrado no .env");

        const resultado = await DriveService.uploadFile(
            caminhoTeste, 
            'teste_sgpi_bot.txt', 
            'text/plain', 
            folderId
        );

        console.log('--- Resultado ---');
        console.log(resultado);
        console.log('Verifique o seu Google Drive agora!');

        // Limpeza (opcional)
        fs.unlinkSync(caminhoTeste);

    } catch (error) {
        console.error('Falha no teste:', error);
    }
}

teste();