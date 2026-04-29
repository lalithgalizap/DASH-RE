import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import MetricsCards from '../components/MetricsCards';
import ProjectsTable from '../components/ProjectsTable';
import ImportModal from '../components/ImportModal';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { hasPermission, canAddClients } = useAuth();
  const [allProjects, setAllProjects] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [filters, setFilters] = useState({
    status: 'All',
    client: 'All'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorPopup, setErrorPopup] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, metricsRes, fileStatusRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/metrics'),
        axios.get('/api/projects-file-status')
      ]);

      const fileStatusMap = new Map(
        (fileStatusRes.data?.projects || []).map(item => [String(item.projectId), item])
      );

      const projectsWithLastModified = projectsRes.data.map(project => {
        const fileInfo = fileStatusMap.get(String(project._id || project.id));
        return { ...project, lastModified: fileInfo?.lastModified || null };
      });

      setAllProjects(projectsWithLastModified);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredProjects = allProjects.filter(project => {
    // Search filter (project name or client)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = (project.name || '').toLowerCase().includes(query);
      const clientMatch = (project.client || project.clients || '').toLowerCase().includes(query);
      if (!nameMatch && !clientMatch) return false;
    }
    
    // Status filter
    if (filters.status !== 'All' && project.status !== filters.status) {
      return false;
    }
    
    // Client filter (case-insensitive)
    if (filters.client !== 'All') {
      if (!project.clients) return false;
      const projectClients = project.clients.split(',').map(c => c.trim().toLowerCase());
      if (!projectClients.includes(filters.client.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowImportModal(false);
      fetchData();
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file. Please check the format.');
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await axios.put(`/api/projects/${editingProject.id}`, projectData);
      } else {
        await axios.post('/api/projects', projectData);
      }
      setShowProjectModal(false);
      setEditingProject(null);
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Error saving project. Please try again.';
      setErrorPopup({ show: true, message });
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/api/projects/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleUpdateField = async (projectId, field, value) => {
    console.log(`[UPDATE] Starting: project ${projectId}, ${field} = ${value}`);
    
    try {
      // Send update to server first
      const response = await axios.patch(`/api/projects/${projectId}/${field}`, { value });
      console.log('[UPDATE] Server response:', response.data);
      
      // Small delay to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then refresh data to ensure consistency
      console.log('[UPDATE] Refreshing data...');
      await fetchData();
      console.log('[UPDATE] Complete!');
    } catch (error) {
      console.error(`[UPDATE] Error updating ${field}:`, error);
      if (error.response) {
        console.error('[UPDATE] Error response:', error.response.data);
      }
      alert(`Failed to update ${field}. Please try again.`);
      fetchData();
    }
  };

  return (
    <div className="container">
      <MetricsCards metrics={metrics} />
      
      <ProjectsTable
        projects={filteredProjects}
        allProjects={allProjects}
        filters={filters}
        onFilterChange={setFilters}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        onNewProject={() => {
          setEditingProject(null);
          setShowProjectModal(true);
        }}
        onUpdateField={handleUpdateField}
        loading={loading}
        canAddDelete={hasPermission('projects', 'add_delete')}
        canEdit={hasPermission('projects', 'edit')}
        canImport={hasPermission('import', 'manage')}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          canManageClients={hasPermission('clients', 'manage')}
          canAddClients={hasPermission('clients', 'manage')}
        />
      )}

      {/* Error Popup */}
      {errorPopup.show && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setErrorPopup({ show: false, message: '' })}
        >
          <div 
            style={{ 
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#1f2937' }}>Error</h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
              {errorPopup.message}
            </p>
            <button
              onClick={() => setErrorPopup({ show: false, message: '' })}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
