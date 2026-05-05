const express = require('express');
const dbAdapter = require('../dbAdapter');
const { authenticate, requirePermission } = require('../auth');

const router = express.Router();

// Get all products (optionally filter by client)
router.get('/', authenticate, async (req, res) => {
  try {
    const { client_id } = req.query;
    const products = await dbAdapter.getAllProducts(client_id);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new product
router.post('/', authenticate, requirePermission('products', 'manage'), async (req, res) => {
  const { name, description, client_id } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!client_id) {
    return res.status(400).json({ error: 'Client is required for product' });
  }

  try {
    const result = await dbAdapter.createProduct({ 
      name: name.trim(), 
      description: description || '',
      client_id 
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('duplicate') || err.message.includes('exists')) {
      return res.status(409).json({ error: 'A product with this name already exists for this client' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete a product
router.delete('/:id', authenticate, requirePermission('products', 'manage'), async (req, res) => {
  try {
    await dbAdapter.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
