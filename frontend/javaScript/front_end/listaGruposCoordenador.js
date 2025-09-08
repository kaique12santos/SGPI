import { ativar } from "../utils/alerts.js";
import { listarGruposPorSemestre } from "../services/listaGruposCoordenadorService.js";


document.addEventListener('DOMContentLoaded', () => {
  const selectSemestre = document.getElementById('selectSemestre');
  const btnBuscar = document.getElementById('btnBuscarGrupos');
  const btnGeral = document.getElementById('btnRelatorioGeral');
  const tabela = document.getElementById('tabelaGrupos');
  const loading = document.getElementById('loading');
  const erro = document.getElementById('mensagem-erro');
  const semGrupos = document.getElementById('sem-grupos');

  function esconderMensagens() {
    tabela.style.display = 'none';
    semGrupos.style.display = 'none';
    erro.style.display = 'none';
  }

  function mostrarErro(msg) {
    erro.textContent = msg || 'Erro ao carregar grupos. Tente novamente mais tarde.';
    erro.style.display = 'block';
  }

  async function renderizarGrupos(semestre) {
    esconderMensagens();
    loading.style.display = 'block';

    try {
      const dados = await listarGruposPorSemestre(semestre);
      loading.style.display = 'none';

      if (!dados || !dados.success) {
        throw new Error(dados?.message || 'Resposta inválida do servidor');
      }

      const grupos = Array.isArray(dados.grupos) ? dados.grupos : [];
      const tbody = tabela.querySelector('tbody');
      tbody.innerHTML = '';

      if (grupos.length === 0) {
        semGrupos.style.display = 'block';
        return;
      }

      grupos.forEach(grp => {
        const tr = document.createElement('tr');

        const tdNome = document.createElement('td');
        tdNome.textContent = grp.GRUPO_NOME || grp.nome || '';
        tr.appendChild(tdNome);

        const tdMembros = document.createElement('td');
        tdMembros.textContent = grp.NOMES_MEMBROS || grp.nomes_membros || '';
        tr.appendChild(tdMembros);

        const tdAcoes = document.createElement('td');
        const btn = document.createElement('button');
        btn.textContent = 'Gerar Relatório';
        btn.classList.add('btn-relatorio');
        btn.addEventListener('click', () => {
          const grupoId = grp.GRUPO_ID ?? grp.grupo_id ?? grp.id;
          if (!grupoId) {
            ativar('ID do grupo não disponível.','warn','');
            return;
          }
          const url = `/coordenador/grupos/${grupoId}/relatorio?semestre=${encodeURIComponent(semestre)}`;
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
      mostrarErro(e.message);
    }
  }

  btnBuscar.addEventListener('click', async () => {
    const semestre = selectSemestre.value;
    if (!semestre) {
      ativar('Por favor, selecione um semestre.','info','');
      return;
    }

    await renderizarGrupos(semestre);
  });

  btnGeral.addEventListener('click', () => {
    const semestre = selectSemestre.value;
    if (!semestre) {
      ativar('Selecione um semestre antes de gerar o relatório geral.','info','');
      return;
    }

    window.location.href = `/coordenador/grupos/${encodeURIComponent(semestre)}/relatorioGeral`;
  });
});
  