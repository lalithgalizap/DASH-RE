import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronLeft, Users, User, Building2,
  Upload, FileText, X, CheckCircle, Trash2, Calendar, Pencil,
  BarChart3, TrendingUp, FileBarChart, Filter, Info, Search, Eye
} from 'lucide-react';
import './Performance.css';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

function Performance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [view, setView] = useState(searchParams.get('view') || 'clients');
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ quarter: 'Q1', year: new Date().getFullYear(), file: null });
  const [extracting, setExtracting] = useState(false);
  const [extractData, setExtractData] = useState(null);

  // Review/confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmForm, setConfirmForm] = useState({});

  // Report detail modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Edit state
  const [editingReport, setEditingReport] = useState(null);

  // Metrics / dashboard state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [noReportResources, setNoReportResources] = useState([]);
  const [showNoReportModal, setShowNoReportModal] = useState(false);
  const [noReportSearch, setNoReportSearch] = useState('');
  const [noReportRoleFilter, setNoReportRoleFilter] = useState('all'); // 'all' | 'manager' | 'resource'

  // All resources state and filters
  const [allResources, setAllResources] = useState([]);
  const [resourceFilters, setResourceFilters] = useState({
    client: '',
    status: '',
    search: ''
  });

  // Report filters for reports view
  const [reportFilters, setReportFilters] = useState({
    quarter: '',
    year: ''
  });

  const { user, canManagePerformance, canViewGlobalPerformance } = useAuth();

  useEffect(() => {
    fetchClients();
    fetchMetrics();
    fetchAllResources();
    
    // Refresh data when window regains focus (user returns from edit page)
    const handleFocus = () => {
      fetchMetrics();
      fetchAllResources();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/performance/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const url = selectedClientFilter
        ? `/api/performance/metrics?client_id=${selectedClientFilter}`
        : '/api/performance/metrics';
      const response = await axios.get(url);
      setMetrics(response.data);
      const combined = [
        ...(response.data.resourcesWithoutReport || []),
        ...(response.data.managersWithoutReport || [])
      ];
      setNoReportResources(combined);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchResources = useCallback(async (clientId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/performance/resources?client_id=${clientId}`);
      setResources(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllResources = useCallback(async () => {
    try {
      const response = await axios.get('/api/performance/resources');
      setAllResources(response.data);
    } catch (error) {
      console.error('Error fetching all resources:', error);
    }
  }, []);

  const fetchReports = useCallback(async (resourceId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/performance/reports?resource_id=${resourceId}`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore state from URL params when clients load
  useEffect(() => {
    if (clients.length === 0) return;

    const urlView = searchParams.get('view');
    const clientId = searchParams.get('client_id');
    const resourceId = searchParams.get('resource_id');

    if (urlView === 'resources' && clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client && !selectedClient) {
        setSelectedClient(client);
        setSelectedClientFilter(clientId);
        setView('resources');
        fetchResources(clientId);
      }
    } else if (urlView === 'reports' && clientId && resourceId) {
      const client = clients.find(c => c.id === clientId);
      if (client && !selectedClient) {
        setSelectedClient(client);
        setSelectedClientFilter(clientId);
        setView('reports');
        fetchResources(clientId).then((fetchedResources) => {
          const resource = fetchedResources.find(r => r.id === resourceId);
          if (resource) {
            setSelectedResource(resource);
            fetchReports(resourceId);
          }
        });
      }
    }
  }, [clients, searchParams, selectedClient, fetchResources, fetchReports]);

  // Sync view state with URL params
  useEffect(() => {
    const currentView = searchParams.get('view') || 'clients';
    if (currentView !== view) {
      setView(currentView);
    }
  }, [searchParams]);

  const updateUrlParams = (newView, clientId = null, resourceId = null) => {
    const params = new URLSearchParams();
    if (newView && newView !== 'clients') params.set('view', newView);
    if (clientId) params.set('client_id', clientId);
    if (resourceId) params.set('resource_id', resourceId);
    setSearchParams(params);
  };

  const handleResourceClick = (resource) => {
    setSelectedResource(resource);
    // If selectedClient is not set (e.g., clicking from All Resources table), find and set the client
    if (!selectedClient && resource.client_id) {
      const client = clients.find(c => c.id === resource.client_id);
      if (client) setSelectedClient(client);
    }
    setView('reports');
    updateUrlParams('reports', selectedClient?.id || resource?.client_id, resource.id);
    fetchReports(resource.id);
  };

  const goToResourceFromModal = (resource) => {
    const client = clients.find(c => c.id === resource.client_id);
    if (client) setSelectedClient(client);
    setSelectedResource({ id: resource.id, username: resource.username });
    setView('reports');
    updateUrlParams('reports', resource.client_id, resource.id);
    fetchReports(resource.id);
    setShowNoReportModal(false);
  };

  const handleBack = () => {
    if (view === 'reports') {
      setView('resources');
      setSelectedResource(null);
      setReports([]);
      updateUrlParams('resources', selectedClient?.id);
    } else if (view === 'resources') {
      setView('clients');
      setSelectedClient(null);
      setSelectedClientFilter('');
      setResources([]);
      updateUrlParams('clients');
    }
  };

  // ---- UPLOAD FLOW ----
  const openUpload = () => {
    setShowUpload(true);
    setUploadForm({ quarter: 'Q1', year: new Date().getFullYear(), file: null });
    setExtractData(null);
    setShowConfirm(false);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleExtract = async () => {
    if (!uploadForm.file) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('pdf', uploadForm.file);
      const response = await axios.post('/api/performance/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractData(response.data);
      // Pre-populate confirm form with extracted data
      const s = response.data.suggestions || {};
      setConfirmForm({
        quarter: uploadForm.quarter,
        year: uploadForm.year,
        period_start: '', period_end: '',
        overall_status: s.overall_status || '',
        overall_reasons: s.overall_reasons || '',
        delivery: s.delivery || '',
        delivery_comments: s.delivery_comments || '',
        quality: s.quality || '',
        quality_comments: s.quality_comments || '',
        rework: s.rework || '',
        rework_comments: s.rework_comments || '',
        communication: s.communication || '',
        communication_comments: s.communication_comments || '',
        strengths: s.strengths || '',
        areas_of_improvement: s.areas_of_improvement || '',
        support_needed: s.support_needed || '',
        recommendation: s.recommendation || '',
        extracted_raw_text: response.data.extracted_text || '',
        resource_name: s.resource_name || '',
        resource_id_string: s.resource_id_string || '',
        role_team: s.role_team || '',
        manager_name: s.manager_name || '',
        prepared_by: s.prepared_by || '',
        prepared_on: s.prepared_on || ''
      });
      setShowUpload(false);
      setShowConfirm(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      // Get client_id from selectedClient or fallback to selectedResource.client_id
      const clientId = selectedClient?.id || selectedResource?.client_id || selectedResource?.clientId;
      if (!clientId) {
        alert('Error: Could not determine client for this resource');
        return;
      }
      
      const isManagerRole = String(selectedResource.role_name || selectedResource.role || '').toLowerCase() === 'manager';
      const payload = {
        resource_id: selectedResource.id,
        client_id: clientId,
        manager_id: selectedResource.manager_id || selectedResource.managerId || (isManagerRole ? selectedResource.id : user?.id || ''),
        ...confirmForm
      };
      if (editingReport) {
        await axios.put(`/api/performance/reports/${editingReport}`, payload);
      } else {
        await axios.post('/api/performance/reports', payload);
      }
      setShowConfirm(false);
      setConfirmForm({});
      setExtractData(null);
      setEditingReport(null);
      fetchReports(selectedResource.id);
      fetchMetrics();
      // Refresh resources list to update latest_report data
      if (selectedClient?.id) {
        fetchResources(selectedClient.id);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save report');
    }
  };

  const openEditReport = (report) => {
    setEditingReport(report.id);
    setConfirmForm({
      quarter: report.quarter,
      year: report.year,
      period_start: report.period_start || '',
      period_end: report.period_end || '',
      overall_status: report.overall_status || '',
      overall_reasons: report.overall_reasons || '',
      delivery: report.delivery || '',
      delivery_comments: report.delivery_comments || '',
      quality: report.quality || '',
      quality_comments: report.quality_comments || '',
      rework: report.rework || '',
      rework_comments: report.rework_comments || '',
      communication: report.communication || '',
      communication_comments: report.communication_comments || '',
      strengths: report.strengths || '',
      areas_of_improvement: report.areas_of_improvement || '',
      support_needed: report.support_needed || '',
      recommendation: report.recommendation || '',
      extracted_raw_text: report.extracted_raw_text || '',
      resource_name: report.resource_name || '',
      resource_id_string: report.resource_id_string || '',
      role_team: report.role_team || '',
      manager_name: report.manager_name || '',
      prepared_by: report.prepared_by || '',
      prepared_on: report.prepared_on || ''
    });
    setShowConfirm(true);
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await axios.delete(`/api/performance/reports/${reportId}`);
      fetchReports(selectedResource.id);
    } catch (error) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const statusColor = (status) => {
    switch (status) {
      case 'red': return '#ef4444';
      case 'amber': return '#f59e0b';
      case 'green': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  const statusLabel = (val, mapping) => mapping[val] || '—';

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const Gauge = ({ percentage, label, sublabel, color }) => {
    // Calculate needle rotation (-90 to 90 degrees)
    const rotation = -90 + (percentage * 1.8);

    // SVG arc parameters
    const centerX = 90;
    const centerY = 90;
    const radius = 70;
    const strokeWidth = 18;

    // Create arc path for 180 degrees (semi-circle)
    const arcPath = (startAngle, endAngle) => {
      const start = polarToCartesian(centerX, centerY, radius, endAngle);
      const end = polarToCartesian(centerX, centerY, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const polarToCartesian = (cx, cy, r, angle) => {
      const angleInRadians = (angle - 180) * Math.PI / 180;
      return {
        x: cx + r * Math.cos(angleInRadians),
        y: cy + r * Math.sin(angleInRadians)
      };
    };

    // Arc segments: Red (0-33%), Amber (33-66%), Green (66-100%)
    const redPath = arcPath(0, 60);
    const amberPath = arcPath(60, 120);
    const greenPath = arcPath(120, 180);

    return (
      <div className="gauge-wrapper">
        <div className="gauge-container">
          <svg className="gauge-svg" viewBox="0 0 180 100">
            {/* Background arc (gray) */}
            <path d={arcPath(0, 180)} className="gauge-bg-arc" />

            {/* Colored segments - Red (left/poor) */}
            <path d={redPath} fill="none" stroke="#ef4444" strokeWidth={strokeWidth} strokeLinecap="butt" />

            {/* Amber (middle/average) */}
            <path d={amberPath} fill="none" stroke="#f59e0b" strokeWidth={strokeWidth} strokeLinecap="butt" />

            {/* Green (right/excellent) */}
            <path d={greenPath} fill="none" stroke="#22c55e" strokeWidth={strokeWidth} strokeLinecap="butt" />
          </svg>

          {/* Needle */}
          <div className="gauge-needle-wrapper">
            <div className="gauge-needle" style={{ transform: `rotate(${rotation}deg)` }}></div>
          </div>
          <div className="gauge-center"></div>
          <div className="gauge-score-number">{percentage}%</div>
        </div>
        <div className="gauge-label" style={{ color }}>{label}</div>
        <div className="gauge-sublabel">{sublabel}</div>
      </div>
    );
  };

  if (loading && view === 'clients') {
    return (
      <div className="performance-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-page">
      <div className="performance-header">
        {view !== 'clients' && (
          <button className="back-btn" onClick={handleBack}>
            <ChevronLeft size={18} />
            Back
          </button>
        )}
      </div>

      {view !== 'clients' && (
        <div className="breadcrumb">
          <span className={view === 'clients' ? 'active' : ''}>Clients</span>
          <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
          <span className={view === 'resources' ? 'active' : ''}>{selectedClient?.name || 'Client'}</span>
          {view === 'reports' && (
            <>
              <ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
              <span className="active">{selectedResource?.username || 'Resource'}</span>
            </>
          )}
        </div>
      )}

      {/* CLIENTS VIEW */}
      {view === 'clients' && (
        <>
          {/* Last Updated Info */}
          {metrics?.lastUpdatedAt && (
            <div className="last-updated-row">
              <span>Last updated: {new Date(metrics.lastUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}

          {/* Dashboard Metrics */}
          {metrics && (
            <div className="metrics-cards-row three-col">
              <div className="metric-card-large metric-card-compact">
                <h5>Overall Performance</h5>
                <div className="metric-card-body">
                  <div className="metric-gauge-left">
                    <Gauge
                      percentage={metrics.totalWithLatestReport > 0 ? metrics.overallScore : 0}
                      label={metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 85 ? 'Excellent'
                        : metrics.overallScore >= 70 ? 'Good'
                        : metrics.overallScore >= 50 ? 'Average'
                        : metrics.overallScore >= 33 ? 'Below Average'
                        : 'Poor'
                        : 'N/A'}
                      color={metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 70 ? '#22c55e'
                        : metrics.overallScore >= 50 ? '#f59e0b'
                        : '#ef4444'
                        : '#94a3b8'}
                      sublabel={metrics.totalWithLatestReport > 0
                        ? `Score: ${(metrics.overallScore / 20).toFixed(1)} / 5`
                        : 'No reports'}
                    />
                  </div>
                  <div className="metric-text-right">
                    <div className="metric-big-value" style={{ color: metrics.totalWithLatestReport > 0 ? (metrics.overallScore >= 70 ? '#22c55e' : metrics.overallScore >= 50 ? '#f59e0b' : '#ef4444') : '#94a3b8' }}>
                      {metrics.totalWithLatestReport > 0 ? `${metrics.overallScore}%` : '—'}
                    </div>
                    <div className="metric-big-label">
                      {metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 85 ? 'Excellent'
                        : metrics.overallScore >= 70 ? 'Good'
                        : metrics.overallScore >= 50 ? 'Average'
                        : metrics.overallScore >= 33 ? 'Below Average'
                        : 'Poor'
                        : 'N/A'}
                    </div>
                    <div className="metric-big-sublabel">
                      {metrics.totalWithLatestReport > 0
                        ? `${metrics.totalWithLatestReport} rated of ${(metrics.totalResources || 0) + (metrics.totalManagers || 0)}`
                        : 'No performance reports'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="metric-card-large metric-card-compact"
                onClick={() => (metrics.totalWithoutReport?.total || noReportResources.length) > 0 && setShowNoReportModal(true)}
                style={{ cursor: (metrics.totalWithoutReport?.total || noReportResources.length) > 0 ? 'pointer' : 'default' }}
              >
                <h5>Total Resources</h5>
                <div className="metric-card-body total-resources-body">
                  <div className="metric-big-value">{metrics.totalResources + (metrics.totalManagers || 0)}</div>
                  <div className="metric-text-block">
                    <div className="metric-big-label">Resources &amp; Managers</div>
                    {metrics.totalWithoutReport?.total > 0 ? (
                      <div className="metric-missing-breakdown">
                        <span className="highlight-missing">Without Reports: {metrics.totalWithoutReport.total}</span>
                        <div className="missing-detail">
                          <span className="missing-dot manager-dot"></span> Managers: {metrics.totalWithoutReport.managers}
                          <span className="missing-dot resource-dot"></span> Resources: {metrics.totalWithoutReport.resources}
                        </div>
                      </div>
                    ) : (
                      <div className="metric-all-good">
                        <CheckCircle size={14} color="#22c55e" /> All have reports
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="metric-card-large">
                <h5>Performance Distribution</h5>
                <div className="distribution-list">
                  {metrics.statusDistribution.filter(s => s.value > 0).map(s => (
                    <div key={s.name} className="dist-row">
                      <span className="dist-dot" style={{ background: s.color }}></span>
                      <span className="dist-name">{s.name}</span>
                      <span className="dist-count">{s.value}</span>
                      <span className="dist-pct">{Math.round(s.value / metrics.totalWithLatestReport * 100)}%</span>
                    </div>
                  ))}
                  {metrics.totalWithLatestReport === 0 && <div className="dist-empty">No reports yet</div>}
                </div>
              </div>
            </div>
          )}

          {clients.length === 0 ? (
            <div className="empty-state">
              <Building2 size={40} color="#cbd5e1" />
              <h3>No clients found</h3>
              <p>Clients will appear once resources are assigned to them.</p>
            </div>
          ) : (
            <div className="full-width">
              {/* All Resources with Filters */}
              <div className="all-resources-section">
                <div className="table-section-header">
                  <h3>All Resources</h3>
                  <span className="table-count">{allResources.length} resources</span>
                </div>

                {/* Resource Filters */}
                <div className="resource-filters compact">
                  <div className="filter-group">
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={resourceFilters.search}
                      onChange={e => setResourceFilters({ ...resourceFilters, search: e.target.value })}
                      className="filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <select
                      value={resourceFilters.client}
                      onChange={e => setResourceFilters({ ...resourceFilters, client: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">All Clients</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <select
                      value={resourceFilters.status}
                      onChange={e => setResourceFilters({ ...resourceFilters, status: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">All Recommendations</option>
                      <option value="continue_strong">Continue (Strong)</option>
                      <option value="continue_meets">Continue (Meets)</option>
                      <option value="continue_improvement">Continue (Plan)</option>
                      <option value="role_change">Role Change</option>
                      <option value="replacement">Replacement/Backfill</option>
                      <option value="none">No Report</option>
                    </select>
                  </div>
                </div>

                <div className="data-table-container">
                  <table className="perf-data-table resources-table">
                    <thead>
                      <tr>
                        <th>RESOURCE</th>
                        <th>CLIENT</th>
                        <th>ROLE / TEAM</th>
                        <th>RECOMMENDATION</th>
                        <th>RATING</th>
                        <th>LAST REPORT</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allResources
                        .filter(r => {
                          const matchesSearch = !resourceFilters.search || r.username?.toLowerCase().includes(resourceFilters.search.toLowerCase());
                          const matchesClient = !resourceFilters.client || r.client_id === resourceFilters.client;
                          const matchesStatus = !resourceFilters.status || 
                            (resourceFilters.status === 'none' ? !r.latest_report : r.latest_report?.recommendation === resourceFilters.status);
                          return matchesSearch && matchesClient && matchesStatus;
                        })
                        .map(resource => {
                          const clientName = clients.find(c => c.id === resource.client_id)?.name || '—';
                          const lastReportDate = resource.latest_report?.updatedAt 
                            ? `${new Date(resource.latest_report.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${resource.latest_report.quarter ? (resource.latest_report.quarter.toString().startsWith('Q') ? resource.latest_report.quarter : `Q${resource.latest_report.quarter}`) : '—'} ${resource.latest_report.year || '—'}`
                            : '—';
                          return (
                            <tr key={resource.id} className="perf-table-row" onClick={() => handleResourceClick(resource)}>
                              <td>
                                <div className="resource-cell">
                                  <div className="resource-avatar" style={{ background: getAvatarColor(resource.username) }}>
                                    {getInitials(resource.username)}
                                  </div>
                                  <span className="resource-name">{resource.username}</span>
                                </div>
                              </td>
                              <td>{clientName}</td>
                              <td>
                                <span className="role-team-text">
                                  {resource.latest_report?.role_team || resource.role_name || '—'}
                                </span>
                              </td>
                              <td>
                                <span className={`recommendation-badge ${resource.latest_report?.recommendation || 'none'}`}>
                                  {(() => {
                                    const rec = resource.latest_report?.recommendation;
                                    if (!rec) return '—';
                                    const recMap = {
                                      continue_strong: 'Continue (Strong)',
                                      continue_meets: 'Continue (Meets)',
                                      continue_improvement: 'Continue (Plan)',
                                      role_change: 'Role Change Recommended',
                                      replacement: 'Replacement/Backfill Recommended'
                                    };
                                    return recMap[rec] || rec;
                                  })()}
                                </span>
                              </td>
                              <td>
                                <div className="rating-display">
                                  {resource.latest_report?.rating ? (
                                    <>
                                      <span className="rating-value">{resource.latest_report.rating}</span>
                                      <span className="rating-stars">{'★'.repeat(Math.round(resource.latest_report.rating))}{'☆'.repeat(5 - Math.round(resource.latest_report.rating))}</span>
                                    </>
                                  ) : (
                                    <span className="rating-empty">—</span>
                                  )}
                                </div>
                              </td>
                              <td>{lastReportDate}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="action-btn view-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResourceClick(resource);
                                    }}
                                    title="View Details"
                                  >
                                    <Eye size={22} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* RESOURCES VIEW */}
      {view === 'resources' && (
        <>
          {/* Dashboard Metrics for selected client */}
          {metrics && selectedClient && (
            <div className="metrics-cards-row three-col">
              <div className="metric-card-large metric-card-compact">
                <h5>Overall Performance</h5>
                <div className="metric-card-body">
                  <div className="metric-gauge-left">
                    <Gauge
                      percentage={metrics.totalWithLatestReport > 0 ? metrics.overallScore : 0}
                      label={metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 85 ? 'Excellent'
                        : metrics.overallScore >= 70 ? 'Good'
                        : metrics.overallScore >= 50 ? 'Average'
                        : metrics.overallScore >= 33 ? 'Below Average'
                        : 'Poor'
                        : 'N/A'}
                      color={metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 70 ? '#22c55e'
                        : metrics.overallScore >= 50 ? '#f59e0b'
                        : '#ef4444'
                        : '#94a3b8'}
                      sublabel={metrics.totalWithLatestReport > 0
                        ? `Score: ${(metrics.overallScore / 20).toFixed(1)} / 5`
                        : 'No reports'}
                    />
                  </div>
                  <div className="metric-text-right">
                    <div className="metric-big-value" style={{ color: metrics.totalWithLatestReport > 0 ? (metrics.overallScore >= 70 ? '#22c55e' : metrics.overallScore >= 50 ? '#f59e0b' : '#ef4444') : '#94a3b8' }}>
                      {metrics.totalWithLatestReport > 0 ? `${metrics.overallScore}%` : '—'}
                    </div>
                    <div className="metric-big-label">
                      {metrics.totalWithLatestReport > 0
                        ? metrics.overallScore >= 85 ? 'Excellent'
                        : metrics.overallScore >= 70 ? 'Good'
                        : metrics.overallScore >= 50 ? 'Average'
                        : metrics.overallScore >= 33 ? 'Below Average'
                        : 'Poor'
                        : 'N/A'}
                    </div>
                    <div className="metric-big-sublabel">
                      {metrics.totalWithLatestReport > 0
                        ? `${metrics.totalWithLatestReport} rated of ${(metrics.totalResources || 0) + (metrics.totalManagers || 0)}`
                        : 'No performance reports'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="metric-card-large metric-card-compact"
                onClick={() => (metrics.totalWithoutReport?.total || noReportResources.length) > 0 && setShowNoReportModal(true)}
                style={{ cursor: (metrics.totalWithoutReport?.total || noReportResources.length) > 0 ? 'pointer' : 'default' }}
              >
                <h5>Total Resources</h5>
                <div className="metric-card-body total-resources-body">
                  <div className="metric-big-value">{metrics.totalResources + (metrics.totalManagers || 0)}</div>
                  <div className="metric-text-block">
                    <div className="metric-big-label">Resources &amp; Managers</div>
                    {metrics.totalWithoutReport?.total > 0 ? (
                      <div className="metric-missing-breakdown">
                        <span className="highlight-missing">Without Reports: {metrics.totalWithoutReport.total}</span>
                        <div className="missing-detail">
                          <span className="missing-dot manager-dot"></span> Managers: {metrics.totalWithoutReport.managers}
                          <span className="missing-dot resource-dot"></span> Resources: {metrics.totalWithoutReport.resources}
                        </div>
                      </div>
                    ) : (
                      <div className="metric-all-good">
                        <CheckCircle size={14} color="#22c55e" /> All have reports
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="metric-card-large">
                <h5>Performance Distribution</h5>
                <div className="distribution-list">
                  {metrics.statusDistribution.filter(s => s.value > 0).map(s => (
                    <div key={s.name} className="dist-row">
                      <span className="dist-dot" style={{ background: s.color }}></span>
                      <span className="dist-name">{s.name}</span>
                      <span className="dist-count">{s.value}</span>
                      <span className="dist-pct">{Math.round(s.value / metrics.totalWithLatestReport * 100)}%</span>
                    </div>
                  ))}
                  {metrics.totalWithLatestReport === 0 && <div className="dist-empty">No reports yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="perf-page-header">
            <div className="perf-page-title">
              <h1>Resource Performance Details <span className="client-badge">{selectedClient?.name || 'Client'}</span></h1>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading resources...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="empty-state">
              <Users size={40} color="#cbd5e1" />
              <h3>No resources found</h3>
              <p>No resources are assigned to this client.</p>
            </div>
          ) : (
            <>
              <div className="table-section-header">
                <h3>Resource Performance Details <span className="client-badge">{selectedClient?.name || ''}</span></h3>
                <span className="table-count">Showing all {resources.length} resource{resources.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="data-table-container">
                <table className="perf-data-table">
                  <thead>
                    <tr>
                      <th>RESOURCE NAME</th>
                      <th>ROLE / TEAM</th>
                      <th>STATUS</th>
                      <th>MANAGER FEEDBACK SUMMARY</th>
                      <th>UPDATED AT</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(resource => {
                      const lr = resource.latest_report;
                      const statusMap = {
                        green: 'Meets Expectations',
                        amber: 'Needs Improvement',
                        red: 'Needs Improvement'
                      };
                      const feedbackText = lr?.overall_reasons || lr?.strengths || '';
                      const truncatedFeedback = feedbackText.length > 80 ? feedbackText.slice(0, 80) + '...' : feedbackText;
                      return (
                        <tr key={resource.id} className="perf-table-row">
                          <td>
                            <div className="resource-cell">
                              <div className="resource-avatar" style={{ background: getAvatarColor(resource.username) }}>
                                {getInitials(resource.username)}
                              </div>
                              <span className="resource-name">{resource.username}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${resource.role_name?.toLowerCase() === 'manager' ? 'manager' : 'resource'}`}>
                              {resource.role_name || 'Resource'}
                            </span>
                          </td>
                          <td>
                            {lr?.overall_status ? (
                              <div className="status-cell">
                                <span className="status-dot" style={{ background: statusColor(lr.overall_status) }}></span>
                                <span>{statusMap[lr.overall_status] || lr.overall_status}</span>
                              </div>
                            ) : (
                              <span className="na-text">—</span>
                            )}
                          </td>
                          <td>
                            {truncatedFeedback ? (
                              <span className="feedback-summary">{truncatedFeedback}</span>
                            ) : (
                              <span className="na-text">—</span>
                            )}
                          </td>
                          <td>{lr ? formatDate(lr.updatedAt) : '—'}</td>
                          <td>
                            <button className="btn-icon-action" onClick={() => handleResourceClick(resource)} title="View Reports">
                              <Eye size={16} />
                            </button>
                            {canManagePerformance() && (
                              <button className="btn-icon-action" onClick={() => openUpload()} title="Upload Report">
                                <Upload size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* REPORTS VIEW */}
      {view === 'reports' && (
        <>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Loading reports...</span>
            </div>
          ) : (
            <div className="reports-section">
              <div className="reports-header">
                <h3>Performance Reports — {selectedResource?.username}</h3>
                <div className="reports-filters">
                  <div className="filter-group">
                    <select
                      value={reportFilters.quarter}
                      onChange={e => setReportFilters({ ...reportFilters, quarter: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">All Quarters</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <select
                      value={reportFilters.year}
                      onChange={e => setReportFilters({ ...reportFilters, year: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">All Years</option>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {canManagePerformance && (
                    <button className="btn-primary" onClick={openUpload}>
                      <Upload size={16} />
                      Upload Report
                    </button>
                  )}
                </div>
              </div>
              {reports.length === 0 ? (
                <div className="empty-state">
                  <FileText size={40} color="#cbd5e1" />
                  <h3>No reports yet</h3>
                  <p>Upload a quarterly performance report to get started.</p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="perf-data-table reports-table">
                    <thead>
                      <tr>
                        <th>QUARTER</th>
                        <th>YEAR</th>
                        <th>STATUS</th>
                        <th>SCORECARD</th>
                        <th>RECOMMENDATION</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports
                        .filter(r => !reportFilters.quarter || r.quarter === reportFilters.quarter)
                        .filter(r => !reportFilters.year || r.year.toString() === reportFilters.year)
                        .map(report => (
                        <tr 
                          key={report.id} 
                          className="perf-table-row report-row" 
                          onClick={() => { setSelectedReport(report); setShowDetail(true); }}
                        >
                          <td>
                            <span className="report-quarter">{report.quarter}</span>
                          </td>
                          <td>{report.year}</td>
                          <td>
                            <span 
                              className="status-badge" 
                              style={{ 
                                background: statusColor(report.overall_status) + '20', 
                                color: statusColor(report.overall_status) 
                              }}
                            >
                              {report.overall_status?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="scorecard-summary">
                              <span>D: {statusLabel(report.delivery, { yes: 'Y', mostly: 'M', not: 'N' })}</span>
                              <span>Q: {statusLabel(report.quality, { good: 'G', mixed: 'M', poor: 'P' })}</span>
                              <span>R: {statusLabel(report.rework, { high: 'H', medium: 'M', low: 'L' })}</span>
                              <span>C: {statusLabel(report.communication, { effective: 'E', needs_improvement: 'N' })}</span>
                            </div>
                          </td>
                          <td>
                            {statusLabel(report.recommendation, {
                              continue_strong: 'Continue (Strong)',
                              continue_meets: 'Continue (Meets)',
                              continue_improvement: 'Continue (Plan)',
                              replacement: 'Replacement',
                              role_change: 'Role Change'
                            })}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn view-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditReport(report);
                                }}
                                title="Edit Report"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Quarterly Report</h2>
              <button className="btn-icon" onClick={() => setShowUpload(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Quarter</label>
                  <select value={uploadForm.quarter} onChange={e => setUploadForm({ ...uploadForm, quarter: e.target.value })}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input type="number" value={uploadForm.year} onChange={e => setUploadForm({ ...uploadForm, year: parseInt(e.target.value) || '' })} />
                </div>
              </div>
              <div className="form-group">
                <label>PDF File</label>
                <div className="file-dropzone" onClick={() => document.getElementById('pdf-upload').click()}>
                  <Upload size={32} color="#94a3b8" />
                  <p>{uploadForm.file ? uploadForm.file.name : 'Click to select PDF file'}</p>
                  <input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleExtract} disabled={!uploadForm.file || extracting}>
                {extracting ? 'Extracting...' : 'Extract & Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW / CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Extracted Report</h2>
              <button className="btn-icon" onClick={() => setShowConfirm(false)}><X size={18} /></button>
            </div>
            <div className="review-modal-body" style={editingReport ? { gridTemplateColumns: '1fr' } : undefined}>
              {/* Left: PDF Preview (only for new uploads) */}
              {!editingReport && (
                <div className="pdf-preview-panel">
                  <h4>Uploaded Document</h4>
                  {uploadForm.file ? (
                    <embed
                      src={URL.createObjectURL(uploadForm.file)}
                      type="application/pdf"
                      className="pdf-embed"
                    />
                  ) : (
                    <div className="pdf-placeholder">No PDF uploaded</div>
                  )}
                </div>
              )}
              {/* Right: Editable Form */}
              <div className="form-panel">
                <div className="form-row">
                  <div className="form-group">
                    <label>Quarter</label>
                    <select value={confirmForm.quarter} onChange={e => setConfirmForm({ ...confirmForm, quarter: e.target.value })}>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input type="number" value={confirmForm.year} onChange={e => setConfirmForm({ ...confirmForm, year: parseInt(e.target.value) || '' })} />
                  </div>
                </div>

                {/* Extracted Metadata from PDF - Editable */}
                <h4 className="section-title">Resource Details</h4>
                <div className="metadata-form-grid">
                  <div className="form-group">
                    <label>Resource Name</label>
                    <input type="text" value={confirmForm.resource_name} onChange={e => setConfirmForm({ ...confirmForm, resource_name: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                  <div className="form-group">
                    <label>Resource ID</label>
                    <input type="text" value={confirmForm.resource_id_string} onChange={e => setConfirmForm({ ...confirmForm, resource_id_string: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                  <div className="form-group">
                    <label>Role / Team</label>
                    <input type="text" value={confirmForm.role_team} onChange={e => setConfirmForm({ ...confirmForm, role_team: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                  <div className="form-group">
                    <label>Manager</label>
                    <input type="text" value={confirmForm.manager_name} onChange={e => setConfirmForm({ ...confirmForm, manager_name: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                  <div className="form-group">
                    <label>Prepared By</label>
                    <input type="text" value={confirmForm.prepared_by} onChange={e => setConfirmForm({ ...confirmForm, prepared_by: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                  <div className="form-group">
                    <label>Prepared On</label>
                    <input type="text" value={confirmForm.prepared_on} onChange={e => setConfirmForm({ ...confirmForm, prepared_on: e.target.value })} placeholder="Extracted from PDF..." />
                  </div>
                </div>

                <h4 className="section-title">Overall</h4>
                <div className="form-group">
                  <label>Overall Status</label>
                  <div className="radio-group">
                    {['red', 'amber', 'green'].map(s => (
                      <label key={s} className="radio-chip" style={{ color: statusColor(s) }}>
                        <input type="radio" name="overall_status" value={s} checked={confirmForm.overall_status === s} onChange={e => setConfirmForm({ ...confirmForm, overall_status: e.target.value })} />
                        <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Overall Reasons</label>
                  <textarea value={confirmForm.overall_reasons} onChange={e => setConfirmForm({ ...confirmForm, overall_reasons: e.target.value })} rows={2} />
                </div>

                <h4 className="section-title">Performance Scorecard</h4>
                <div className="scorecard-grid">
                  <div className="form-group">
                    <label>Delivery</label>
                    <select value={confirmForm.delivery} onChange={e => setConfirmForm({ ...confirmForm, delivery: e.target.value })}>
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="mostly">Mostly</option>
                      <option value="not">Not</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quality</label>
                    <select value={confirmForm.quality} onChange={e => setConfirmForm({ ...confirmForm, quality: e.target.value })}>
                      <option value="">—</option>
                      <option value="good">Good</option>
                      <option value="mixed">Mixed</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rework</label>
                    <select value={confirmForm.rework} onChange={e => setConfirmForm({ ...confirmForm, rework: e.target.value })}>
                      <option value="">—</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Communication</label>
                    <select value={confirmForm.communication} onChange={e => setConfirmForm({ ...confirmForm, communication: e.target.value })}>
                      <option value="">—</option>
                      <option value="effective">Effective</option>
                      <option value="needs_improvement">Needs Improvement</option>
                    </select>
                  </div>
                </div>

                <h4 className="section-title">Comments</h4>
                <div className="form-group">
                  <label>Strengths / Wins</label>
                  <textarea value={confirmForm.strengths} onChange={e => setConfirmForm({ ...confirmForm, strengths: e.target.value })} rows={2} />
                </div>
                <div className="form-group">
                  <label>Areas of Improvement</label>
                  <textarea value={confirmForm.areas_of_improvement} onChange={e => setConfirmForm({ ...confirmForm, areas_of_improvement: e.target.value })} rows={2} />
                </div>
                <div className="form-group">
                  <label>Support Needed</label>
                  <textarea value={confirmForm.support_needed} onChange={e => setConfirmForm({ ...confirmForm, support_needed: e.target.value })} rows={2} />
                </div>

                <h4 className="section-title">Recommendation</h4>
                <div className="form-group">
                  <select value={confirmForm.recommendation} onChange={e => setConfirmForm({ ...confirmForm, recommendation: e.target.value })}>
                    <option value="">—</option>
                    <option value="continue_strong">Continue (Strong)</option>
                    <option value="continue_meets">Continue (Meets Expectations)</option>
                    <option value="continue_improvement">Continue (Improvement Plan)</option>
                    <option value="replacement">Replacement / Backfill Recommended</option>
                    <option value="role_change">Role Change Recommended</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setShowConfirm(false); setEditingReport(null); setConfirmForm({}); }}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveReport}>
                <CheckCircle size={16} />
                {editingReport ? 'Save Changes' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DETAIL MODAL */}
      {showDetail && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedReport.quarter} {selectedReport.year} Report</h2>
              <button className="btn-icon" onClick={() => setShowDetail(false)}><X size={18} /></button>
            </div>
            <div className="detail-body">
              {/* Resource Info */}
              <div className="detail-section">
                <h4>Resource Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Resource Name</label>
                    <strong>{selectedReport.resource_name || selectedResource?.username || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Role / Team</label>
                    <strong>{selectedReport.role_team || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Manager</label>
                    <strong>{selectedReport.manager_name || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Prepared By</label>
                    <strong>{selectedReport.prepared_by || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Overall Status</h4>
                <span className="status-badge-large" style={{ background: statusColor(selectedReport.overall_status) + '20', color: statusColor(selectedReport.overall_status) }}>
                  {selectedReport.overall_status?.toUpperCase() || 'N/A'}
                </span>
                <p className="detail-text">{selectedReport.overall_reasons || '—'}</p>
              </div>

              <div className="detail-section">
                <h4>Performance Scorecard</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Delivery</label>
                    <strong>{statusLabel(selectedReport.delivery, { yes: 'Yes', mostly: 'Mostly', not: 'Not' })}</strong>
                    <p>{selectedReport.delivery_comments || '—'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Quality</label>
                    <strong>{statusLabel(selectedReport.quality, { good: 'Good', mixed: 'Mixed', poor: 'Poor' })}</strong>
                    <p>{selectedReport.quality_comments || '—'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Rework</label>
                    <strong>{statusLabel(selectedReport.rework, { high: 'High', medium: 'Medium', low: 'Low' })}</strong>
                    <p>{selectedReport.rework_comments || '—'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Communication</label>
                    <strong>{statusLabel(selectedReport.communication, { effective: 'Effective', needs_improvement: 'Needs Improvement' })}</strong>
                    <p>{selectedReport.communication_comments || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Feedback</h4>
                <div className="feedback-item">
                  <label>Strengths / Wins</label>
                  <p>{selectedReport.strengths || '—'}</p>
                </div>
                <div className="feedback-item">
                  <label>Areas of Improvement</label>
                  <p>{selectedReport.areas_of_improvement || '—'}</p>
                </div>
                <div className="feedback-item">
                  <label>Comments</label>
                  <p>{selectedReport.comments || '—'}</p>
                </div>
                <div className="feedback-item">
                  <label>Support Needed</label>
                  <p>{selectedReport.support_needed || '—'}</p>
                </div>
              </div>

              <div className="detail-section">
                <h4>Recommendation</h4>
                <div className="recommendation-box" style={{ 
                  background: selectedReport.recommendation?.includes('continue') ? '#dcfce7' : selectedReport.recommendation?.includes('improvement') ? '#fef3c7' : '#fee2e2',
                  color: selectedReport.recommendation?.includes('continue') ? '#166534' : selectedReport.recommendation?.includes('improvement') ? '#92400e' : '#991b1b',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}>
                  {statusLabel(selectedReport.recommendation, {
                    continue_strong: 'Continue (Strong)',
                    continue_meets: 'Continue (Meets Expectations)',
                    continue_improvement: 'Continue (Improvement Plan)',
                    replacement: 'Replacement / Backfill Recommended',
                    role_change: 'Role Change Recommended'
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* NO REPORT RESOURCES MODAL */}
      {showNoReportModal && (
        <div className="modal-overlay" onClick={() => setShowNoReportModal(false)}>
          <div className="modal-content no-report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <h2>Without Performance Reports</h2>
                <span className="modal-count">{noReportResources.length} total</span>
              </div>
              <button className="btn-icon" onClick={() => setShowNoReportModal(false)}><X size={18} /></button>
            </div>
            
            <div className="modal-filters">
              <div className="modal-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search resources or managers..."
                  value={noReportSearch}
                  onChange={e => setNoReportSearch(e.target.value)}
                  className="modal-search-input"
                />
                {noReportSearch && (
                  <button className="clear-search" onClick={() => setNoReportSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <div className="modal-role-toggle">
                <button
                  className={`role-toggle-btn ${noReportRoleFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNoReportRoleFilter('all')}
                >
                  All
                </button>
                <button
                  className={`role-toggle-btn ${noReportRoleFilter === 'manager' ? 'active' : ''}`}
                  onClick={() => setNoReportRoleFilter('manager')}
                >
                  <Users size={14} />
                  Managers
                </button>
                <button
                  className={`role-toggle-btn ${noReportRoleFilter === 'resource' ? 'active' : ''}`}
                  onClick={() => setNoReportRoleFilter('resource')}
                >
                  <User size={14} />
                  Resources
                </button>
              </div>
            </div>
            
            <div className="modal-body no-report-list">
              {(() => {
                const filtered = noReportResources.filter(r => {
                  const matchesSearch = !noReportSearch || 
                    r.username?.toLowerCase().includes(noReportSearch.toLowerCase()) ||
                    r.client_name?.toLowerCase().includes(noReportSearch.toLowerCase());
                  const matchesRole = noReportRoleFilter === 'all' || 
                    r.role_name?.toLowerCase() === noReportRoleFilter;
                  return matchesSearch && matchesRole;
                });
                
                const managersCount = filtered.filter(r => r.role_name?.toLowerCase() === 'manager').length;
                const resourcesCount = filtered.filter(r => r.role_name?.toLowerCase() === 'resource').length;
                
                return filtered.length === 0 ? (
                  <div className="empty-state compact">
                    <CheckCircle size={32} color="#22c55e" />
                    <p>{noReportResources.length === 0 ? 'All resources and managers have feedback.' : 'No matches found for your filters.'}</p>
                  </div>
                ) : (
                  <>
                    <div className="no-report-summary">
                      <span className="summary-item managers">
                        <span className="dot manager-dot"></span>
                        {managersCount} Manager{managersCount !== 1 ? 's' : ''}
                      </span>
                      <span className="summary-item resources">
                        <span className="dot resource-dot"></span>
                        {resourcesCount} Resource{resourcesCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="no-report-items">
                      {filtered.map(resource => (
                        <div
                          key={resource.id}
                          className="no-report-item"
                          onClick={() => goToResourceFromModal(resource)}
                        >
                          <div className="resource-cell">
                            <div className="resource-avatar" style={{ background: getAvatarColor(resource.username) }}>
                              {getInitials(resource.username)}
                            </div>
                            <div className="no-report-info">
                              <span className="resource-name">{resource.username}</span>
                              <span className="resource-client">{resource.client_name}</span>
                              <span className={`role-badge ${resource.role_name?.toLowerCase() === 'manager' ? 'manager' : 'resource'}`}>
                                {resource.role_name || 'Resource'}
                              </span>
                            </div>
                          </div>
                          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: '#94a3b8' }} />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Performance;
