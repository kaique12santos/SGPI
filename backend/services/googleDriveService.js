const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');

// ==========================================
// CONFIGURAÇÃO DE AUTENTICAÇÃO (MANTIDA)
// ==========================================
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Seta o token de atualização (isso permite que o login nunca expire)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const DriveService = {
    // ---------------------------------------------------------
    // MÉTODOS EXISTENTES (UPLOAD, CRIAR PASTA, DELETAR)
    // ---------------------------------------------------------
    async uploadFile(localFilePath, fileName, mimeType, parentFolderId) {
        try {
            const requestBody = {
                name: fileName,
                parents: [parentFolderId],
            };

            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(localFilePath),
            };

            const response = await drive.files.create({
                requestBody,
                media: media,
                fields: 'id, name, webViewLink, webContentLink',
            });

            console.log(`✅ Upload concluído via OAuth! ID: ${response.data.id}`);
            return response.data;

        } catch (error) {
            console.error('❌ Erro no upload (OAuth):', error.message);
            throw error;
        }
    },

    async createFolder(folderName, parentFolderId) {
        try {
            // Verifica se pasta existe
            // Adicionada verificação de segurança para parentFolderId
            let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
            if (parentFolderId) {
                query += ` and '${parentFolderId}' in parents`;
            }
            
            const existing = await drive.files.list({
                q: query,
                fields: 'files(id, name)',
                spaces: 'drive',
            });

            if (existing.data.files.length > 0) {
                return existing.data.files[0];
            }

            // Cria pasta
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: parentFolderId ? [parentFolderId] : [],
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                fields: 'id, name',
            });

            return response.data;

        } catch (error) {
            console.error('❌ Erro ao criar pasta (OAuth):', error.message);
            throw error;
        }
    },

    async deleteFile(fileId) {
        try {
            await drive.files.delete({ fileId: fileId });
            return true;
        } catch (error) {
            console.error('❌ Erro ao deletar:', error.message);
            throw error;
        }
    },

    // ==========================================
    // NOVOS MÉTODOS PARA O BACKUP (ADICIONADOS)
    // ==========================================

    /**
     * Lista as pastas (Anos) que estão dentro da pasta raiz do sistema
     */
    async listarPastasNaRaiz(rootId) {
        try {
            const res = await drive.files.list({
                q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name, createdTime)',
                orderBy: 'name desc' // Ordena do ano mais recente para o antigo
            });
            return res.data.files;
        } catch (error) {
            console.error('Erro ao listar pastas:', error);
            throw error;
        }
    },

    /**
     * Função Recursiva: Percorre o Drive e adiciona ao ZIP
     */
    async downloadFolderAsZip(folderId, archive, folderPath = '') {
        // 1. Listar tudo que tem dentro desta pasta
        let nextPageToken = null;
        
        do {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'nextPageToken, files(id, name, mimeType)',
                pageToken: nextPageToken
            });

            const files = res.data.files;
            nextPageToken = res.data.nextPageToken;

            for (const file of files) {
                const currentPath = folderPath ? path.join(folderPath, file.name) : file.name;

                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // Se for pasta, adiciona no zip e entra nela (recursão)
                    archive.append(null, { name: currentPath + '/' }); // Cria pasta vazia no zip
                    // Chamada recursiva usando 'this' para referenciar o próprio objeto DriveService
                    await this.downloadFolderAsZip(file.id, archive, currentPath);
                } else {
                    // Se for arquivo, faz o download do stream e joga no zip
                    try {
                        const dest = await drive.files.get(
                            { fileId: file.id, alt: 'media' },
                            { responseType: 'stream' }
                        );
                        
                        archive.append(dest.data, { name: currentPath });
                    } catch (err) {
                        console.error(`Erro ao baixar arquivo ${file.name} para o zip:`, err.message);
                        // Adiciona um txt de erro no lugar do arquivo para avisar caso falhe um arquivo específico
                        archive.append(`Erro ao baixar: ${err.message}`, { name: `${currentPath}.ERROR.txt` });
                    }
                }
            }
        } while (nextPageToken);
    }
};

module.exports = DriveService;