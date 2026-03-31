// Importar o Express para criar o router
const express = require('express');
const router = express.Router();

// Importar as funções do Controller
const ClienteController = require('../controllers/clienteController');

// ============================================================
// DEFINIÇÃO DAS ROTAS
// ============================================================

// GET /clientes - Listar todos os clientes
router.get('/clientes', ClienteController.listarTodos);

// GET /clientes/categoria/:categoria - Buscar por nome
router.get('/clientes/nome/:nome', ClienteController.buscarPorNome);

// GET /clientes/:id - Buscar cliente específico por ID
router.get('/clientes/:id', ClienteController.buscarPorId);

// POST /Clientes - Criar novo cliente
router.post('/clientes', ClienteController.criar);

// PUT /clientes/:id - Atualizar cliente completo
router.put('/clientes/:id', ClienteController.atualizar);

// DELETE /clientes/:id - Deletar cliente
router.delete('/clientes/:id', ClienteController.deletar);

// ============================================================
// EXPORTAR O ROUTER
// ============================================================
module.exports = router;
