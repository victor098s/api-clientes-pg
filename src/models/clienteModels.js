// Importar o pool de conexões do PostgreSQL
const pool = require("../config/database");

// ============================================================
// FUNÇÃO: listarTodos
// DESCRIÇÃO: Retorna todos os clientes do banco
// RETORNO: Promise com array de clientes
// ============================================================
// pool.query() já retorna uma Promise automaticamente!
// Não precisamos criar new Promise como fizemos no SQLite
async function listarTodos() {
  // PostgreSQL: a query retorna um objeto 'result'
  const result = await pool.query("SELECT * FROM clientes ORDER BY id");

  // Os dados ficam em result.rows
  return result.rows;
}

// ============================================================
// FUNÇÃO: buscarPorId
// DESCRIÇÃO: Busca um cliente específico
// PARÂMETRO: id (número)
// RETORNO: Promise com o cliente ou undefined
// ============================================================
async function buscarPorId(id) {
  // PostgreSQL usa $1, $2, $3... como placeholders
  // (SQLite usava ? ? ?)
  const result = await pool.query(
    "SELECT * FROM clientes WHERE id = $1",
    [id], // O array com os valores dos placeholders
  );

  // Retorna o primeiro resultado (ou undefined se não achar)
  return result.rows[0];
}

// ============================================================
// FUNÇÃO: criar
// DESCRIÇÃO: Insere um novo cliente no banco
// PARÂMETRO: dados (objeto)
// RETORNO: Promise com o cliente criado (incluindo o ID)
// ============================================================
async function criar(dados) {
  const { nome, cpf, telefone, email, datanasc, rua, numeroCasa, bairro } =
    dados;

  // RETURNING * é um recurso do PostgreSQL que retorna
  // o registro inserido automaticamente!
  const sql = `
    INSERT INTO clientes (nome, cpf, telefone, email, datanasc, rua, numeroCasa, bairro)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  // Executar a query com os valores
  const result = await pool.query(sql, [
    nome,
    cpf,
    telefone,
    email,
    datanasc,
    rua,
    numeroCasa,
    bairro,
  ]);

  // O cliente inserido com o ID gerado pelo banco
  return result.rows[0];
}

// ============================================================
// FUNÇÃO: atualizar
// DESCRIÇÃO: Atualiza todos os dados de um cliente
// PARÂMETROS: id, dados
// RETORNO: Promise com cliente atualizado ou null
// ============================================================

async function atualizar(id, dados) {
  const { nome, cpf, telefone, email, datanasc, rua, numeroCasa, bairro } =
    dados;

  // UPDATE com RETURNING * também retorna o registro atualizado
  const sql = `
    UPDATE clientes
    SET  nome= $1, cpf= $2, telefone= $3, email= $4, datanasc= $5, rua= $6, numeroCasa= $7, bairro= $8 
    WHERE id = $9
    RETURNING *
  `;

  const result = await pool.query(sql, [
    nome,
    cpf,
    telefone,
    email,
    datanasc,
    rua,
    numeroCasa,
    bairro,
    id,
  ]);

  // Se não atualizou nenhuma linha, retorna null
  return result.rows[0] || null;
}

// ============================================================
// FUNÇÃO: deletar
// DESCRIÇÃO: Remove um cliente do banco
// PARÂMETRO: id (número)
// RETORNO: Promise com true/false
// ============================================================
async function deletar(id) {
  const result = await pool.query("DELETE FROM clientes WHERE id = $1", [id]);

  // rowCount indica quantas linhas foram afetadas
  // Se for > 0, significa que deletou algo
  return result.rowCount > 0;
}

// ============================================================
// FUNÇÃO: buscarPorCategoria
// DESCRIÇÃO: Filtra clientes por categoria
// PARÂMETRO: categoria (string)
// RETORNO: Promise com array de clientes
// ============================================================
async function buscarPorNome(nome) {
  // ILIKE é o LIKE case-insensitive do PostgreSQL
  // (no SQLite usávamos LIKE normal)
  const sql = "SELECT * FROM clientes WHERE categoria ILIKE $1";

  const result = await pool.query(
    sql,
    [`%${nome}%`], // % = wildcard (qualquer texto)
  );

  return result.rows;
}

// ============================================================
// EXPORTAR TODAS AS FUNÇÕES
// ============================================================
module.exports = {
  listarTodos,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  buscarPorNome,
};
