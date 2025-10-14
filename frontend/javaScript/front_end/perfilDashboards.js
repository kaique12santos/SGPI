import {
    // Admin
    getAdminTotalUsuarios,
    getAdminLogs,
  
    // Coordenador
    getCoordTotalProjetos,
    getCoordTaxaConclusao,
    getCoordProjetosStatus,
  
    // Professor
    getProfTotalAtividades,
    getProfEntregas,
    getProfMediaNotas,
    getProfReconsideracoes,
    getProfSemestresAnteriores,
  
    // Orientador
    getOriProjetosAtivos,
    getOriProjetosStatus,
    getOriTotalGrupos,
    getOriTotalAlunos,
    getOriTaxaConclusao,
    getOriHistoricoSemestres
  } from '../services/dashboardServices.js';
  
  const usuarioId = localStorage.getItem('usuarioId');
  const userRole = localStorage.getItem('userRole');
  

// frontend/utils/dashboardSkeleton.js
// ⚡ Cria dinamicamente os elementos de dashboard caso não existam no HTML


function criarEstruturaDashboards() {
  criarSkeletonAdmin();
  criarSkeletonCoordenador();
  criarSkeletonProfessor();
  criarSkeletonOrientador();
}

/* 🟥 ============================
   ADMINISTRADOR
   ============================ */
function criarSkeletonAdmin() {
  const container = document.querySelector("#section-dashboard-admin .dashboard-container");
  if (!container || container.children.length > 0) return;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total de Usuários</h3>
        <p class="stat-value" id="admin-total-usuarios">0</p>
      </div>

      <div class="stat-card">
        <h3>Ações Recentes</h3>
        <p class="stat-subtitle">Últimos registros da Auditoria</p>
        <ul class="log-list" id="admin-log-acoes">
          <li>Carregando...</li>
        </ul>
      </div>
    </div>
  `;
}

/* 🟦 ============================
   COORDENADOR
   ============================ */
function criarSkeletonCoordenador() {
  const container = document.querySelector("#section-dashboard-coordenador .dashboard-container");
  if (!container || container.children.length > 0) return;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total de Projetos no Semestre</h3>
        <p class="stat-value" id="coord-total-projetos">0</p>
      </div>

      <div class="stat-card">
        <h3>Taxa de Conclusão</h3>
        <p class="stat-value" id="coord-taxa-conclusao">0%</p>
      </div>
    </div>

    <div class="chart-container">
      <h3>Projetos por Status</h3>
      <div id="coord-projetos-status-chart" class="chart-placeholder">
        <p>Gráfico será exibido aqui</p>
      </div>
    </div>
  `;
}

/* 🟨 ============================
   PROFESSOR
   ============================ */
