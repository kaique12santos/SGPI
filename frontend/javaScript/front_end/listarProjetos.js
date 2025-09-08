
import { ativar } from "../utils/alerts.js";
import { listarProjetosPorSemestre } from "../services/listarProjetosService.js";

document.addEventListener('DOMContentLoaded', () => {
  const selectSemestre = document.getElementById('selectSemestre');
  const btnBuscar = document.getElementById('btnBuscar');
  const tabela = document.getElementById('tabelaProjetos');
  const loading = document.getElementById('loading');
  const erro = document.getElementById('mensagem-erro');
  const semProjetos = document.getElementById('sem-projetos');

  async function renderizarProjetos(semestre) {
    tabela.style.display = 'none';
    semProjetos.style.display = 'none';
    erro.style.display = 'none';
    loading.style.display = 'block';

    try {
      const dados = await listarProjetosPorSemestre(semestre);
      loading.style.display = 'none';

      if (!dados || !dados.success) {
        throw new Error(dados?.message || 'Erro ao buscar projetos.');
      }

      const projetos = Array.isArray(dados.projetos) ? dados.projetos : [];
      const tbody = tabela.querySelector('tbody');
      tbody.innerHTML = '';

      if (projetos.length === 0) {
        semProjetos.style.display = 'block';
        return;
      }

      projetos.forEach(proj => {
        const tr = document.createElement('tr');

        // Coluna título (link detalhes)
        const tdTitulo = document.createElement('td');
        const aDetalhes = document.createElement('a');
        aDetalhes.href = `detalhesProjeto?projetoId=${proj.PROJETO_ID}`;
        aDetalhes.textContent = proj.TITULO_PROJETO;
        tdTitulo.appendChild(aDetalhes);
        tr.appendChild(tdTitulo);

        // Coluna membros
        const tdMembros = document.createElement('td');
        tdMembros.classList.add('td');
        tdMembros.textContent = proj.NOMES_MEMBROS || '';
        tr.appendChild(tdMembros);

        // Coluna status
        const tdStatus = document.createElement('td');
        tdStatus.textContent = proj.STATUS_PROJETO;
        switch (proj.STATUS_PROJETO) {
          case 'Em Andamento':
            tdStatus.classList.add('status-em-andamento');
            break;
          case 'Em Proposta':
            tdStatus.classList.add('status-em-proposta');
            break;
          case 'Aguardando Avaliação':
            tdStatus.classList.add('status-aguardando');
            break;
          case 'Concluído':
            tdStatus.classList.add('status-concluido');
            break;
        }
        tr.appendChild(tdStatus);

        // Coluna data encerramento
        const tdData = document.createElement('td');
        if (proj.STATUS_PROJETO === 'Concluído' && proj.DATA_ENCERRAMENTO) {
          tdData.textContent = new Date(proj.DATA_ENCERRAMENTO).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        } else {
          tdData.textContent = '-';
        }
        tr.appendChild(tdData);

        tbody.appendChild(tr);
      });

      tabela.style.display = 'table';
    } catch (e) {
      console.error('Erro ao carregar projetos:', e);
      loading.style.display = 'none';
      erro.style.display = 'block';
      erro.textContent = 'Erro ao carregar projetos. Tente novamente mais tarde.';
    }
  }

  btnBuscar.addEventListener('click', async () => {
    const semestre = selectSemestre.value;
    if (!semestre) {
      ativar('Por favor, selecione um semestre.', 'info', '');
      return;
    }
    await renderizarProjetos(semestre);
  });
});