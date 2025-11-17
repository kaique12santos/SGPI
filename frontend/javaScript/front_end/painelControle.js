import { getConfigMatriculas, updateConfigMatriculas } from '../services/configService.js';
import { ativar } from '../utils/alerts.js';
import { confirmarAcao } from "../utils/confirmDialog.js";

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

    document.querySelectorAll('.config-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Evita dupla ativação se clicar no próprio switch
            if (e.target.closest('.switch')) return;
    
            const toggle = item.querySelector('input[type="checkbox"]');
            if (toggle) {
                toggle.checked = !toggle.checked;
    
                // dispara o evento de mudança para manter sua lógica
                toggle.dispatchEvent(new Event('change'));
            }
        });
    });
    
    btnSalvar?.addEventListener('click', async () => {
        const novasSettings = {
            alunoMatricula: toggleAluno.checked,
            professorMatricula: toggleProfessor.checked
        };
    
        // Detectar mudanças
        const alunoMudou = novasSettings.alunoMatricula !== currentSettings.alunoMatricula;
        const professorMudou = novasSettings.professorMatricula !== currentSettings.professorMatricula;
    
        // Nenhuma alteração
        if (!alunoMudou && !professorMudou) {
            ativar("Nenhuma alteração detectada nas matrículas.", "info", "");
            return;
        }
    
        // Preparar mensagem personalizada
        let msg = "";
    
        if (alunoMudou) {
            msg += `Você está prestes a ${novasSettings.alunoMatricula ? "habilitar" : "desabilitar"} a matrícula de alunos.\n`;
        }
    
        if (professorMudou) {
            msg += `Você está prestes a ${novasSettings.professorMatricula ? "habilitar" : "desabilitar"} o vínculo de professores.\n`;
        }
    
        msg += "\nDeseja confirmar as alterações?";
    
        // Exibir confirmação
        const confirmar = await confirmarAcao(
            "Confirmar alterações?",
            msg,
            "Confirmar",
            "Cancelar"
        );
    
        if (!confirmar) return;
    
        // Segue com o salvamento
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
    
        try {
            const data = await updateConfigMatriculas(novasSettings);
        
            if (data?.success) {
        
                // ----- Gerar mensagem personalizada de sucesso -----
                let msgSucesso = "";
        
                if (alunoMudou) {
                    msgSucesso += `Matrícula de alunos foi ${novasSettings.alunoMatricula ? "habilitada" : "desabilitada"} com sucesso.\n`;
                }
        
                if (professorMudou) {
                    msgSucesso += `Vínculo de professores foi ${novasSettings.professorMatricula ? "habilitado" : "desabilitado"} com sucesso.\n`;
                }
        
                // Mensagem final
                ativar(msgSucesso.trim(), "sucesso", "");
        
                // Atualiza os valores armazenados
                currentSettings = { ...novasSettings };
        
            } else {
                ativar(data?.message || "Erro ao salvar configurações.", "erro", "");
            }
        
        } catch (e) {
            console.error("Erro ao salvar configurações:", e);
            ativar("Falha na comunicação com o servidor.", "erro", "");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = "Salvar Alterações";
        }
    });

    // Carrega o estado inicial
    carregarStatus();
});