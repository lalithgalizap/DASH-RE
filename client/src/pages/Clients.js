import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Building2, Search, Package } from 'lucide-react';
import './Clients.css';

function Clients() {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'products'
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [selectedClientForProduct, setSelectedClientForProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load clients');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    const name = newClientName.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/clients', { name });
      setNewClientName('');
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const name = newProductName.trim();
    if (!name) return;
    if (!selectedClientForProduct) {
      setError('Please select a client for this product');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/products', { 
        name, 
        description: newProductDescription.trim(),
        client_id: selectedClientForProduct
      });
      setNewProductName('');
      setNewProductDescription('');
      setSelectedClientForProduct('');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client? Existing projects will keep the client name.')) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete client');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.client_name && product.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentData = activeTab === 'clients' ? filteredClients : filteredProducts;
  const totalCount = activeTab === 'clients' ? clients.length : products.length;

  return (
    <div className="clients-page">
      <div className="clients-container">
        {/* Header */}
        <div className="clients-header">
          <div className="clients-header-left">
            <div className="clients-icon-wrapper">
              {activeTab === 'clients' ? (
                <Building2 size={28} color="#4f46e5" strokeWidth={2} />
              ) : (
                <Package size={28} color="#4f46e5" strokeWidth={2} />
              )}
            </div>
            <div>
              <h1 className="clients-title">Clients / Products</h1>
              <p className="clients-subtitle">Manage your organization's clients and products</p>
            </div>
          </div>
          <div className="clients-stats">
            <div className="stat-item">
              <span className="stat-value">{clients.length}</span>
              <span className="stat-label">Clients</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">{products.length}</span>
              <span className="stat-label">Products</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('clients');
              setSearchQuery('');
              setError(null);
            }}
          >
            <Building2 size={18} />
            Clients
            <span className="tab-count">{clients.length}</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('products');
              setSearchQuery('');
              setError(null);
            }}
          >
            <Package size={18} />
            Products
            <span className="tab-count">{products.length}</span>
          </button>
        </div>

        {/* Add Client/Product Form */}
        <div className="add-client-section">
          {activeTab === 'clients' ? (
            <form onSubmit={handleAddClient} className="add-client-form">
              <div className="form-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter new client name..."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="client-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newClientName.trim()}
                className="add-client-btn"
              >
                <Plus size={18} />
                {loading ? 'Adding...' : 'Add Client'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddProduct} className="add-product-form">
              <div className="form-inputs-row">
                <div className="form-input-wrapper flex-2">
                  <select
                    value={selectedClientForProduct}
                    onChange={(e) => setSelectedClientForProduct(e.target.value)}
                    className="client-select"
                    required
                  >
                    <option value="">Select Client *</option>
                    {clients.map(client => (
                      <option key={client.id || client._id} value={client.id || client._id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-input-wrapper flex-2">
                  <input
                    type="text"
                    placeholder="Enter product name *"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="client-input"
                    required
                  />
                </div>
                <div className="form-input-wrapper flex-3">
                  <input
                    type="text"
                    placeholder="Enter product description (optional)..."
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    className="client-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newProductName.trim() || !selectedClientForProduct}
                  className="add-client-btn"
                >
                  <Plus size={18} />
                  {loading ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
        </div>

        {/* Search Bar */}
        {totalCount > 0 && (
          <div className="search-section">
            <div className="search-bar">
              <Search size={20} color="#6b7280" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search-btn"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="search-results-info">
                Showing {currentData.length} of {totalCount} {activeTab}
              </div>
            )}
          </div>
        )}

        {/* List Section */}
        <div className="clients-list-section">
          {currentData.length === 0 && !searchQuery ? (
            <div className="empty-state">
              {activeTab === 'clients' ? (
                <Building2 size={48} color="#cbd5e1" />
              ) : (
                <Package size={48} color="#cbd5e1" />
              )}
              <h3>No {activeTab} defined yet</h3>
              <p>Add your first {activeTab === 'clients' ? 'client' : 'product'} using the form above</p>
            </div>
          ) : currentData.length === 0 && searchQuery ? (
            <div className="empty-state">
              <Search size={48} color="#cbd5e1" />
              <h3>No {activeTab} found</h3>
              <p>Try adjusting your search query</p>
            </div>
          ) : (
            <div className="clients-grid">
              {activeTab === 'clients' ? (
                filteredClients.map((client, idx) => (
                  <div key={client.id || client._id} className="client-card">
                    <div className="client-card-content">
                      <div className="client-avatar">
                        <span className="client-initial">
                          {(client.name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="client-info">
                        <h3 className="client-name">{client.name}</h3>
                        <p className="client-meta">Client #{idx + 1}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClient(client.id || client._id)}
                      className="delete-client-btn"
                      title="Delete client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                filteredProducts.map((product, idx) => (
                  <div key={product.id || product._id} className="client-card product-card">
                    <div className="client-card-content">
                      <div className="client-avatar product-avatar">
                        <Package size={20} color="#4f46e5" />
                      </div>
                      <div className="client-info">
                        <h3 className="client-name">{product.name}</h3>
                        <p className="client-meta">
                          <span className="client-badge">{product.client_name}</span>
                          {product.description && (
                            <span className="product-description"> • {product.description}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.id || product._id)}
                      className="delete-client-btn"
                      title="Delete product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Clients;
