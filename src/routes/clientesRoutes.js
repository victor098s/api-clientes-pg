// Importar o Express para criar o router
const express = require('express');
const router = express.Router();

// Importar as funções do Controller
const ClienteController = require('../controllers/clienteController');

// ============================================================
// DEFINIÇÃO DAS ROTAS
// ============================================================

// GET /clientes - Listar todos os clientes
router.get('/', ClienteController.listarTodos);

// GET /clientes/categoria/:categoria - Buscar por categoria
router.get('/nome/:nome', ClienteController.buscarPorCategoria);

// GET /clientes/:id - Buscar cliente específico por ID
router.get('/:id', ClienteController.buscarPorId);

// POST /Clientes - Criar novo cliente
router.post('/clientes', ClienteController.criar);

// PUT /clientes/:id - Atualizar cliente completo
router.put('/clientes/:id', ClienteController.atualizar);

// DELETE /clientes/:id - Deletar cliente
router.delete('/:id', ClienteController.deletar);

// ============================================================
// EXPORTAR O ROUTER
// ============================================================
module.exports = router;
