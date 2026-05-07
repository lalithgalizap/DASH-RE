import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, UserCheck, UserX, RefreshCw, BarChart2, X } from 'lucide-react';
import './Admin.css';

const EXCLUDED_ROLES = ['Manager', 'Resource'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [formError, setFormError] = useState('');

  // Quarter modal
  const [quarterUser, setQuarterUser] = useState(null);
  // activity: { 'Q1-2026': 'active'|'inactive', ... }
  const [activity, setActivity] = useState({});
  const [savingQuarter, setSavingQuarter] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    manager_id: '',
    client_id: '',
    product_id: '',
    is_active: 1
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchClients();
    fetchProducts();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate mandatory fields for Resource role
    if (isResource) {
      if (!formData.client_id) { setFormError('Client is required for a Resource.'); return; }
      if (!formData.product_id) { setFormError('Product is required for a Resource.'); return; }
      if (!formData.manager_id) { setFormError('Manager is required for a Resource.'); return; }
    }

    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        if (!updateData.manager_id) updateData.manager_id = null;
        if (!updateData.client_id) updateData.client_id = null;
        if (!updateData.product_id) updateData.product_id = null;
        await axios.put(`/api/users/${editingUser.id}`, updateData);
      } else {
        const createData = { ...formData, is_active: 1 };
        if (!createData.manager_id) delete createData.manager_id;
        if (!createData.client_id) delete createData.client_id;
        if (!createData.product_id) delete createData.product_id;
        await axios.post('/api/users', createData);
      }
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving user');
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) { alert('You cannot delete your own account'); return; }
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/users/${id}`);
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.error || 'Error deleting user');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormError('');
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role_id: user.role_id || '',
      manager_id: user.manager_id || '',
      client_id: user.client_id || '',
      product_id: user.product_id || '',
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormError('');
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', role_id: '', manager_id: '', client_id: '', product_id: '', send_email: true });
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.put(`/api/users/${user.id}`, { is_active: user.is_active ? 0 : 1 });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating user');
    }
  };

  /* ── In Org / Out Of Org toggle ── */
  const handleToggleOrg = async (user) => {
    try {
      await axios.put(`/api/users/${user.id}`, { in_org: !user.in_org });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating user');
    }
  };

  /* ── Quarter modal ── */
  const openQuarterModal = (user) => {
    setQuarterUser(user);
    // Build activity map from saved quarter_activity array
    const map = {};
    (user.quarter_activity || []).forEach(({ year, quarter, status }) => {
      map[`${quarter}-${year}`] = status;
    });
    setActivity(map);
  };

  const toggleActivity = (quarter, year) => {
    const key = `${quarter}-${year}`;
    setActivity(prev => ({
      ...prev,
      [key]: prev[key] === 'active' ? 'inactive'
           : prev[key] === 'inactive' ? undefined   // clear = unset
           : 'active'
    }));
  };

  const handleSaveQuarter = async () => {
    setSavingQuarter(true);
    try {
      // Convert map back to array, drop unset entries
      const quarter_activity = Object.entries(activity)
        .filter(([, status]) => status !== undefined)
        .map(([key, status]) => {
          const [quarter, year] = key.split('-');
          return { quarter, year: parseInt(year), status };
        });
      await axios.put(`/api/users/${quarterUser.id}`, { quarter_activity });
      fetchUsers();
      setQuarterUser(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving quarter activity');
    } finally {
      setSavingQuarter(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (viewMode === 'all') return true;
    if (viewMode === 'manager-resource') return EXCLUDED_ROLES.includes(user.role_name);
    if (viewMode === 'legacy') return !EXCLUDED_ROLES.includes(user.role_name);
    return true;
  });

  const currentRoleName = roles.find(r => r.id === formData.role_id)?.name || '';
  const isResource = currentRoleName === 'Resource';
  const isMRView = EXCLUDED_ROLES.includes(currentRoleName);
  const managerUsers = users.filter(u => u.role_name === 'Manager');
  const editingUserRoleName = editingUser?.role_name || '';
  const isEditingMRUser = EXCLUDED_ROLES.includes(editingUserRoleName);
  const isCreatingMRUser = EXCLUDED_ROLES.includes(currentRoleName);

  const availableRoles = (() => {
    if (viewMode === 'manager-resource') return roles.filter(r => EXCLUDED_ROLES.includes(r.name));
    if (viewMode === 'legacy') return roles.filter(r => !EXCLUDED_ROLES.includes(r.name));
    if (isEditingMRUser || isCreatingMRUser) return roles.filter(r => EXCLUDED_ROLES.includes(r.name));
    return roles.filter(r => !EXCLUDED_ROLES.includes(r.name));
  })();

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="spin" size={32} />
        <p>Loading users...</p>
      </div>
    );
  }

  /* ── shared button style ── */
  const toggleBtnStyle = (active) => ({
    padding: '6px 14px', borderRadius: '6px', border: 'none',
    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    backgroundColor: active ? '#ffffff' : 'transparent',
    color: active ? '#0f172a' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s ease'
  });

  return (
    <div className="admin-page">
      {/* Note banner */}
      <div style={{
        backgroundColor: '#213848', border: '1px solid #e8eaeb', borderRadius: '8px',
        padding: '12px 16px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '14px', color: '#f0f0f2da'
      }}>
        <span><strong>Note:</strong> To add a Manager or Resource user, please switch to the <strong>"Manager / Resource"</strong> toggle</span>
      </div>

      <div className="admin-header">
        <div className="admin-title">
          <Users size={24} />
          <h1>User Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', gap: '4px' }}>
            {[
              { key: 'all',              label: 'All Users' },
              { key: 'manager-resource', label: 'Manager / Resource' },
              { key: 'legacy',           label: 'Legacy Users' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)} style={toggleBtnStyle(viewMode === key)}>
                {label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              {viewMode === 'manager-resource' && <th>Client</th>}
              {viewMode === 'manager-resource' && <th>Manager</th>}
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive' : ''}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role_name?.toLowerCase()}`}>
                    {user.role_name || 'No Role'}
                  </span>
                </td>
                {viewMode === 'manager-resource' && (
                  <td>
                    {user.client_name
                      ? <span style={{ fontSize: '13px', color: '#475569' }}>{user.client_name}</span>
                      : <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>}
                  </td>
                )}
                {viewMode === 'manager-resource' && (
                  <td>
                    {user.role_name === 'Resource' && user.manager_name
                      ? <span style={{ fontSize: '13px', color: '#475569' }}>{user.manager_name}</span>
                      : <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>}
                  </td>
                )}
                {/* In Org / Out Of Org badge */}
                <td>
                  <button
                    onClick={() => handleToggleOrg(user)}
                    title="Toggle In Org / Out Of Org"
                    style={{
                      padding: '3px 10px', borderRadius: '20px', border: 'none',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      background: user.in_org !== false ? '#dcfce7' : '#fee2e2',
                      color:      user.in_org !== false ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {user.in_org !== false ? 'In Org' : 'Out Of Org'}
                  </button>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  <button className="btn-icon" onClick={() => handleToggleActive(user)}
                    title={user.is_active ? 'Deactivate' : 'Activate'}>
                    {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                  <button className="btn-icon" onClick={() => handleEdit(user)} title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(user.id)}
                    title="Delete" disabled={user.id === currentUser?.id}>
                    <Trash2 size={18} />
                  </button>
                  {/* Quarter button — Manager / Resource only */}
                  {EXCLUDED_ROLES.includes(user.role_name) && (
                    <button
                      className="btn-icon"
                      onClick={() => openQuarterModal(user)}
                      title="Set Quarter"
                      style={{ color: '#7c3aed', borderColor: '#7c3aed' }}
                    >
                      <BarChart2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ══ Add / Edit User Modal ══ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password {editingUser && '(leave blank to keep current)'}</label>
                <input type="password" value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={formData.role_id}
                  onChange={e => setFormData({ ...formData, role_id: e.target.value, manager_id: '', client_id: '', product_id: '' })}
                  required>
                  <option value="">Select Role</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              {isMRView && (
                <div className="form-group">
                  <label>
                    Client {isResource && <span style={{ color: '#ef4444' }}>*</span>}
                    {!isResource && <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '12px' }}> (optional)</span>}
                  </label>
                  <select value={formData.client_id}
                    onChange={e => setFormData({ ...formData, client_id: e.target.value, product_id: '' })}>
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {isMRView && (
                <div className="form-group">
                  <label>
                    Product {isResource && <span style={{ color: '#ef4444' }}>*</span>}
                    {!isResource && <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '12px' }}> (optional)</span>}
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                    disabled={!formData.client_id}
                  >
                    <option value="">{formData.client_id ? 'Select Product' : 'Select a client first'}</option>
                    {products
                      .filter(p => p.client_id === formData.client_id)
                      .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                    }
                  </select>
                </div>
              )}
              {isResource && (
                <div className="form-group">
                  <label>Manager <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={formData.manager_id}
                    onChange={e => setFormData({ ...formData, manager_id: e.target.value })}>
                    <option value="">Select Manager</option>
                    {managerUsers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                  </select>
                </div>
              )}
              {formError && (
                <div style={{
                  padding: '8px 12px', borderRadius: '6px', marginBottom: '8px',
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  color: '#dc2626', fontSize: '13px'
                }}>
                  {formError}
                </div>
              )}
              {!editingUser && (
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" checked={formData.send_email}
                      onChange={e => setFormData({ ...formData, send_email: e.target.checked })} />
                    Send Welcome Email
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Quarter Modal ══ */}
      {quarterUser && (
        <div className="modal-overlay" onClick={() => setQuarterUser(null)}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '94%' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Quarter Activity</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {quarterUser.username} · {quarterUser.role_name}
                </p>
              </div>
              <button onClick={() => setQuarterUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '22px', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} />
                Active
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#dc2626', display: 'inline-block' }} />
                Inactive
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e5e7eb', display: 'inline-block' }} />
                Not set
              </span>
              <span style={{ color: '#9ca3af' }}>· Click to cycle: Not set → Active → Inactive → Not set</span>
            </div>

            {/* Year × Quarter grid */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                      Year
                    </th>
                    {QUARTERS.map(q => (
                      <th key={q} style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                        {q}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {YEARS.map((year, yi) => (
                    <tr key={year} style={{ background: yi % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#374151' }}>{year}</td>
                      {QUARTERS.map(q => {
                        const key = `${q}-${year}`;
                        const status = activity[key];
                        const bg    = status === 'active'   ? '#16a34a'
                                    : status === 'inactive' ? '#dc2626'
                                    : '#e5e7eb';
                        const color = status ? 'white' : '#9ca3af';
                        const label = status === 'active'   ? 'Active'
                                    : status === 'inactive' ? 'Inactive'
                                    : '—';
                        return (
                          <td key={q} style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleActivity(q, year)}
                              title={`Click to toggle ${q} ${year}`}
                              style={{
                                padding: '5px 14px', borderRadius: '6px', border: 'none',
                                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                background: bg, color,
                                transition: 'all 0.15s ease',
                                minWidth: '72px'
                              }}
                            >
                              {label}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setQuarterUser(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSaveQuarter}
                disabled={savingQuarter}
                style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
              >
                {savingQuarter ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
