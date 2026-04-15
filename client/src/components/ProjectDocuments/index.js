import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, AlertTriangle, Users, Calendar, TrendingUp, Shield, UserCircle, XCircle, GitPullRequest, CalendarCheck } from 'lucide-react';
import GovernanceCadence from '../GovernanceCadence';
import ProjectCharterTab from './tabs/ProjectCharterTab';
import ProjectPlanTab from './tabs/ProjectPlanTab';
import MilestonesTab from './tabs/MilestonesTab';
import StakeholdersTab from './tabs/StakeholdersTab';
import RaidLogTab from './tabs/RaidLogTab';
import RiskRegisterTab from './tabs/RiskRegisterTab';
import ResourceManagementTab from './tabs/ResourceManagementTab';
import ChangeManagementTab from './tabs/ChangeManagementTab';
import ClosureTab from './tabs/ClosureTab';
import CategoryModal from './modals/CategoryModal';
import MitigationModal from './modals/MitigationModal';
import '../ProjectDocuments.css';

function ProjectDocuments({ projectId, projectName, canEdit }) {
  const [activeTab, setActiveTab] = useState('charter');
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [raidViewMode, setRaidViewMode] = useState('table');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMitigation, setSelectedMitigation] = useState(null);
  const [showMitigationModal, setShowMitigationModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [selectedChange, setSelectedChange] = useState(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  const [raidFilters, setRaidFilters] = useState({
    Type: '',
    Category: '',
    Status: '',
    Severity: '',
    'Mitigation Strategy': ''
  });

  const [scopeIncluded, setScopeIncluded] = useState('');
  const [scopeExcluded, setScopeExcluded] = useState('');
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [savingScope, setSavingScope] = useState(false);

  const [planFilters, setPlanFilters] = useState({
    Phase: '',
    'Task Type': '',
    Owner: '',
    Status: '',
    'RAG Status': ''
  });

  const [resourceSearch, setResourceSearch] = useState('');

  const [riskFilters, setRiskFilters] = useState({
    'Impact Area': '',
    'Impact Rating': '',
    'Probability': '',
    'Risk Priority': '',
    'Status': '',
    'Risk Owner': '',
    'Mitigation Strategy': ''
  });

  const [closureFiles, setClosureFiles] = useState([]);
  const [closureUploading, setClosureUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [changeManagementFilters, setChangeManagementFilters] = useState({
    'Change ID': '',
    'Status': '',
    'Priority': '',
    'Impact': '',
    'Requester': ''
  });

  const [milestoneFilters, setMilestoneFilters] = useState({
    'Status': '',
    'Owner': '',
    'WBS': ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchScope();
  }, [projectId, projectName]);

  useEffect(() => {
    if (activeTab === 'closure') {
      fetchClosureFiles();
    }
  }, [activeTab, projectId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/projects/${projectId}/documents?projectName=${encodeURIComponent(projectName)}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScope = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/scope`);
      setScopeIncluded(response.data.scope_included || '');
      setScopeExcluded(response.data.scope_excluded || '');
    } catch (error) {
      console.error('Error fetching scope:', error);
    }
  };

  const saveScope = async () => {
    try {
      setSavingScope(true);
      await axios.put(`/api/projects/${projectId}/scope`, {
        scope_included: scopeIncluded,
        scope_excluded: scopeExcluded
      });
      setIsEditingScope(false);
    } catch (error) {
      console.error('Error saving scope:', error);
      alert('Failed to save scope');
    } finally {
      setSavingScope(false);
    }
  };

  const fetchClosureFiles = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/closure-documents`);
      setClosureFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching closure files:', error);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleClosureUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setClosureUploading(true);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    
    try {
      await axios.post(`/api/projects/${projectId}/closure-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFiles([]);
      fetchClosureFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setClosureUploading(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/closure-documents/download/${encodeURIComponent(filename)}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await axios.delete(`/api/projects/${projectId}/closure-documents/${encodeURIComponent(filename)}`);
      fetchClosureFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const tabs = [
    { id: 'charter', label: 'Project Charter', icon: FileText },
    { id: 'plan', label: 'Project Plan', icon: Calendar },
    { id: 'milestones', label: 'Milestone Tracker', icon: TrendingUp },
    { id: 'stakeholders', label: 'Stakeholder Register', icon: Users },
    { id: 'governance', label: 'Governance & Cadences', icon: CalendarCheck },
    { id: 'raid', label: 'RAID Log', icon: AlertTriangle },
    { id: 'cadence', label: 'Risk Register', icon: Shield },
    { id: 'resource', label: 'Resource Management', icon: UserCircle },
    { id: 'change', label: 'Change Management', icon: GitPullRequest },
    { id: 'closure', label: 'Project Closure', icon: XCircle }
  ];

  const resetFilters = (filterSet, defaultFilters) => {
    filterSet(defaultFilters);
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-state">Loading documents...</div>;
    }

    switch (activeTab) {
      case 'charter':
        return (
          <ProjectCharterTab
            documents={documents}
            projectName={projectName}
            scopeIncluded={scopeIncluded}
            scopeExcluded={scopeExcluded}
            isEditingScope={isEditingScope}
            savingScope={savingScope}
            canEdit={canEdit}
            setScopeIncluded={setScopeIncluded}
            setScopeExcluded={setScopeExcluded}
            setIsEditingScope={setIsEditingScope}
            saveScope={saveScope}
            fetchScope={fetchScope}
          />
        );
      case 'plan':
        return (
          <ProjectPlanTab
            documents={documents}
            planFilters={planFilters}
            setPlanFilters={setPlanFilters}
            selectedTask={selectedTask}
            setSelectedTask={setSelectedTask}
            showTaskModal={showTaskModal}
            setShowTaskModal={setShowTaskModal}
          />
        );
      case 'milestones':
        return (
          <MilestonesTab
            documents={documents}
            milestoneFilters={milestoneFilters}
            setMilestoneFilters={setMilestoneFilters}
            selectedMilestone={selectedMilestone}
            setSelectedMilestone={setSelectedMilestone}
            showMilestoneModal={showMilestoneModal}
            setShowMilestoneModal={setShowMilestoneModal}
          />
        );
      case 'stakeholders':
        return (
          <StakeholdersTab
            documents={documents}
            stakeholderSearch={stakeholderSearch}
            setStakeholderSearch={setStakeholderSearch}
            selectedStakeholder={selectedStakeholder}
            setSelectedStakeholder={setSelectedStakeholder}
            showStakeholderModal={showStakeholderModal}
            setShowStakeholderModal={setShowStakeholderModal}
          />
        );
      case 'governance':
        return <GovernanceCadence documents={documents} />;
      case 'raid':
        return (
          <RaidLogTab
            documents={documents}
            raidFilters={raidFilters}
            setRaidFilters={setRaidFilters}
            raidViewMode={raidViewMode}
            setRaidViewMode={setRaidViewMode}
            setSelectedCategory={setSelectedCategory}
            setShowCategoryModal={setShowCategoryModal}
            setSelectedMitigation={setSelectedMitigation}
            setShowMitigationModal={setShowMitigationModal}
          />
        );
      case 'cadence':
        return (
          <RiskRegisterTab
            documents={documents}
            riskFilters={riskFilters}
            setRiskFilters={setRiskFilters}
            selectedRisk={selectedRisk}
            setSelectedRisk={setSelectedRisk}
            showRiskModal={showRiskModal}
            setShowRiskModal={setShowRiskModal}
          />
        );
      case 'resource':
        return (
          <ResourceManagementTab
            documents={documents}
            resourceSearch={resourceSearch}
            setResourceSearch={setResourceSearch}
          />
        );
      case 'change':
        return (
          <ChangeManagementTab
            documents={documents}
            changeManagementFilters={changeManagementFilters}
            setChangeManagementFilters={setChangeManagementFilters}
            selectedChange={selectedChange}
            setSelectedChange={setSelectedChange}
            showChangeModal={showChangeModal}
            setShowChangeModal={setShowChangeModal}
          />
        );
      case 'closure':
        return (
          <ClosureTab
            closureFiles={closureFiles}
            selectedFiles={selectedFiles}
            closureUploading={closureUploading}
            handleFileSelect={handleFileSelect}
            handleClosureUpload={handleClosureUpload}
            handleDownload={handleDownload}
            handleDelete={handleDelete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="project-documents">
      <div className="documents-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`doc-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="documents-content">
        {renderContent()}
      </div>
      {showCategoryModal && selectedCategory && (
        <CategoryModal
          selectedCategory={selectedCategory}
          documents={documents}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
      {showMitigationModal && selectedMitigation && (
        <MitigationModal
          selectedMitigation={selectedMitigation}
          documents={documents}
          onClose={() => setShowMitigationModal(false)}
        />
      )}
    </div>
  );
}

export default ProjectDocuments;
