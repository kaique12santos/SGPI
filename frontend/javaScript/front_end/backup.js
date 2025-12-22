import { ativar } from '../utils/alerts.js';
import { confirmarAcao } from '../utils/confirmDialog.js';

document.addEventListener('DOMContentLoaded', () => {
    carregarAnos();
    configurarOuvintes();
});

function configurarOuvintes() {
    const container = document.getElementById('lista-anos');

    container.addEventListener('click', async (e) => {
        // Verifica se clicou no Download
        const btnDownload = e.target.closest('.btn-download');
        if (btnDownload && !btnDownload.disabled) {
            const folderId = btnDownload.dataset.id;
            const nomePasta = btnDownload.dataset.nome;
            
            const confirmou = await confirmarAcao(
                'Gerar Backup Completo',
                `Deseja iniciar o download do backup para o <strong>${nomePasta}</strong>?<br><br>Isso pode levar alguns minutos.`,
                'Iniciar Download',
                'Cancelar'
            );
            if (confirmou) iniciarBackup(folderId, nomePasta, btnDownload);
        }

        // Verifica se clicou no Excluir (NOVO)
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete && !btnDelete.disabled) {
            const folderId = btnDelete.dataset.id;
            const nomePasta = btnDelete.dataset.nome;

            // Alerta Duplo de Perigo
            const confirmou = await confirmarAcao(
                '⚠️ EXCLUSÃO PERMANENTE',
                `Tem certeza que deseja apagar a pasta <strong>${nomePasta}</strong> do Google Drive?<br><br>
                 <span style="color:red">Esta ação não pode ser desfeita. Certifique-se de que você já fez o backup (download) e guardou os arquivos em segurança.</span>`,
                'SIM, EXCLUIR',
                'Cancelar'
            );

            if (confirmou) excluirPastaNuvem(folderId, nomePasta);
        }
    });
}

async function carregarAnos() {
    const container = document.getElementById('lista-anos');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/admin/backup/anos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        container.innerHTML = '';
        
        if (data.anos.length === 0) {
            container.innerHTML = '<p>Nenhuma pasta de ano encontrada no Drive.</p>';
            ativar('Nenhum backup disponível no momento.', 'info');
            return;
        }

        // Constante de 5 anos para verificação visual
        const CINCO_ANOS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
        const agora = new Date().getTime();

        data.anos.forEach(pasta => {
            const dataCriacao = new Date(pasta.createdTime).getTime();
            const idade = agora - dataCriacao;
            const ehAntigo = idade > CINCO_ANOS_MS;

            // Formatação da data para exibição
            const dataFormatada = new Date(pasta.createdTime).toLocaleDateString('pt-BR');

            const card = document.createElement('div');
            card.className = 'year-card';
            
            // Monta o HTML. Se for antigo, adiciona o botão de Delete.
            let botoesHtml = `
                <button class="btn-download" data-id="${pasta.id}" data-nome="${pasta.name}">
                    <span class="spinner"></span>
                    <span>📥 Baixar ZIP</span>
                </button>
            `;

            if (ehAntigo) {
                botoesHtml += `
                    <button class="btn-delete" data-id="${pasta.id}" data-nome="${pasta.name}">
                        <span>🗑️ Excluir da Nuvem</span>
                    </button>
                `;
            }

            card.innerHTML = `
                <div class="year-info">
                    <h3>Ano Letivo ${pasta.name}</h3>
                    <p>Criado em: ${dataFormatada}</p>
                    <p style="font-size: 0.8em; color: #94a3b8;">ID: ${pasta.id}</p>
                </div>
                <div style="display:flex;">
                    ${botoesHtml}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red">Erro ao carregar lista de backups.</p>';
        ativar('Erro ao conectar com o Google Drive.', 'erro');
    }
}

async function iniciarBackup(folderId, nomePasta, btn) {
    // (Código da função de backup mantém-se igual ao anterior...)
    const spanTexto = btn.querySelector('span:last-child');
    const spinner = btn.querySelector('.spinner');
    const originalText = spanTexto.innerText;
    
    btn.disabled = true;
    spanTexto.innerText = 'Gerando ZIP...';
    spinner.style.display = 'block';
    ativar('Solicitação enviada. Preparando arquivos...', 'info');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/admin/backup/download/${folderId}?nome=Backup_${nomePasta}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errText = await response.text(); 
            throw new Error(errText || 'Falha ao gerar o arquivo.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_${nomePasta}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        ativar(`Backup de ${nomePasta} concluído com sucesso!`, 'sucesso');
    } catch (err) {
        console.error(err);
        ativar('Erro ao realizar backup. Tente novamente.', 'erro');
    } finally {
        btn.disabled = false;
        spanTexto.innerText = originalText;
        spinner.style.display = 'none';
    }
}

// NOVA FUNÇÃO: Excluir Pasta
async function excluirPastaNuvem(folderId, nomePasta) {
    try {
        const token = localStorage.getItem('token');
        ativar('Processando exclusão...', 'info');

        const response = await fetch(`/admin/backup/delete/${folderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        ativar('Pasta excluída com sucesso!', 'sucesso');
        
        // Recarrega a lista para sumir com o card
        setTimeout(() => carregarAnos(), 1500);

    } catch (err) {
        console.error(err);
        ativar(err.message || 'Erro ao excluir pasta.', 'erro');
    }
}