function criarSkeletonProfessor() {
  const container = document.querySelector("#section-dashboard-professor .dashboard-container");
  if (!container || container.children.length > 0) return;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Atividades Criadas (Semestre)</h3>
        <p class="stat-value" id="prof-total-atividades">0</p>
      </div>

      <div class="stat-card">
        <h3>Entregas Avaliadas vs Pendentes</h3>
        <p class="stat-value" id="prof-entregas-avaliadas">0 / 0</p>
      </div>

      <div class="stat-card">
        <h3>Média das Notas</h3>
        <p class="stat-value" id="prof-media-notas">0.0</p>
      </div>

      <div class="stat-card">
        <h3>Pedidos de Reconsideração</h3>
        <p class="stat-value" id="prof-reconsideracoes">0 / 0</p>
      </div>
    </div>

    <div class="list-container">
      <h3>Histórico de semestres lecionados</h3>
      <ul class="simple-list" id="prof-historico-semestres">
        <li>Nenhum semestre registrado</li>
      </ul>
    </div>
  `;
}

/* 🟧 ============================
   ORIENTADOR
   ============================ */
function criarSkeletonOrientador() {
  const container = document.querySelector("#section-dashboard-orientador .dashboard-container");
  if (!container || container.children.length > 0) return;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Projetos Ativos</h3>
        <p class="stat-value" id="ori-projetos-ativos">0</p>
      </div>

      <div class="stat-card">
        <h3>Total de Grupos</h3>
        <p class="stat-value" id="ori-total-grupos">0</p>
      </div>

      <div class="stat-card">
        <h3>Total de Alunos Orientados</h3>
        <p class="stat-value" id="ori-total-alunos">0</p>
      </div>

      <div class="stat-card">
        <h3>Taxa de Conclusão</h3>
        <p class="stat-value" id="ori-taxa-conclusao">0%</p>
      </div>
    </div>

    <div class="chart-container">
      <h3>Projetos por Status</h3>
      <div id="ori-projetos-status-chart" class="chart-placeholder">
        <p>Gráfico será exibido aqui</p>
      </div>
    </div>

    <div class="list-container">
      <h3>Histórico de Projetos Orientados</h3>
      <ul class="simple-list" id="ori-historico-projetos">
        <li>Nenhum projeto registrado</li>
      </ul>
    </div>
  `;
}


  document.addEventListener('DOMContentLoaded', () => {
    criarEstruturaDashboards();
    if (!usuarioId) return console.warn('[Dashboard] Nenhum usuário logado.');
  
    switch (userRole) {
      case 'administrador':
        carregarDashboardAdmin();
        break;
      case 'coordenador':
        carregarDashboardCoordenador();
        break;
      case 'professor':
        carregarDashboardProfessor(usuarioId);
        break;
      case 'professor_orientador':
        carregarDashboardOrientador(usuarioId);
        break;
      default:
        break;
    }
  });
  
  /* ============================
   🌀 LOADING SPINNER
  ============================ */
function mostrarLoading(sectionId) {
  const container = document.querySelector(`#${sectionId} .dashboard-container`);
  if (container) {
    // Cria um overlay de loading sem apagar os elementos
    const loadingEl = document.createElement('div');
    loadingEl.className = 'dashboard-loading-overlay';
    loadingEl.innerHTML = `
      <div class="dashboard-loading">
        <div class="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    `;
    container.appendChild(loadingEl);
  }
}

