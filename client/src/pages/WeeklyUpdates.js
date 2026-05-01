import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Calendar, User, Briefcase, Bell, Eye, Building2, Clock } from 'lucide-react';
import './WeeklyUpdates.css';

function WeeklyUpdates() {
  const { user, isManager, isAdmin, isCSP, canViewGlobalWeeklyUpdates } = useAuth();
  
  // Auth helpers - must be defined before using in state
  const hasGlobalView = canViewGlobalWeeklyUpdates();
  const isManagerRole = isManager();
  const isAdminCSP = isAdmin() || isCSP();
  
  // Determine if user should see "My Updates" tab (only Resources and Managers see it)
  const showMyUpdatesTab = !isAdminCSP && !hasGlobalView;
  
  // State
  const [updates, setUpdates] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(showMyUpdatesTab ? 'my' : (isManagerRole ? 'team' : 'all'));
  const [showForm, setShowForm] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewMode, setViewMode] = useState('clients'); // 'clients' or 'resources'
  const [modalWeekFilter, setModalWeekFilter] = useState(getCurrentWeekStart());
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [resourceFilter, setResourceFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    week_starting: getCurrentWeekStart(),
    accomplishments: '',
    challenges: '',
    next_week_plans: '',
    status: 'draft'
  });

  // Get current week start (Monday)
  function getCurrentWeekStart() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Get week ending date
  function getWeekEnding(weekStarting) {
    const date = new Date(weekStarting);
    date.setDate(date.getDate() + 4); // Friday
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Fetch updates
  useEffect(() => {
    fetchUpdates();
    if (isManagerRole || hasGlobalView) {
      fetchResources();
    }
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/weekly-updates');
      setUpdates(response.data.updates || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await axios.get('/api/weekly-updates/resources');
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchResourceUpdates = async (resourceId) => {
    try {
      const response = await axios.get(`/api/weekly-updates/resource/${resourceId}`);
      return response.data.updates || [];
    } catch (error) {
      console.error('Error fetching resource updates:', error);
      return [];
    }
  };

  const handleRemind = async (resourceId, weekStarting = null) => {
    try {
      const payload = weekStarting ? { week_starting: weekStarting } : {};
      await axios.post(`/api/weekly-updates/remind/${resourceId}`, payload);
      alert('Reminder sent successfully');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert(error.response?.data?.error || 'Error sending reminder');
    }
  };

  const openResourceProfile = async (resource) => {
    const resourceUpdates = await fetchResourceUpdates(resource.id);
    setSelectedResource({ ...resource, updates: resourceUpdates });
    setShowResourceModal(true);
  };

  const handleClientClick = (clientName) => {
    setSelectedClient(clientName);
    setViewMode('resources');
    // Reset filters when switching to client view
    setResourceFilter('');
    setManagerFilter('');
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setViewMode('clients');
    setResourceFilter('');
    setManagerFilter('');
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit new update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUpdate) {
        await axios.put(`/api/weekly-updates/${editingUpdate._id}`, formData);
      } else {
        await axios.post('/api/weekly-updates', formData);
      }
      setShowForm(false);
      setEditingUpdate(null);
      setFormData({
        week_starting: getCurrentWeekStart(),
        accomplishments: '',
        challenges: '',
        next_week_plans: '',
        status: 'draft'
      });
      fetchUpdates();
    } catch (error) {
      console.error('Error saving update:', error);
      alert(error.response?.data?.error || 'Error saving update');
    }
  };

  // Edit update
  const handleEdit = (update) => {
    setEditingUpdate(update);
    setFormData({
      week_starting: update.week_starting?.split('T')[0] || getCurrentWeekStart(),
      accomplishments: update.accomplishments || '',
      challenges: update.challenges || '',
      next_week_plans: update.next_week_plans || '',
      status: update.status || 'draft'
    });
    setShowForm(true);
  };

  // Delete update
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return;
    try {
      await axios.delete(`/api/weekly-updates/${id}`);
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      alert('Error deleting update');
    }
  };

  // Toggle row expansion
  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingUpdate(null);
    setFormData({
      week_starting: getCurrentWeekStart(),
      accomplishments: '',
      challenges: '',
      next_week_plans: '',
      status: 'draft'
    });
  };

  // Get unique managers from resources
  const managers = [...new Set(resources.filter(r => r.manager_id).map(r => ({ 
    id: r.manager_id, 
    name: r.manager_name || 'Unknown' 
  })))].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  if (loading) {
    return (
      <div className="weekly-updates-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading weekly updates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-updates-page">
      <div className="page-header">
        <h1>Weekly Updates</h1>
        <div className="header-actions">
          {!showForm && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} />
              New Update
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {showMyUpdatesTab && (
          <button 
            className={`tab ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            My Updates
          </button>
        )}
        {isManagerRole && (
          <button 
            className={`tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            Team Updates
          </button>
        )}
        {(hasGlobalView || isAdminCSP) && (
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Updates
          </button>
        )}
      </div>

      {/* Filters */}
      {(hasGlobalView || isManagerRole) && (
        <div className="filters-row">
          {(isManagerRole || hasGlobalView) && (
            <select 
              value={resourceFilter} 
              onChange={(e) => setResourceFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Resources</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.username}</option>
              ))}
            </select>
          )}
          {hasGlobalView && (
            <select 
              value={managerFilter} 
              onChange={(e) => setManagerFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Managers</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {(resourceFilter || managerFilter) && (
            <button 
              className="btn-secondary" 
              onClick={() => {
                setResourceFilter('');
                setManagerFilter('');
              }}
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingUpdate ? 'Edit Update' : 'New Weekly Update'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Week Starting (Monday)</label>
                <input 
                  type="date" 
                  name="week_starting" 
                  value={formData.week_starting}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  name="status" 
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Accomplishments</label>
              <textarea 
                name="accomplishments" 
                value={formData.accomplishments}
                onChange={handleInputChange}
                rows={4}
                placeholder="What did you accomplish this week?"
              />
            </div>
            
            <div className="form-group">
              <label>Challenges</label>
              <textarea 
                name="challenges" 
                value={formData.challenges}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any challenges faced this week?"
              />
            </div>
            
            <div className="form-group">
              <label>Next Week Plans</label>
              <textarea 
                name="next_week_plans" 
                value={formData.next_week_plans}
                onChange={handleInputChange}
                rows={3}
                placeholder="What are your plans for next week?"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <Save size={16} />
                {editingUpdate ? 'Update' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                <X size={16} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Area - My Updates or Resources List */}
      {activeTab === 'my' ? (
        // My Updates View (Resource view)
        <div className="updates-list">
          {updates.filter(u => u.resource_id === user?.id).length === 0 ? (
            <div className="empty-state">
              <p>No weekly updates found.</p>
              {!showForm && (
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                  <Plus size={18} />
                  Create First Update
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="updates-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {updates.filter(u => u.resource_id === user?.id).map(update => (
                    <React.Fragment key={update._id}>
                      <tr className="update-row">
                        <td>
                          <div className="week-cell">
                            <Calendar size={16} />
                            <span>
                              {formatDate(update.week_starting)} - {getWeekEnding(update.week_starting)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${update.status}`}>
                            {update.status}
                          </span>
                        </td>
                        <td>{formatDate(update.updated_at)}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-icon"
                              onClick={() => toggleExpand(update._id)}
                              title={expandedRow === update._id ? 'Collapse' : 'Expand'}
                            >
                              {expandedRow === update._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button 
                              className="btn-icon edit"
                              onClick={() => handleEdit(update)}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn-icon delete"
                              onClick={() => handleDelete(update._id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === update._id && (
                        <tr className="details-row">
                          <td colSpan={4}>
                            <div className="update-details">
                              <div className="detail-section">
                                <h4>Accomplishments</h4>
                                <p>{update.accomplishments || 'No accomplishments recorded.'}</p>
                              </div>
                              <div className="detail-section">
                                <h4>Challenges</h4>
                                <p>{update.challenges || 'No challenges recorded.'}</p>
                              </div>
                              <div className="detail-section">
                                <h4>Next Week Plans</h4>
                                <p>{update.next_week_plans || 'No plans recorded.'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Team/All View - Clients First Approach
        <div className="updates-list">
          {viewMode === 'clients' ? (
            // Clients List View
            <>
              <div className="clients-header">
                <h3>Clients</h3>
                <p>Select a client to view their resources and weekly updates</p>
              </div>
              {(() => {
                // Get unique clients from resources
                const clientsMap = new Map();
                resources.forEach(r => {
                  const clientName = r.client_name || 'No Client';
                  if (!clientsMap.has(clientName)) {
                    clientsMap.set(clientName, {
                      name: clientName,
                      resourceCount: 0,
                      lastUpdate: null
                    });
                  }
                  const client = clientsMap.get(clientName);
                  client.resourceCount++;
                  // Track the most recent update across all resources for this client
                  if (r.last_update) {
                    if (!client.lastUpdate || new Date(r.last_update.updated_at) > new Date(client.lastUpdate.updated_at)) {
                      client.lastUpdate = r.last_update;
                    }
                  }
                });
                
                // Apply manager filter if set
                let filteredResources = resources;
                if (managerFilter) {
                  filteredResources = resources.filter(r => r.manager_id === managerFilter);
                }
                
                // Recalculate clients based on filtered resources
                const filteredClientsMap = new Map();
                filteredResources.forEach(r => {
                  const clientName = r.client_name || 'No Client';
                  if (!filteredClientsMap.has(clientName)) {
                    filteredClientsMap.set(clientName, {
                      name: clientName,
                      resourceCount: 0,
                      lastUpdate: null
                    });
                  }
                  const client = filteredClientsMap.get(clientName);
                  client.resourceCount++;
                  if (r.last_update) {
                    if (!client.lastUpdate || new Date(r.last_update.updated_at) > new Date(client.lastUpdate.updated_at)) {
                      client.lastUpdate = r.last_update;
                    }
                  }
                });
                
                const clients = Array.from(filteredClientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                
                if (clients.length === 0) {
                  return (
                    <div className="empty-state">
                      <p>No clients found.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="clients-grid">
                    {clients.map(client => (
                      <div 
                        key={client.name} 
                        className="client-card"
                        onClick={() => handleClientClick(client.name)}
                      >
                        <div className="client-card-header">
                          <Building2 size={24} />
                          <h4>{client.name}</h4>
                        </div>
                        <div className="client-card-stats">
                          <span className="stat">
                            <User size={14} />
                            {client.resourceCount} {client.resourceCount === 1 ? 'Resource' : 'Resources'}
                          </span>
                          {client.lastUpdate ? (
                            <span className="stat update-status">
                              <Clock size={14} />
                              Last: {formatDate(client.lastUpdate.week_starting)}
                              <span className={`status-badge small ${client.lastUpdate.status}`}>
                                {client.lastUpdate.status}
                              </span>
                            </span>
                          ) : (
                            <span className="stat no-update">
                              <Clock size={14} />
                              No updates
                            </span>
                          )}
                        </div>
                        <div className="client-card-arrow">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            // Resources for Selected Client View
            <>
              <div className="resources-header">
                <button className="btn-secondary back-btn" onClick={handleBackToClients}>
                  <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                  Back to Clients
                </button>
                <h3>{selectedClient === 'No Client' ? 'Unassigned Resources' : `Resources for ${selectedClient}`}</h3>
              </div>
              {(() => {
                // Filter resources by selected client
                let clientResources = resources.filter(r => 
                  (r.client_name || 'No Client') === selectedClient
                );
                
                // Apply manager filter if set
                if (managerFilter) {
                  clientResources = clientResources.filter(r => r.manager_id === managerFilter);
                }
                
                // Apply resource filter if set
                if (resourceFilter) {
                  clientResources = clientResources.filter(r => r.id === resourceFilter);
                }
                
                if (clientResources.length === 0) {
                  return (
                    <div className="empty-state">
                      <p>No resources found for this client.</p>
                      <button className="btn-secondary" onClick={handleBackToClients}>
                        Back to Clients
                      </button>
                    </div>
                  );
                }
                
                return (
                  <div className="table-container">
                    <table className="updates-table resources-table">
                      <thead>
                        <tr>
                          <th>{isAdminCSP || hasGlobalView ? 'Name' : 'Resource Name'}</th>
                          <th>Role</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientResources.map(resource => (
                          <tr key={resource.id} className="resource-row">
                            <td>
                              <div className="resource-cell clickable" onClick={() => openResourceProfile(resource)}>
                                <User size={18} />
                                <span className="resource-name">{resource.username}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`role-badge ${resource.role_name?.toLowerCase()}`}>
                                {resource.role_name}
                              </span>
                            </td>
                            <td>
                              <div className="last-update-cell">
                                <Clock size={16} />
                                <span>
                                  {resource.last_update ? (
                                    <>
                                      {formatDate(resource.last_update.week_starting)} 
                                      <span className={`status-badge small ${resource.last_update.status}`}>
                                        {resource.last_update.status}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="no-update">No update submitted</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="btn-icon view"
                                  onClick={() => openResourceProfile(resource)}
                                  title="View Updates"
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  className="btn-icon remind"
                                  onClick={() => handleRemind(resource.id)}
                                  title="Send Reminder"
                                >
                                  <Bell size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Resource Profile Modal */}
      {showResourceModal && selectedResource && (() => {
        // Generate week options (last 4 weeks + current + next 2 weeks)
        const weekOptions = [];
        const today = new Date();
        const currentDay = today.getDay();
        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
        
        for (let i = -4; i <= 2; i++) {
          const weekDate = new Date(currentMonday);
          weekDate.setDate(currentMonday.getDate() + (i * 7));
          const weekStr = weekDate.toISOString().split('T')[0];
          const weekEnd = new Date(weekDate);
          weekEnd.setDate(weekDate.getDate() + 4);
          weekOptions.push({
            value: weekStr,
            label: `${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          });
        }
        
        // Filter update for selected week
        const selectedWeekUpdate = selectedResource.updates.find(u => {
          const updateWeek = new Date(u.week_starting).toISOString().split('T')[0];
          return updateWeek === modalWeekFilter;
        });
        
        return (
          <div className="modal-overlay" onClick={() => setShowResourceModal(false)}>
            <div className="modal-content resource-profile-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  <User size={20} />
                  {selectedResource.username}'s Weekly Update
                </h2>
                <div className="modal-actions">
                  <button 
                    className="btn-icon remind" 
                    onClick={() => handleRemind(selectedResource.id, modalWeekFilter)}
                    title="Send Reminder"
                  >
                    <Bell size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => setShowResourceModal(false)}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="resource-info">
                  <p><strong>Client:</strong> {selectedResource.client_name || '-'}</p>
                  <p><strong>Email:</strong> <a href={`mailto:${selectedResource.email}`} className="email-link">{selectedResource.email}</a></p>
                </div>
                
                {/* Week Filter */}
                <div className="modal-filter">
                  <label>Select Week:</label>
                  <select 
                    value={modalWeekFilter} 
                    onChange={(e) => setModalWeekFilter(e.target.value)}
                    className="filter-select"
                  >
                    {weekOptions.map(week => (
                      <option key={week.value} value={week.value}>{week.label}</option>
                    ))}
                  </select>
                </div>
                
                {/* Show update for selected week or "Yet to receive" message */}
                {selectedWeekUpdate ? (
                  <div className="update-card">
                    <div className="update-header">
                      <span className="update-week">
                        Week: {formatDate(selectedWeekUpdate.week_starting)} - {getWeekEnding(selectedWeekUpdate.week_starting)}
                      </span>
                      <span className={`status-badge ${selectedWeekUpdate.status}`}>
                        {selectedWeekUpdate.status}
                      </span>
                    </div>
                    <div className="update-content">
                      <div className="update-section">
                        <h4>Accomplishments</h4>
                        <p>{selectedWeekUpdate.accomplishments || 'None recorded'}</p>
                      </div>
                      <div className="update-section">
                        <h4>Challenges</h4>
                        <p>{selectedWeekUpdate.challenges || 'None recorded'}</p>
                      </div>
                      <div className="update-section">
                        <h4>Next Week Plans</h4>
                        <p>{selectedWeekUpdate.next_week_plans || 'None recorded'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state pending-update">
                    <div className="pending-icon">
                      <Clock size={48} />
                    </div>
                    <h3>Yet to receive an update</h3>
                    <p>No weekly update has been submitted for the week of {formatDate(modalWeekFilter)}.</p>
                    <button 
                      className="btn-primary remind-btn" 
                      onClick={() => handleRemind(selectedResource.id, modalWeekFilter)}
                    >
                      <Bell size={16} />
                      Send Reminder
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default WeeklyUpdates;

