const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
});

pool.connect((erro, client, release) => {
  if (erro) {
    console.error("❌ Erro ao conectar com o PostGreeSQL", erro);
  } else {
    console.log("✅ Conectado ao PosteGreeSQL");
    release();
  }
});

const createTable = async () => {
  const sql = `CREATE TABLE IF NOT EXISTS clientes(
        id serial primary key,
        nome varchar(50) not null,
        cpf varchar (14) not null,
        telefone int not null,
        email varchar (50) not null,
        datanasc date not null,
        rua varchar(50) not null,
        numeroCasa int not null,
        bairro varchar(50) not null
        )`;
  try {
    await pool.query(sql);
    console.log("✅ Tabela criada com sucesso");
  } catch (erro) {
    console.error("❌ Erro ao criar a tabela de clientes !", erro.message);
  }
};

createTable();
module.exports = pool;
