// =============================================
// script.js — Lógica do Front-end
// Comunicação com a API REST de Clientes
// =============================================

// ─── VARIÁVEL GLOBAL ─────────────────────────
// Guarda o ID do cliente sendo editado.
// null = modo cadastro (novo cliente)
// número = modo edição (cliente existente)
// Esta variável é consultada no submit do formulário
// para decidir se chama criarCliente() ou atualizarCliente()
let clienteEmEdicao = null;

// ═════════════════════════════════════════════
// SEÇÃO 1: FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────
// Estas funções são ferramentas de apoio usadas
// pelas demais seções. Não chamam a API diretamente.
// Incluem: exibir modal de feedback, limpar formulário
// e formatar dados para exibição (CPF, telefone, data).
// ═════════════════════════════════════════════

/**
 * Exibe um modal (janela flutuante) com uma mensagem de feedback ao usuário.
 * É chamada após cada operação (criar, editar, deletar) para informar
 * se a ação foi bem-sucedida ou se ocorreu um erro.
 * @param {string} mensagem - Texto a ser exibido no modal
 * @param {string} tipo - 'sucesso' | 'erro' | 'info'
 */
function mostrarMensagem(mensagem, tipo = "info") {
  const modal = document.getElementById("modalMessage");
  const modalText = document.getElementById("modalText");
  // Define o texto e torna o modal visível (estava display:none no CSS)
  modalText.textContent = mensagem;
  modal.style.display = "flex";
}

/**
 * Fecha o modal de mensagens.
 * Chamada pelo botão "Fechar" dentro do modal no index.html:
 * <button onclick="fecharModal()">Fechar</button>
 */
function fecharModal() {
  document.getElementById("modalMessage").style.display = "none";
}

/**
 * Limpa todos os campos do formulário e reseta o estado de edição.
 * Após limpar, o sistema volta ao modo de cadastro (novo cliente).
 */
function limparFormulario() {
  // .reset() é um método nativo do HTML que limpa todos os inputs do form
  document.getElementById("clientForm").reset();
  // Reseta a variável global para indicar que não há edição em andamento
  clienteEmEdicao = null;
  // Restaura o título original da seção do formulário
  document.querySelector(".form-section h2").textContent =
    "Adicionar ou Editar Cliente";
}

/**
 * Formata CPF para exibição: "12345678901" → "123.456.789-01"
 * A regex usa 4 grupos de captura para dividir os dígitos:
 *   (\d{3}) → 3 dígitos  →  "123"
 *   (\d{3}) → 3 dígitos  →  "456"
 *   (\d{3}) → 3 dígitos  →  "789"
 *   (\d{2}) → 2 dígitos  →  "01"
 * O padrão '$1.$2.$3-$4' reconstrói como: 123.456.789-01
 */
