document.addEventListener('DOMContentLoaded', () => {
    carregarDetalhes();
  });
  
  const atividadeId = localStorage.getItem('atividade_id');
  const alunoId = localStorage.getItem('usuarioId');
  
  async function carregarDetalhes() {
    try {
      const res = await fetch(`/api/atividade/${atividadeId}?aluno_id=${alunoId}`);
      const data = await res.json();
  
      if (data.success) {
        const a = data.atividade;
        document.getElementById('titulo').innerText = a.titulo;
        document.getElementById('descricao').innerText = a.descricao;
        document.getElementById('professor').innerText = a.professor_nome + ' (' + a.professor_email + ')';
        document.getElementById('prazo').innerText = new Date(a.prazo_entrega).toLocaleString('pt-BR');
        document.getElementById('criterios').innerText = a.criterios_avaliacao;
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      document.getElementById('erro').textContent = 'Erro ao carregar detalhes da atividade.'; //
      document.getElementById('erro').style.display = 'block';//
    }
  }
  
  async function enviarEntrega() {
    const fileInput = document.getElementById('arquivo');
    const sucesso = document.getElementById('sucesso');//
    const erro = document.getElementById('erro');//
    sucesso.style.display = 'none';//
    erro.style.display = 'none';//
  
    if (!fileInput.files[0]) {
      erro.textContent = 'Selecione um arquivo.';//
      erro.style.display = 'block';//
      return;
    }
  
    const formData = new FormData();
    formData.append('arquivo', fileInput.files[0]);
    formData.append('atividade_id', atividadeId);
    formData.append('aluno_id', alunoId);
  
    try {
      const res = await fetch('/api/entregas', {
        method: 'POST',
        body: formData
      });
  
      const result = await res.json();
  
      if (result.success) {
        sucesso.style.display = 'block';//
      } else {
        erro.textContent = result.message || 'Erro ao enviar.';//
        erro.style.display = 'block';//
      }
    } catch (e) {
      erro.textContent = 'Erro de conexão.';//
      erro.style.display = 'block';//
    }
  }
  