function removerLoading(sectionId) {
  const container = document.querySelector(`#${sectionId} .dashboard-container`);
  if (container) {
    const loadingEl = container.querySelector('.dashboard-loading-overlay');
    if (loadingEl) loadingEl.remove();
  }
}
  
  /* ============================
   🟥 ADMINISTRADOR
  ============================ */
  async function carregarDashboardAdmin() {
    const sectionId = 'section-dashboard-admin';
    mostrarLoading(sectionId);
  
    try {
      const [totalResp, logsResp] = await Promise.all([
        getAdminTotalUsuarios(),
        getAdminLogs()
      ]);
  
      const totalData = await totalResp.json();
      const logsData = await logsResp.json();
  
      removerLoading(sectionId);
  
      document.getElementById('admin-total-usuarios').textContent = totalData.total ?? 0;
  
      const logList = document.getElementById('admin-log-acoes');
      logList.innerHTML = logsData.logs?.length
        ? logsData.logs.map(l => `<li><b>#${l.id}</b> - ${l.acao} em ${new Date(l.data).toLocaleString()}</li>`).join('')
        : '<li>Nenhum log encontrado.</li>';
  
    } catch (err) {
      console.error('[Admin Dashboard]', err);
    }
  }
  
  /* ============================
   🟦 COORDENADOR
  ============================ */
  async function carregarDashboardCoordenador() {
    const sectionId = 'section-dashboard-coordenador';
    mostrarLoading(sectionId);
  
    try {
      const [totalResp, taxaResp, statusResp] = await Promise.all([
        getCoordTotalProjetos(),
        getCoordTaxaConclusao(),
        getCoordProjetosStatus()
      ]);
  
      const total = await totalResp.json();
      const taxa = await taxaResp.json();
      const status = await statusResp.json();
  
      removerLoading(sectionId);
  
      document.getElementById('coord-total-projetos').textContent = total.total ?? 0;
      document.getElementById('coord-taxa-conclusao').textContent = (taxa.taxa ?? 0) + '%';
  
      renderGraficoStatus('coord-projetos-status-chart', status.data);
    } catch (err) {
      console.error('[Coordenador Dashboard]', err);
    }
  }
  
  /* ============================
   🟨 PROFESSOR
  ============================ */
  async function carregarDashboardProfessor(id) {
    const sectionId = 'section-dashboard-professor';
    mostrarLoading(sectionId);
  
    try {
      const [atividadesR, entregasR, mediaR, reconsideracoesR, historicoR] = await Promise.all([
        getProfTotalAtividades(id),
        getProfEntregas(id),
        getProfMediaNotas(id),
        getProfReconsideracoes(id),
        getProfSemestresAnteriores(id)
      ]);
  
      const atividades = await atividadesR.json();
      const entregas = await entregasR.json();
      const media = await mediaR.json();
      const reconsideracoes = await reconsideracoesR.json();
      const historico = await historicoR.json();
  
      removerLoading(sectionId);
  
      document.getElementById('prof-total-atividades').textContent = atividades.total ?? 0;
      document.getElementById('prof-entregas-avaliadas').textContent = `${entregas.avaliadas ?? 0} / ${ (entregas.avaliadas ?? 0) + (entregas.pendentes ?? 0) }`;
      document.getElementById('prof-media-notas').textContent = (media.media ?? 0).toFixed(1);
      document.getElementById('prof-reconsideracoes').textContent = `${reconsideracoes.respondidos ?? 0} / ${reconsideracoes.total ?? 0}`;
  
      const list = document.getElementById('prof-historico-semestres');
      list.innerHTML = historico.data?.length
        ? historico.data.map(s => `<li>${s.descricao} (${s.ano}/${s.periodo})</li>`).join('')
        : '<li>Nenhum semestre registrado</li>';
  
    } catch (err) {
      console.error('[Professor Dashboard]', err);
    }
  }
  
  /* ============================
   🟧 ORIENTADOR
  ============================ */
  async function carregarDashboardOrientador(id) {
    const sectionId = 'section-dashboard-orientador';
    mostrarLoading(sectionId);
  
    try {
      const [ativosR, statusR, gruposR, alunosR, taxaR, historicoR] = await Promise.all([
        getOriProjetosAtivos(id),
        getOriProjetosStatus(id),
        getOriTotalGrupos(id),
        getOriTotalAlunos(id),
        getOriTaxaConclusao(id),
        getOriHistoricoSemestres(id)
      ]);
  
      const ativos = await ativosR.json();
      const status = await statusR.json();
      const grupos = await gruposR.json();
      const alunos = await alunosR.json();
      const taxa = await taxaR.json();
      const historico = await historicoR.json();
  
      removerLoading(sectionId);
  
      document.getElementById('ori-projetos-ativos').textContent = ativos.total ?? 0;
      document.getElementById('ori-total-grupos').textContent = grupos.total ?? 0;
      document.getElementById('ori-total-alunos').textContent = alunos.total ?? 0;
      document.getElementById('ori-taxa-conclusao').textContent = (taxa.taxa ?? 0) + '%';
  
      renderGraficoStatus('ori-projetos-status-chart', status.data);
  
      const list = document.getElementById('ori-historico-projetos');
      list.innerHTML = historico.data?.length
        ? historico.data.map(s => `<li>${s.descricao} (${s.ano}/${s.periodo})</li>`).join('')
        : '<li>Nenhum projeto registrado</li>';
  
    } catch (err) {
      console.error('[Orientador Dashboard]', err);
    }
  }
  
  /* ============================
   📊 FUNÇÃO AUXILIAR - GRÁFICO
  ============================ */
  function renderGraficoStatus(canvasId, data) {
    const container = document.getElementById(canvasId);
    if (!container || !data?.length) {
      container.innerHTML = '<p>Sem dados para exibir</p>';
      return;
    }
  
    container.innerHTML = `<canvas></canvas>`;
    const ctx = container.querySelector('canvas').getContext('2d');
  
    const labels = data.map(d => d.status);
    const valores = data.map(d => d.qtd);
  
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: ['#457b9d', '#a8dadc', '#f4a261', '#e76f51', '#2a9d8f']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: false }
        }
      }
    });
  }
  