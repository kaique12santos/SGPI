document.addEventListener('DOMContentLoaded', () => {
    const selectSemestre = document.getElementById('selectSemestre');
    const btnBuscar = document.getElementById('btnBuscarGrupos');
    const btnGeral = document.getElementById('btnRelatorioGeral');
    const tabela = document.getElementById('tabelaGrupos');
    const loading = document.getElementById('loading');
    const erro = document.getElementById('mensagem-erro');
    const semGrupos = document.getElementById('sem-grupos');
  
    // Função para buscar e exibir os grupos na tabela (igual antes)
    btnBuscar.addEventListener('click', async () => {
      const semestre = selectSemestre.value;
      if (!semestre) {
        alert('Por favor, selecione um semestre.');
        return;
      }
  
      tabela.style.display = 'none';
      semGrupos.style.display = 'none';
      erro.style.display = 'none';
      loading.style.display = 'block';
  
      try {
        const response = await fetch(`/coordenador/grupos/${encodeURIComponent(semestre)}`);
        const dados = await response.json();
        loading.style.display = 'none';
  
        if (!dados.success) {
          throw new Error(dados.message || 'Erro ao obter grupos.');
        }
  
        const grupos = dados.grupos; // array [{ GRUPO_ID, GRUPO_NOME, NOMES_MEMBROS }, ...]
        const tbody = tabela.querySelector('tbody');
        tbody.innerHTML = '';
  
        if (grupos.length === 0) {
          semGrupos.style.display = 'block';
          return;
        }
  
        grupos.forEach(grp => {
          const tr = document.createElement('tr');
  
          // Coluna Nome do Grupo
          const tdNome = document.createElement('td');
          tdNome.textContent = grp.GRUPO_NOME;
          tr.appendChild(tdNome);
  
          // Coluna Membros
          const tdMembros = document.createElement('td');
          tdMembros.textContent = grp.NOMES_MEMBROS;
          tr.appendChild(tdMembros);
  
          // Coluna Ações (botão de relatório individual, se já existia)
          const tdAcoes = document.createElement('td');
          const btn = document.createElement('button');
          btn.textContent = 'Gerar Relatório';
          btn.classList.add('btn-relatorio');
          btn.addEventListener('click', () => {
            // Relatório individual (já implementado anteriormente)
            const url = `/coordenador/grupos/${grp.GRUPO_ID}/relatorio?semestre=${encodeURIComponent(semestre)}`;
            window.location.href = url;
          });
          tdAcoes.appendChild(btn);
          tr.appendChild(tdAcoes);
  
          tbody.appendChild(tr);
        });
  
        tabela.style.display = 'table';
      } catch (e) {
        console.error('Erro ao carregar grupos:', e);
        loading.style.display = 'none';
        erro.style.display = 'block';
        erro.textContent = 'Erro ao carregar grupos. Tente novamente mais tarde.';
      }
    });
  
    // NOVO: clique no botão de Relatório Geral
    btnGeral.addEventListener('click', () => {
      const semestre = selectSemestre.value;
      if (!semestre) {
        alert('Selecione um semestre antes de gerar o relatório geral.');
        return;
      }
      // Redireciona para a rota que vai gerar O EXCEL COM TODOS OS GRUPOS AQUI
      window.location.href = `/coordenador/grupos/${encodeURIComponent(semestre)}/relatorioGeral`;
    });
  });
  