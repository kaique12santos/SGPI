

<div align="center">
  <img src="frontend\imagens\teste.png" alt="Sistema de Gestão de PIS" width="400" height="250"/>
  
  # 🎓 Sistema de Gestão de PIS
  
  ### Facilitando a organização e gestão dos Projetos Integradores para alunos, professores e coordenadores
  
  ![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
  ![Version](https://img.shields.io/badge/version-1.0.0-blue)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Contributors](https://img.shields.io/badge/contributors-5-orange)
</div>

---

## 📖 Sobre o Projeto

O **Sistema de Gestão de PIS** é uma plataforma web moderna e intuitiva, desenvolvida para centralizar e otimizar o gerenciamento dos Projetos Integradores do curso de **Desenvolvimento de Software Multiplataforma (DSM)**. 

Nossa solução permite que:
- 👨‍🎓 **Alunos** organizem suas entregas e acompanhem o progresso
- 👨‍🏫 **Professores** avaliem projetos de forma eficiente
- 👩‍💼 **Coordenadores** monitorem o desempenho geral dos grupos

---

## ✨ Funcionalidades Principais

<table>
<tr>
<td width="50%">

### 🔐 Autenticação & Usuários
- ✅ Cadastro multi-perfil (alunos, professores, coordenadores)
- ✅ Sistema de login seguro
- ✅ Recuperação de senha
- ✅ Perfis personalizados por tipo de usuário

</td>
<td width="50%">

### 📊 Gestão de Projetos
- ✅ Criação e organização de grupos
- ✅ Gerenciamento por semestre letivo
- ✅ Upload de arquivos e artefatos
- ✅ Sistema de busca e filtros avançados

</td>
</tr>
<tr>
<td width="50%">

### 📝 Avaliações & Feedback
- ✅ Sistema de avaliação integrado
- ✅ Feedback detalhado dos professores
- ✅ Pedidos de reconsideração
- ✅ Histórico de avaliações

</td>
<td width="50%">

### 📈 Relatórios & Notificações
- ✅ Relatórios acadêmicos automatizados
- ✅ Exportação (PDF, Excel, CSV)
- ✅ Notificações por e-mail
- ✅ Manual do curso integrado

</td>
</tr>
</table>

---

## 🛠️ Stack Tecnológica

<div align="center">

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NPM](https://img.shields.io/badge/NPM-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![bcrypt (npm)](https://img.shields.io/badge/bcrypt-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![UUID (npm)](https://img.shields.io/badge/UUID-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Multer (npm)](https://img.shields.io/badge/Multer-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Sharp (npm)](https://img.shields.io/badge/Sharp-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)
![Nodemailer (npm)](https://img.shields.io/badge/Nodemailer-CB3837?style=for-the-badge&logo=npm&logoColor=white)

### Banco de Dados
![Oracle](https://img.shields.io/badge/Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white)

### Ferramentas
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 🏗️ Arquitetura do Projeto

O projeto segue uma arquitetura inspirada no padrão **MVC (Model-View-Controller)** para organizar o código e separar as responsabilidades:

*   ### 📁 Backend (Server-side)
    *   **Model (Modelo):**
        *   Localizado principalmente em arquivos como `connectOracle.js` e dentro da lógica de acesso a dados nas rotas.
        *   Responsável pela interação com o banco de dados Oracle (consultas, inserções, atualizações) e pela lógica de negócio associada aos dados.
    *   **Controller (Controlador):**
        *   Implementado nos arquivos dentro da pasta `backend/routes/`.
        *   Gerencia as requisições HTTP recebidas, processa os dados de entrada, interage com o Model para buscar ou manipular dados, e envia as respostas para o cliente (muitas vezes em formato JSON para APIs ou servindo arquivos HTML).
        *   O `server.js` atua como o ponto de entrada principal, configurando o Express e montando esses controladores.
    *   **Outros:**
        *   A pasta `uploads/` é utilizada para armazenar arquivos enviados pelos usuários, gerenciados por bibliotecas como Multer.

*   ### 🎨 Frontend (Client-side)
    *   **View (Visão):**
        *   Composto pelos arquivos HTML localizados em `frontend/views/`.
        *   Arquivos CSS em `frontend/css/` para estilização.
        *   Scripts JavaScript em `frontend/javaScript/` para interatividade no navegador e comunicação com o backend (APIs).
        *   Imagens e outros assets visuais em `frontend/imagens/`.
        *   Responsável por apresentar a interface ao usuário e capturar suas interações.

Essa estrutura visa promover um código mais modular, fácil de manter e testar, com uma clara distinção entre a lógica de apresentação, a lógica de controle de fluxo da aplicação e a lógica de manipulação de dados.

---
## 🚀 Status do Projeto

<div align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow?style=for-the-badge" alt="Status"/>
</div>

### 📋 Roadmap de Desenvolvimento

- [x] **Fase 1:** Sistema de autenticação e cadastro
- [x] **Fase 2:** Gestão de usuários e perfis
- [x] **Fase 3:** Criação e gerenciamento de grupos
- [x] **Fase 4:** Sistema de upload e artefatos
- [x] **Fase 5:** Módulo de avaliações
- [x] **Fase 6:** Sistema de notificações
- [x] **Fase 7:** Relatórios e exportação
- [x] **Fase 8:** Busca e filtros avançados
- [ ] **Fase 9:** Testes finais e deploy
- [X] **Fase 10:** Documentação final

---

## 👥 Equipe de Desenvolvimento

<table align="center">
<tr>
<td align="center">
<img src="https://github.com/unrealplastic.png" width="80px" style="border-radius: 50%"/>
<br><strong>Nicole Lisboa</strong>
<br><em>Frontend Developer</em>
<br>
<a href="https://github.com/unrealplastic">
<img src="https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white"/>
</a>
</td>
<td align="center">
<img src="https://github.com/yMistikTK.png" width="80px" style="border-radius: 50%"/>
<br><strong>Luiz Carlos</strong>
<br><em>Scrum Master</em>
<br>
<a href="https://github.com/yMistikTK">
<img src="https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white"/>
</a>
<a href="https://www.linkedin.com/in/luiz-carlos-gimenes-fernandes-de-sousa-045b75198/">
<img src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"/>
</a>
</td>
<td align="center">
<img src="https://github.com/kaique12santos.png" width="80px" style="border-radius: 50%"/>
<br><strong>Kaique Santos</strong>
<br><em>Backend Developer</em>
<br>
<a href="https://github.com/kaique12santos">
<img src="https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white"/>
</a>
<a href="https://linkedin.com/in/kaique-caitano-b68b902ba">
<img src="https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white"/>
</a>
</td>
</tr>
<tr>
<td align="center">
<img src="https://github.com/diegomarques23.png" width="80px" style="border-radius: 50%"/>
<br><strong>Diego Marques</strong>
<br><em>Documentation</em>
<br>
<a href="https://github.com/diegomarques23">
<img src="https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white"/>
</a>
</td>
<td align="center">
<img src="https://github.com/Vini-Crepaldi.png" width="80px" style="border-radius: 50%"/>
<br><strong>Vinicius Crepaldi</strong>
<br><em>Database Admin</em>
<br>
<a href="https://github.com/Vini-Crepaldi">
<img src="https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white"/>
</a>
</td>
<td align="center">
<!-- Espaço para manter alinhamento -->
</td>
</tr>
</table>

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 14 ou superior)
- Oracle Database
- Git

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sistema-gestao-pis.git

# Acesse o diretório do projeto
cd sistema-gestao-pis

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Execute as migrations do banco de dados
npm run migrate

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```env
DATABASE_URL=sua_string_de_conexao_oracle
EMAIL_SERVICE=seu_servico_de_email
JWT_SECRET=sua_chave_secreta
```

---

## 📚 Documentação

- 📖 [Manual do Usuário](docs/manual-usuario.md)
- 🔧 [Guia de Instalação](docs/instalacao.md)
- 🎨 [Guia de Estilo](docs/guia-estilo.md)
- 🔌 [API Documentation](docs/api.md)

---

## 🤝 Como Contribuir

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---


<div align="center">
  <img src="frontend/imagens/logo-equipe.png" alt="Logo da Equipe DSM" width="200"/> <!-- Ajuste o 'width' conforme necessário -->
  <p>Desenvolvido com ❤️ pela equipe <strong>CODECEPS</strong></p>
  <p>
    <a href="#top">⬆️ Voltar ao topo</a>
  </p>
</div>