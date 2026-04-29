import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Building2 } from 'lucide-react';

function ClientManagementModal({ isOpen, onClose }) {
  const [clients, setClients] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load clients');
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

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client? Existing projects will keep the client name.')) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete client');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Manage Clients</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Add or remove global client names</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Add client form */}
          <form
            onSubmit={handleAddClient}
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            <div style={{
              flex: 1,
              position: 'relative'
            }}>
              <input
                type="text"
                placeholder="Enter new client name..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#c7d2fe'}
                onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newClientName.trim()}
              style={{
                padding: '10px 18px',
                backgroundColor: loading || !newClientName.trim() ? '#cbd5e1' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !newClientName.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => {
                if (!loading && newClientName.trim()) {
                  e.currentTarget.style.backgroundColor = '#4338ca';
                }
              }}
              onMouseLeave={e => {
                if (!loading && newClientName.trim()) {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }
              }}
            >
              <Plus size={15} />
              {loading ? 'Adding...' : 'Add'}
            </button>
          </form>

          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>&#9888;</span>
              {error}
            </div>
          )}

          {/* Client list */}
          {clients.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#94a3b8',
              padding: '40px 20px',
              border: '1.5px dashed #e2e8f0',
              borderRadius: '12px'
            }}>
              <Building2 size={36} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No clients defined yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Add your first client above</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {clients.map((client, idx) => (
                <div
                  key={client.id || client._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #f1f5f9',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#64748b'
                      }}>
                        {(client.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{client.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteClient(client.id || client._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }}
                    title="Delete client"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientManagementModal;
