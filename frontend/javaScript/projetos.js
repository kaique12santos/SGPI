document.addEventListener('DOMContentLoaded', () => {
    carregarGruposPorSemestre()
    document.getElementById('formProjeto').addEventListener('submit', criarProjeto);
  });

  document.getElementById('semestre').addEventListener('change', function () {
    const semestreSelecionado = this.value;
    if (semestreSelecionado) {
      carregarGruposPorSemestre(semestreSelecionado);
      
    } else {
      document.getElementById('grupo').innerHTML = '<option value="">Selecione um grupo</option>';
    }
  });
  
  async function carregarGruposPorSemestre(semestre) {
    const grupoSelect = document.getElementById('grupo');
    grupoSelect.innerHTML = '<option value="">Carregando grupos...</option>';
  
    try {
      const res = await fetch(`/api/grupos?semestre=${semestre}`);
      const data = await res.json();
  
      grupoSelect.innerHTML = '';
  
      if (data.success && data.grupos.length > 0) {
        // 1. Obter grupo_ids já usados nos projetos exibidos
        const gruposUsados = projetosGlobais.map(p => p.grupo_id);
  
        // 2. Filtrar os grupos ainda não usados
        const gruposDisponiveis = data.grupos.filter(g => !gruposUsados.includes(g.ID));
  
        if (gruposDisponiveis.length === 0) {
          grupoSelect.innerHTML = '<option value="">Nenhum grupo disponível</option>';
          return;
        }
  
        grupoSelect.innerHTML = '<option value="">Selecione um grupo</option>';
        gruposDisponiveis.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.ID;
          opt.textContent = g.NOME;
          grupoSelect.appendChild(opt);
        });
  
      } else {
        grupoSelect.innerHTML = '<option value="">Nenhum grupo encontrado</option>';
      }
    } catch (e) {
      console.error('Erro ao carregar grupos:', e);
      grupoSelect.innerHTML = '<option value="">Erro ao buscar grupos</option>';
    }
  }
  
  
  
  async function criarProjeto(event) {
    event.preventDefault();
  
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const semestre = document.getElementById('semestre').value.trim();
    const grupo_id = document.getElementById('grupo').value;
    const orientador_id = localStorage.getItem('usuarioId'); // já salvo no login
  
    const mensagem = document.getElementById('mensagem');
    mensagem.style.display = 'none';
  
    if (!titulo || !grupo_id || !semestre) {
      mensagem.textContent = 'Preencha todos os campos obrigatórios.';
      mensagem.className = 'alerta erro';
      mensagem.style.display = 'block';
      return;
    }
  
    try {
      const res = await fetch('/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descricao,
          grupo_id,
          orientador_id,
          semestre
        })
      });
  
      const result = await res.json();
  
      mensagem.textContent = result.message;
      mensagem.className = 'alerta ' + (result.success ? 'sucesso' : 'erro');
      mensagem.style.display = 'block';
  
      if (result.success) {
        document.getElementById('formProjeto').reset();
      }
    } catch (err) {
      mensagem.textContent = 'Erro na requisição.';
      mensagem.className = 'alerta erro';
      mensagem.style.display = 'block';
    }
  }
  