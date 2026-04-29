const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate, requirePermission } = require('../auth');

const router = express.Router();

// GET all clients (public read)
router.get('/', async (req, res) => {
  try {
    const clients = await dbAdapter.getAllClients();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create client (manage_clients permission)
router.post('/', authenticate, requirePermission('clients', 'manage'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }
    const result = await dbAdapter.createClient(name.trim());
    res.json(result);
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'A client with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE client (manage_clients permission)
router.delete('/:id', authenticate, requirePermission('clients', 'manage'), async (req, res) => {
  try {
    const result = await dbAdapter.deleteClient(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
