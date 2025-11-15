import { getConfigMatriculas, updateConfigMatriculas } from '../services/configService.js';
import { ativar } from '../utils/alerts.js'; // Verifique o caminho para seu 'alerts.js'

document.addEventListener('DOMContentLoaded', () => {
    const toggleAluno = document.getElementById('toggle-aluno-matricula');
    const toggleProfessor = document.getElementById('toggle-professor-matricula');
    const btnSalvar = document.getElementById('btn-salvar-config');
    const loading = document.getElementById('loading-config');

    let currentSettings = {};

    async function carregarStatus() {
        if (!toggleAluno || !toggleProfessor || !loading) return;
        
        loading.style.display = 'block';
        btnSalvar.disabled = true;

        try {
            const data = await getConfigMatriculas();
            if (data?.success && data.settings) {
                currentSettings = data.settings;
                toggleAluno.checked = currentSettings.alunoMatricula || false;
                toggleProfessor.checked = currentSettings.professorMatricula || false;
            } else {
                ativar('Erro ao carregar configurações.', 'erro', '');
            }
        } catch (e) {
            console.error('Erro ao carregar configurações:', e);
            ativar('Falha na comunicação com o servidor.', 'erro', '');
        } finally {
            loading.style.display = 'none';
            btnSalvar.disabled = false;
        }
    }

    btnSalvar?.addEventListener('click', async () => {
        const novasSettings = {
            alunoMatricula: toggleAluno.checked,
            professorMatricula: toggleProfessor.checked
        };

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        try {
            const data = await updateConfigMatriculas(novasSettings);
            if (data?.success) {
                ativar('Configurações salvas com sucesso!', 'sucesso', '');
                currentSettings = novasSettings;
            } else {
                ativar(data?.message || 'Erro ao salvar configurações.', 'erro', '');
            }
        } catch (e) {
            console.error('Erro ao salvar configurações:', e);
            ativar('Falha na comunicação com o servidor.', 'erro', '');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    });

    // Carrega o estado inicial
    carregarStatus();
});