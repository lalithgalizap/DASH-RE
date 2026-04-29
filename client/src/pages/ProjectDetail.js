import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Upload, ArrowLeft } from 'lucide-react';
import ProjectModal from '../components/ProjectModal';
import DetailsModal from '../components/DetailsModal';
import ExcelUploadModal from '../components/ExcelUploadModal';
import ProjectDocuments from '../components/ProjectDocuments';
import ProjectDashboard from '../components/ProjectDashboard';
import { useAuth } from '../contexts/AuthContext';
import './ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [errorPopup, setErrorPopup] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const [projectRes, fileStatusRes] = await Promise.all([
        axios.get(`/api/projects/${id}`),
        axios.get('/api/projects-file-status')
      ]);

      const projectData = projectRes.data;
      const fileStatusList = fileStatusRes.data?.projects || [];
      const fileInfo = fileStatusList.find(
        f => String(f.projectId) === String(projectData._id || projectData.id)
      );
      projectData.lastModified = fileInfo?.lastModified || null;

      setProject(projectData);
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      await axios.put(`/api/projects/${id}`, projectData);
      setShowProjectModal(false);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error saving project:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Error saving project. Please try again.';
      setErrorPopup({ show: true, message });
    }
  };


  const handleSaveDetails = async (detailsData) => {
    try {
      const updatedProject = { ...project, ...detailsData };
      await axios.put(`/api/projects/${id}`, updatedProject);
      setShowDetailsModal(false);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error saving details:', error);
      alert('Error saving details. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="loading">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="error">Project not found</div>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail-container">
        {/* Main Content */}
        <main className="project-main project-main-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button className="back-btn-inline" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              Back to Projects
            </button>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {(hasPermission('projects', 'add_delete') || hasPermission('projects', 'edit')) && (
                <>
                  {hasPermission('projects', 'add_delete') && (
                    <button className="action-btn upload-btn" onClick={() => setShowUploadModal(true)}>
                      <Upload size={16} />
                      Upload Document
                    </button>
                  )}
                  {hasPermission('projects', 'edit') && (
                    <button className="action-btn edit-btn" onClick={() => setShowProjectModal(true)}>
                      <Edit size={16} />
                      Edit Project
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Project Dashboard */}
          <ProjectDashboard 
            projectId={id} 
            projectName={project.name} 
            project={project}
          />

          {/* Documents Section */}
          <section className="content-section documents-section">
            <ProjectDocuments projectId={id} projectName={project?.name} canEdit={hasPermission('projects', 'edit')} />
          </section>
        </main>
      </div>

      {showProjectModal && (
        <ProjectModal
          project={project}
          onClose={() => setShowProjectModal(false)}
          onSave={handleSaveProject}
          isAdmin={isAdmin() === true}
          canManageClients={hasPermission('projects', 'edit')}
          canAddClients={hasPermission('clients', 'manage')}
        />
      )}

      {showDetailsModal && (
        <DetailsModal
          project={project}
          onClose={() => setShowDetailsModal(false)}
          onSave={handleSaveDetails}
        />
      )}

      {showUploadModal && (
        <ExcelUploadModal
          currentProject={project}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchProjectDetails}
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

export default ProjectDetail;
