import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Building2, Search, Package, FolderKanban, ChevronRight, X, Layers } from 'lucide-react';
import './Clients.css';

function Clients() {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [selectedClientForProduct, setSelectedClientForProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // for detail panel

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchProjects();
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
    } catch (err) {
      console.error('Failed to load products');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects');
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
      if (selectedClient?.id === id || selectedClient?._id === id) setSelectedClient(null);
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

  const getClientProducts = (clientId) =>
    products.filter(p => p.client_id === clientId || p.client_id === String(clientId));

  const getClientProjects = (clientName) =>
    projects.filter(p => {
      if (!p.clients) return false;
      return p.clients.split(',').map(c => c.trim().toLowerCase()).includes(clientName.toLowerCase());
    });

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { bg: '#dcfce7', text: '#166534' };
    if (s === 'in progress' || s === 'active') return { bg: '#dbeafe', text: '#1e40af' };
    if (s === 'on hold') return { bg: '#fef3c7', text: '#92400e' };
    if (s === 'cancelled') return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#f1f5f9', text: '#475569' };
  };

  return (
    <div className="cl-page">
      {/* Header */}
      <div className="cl-header">
        <div className="cl-header-left">
          <div className="cl-icon-box">
            <Layers size={22} color="white" />
          </div>
          <div>
            <h1 className="cl-title">Clients &amp; Products</h1>
            <p className="cl-subtitle">Manage clients, products and their associated projects</p>
          </div>
        </div>
        <div className="cl-stats">
          <div className="cl-stat">
            <span className="cl-stat-value">{clients.length}</span>
            <span className="cl-stat-label">Clients</span>
          </div>
          <div className="cl-stat-divider" />
          <div className="cl-stat">
            <span className="cl-stat-value">{products.length}</span>
            <span className="cl-stat-label">Products</span>
          </div>
          <div className="cl-stat-divider" />
          <div className="cl-stat">
            <span className="cl-stat-value">{projects.length}</span>
            <span className="cl-stat-label">Projects</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cl-tabs">
        <button
          className={`cl-tab ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => { setActiveTab('clients'); setSearchQuery(''); setSelectedClient(null); setError(null); }}
        >
          <Building2 size={16} />
          Clients
          <span className="cl-tab-badge">{clients.length}</span>
        </button>
        <button
          className={`cl-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => { setActiveTab('products'); setSearchQuery(''); setSelectedClient(null); setError(null); }}
        >
          <Package size={16} />
          Products
          <span className="cl-tab-badge">{products.length}</span>
        </button>
      </div>

      {/* Add Form */}
      <div className="cl-form-card">
        {activeTab === 'clients' ? (
          <form onSubmit={handleAddClient} className="cl-form-row">
            <input
              type="text"
              placeholder="New client name..."
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              className="cl-input"
            />
            <button type="submit" disabled={loading || !newClientName.trim()} className="cl-add-btn">
              <Plus size={16} />
              {loading ? 'Adding...' : 'Add Client'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAddProduct} className="cl-form-row">
            <select
              value={selectedClientForProduct}
              onChange={e => setSelectedClientForProduct(e.target.value)}
              className="cl-input cl-select"
              required
            >
              <option value="">Select Client *</option>
              {clients.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Product name *"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
              className="cl-input"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newProductDescription}
              onChange={e => setNewProductDescription(e.target.value)}
              className="cl-input cl-input-wide"
            />
            <button type="submit" disabled={loading || !newProductName.trim() || !selectedClientForProduct} className="cl-add-btn">
              <Plus size={16} />
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </form>
        )}
        {error && (
          <div className="cl-error">
            <span>⚠</span> {error}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="cl-search-bar">
        <Search size={16} color="#9ca3af" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="cl-search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="cl-search-clear">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Main content: list + detail panel */}
      <div className={`cl-content ${selectedClient ? 'with-panel' : ''}`}>
        {/* List */}
        <div className="cl-list-section">
          {activeTab === 'clients' ? (
            filteredClients.length === 0 ? (
              <div className="cl-empty">
                <Building2 size={40} color="#cbd5e1" />
                <p>{searchQuery ? 'No clients match your search' : 'No clients yet. Add one above.'}</p>
              </div>
            ) : (
              <div className="cl-grid">
                {filteredClients.map(client => {
                  const clientId = client.id || client._id;
                  const clientProducts = getClientProducts(clientId);
                  const clientProjects = getClientProjects(client.name);
                  const isSelected = (selectedClient?.id || selectedClient?._id) === clientId;
                  return (
                    <div
                      key={clientId}
                      className={`cl-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedClient(isSelected ? null : client)}
                    >
                      <div className="cl-card-left">
                        <div className="cl-avatar">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="cl-card-info">
                          <span className="cl-card-name">{client.name}</span>
                          <div className="cl-card-meta">
                            <span className="cl-meta-pill">
                              <Package size={11} /> {clientProducts.length} product{clientProducts.length !== 1 ? 's' : ''}
                            </span>
                            <span className="cl-meta-pill">
                              <FolderKanban size={11} /> {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="cl-card-actions">
                        <ChevronRight size={16} color={isSelected ? '#4f46e5' : '#cbd5e1'} />
                        <button
                          className="cl-delete-btn"
                          onClick={e => { e.stopPropagation(); handleDeleteClient(clientId); }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredProducts.length === 0 ? (
              <div className="cl-empty">
                <Package size={40} color="#cbd5e1" />
                <p>{searchQuery ? 'No products match your search' : 'No products yet. Add one above.'}</p>
              </div>
            ) : (
              <div className="cl-grid">
                {filteredProducts.map(product => {
                  const productId = product.id || product._id;
                  return (
                    <div key={productId} className="cl-card">
                      <div className="cl-card-left">
                        <div className="cl-avatar cl-avatar-purple">
                          <Package size={18} color="#7c3aed" />
                        </div>
                        <div className="cl-card-info">
                          <span className="cl-card-name">{product.name}</span>
                          <div className="cl-card-meta">
                            <span className="cl-meta-pill cl-pill-blue">
                              <Building2 size={11} /> {product.client_name || '—'}
                            </span>
                            {product.description && (
                              <span className="cl-product-desc">{product.description}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="cl-delete-btn"
                        onClick={() => handleDeleteProduct(productId)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Detail Panel */}
        {selectedClient && (() => {
          const clientId = selectedClient.id || selectedClient._id;
          const clientProducts = getClientProducts(clientId);
          const clientProjects = getClientProjects(selectedClient.name);
          return (
            <div className="cl-detail-panel">
              <div className="cl-panel-header">
                <div className="cl-panel-title">
                  <div className="cl-avatar cl-avatar-sm">{selectedClient.name.charAt(0).toUpperCase()}</div>
                  <span>{selectedClient.name}</span>
                </div>
                <button className="cl-panel-close" onClick={() => setSelectedClient(null)}>
                  <X size={16} />
                </button>
              </div>

              {/* Products section */}
              <div className="cl-panel-section">
                <div className="cl-panel-section-title">
                  <Package size={14} color="#7c3aed" />
                  Products
                  <span className="cl-panel-count">{clientProducts.length}</span>
                </div>
                {clientProducts.length === 0 ? (
                  <p className="cl-panel-empty">No products assigned</p>
                ) : (
                  <div className="cl-panel-list">
                    {clientProducts.map(p => (
                      <div key={p.id || p._id} className="cl-panel-item">
                        <div className="cl-panel-item-dot" style={{ background: '#7c3aed' }} />
                        <div>
                          <div className="cl-panel-item-name">{p.name}</div>
                          {p.description && <div className="cl-panel-item-sub">{p.description}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Projects section */}
              <div className="cl-panel-section">
                <div className="cl-panel-section-title">
                  <FolderKanban size={14} color="#2563eb" />
                  Projects
                  <span className="cl-panel-count">{clientProjects.length}</span>
                </div>
                {clientProjects.length === 0 ? (
                  <p className="cl-panel-empty">No projects associated</p>
                ) : (
                  <div className="cl-panel-list">
                    {clientProjects.map(p => {
                      const sc = statusColor(p.status);
                      return (
                        <div key={p.id || p._id} className="cl-panel-item">
                          <div className="cl-panel-item-dot" style={{ background: '#2563eb' }} />
                          <div style={{ flex: 1 }}>
                            <div className="cl-panel-item-name">{p.name}</div>
                            {p.status && (
                              <span className="cl-status-badge" style={{ background: sc.bg, color: sc.text }}>
                                {p.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default Clients;