function formatarCPF(cpf) {
  if (!cpf) return "";
  // Remove tudo que não for dígito antes de formatar (ex: se já tiver máscara)
  const apenasDigitos = cpf.replace(/\D/g, "");
  return apenasDigitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
/**
 * Formata telefone para exibição: "11999998888" → "(11) 99999-8888"
 * \d{4,5} captura 4 ou 5 dígitos, cobrindo telefone fixo e celular.
 */
function formatarTelefone(telefone) {
  if (!telefone) return "";
  const apenasDigitos = telefone.replace(/\D/g, "");
  return apenasDigitos.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
}

/**
 * Formata data do banco (YYYY-MM-DD) para exibição (DD/MM/YYYY).
 * O PostgreSQL retorna datas no formato ISO: "1990-05-25T00:00:00.000Z"
 * Usamos substring(0,10) para pegar apenas a parte da data: "1990-05-25"
 * Em seguida, split('-') divide em array: ["1990", "05", "25"]
 * Por fim, remontamos na ordem brasileira: "25/05/1990"
 */
function formatarData(data) {
  if (!data) return "";
  const [ano, mes, dia] = data.substring(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Escapa aspas simples em strings para uso seguro dentro de onclick="...".
 * IMPORTANTE: quando um nome ou endereço contém apóstrofo (ex: "D'avila"),
 * o HTML do botão Editar quebraria sem este tratamento, pois a aspa simples
 * fecharia prematuramente o atributo onclick.
 * Esta função substitui ' por \' para que o HTML seja válido.
 * @param {string} valor - String a ser escapada
 * @returns {string} String com aspas simples escapadas
 */
function escaparAspa(valor) {
  if (!valor) return "";
  return String(valor).replace(/'/g, "\\'");
}

// ═════════════════════════════════════════════
// SEÇÃO 2: OPERAÇÕES COM A API (CRUD)
// ─────────────────────────────────────────────
// Esta é a seção principal do script. Aqui ficam
// as funções que se comunicam diretamente com o
// back-end usando fetch(). Cada função representa
// uma operação do CRUD:
//   carregarClientes() → GET  /clientes       (Read - listar todos)
//   criarCliente()     → POST /clientes       (Create)
//   atualizarCliente() → PUT  /clientes/:id   (Update)
//   deletarCliente()   → DELETE /clientes/:id (Delete)
//
// Todas são funções assíncronas (async/await) e usam
// try/catch para tratar erros de rede ou do servidor.
// ═════════════════════════════════════════════

/**
 * GET /clientes
 * Busca TODOS os clientes da API e exibe na tabela.
 * Esta função é chamada automaticamente ao carregar a página
 * e também pelo botão "Recarregar Lista".
 *
 * Fluxo de execução:
 *  1. Exibe "Carregando..." e limpa a tabela anterior
 *  2. Faz fetch GET para /clientes
 *  3. Se der certo: exibe a tabela com os dados
 *  4. Se der errado: exibe mensagem de erro
 */
async function carregarClientes() {
  // Captura os três elementos de controle visual da seção de listagem
  const loadingMessage = document.getElementById("loadingMessage");
  const emptyMessage = document.getElementById("emptyMessage");
  const clientsList = document.getElementById("clientsList");

  // Estado inicial: mostra "Carregando..." e limpa conteúdo anterior
  loadingMessage.style.display = "block";
  emptyMessage.style.display = "none";
  clientsList.innerHTML = "";

  try {
    // Envia GET para /clientes — sem body, sem headers especiais
    const resposta = await fetch("http://localhost:3000/clientes");

    // resposta.ok é true para status 200-299, false para 400, 500, etc.
    if (!resposta.ok) throw new Error("Erro ao buscar clientes");

    // .json() lê o corpo da resposta e converte o texto JSON em array JS
    const clientes = await resposta.json();

    // Oculta o "Carregando..." agora que temos a resposta
    loadingMessage.style.display = "none";

    if (clientes.length === 0) {
      // API retornou array vazio: não há clientes cadastrados
      emptyMessage.style.display = "block";
    } else {
      // API retornou dados: monta a tabela HTML
      exibirTabela(clientes);
    }
  } catch (erro) {
    // Qualquer erro de rede ou do servidor cai aqui
    loadingMessage.style.display = "none";
    emptyMessage.style.display = "block";
    console.error("Erro ao carregar clientes:", erro);
    mostrarMensagem(
      "Erro ao carregar clientes. Verifique se o servidor está rodando.",
      "erro",
    );
  }
}

/**
 * POST /clientes
 * Cria um novo cliente enviando todos os campos como JSON no corpo.
 * Chamada pelo submit do formulário quando clienteEmEdicao === null.
 *
 * @param {Object} dados - Objeto com todos os campos do cliente
 *
 * Diferença para o GET:
 *  - Usa method: 'POST'
 *  - Inclui headers com Content-Type: application/json
 *  - Inclui body com os dados convertidos por JSON.stringify()
 */
async function criarCliente(dados) {
  try {
    const resposta = await fetch("http://localhost:3000/clientes", {
      method: "POST",
      headers: {
        // Informa ao servidor que o corpo está em formato JSON
        // Sem isso, o express.json() não sabe como interpretar o body
        "Content-Type": "application/json",
      },
      // JSON.stringify converte o objeto JS para texto JSON antes de enviar
      // Ex: { nome: "João" } → '{"nome":"João"}'
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.error || "Erro ao criar cliente");
    }

    mostrarMensagem("Cliente cadastrado com sucesso!", "sucesso");
    limparFormulario(); // Limpa o formulário para um próximo cadastro
    carregarClientes(); // Atualiza a tabela para mostrar o novo registro
  } catch (erro) {
    console.error("Erro ao criar cliente:", erro);
    mostrarMensagem("Erro: " + erro.message, "erro");
  }
}

/**
 * PUT /clientes/:id
 * Atualiza os dados de um cliente existente.
 * Chamada pelo submit do formulário quando clienteEmEdicao tem um ID.
 *
 * @param {number} id    - ID do cliente a ser atualizado (vai na URL)
 * @param {Object} dados - Novos dados do cliente (vão no body)
 *
 * Diferença para o POST:
 *  - Usa method: 'PUT'
 *  - O ID vai na URL: /clientes/5  (não no body)
 *  - O body contém apenas os dados a atualizar
 */
async function atualizarCliente(id, dados) {
  try {
    // Template literal monta a URL com o ID: /clientes/5
    const resposta = await fetch(`http://localhost:3000/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.error || "Erro ao atualizar cliente");
    }

    mostrarMensagem("Cliente atualizado com sucesso!", "sucesso");
    limparFormulario(); // Sai do modo de edição
    carregarClientes(); // Atualiza a tabela com os dados novos
  } catch (erro) {
    console.error("Erro ao atualizar cliente:", erro);
    mostrarMensagem("Erro: " + erro.message, "erro");
  }
}

/**
 * DELETE /clientes/:id
 * Remove permanentemente um cliente após confirmação do usuário.
 * Chamada pelo botão "Deletar" de cada linha da tabela.
 *
 * @param {number} id - ID do cliente a ser deletado
 *
 * Diferença para os outros métodos:
 *  - Usa method: 'DELETE'
 *  - Não tem body nem headers especiais
 *  - O ID vai apenas na URL: /clientes/5
 */
async function deletarCliente(id) {
  // confirm() exibe uma caixa de diálogo nativa do navegador.
  // Se o usuário clicar em "Cancelar", a função termina aqui (return).
  if (!confirm("Tem certeza que deseja deletar este cliente?")) return;

  try {
    const resposta = await fetch(`http://localhost:3000/clientes/${id}`, {
      method: "DELETE",
      // DELETE não precisa de body nem Content-Type
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.error || "Erro ao deletar cliente");
    }

    mostrarMensagem("Cliente removido com sucesso!", "sucesso");
    carregarClientes(); // Recarrega a tabela sem o registro deletado
  } catch (erro) {
    console.error("Erro ao deletar cliente:", erro);
    mostrarMensagem("Erro: " + erro.message, "erro");
  }
}

// ═════════════════════════════════════════════
// SEÇÃO 3: EXIBIÇÃO DOS DADOS
// ─────────────────────────────────────────────
// Esta seção cuida da interface visual dos dados.
// Contém duas funções:
//   exibirTabela()   → recebe o array de clientes e monta
//                      dinamicamente a tabela HTML na página
//   editarCliente()  → preenche o formulário com os dados
//                      de um cliente para edição
//
// Aqui o JavaScript age como um "montador de HTML":
// lê os dados do objeto JSON e os injeta no DOM da página.
// ═════════════════════════════════════════════

/**
 * Gera e insere a tabela HTML com a lista de clientes recebida da API.
 * Usa template literals (crases ``) para montar o HTML como texto
 * e depois atribui ao innerHTML do container.
 *
 * @param {Array} clientes - Array de objetos cliente vindos da API
 *
 * Para cada cliente do array, esta função:
 *  1. Formata os dados para exibição (CPF, telefone, data)
 *  2. Monta o endereço completo em uma única string
 *  3. Cria uma linha <tr> com botões de Editar e Deletar
 *  4. Insere tudo no div#clientsList do HTML
 */
function exibirTabela(clientes) {
  const clientsList = document.getElementById("clientsList");

  // Começa montando o HTML da tabela (cabeçalho fixo)
  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>CPF</th>
          <th>Telefone</th>
          <th>E-mail</th>
          <th>Nascimento</th>
          <th>Endereço</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Percorre o array e adiciona uma linha por cliente
  clientes.forEach((cliente) => {
    // Monta o endereço completo juntando os campos em uma única string.
    // filter(Boolean) remove valores null, undefined ou string vazia

    // para não aparecer vírgulas soltas quando 'casa' for nulo.
    const endereco = [
      cliente.rua,
      cliente.numeroCasa,
      cliente.casa, // Pode ser null (campo opcional)
      cliente.bairro,
    ]
      .filter(Boolean)
      .join(", "); // Resultado: "Av. Paulista, 1000, Apto 5, Bela Vista"

    // escaparAspa() protege os valores dos campos contra apóstrofos
    // que quebrariam o onclick="editarCliente('D'avila', ...)"
    html += `
      <tr>
        <td>#${cliente.id}</td>
        <td>${cliente.nome}</td>
        <td>${formatarCPF(cliente.cpf)}</td>
        <td>${formatarTelefone(cliente.telefone)}</td>
        <td>${cliente.email}</td>
        <td>${formatarData(cliente.datanasc)}</td>
        <td>${endereco}</td>
        <td class="acoes">
          <button class="btn btn-edit"
            onclick="editarCliente(
              ${cliente.id},
              '${escaparAspa(cliente.nome)}',
              '${escaparAspa(cliente.cpf)}',
              '${escaparAspa(cliente.telefone)}',
              '${escaparAspa(cliente.email)}',
              '${cliente.datanasc ? cliente.datanasc.substring(0, 10) : ""}',
              '${escaparAspa(cliente.rua)}',
              ${cliente.numeroCasa},
              '${escaparAspa(cliente.casa || "")}',
              '${escaparAspa(cliente.bairro)}'
            )">
            ✏️ Editar
          </button>
          <button class="btn btn-danger"
            onclick="deletarCliente(${cliente.id})">
            🗑 Deletar
          </button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  // Injeta todo o HTML gerado no container da tabela na página
  clientsList.innerHTML = html;
}

/**
 * Preenche o formulário com os dados do cliente selecionado para edição.
 * Chamada pelo botão "Editar" de cada linha, gerado em exibirTabela().
 *
 * Recebe todos os campos como parâmetros individuais porque são passados
 * diretamente pelo atributo onclick="" do botão no HTML gerado.
 */
function editarCliente(
  id,
  nome,
  cpf,
  telefone,
  email,
  datanasc,
  rua,
  numeroCasa,
  casa,
  bairro,
) {
  // Grava o ID na variável global para que o submit do formulário saiba
  // que deve chamar atualizarCliente() e não criarCliente()
  clienteEmEdicao = id;

  // Preenche cada campo do formulário com os dados recebidos
  document.getElementById("nome").value = nome;
  document.getElementById("cpf").value = cpf;
  document.getElementById("telefone").value = telefone;
  document.getElementById("email").value = email;
  document.getElementById("datanasc").value = datanasc; // formato YYYY-MM-DD
  document.getElementById("rua").value = rua;
  document.getElementById("numero").value = numeroCasa;
  document.getElementById("casa").value = casa;
  document.getElementById("bairro").value = bairro;

  // Altera o título da seção do formulário para deixar claro que é uma edição
  document.querySelector(".form-section h2").textContent =
    `Editando Cliente #${id}`;

  // Rola a página suavemente até o formulário para o usuário ver o que aconteceu
  document
    .querySelector(".form-section")
    .scrollIntoView({ behavior: "smooth" });
}

// ═════════════════════════════════════════════
// SEÇÃO 4: BUSCA E FILTRO
// ─────────────────────────────────────────────
// Esta seção gerencia a funcionalidade de pesquisa.
// Contém duas funções:
//   buscarClientes()  → faz o fetch para as rotas de busca
//                       do back-end (/clientes/nome/:nome
//                       ou /clientes/:id) e exibe os resultados
//   filtrarClientes() → lê os campos do formulário de busca
//                       e decide qual tipo de busca executar
//
// A busca sempre ocorre no back-end (server-side), não no
// array em memória, para garantir resultados precisos mesmo
// com grandes volumes de dados.
// ═════════════════════════════════════════════

/**
 * Envia uma requisição de busca ao back-end e exibe os resultados.
 * Suporta dois tipos de busca, conforme a rota da API:
 *   tipo 'nome' → GET /clientes/nome/:nome  (retorna array)
 *   tipo 'id'   → GET /clientes/:id          (retorna objeto único)
 *
 * @param {string} tipo  - 'nome' ou 'id'
 * @param {string} valor - Valor digitado no campo de busca
 */
async function buscarClientes(tipo, valor) {
  // Reutiliza os mesmos elementos de controle visual de carregarClientes()
  const loadingMessage = document.getElementById("loadingMessage");
  const emptyMessage = document.getElementById("emptyMessage");
  const clientsList = document.getElementById("clientsList");

  loadingMessage.style.display = "block";
  emptyMessage.style.display = "none";
  clientsList.innerHTML = "";

  try {
    // Monta a URL correta de acordo com o tipo de busca selecionado
    let url = "";
    if (tipo === "nome") {
      // encodeURIComponent converte caracteres especiais para URL segura
      // Ex: "João Silva" → "Jo%C3%A3o%20Silva"
      url = `http://localhost:3000/clientes/nome/${encodeURIComponent(valor)}`;
    } else if (tipo === "id") {
      // Busca pelo ID numérico diretamente na rota /:id
      url = `http://localhost:3000/clientes/${valor}`;
    }

    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error("Erro na busca");

    let clientes = await resposta.json();

    // Normalização: a rota /clientes/:id retorna um objeto único {},
    // enquanto /clientes/nome/:nome retorna um array [].
    // Convertemos sempre para array para poder usar exibirTabela()
    // da mesma forma nos dois casos.
    if (!Array.isArray(clientes)) {
      clientes = clientes ? [clientes] : [];
    }

    loadingMessage.style.display = "none";

    if (clientes.length === 0) {
      emptyMessage.style.display = "block";
      emptyMessage.textContent = "Nenhum cliente encontrado para essa busca.";
    } else {
      exibirTabela(clientes);
    }
  } catch (erro) {
    loadingMessage.style.display = "none";
    emptyMessage.style.display = "block";
    console.error("Erro na busca:", erro);
    mostrarMensagem("Erro ao buscar clientes.", "erro");
  }
}

/**
 * Lê os valores do formulário de busca e decide o que fazer.
 * Chamada pelo botão "Buscar" e pela tecla Enter no campo de texto.
 *
 * Se o campo estiver vazio → recarrega todos os clientes
 * Se houver texto         → chama buscarClientes() com tipo e valor
 */
function filtrarClientes() {
  const valor = document.getElementById("searchInput").value.trim();
  const tipo = document.getElementById("searchType").value; // 'nome' ou 'id'

  if (valor === "") {
    // Campo vazio = o usuário limpou a busca, volta para a lista completa
    carregarClientes();
  } else {
    buscarClientes(tipo, valor);
  }
}

// ═════════════════════════════════════════════
// SEÇÃO 5: EVENT LISTENERS
// ─────────────────────────────────────────────
// Esta é a seção que "liga" o HTML ao JavaScript.
// Event Listeners são "escutadores de eventos":
// aguardam que o usuário faça algo (clicar em um botão,
// enviar um formulário, pressionar uma tecla) e então
// executam a função correspondente.
//
// IMPORTANTE: todo o código desta seção fica dentro de
// DOMContentLoaded, que garante que o HTML esteja 100%
// carregado antes de tentar acessar os elementos pelo id.
// Sem isso, getElementById() poderia retornar null.
// ═════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function () {
  // ─── Carregamento inicial ─────────────────
  // Assim que a página termina de carregar, busca e exibe os clientes
  carregarClientes();

  // ─── Submit do formulário ─────────────────
  // Intercepta o envio do formulário para tratar via JavaScript
  // em vez de recarregar a página (comportamento padrão do HTML)
  document
    .getElementById("clientForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault(); // Cancela o recarregamento padrão da página

      // Coleta os valores de todos os campos do formulário
      const dados = {
        nome: document.getElementById("nome").value.trim(),
        cpf: document.getElementById("cpf").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("email").value.trim(),
        datanasc: document.getElementById("datanasc").value,
        rua: document.getElementById("rua").value.trim(),
        // parseInt converte a string do input para número inteiro
        numeroCasa: parseInt(document.getElementById("numero").value),
        // Se o campo casa estiver vazio, envia null para o banco
        casa: document.getElementById("casa").value.trim() || null,
        bairro: document.getElementById("bairro").value.trim(),
      };

      // A variável global clienteEmEdicao decide a operação:
      // Se tiver um ID → é uma edição → chama PUT
      // Se for null    → é um cadastro novo → chama POST
      if (clienteEmEdicao) {
        atualizarCliente(clienteEmEdicao, dados);
      } else {
        criarCliente(dados);
      }
    });

  // ─── Botão Limpar ─────────────────────────
  // Limpa todos os campos e volta ao modo de cadastro
  document
    .getElementById("btnLimpar")
    .addEventListener("click", limparFormulario);

  // ─── Botão Recarregar ─────────────────────
  // Refaz o GET /clientes e atualiza a tabela completa
  document
    .getElementById("btnRecarregar")
    .addEventListener("click", carregarClientes);

  // ─── Botão Buscar ─────────────────────────
  // Lê o campo de busca e envia para o back-end
  document
    .getElementById("btnBuscar")
    .addEventListener("click", filtrarClientes);

  // ─── Tecla Enter no campo de busca ────────
  // Permite buscar pressionando Enter, sem precisar clicar no botão
  document
    .getElementById("searchInput")
    .addEventListener("keyup", function (e) {
      if (e.key === "Enter") filtrarClientes();
    });

  // ─── Fechar modal ao clicar fora ──────────
  // Se o usuário clicar no fundo escuro (overlay) do modal,
  // fecha o modal. e.target é o elemento que foi clicado;
  // 'this' é o próprio modal. Se forem iguais, clicou no fundo.
  document
    .getElementById("modalMessage")
    .addEventListener("click", function (e) {
      if (e.target === this) fecharModal();
    });
}); // Fim do DOMContentLoaded
