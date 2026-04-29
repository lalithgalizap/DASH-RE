import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, UserCheck, UserX, RefreshCw } from 'lucide-react';
import './Admin.css';

const EXCLUDED_ROLES = ['Manager', 'Resource'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'manager-resource'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    manager_id: '',
    client_id: '',
    is_active: 1
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchClients();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        if (!updateData.manager_id) delete updateData.manager_id;
        if (!updateData.client_id) delete updateData.client_id;
        await axios.put(`/api/users/${editingUser.id}`, updateData);
      } else {
        const createData = {
          ...formData,
          is_active: 1
        };
        if (!createData.manager_id) delete createData.manager_id;
        if (!createData.client_id) delete createData.client_id;
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
    if (id === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
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
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role_id: user.role_id || '',
      manager_id: user.manager_id || '',
      client_id: user.client_id || '',
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role_id: '',
      manager_id: '',
      client_id: '',
      send_email: true
    });
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.put(`/api/users/${user.id}`, {
        is_active: user.is_active ? 0 : 1
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error updating user');
    }
  };

  // Filter users based on view mode
  const filteredUsers = users.filter(user => {
    if (viewMode === 'all') return true;
    return EXCLUDED_ROLES.includes(user.role_name);
  });

  // Get current role name from formData
  const currentRoleName = roles.find(r => r.id === formData.role_id)?.name || '';
  const isResource = currentRoleName === 'Resource';
  const isMRView = viewMode === 'manager-resource' && (currentRoleName === 'Manager' || currentRoleName === 'Resource');

  // All manager users for the dropdown
  const managerUsers = users.filter(u => u.role_name === 'Manager');

  // Available roles for dropdown based on view mode
  const availableRoles = viewMode === 'all'
    ? roles.filter(r => !EXCLUDED_ROLES.includes(r.name))
    : roles.filter(r => EXCLUDED_ROLES.includes(r.name));

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="spin" size={32} />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">
          <Users size={24} />
          <h1>User Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Toggle Switch */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'all' ? '#ffffff' : 'transparent',
                color: viewMode === 'all' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All Users
            </button>
            <button
              onClick={() => setViewMode('manager-resource')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'manager-resource' ? '#ffffff' : 'transparent',
                color: viewMode === 'manager-resource' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'manager-resource' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Manager / Resource
            </button>
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
                    {user.client_name ? (
                      <span style={{ fontSize: '13px', color: '#475569' }}>{user.client_name}</span>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                )}
                {viewMode === 'manager-resource' && (
                  <td>
                    {user.role_name === 'Resource' ? (
                      user.manager_name ? (
                        <span style={{ fontSize: '13px', color: '#475569' }}>{user.manager_name}</span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                      )
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                )}
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleToggleActive(user)}
                    title={user.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(user)}
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(user.id)}
                    title="Delete"
                    disabled={user.id === currentUser?.id}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password {editingUser && '(leave blank to keep current)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role_id}
                  onChange={e => {
                    const newRoleId = e.target.value;
                    setFormData({
                      ...formData,
                      role_id: newRoleId,
                      manager_id: '',
                      client_id: ''
                    });
                  }}
                  required
                >
                  <option value="">Select Role</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              {isMRView && (
                <div className="form-group">
                  <label>Client</label>
                  <select
                    value={formData.client_id}
                    onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {isResource && (
                <div className="form-group">
                  <label>Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={e => setFormData({ ...formData, manager_id: e.target.value })}
                  >
                    <option value="">Select Manager</option>
                    {managerUsers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.username}</option>
                    ))}
                  </select>
                </div>
              )}
              {!editingUser && (
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.send_email}
                      onChange={e => setFormData({ ...formData, send_email: e.target.checked })}
                    />
                    Send Welcome Email
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
