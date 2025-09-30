
// Serviço de cadastro
export async function cadastrarUsuario(dados) {
  // Remove dados extras que o backend não espera
  const payload = {
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    tipo: dados.perfil,
    chaveProfessor: dados.chaveProfessor || null,
    materias: dados.perfil === "aluno" 
      // envia como array de códigos ou ids (dependendo da sua escolha no backend)
      ? dados.materias.map(m => m)  
      : []
  };

  // Envia a requisição POST para o backend
  return fetchJsonComAuth("/cadastro", payload, "POST");
}