import { ativar } from "./alerts.js";

document.addEventListener('DOMContentLoaded', () => {
  const selectSemestre = document.getElementById('selectSemestre');
  const btnBuscar = document.getElementById('btnBuscar');
  const tabela = document.getElementById('tabelaProjetos');
  const loading = document.getElementById('loading');
  const erro = document.getElementById('mensagem-erro');
  const semProjetos = document.getElementById('sem-projetos');

  btnBuscar.addEventListener('click', async () => {
    const semestre = selectSemestre.value;
    if (!semestre) {
      ativar('Por favor, selecione um semestre.','info','');
      return;
    }

    // Reseta exibição antes de começar
    tabela.style.display = 'none';
    semProjetos.style.display = 'none';
    erro.style.display = 'none';
    loading.style.display = 'block';

    try {
      // Faz a chamada à API (rota que criamos em /coordenador/projetos/:semestre)
      const resposta = await fetch(`/coordenador/projetos/${encodeURIComponent(semestre)}`);
      const dados = await resposta.json();

      loading.style.display = 'none'; // Esconde o “Carregando” logo que retorna algo

      if (!dados.success) {
        throw new Error(dados.message || 'Erro ao obter projetos.');
      }

      const projetos = dados.projetos; // array de objetos vindos do back-end
      const tbody = tabela.querySelector('tbody');
      tbody.innerHTML = ''; // limpa conteúdo antigo, se houver

      if (projetos.length === 0) {
        // Nenhum projeto para este semestre
        semProjetos.style.display = 'block';
        return;
      }

      // Para cada projeto, criamos uma <tr> com as 4 colunas
      projetos.forEach(proj => {
        const tr = document.createElement('tr');

        // 1) Título do Projeto (link para detalhes)
        const tdTitulo = document.createElement('td');
        const aDetalhes = document.createElement('a');
        aDetalhes.href = `detalhesProjeto?projetoId=${proj.PROJETO_ID}`;
        aDetalhes.textContent = proj.TITULO_PROJETO;
        tdTitulo.appendChild(aDetalhes);
        tr.appendChild(tdTitulo);

        // 2) Nomes dos Membros
        const tdMembros = document.createElement('td');
        tdMembros.classList.add('td')
        tdMembros.textContent = proj.NOMES_MEMBROS;
        tr.appendChild(tdMembros);

        // 3) Status
        const tdStatus = document.createElement('td');
        tdStatus.textContent = proj.STATUS_PROJETO;
        // Aplica classe de cor conforme status (mesmo padrão do CSS fornecido)
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
          default:
            break;
        }
        tr.appendChild(tdStatus);

        // 4) Data de Encerramento (apenas se estiver 'Concluído')
        const tdData = document.createElement('td');
        if (proj.STATUS_PROJETO === 'Concluído' && proj.DATA_ENCERRAMENTO) {
          const dt = new Date(proj.DATA_ENCERRAMENTO);
          tdData.textContent = dt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
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
  });
});
