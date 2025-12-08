const fs = require('fs');
const { google } = require('googleapis');

// Configuração da Autenticação OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Seta o token de atualização (isso permite que o login nunca expire)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const DriveService = {
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
            const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`;
            
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
                parents: [parentFolderId],
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
    }
};

module.exports = DriveService;