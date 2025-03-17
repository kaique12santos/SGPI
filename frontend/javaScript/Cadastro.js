const selectElement = document.getElementById('semestre');
const selectedValue = selectElement.value; 

console.log("Semestre selecionado:", selectedValue);


//adicionando um evento para quando o valor do select for alterado
selectElement.addEventListener('change', (event) => {
  const novoValorSelecionado = event.target.value;
  console.log("Novo semestre selecionado:", novoValorSelecionado);

 // adicionar a lógica que precisa ser executada
 // quando o usuário selecionar um novo semestre
});