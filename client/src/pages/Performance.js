import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronLeft, Users, User, Building2,
  Upload, FileText, X, CheckCircle, Trash2, Pencil, Search, Eye
} from 'lucide-react';
import './Performance.css';

function Performance() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [view, setView] = useState(searchParams.get('view') || 'clients');
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [resources, setResources] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ quarter: 'Q1', year: new Date().getFullYear(), file: null });
  const [extracting, setExtracting] = useState(false);

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
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [noReportResources, setNoReportResources] = useState([]);
  const [showNoReportModal, setShowNoReportModal] = useState(false);
  const [noReportSearch, setNoReportSearch] = useState('');
  const [noReportRoleFilter, setNoReportRoleFilter] = useState('all'); // 'all' | 'manager' | 'resource'
  const [scorecardSearch, setScorecardSearch] = useState('');

  // Scorecard drill-down modal
  const [scorecardModal, setScorecardModal] = useState(null);
  // { category: 'delivery', option: 'yes', label: 'Delivery — Yes', color: '#16a34a', resources: [...] }

  // All resources state and filters
  // ── Derive current quarter from today's date ──────────────────────────────
  const getCurrentQuarter = () => {
    const month = new Date().getMonth(); // 0-11
    if (month < 3)  return 'Q1';
    if (month < 6)  return 'Q2';
    if (month < 9)  return 'Q3';
    return 'Q4';
  };
  const CURRENT_QUARTER = getCurrentQuarter();
  const CURRENT_YEAR_STR = String(new Date().getFullYear());

  const [allResources, setAllResources] = useState([]);

  // Restore filters from sessionStorage so they persist across navigation
  const savedFilters = (() => {
    try { return JSON.parse(sessionStorage.getItem('perfResourceFilters')); } catch { return null; }
  })();

  const [resourceFilters, setResourceFilters] = useState(savedFilters || {
    client: [],
    status: [],
    quarter: [CURRENT_QUARTER],
    year:    [CURRENT_YEAR_STR],
    search: ''
  });

  // Report filters for reports view
  const [reportFilters, setReportFilters] = useState({
    quarter: '',
    year: ''
  });

  const { user, canManagePerformance } = useAuth();

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchMetrics();
    // NOTE: fetchAllResources is intentionally NOT called here.
    // The useEffect below watches resourceFilters.quarter/year and fires on
    // mount with the default current-quarter values — calling it here too
    // would race and sometimes overwrite the filtered result with unfiltered data.
    
    // Refresh data when window regains focus (user returns from edit page)
    const handleFocus = () => {
      fetchMetrics();
      fetchAllResources({
        quarter: resourceFilters.quarter,
        year: resourceFilters.year
      });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const url = selectedClientFilter
        ? `/api/performance/metrics?client_id=${selectedClientFilter}`
        : '/api/performance/metrics';
      const response = await axios.get(url);
      setMetrics(response.data);
      // noReportResources is now derived from allResources (filteredForMetrics)
      // to stay consistent with the card count — see clients view render logic
    } catch (error) {
      console.error('Error fetching metrics:', error);
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

  const fetchAllResources = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.quarter && filters.quarter.length > 0) {
        filters.quarter.forEach(q => params.append('quarter', q));
      }
      if (filters.year && filters.year.length > 0) {
        filters.year.forEach(y => params.append('year', y));
      }
      
      const url = `/api/performance/resources${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      setAllResources(response.data);
    } catch (error) {
      console.error('Error fetching all resources:', error);
    }
  }, []);

  // Refetch resources when quarter or year filter changes
  useEffect(() => {
    fetchAllResources({ 
      quarter: resourceFilters.quarter, 
      year: resourceFilters.year 
    });
  }, [resourceFilters.quarter, resourceFilters.year, fetchAllResources]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Always go straight back to clients — skip the intermediate resources view
      setView('clients');
      setSelectedClient(null);
      setSelectedClientFilter('');
      setSelectedResource(null);
      setReports([]);
      setResources([]);
      updateUrlParams('clients');
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
      // Pre-populate confirm form with extracted data
      const s = response.data.suggestions || {};
      setConfirmForm({
        quarter: uploadForm.quarter,
        year: uploadForm.year,
        client_id: selectedResource?.client_id || '',
        product_id: '',
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
      // Validate client_id and product_id
      if (!confirmForm.client_id) {
        alert('Please select a client');
        return;
      }
      if (!confirmForm.product_id) {
        alert('Please select a product');
        return;
      }
      
      const isManagerRole = String(selectedResource.role_name || selectedResource.role || '').toLowerCase() === 'manager';
      const payload = {
        resource_id: selectedResource.id,
        client_id: confirmForm.client_id,
        product_id: confirmForm.product_id,
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
      setEditingReport(null);
      fetchReports(selectedResource.id);
      fetchMetrics();
      // Refresh resources list to update latest_report data
      if (selectedClient?.id) {
        fetchResources(selectedClient.id);
      }
      // Also refresh all resources list for the main dashboard
      fetchAllResources();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save report');
    }
  };

  const openEditReport = (report) => {
    setEditingReport(report.id);
    setConfirmForm({
      quarter: report.quarter,
      year: report.year,
      client_id: report.client_id || '',
      product_id: report.product_id || '',
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

  // Multi-select filter helpers
  const toggleFilterOption = (filterKey, value) => {
    setResourceFilters(prev => {
      const currentValues = prev[filterKey];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  };

  const hasActiveFilters = () => {
    // Not "active" if everything is at the default: current quarter, current year, no other filters
    const isDefaultQuarter = resourceFilters.quarter.length === 1 && resourceFilters.quarter[0] === CURRENT_QUARTER;
    const isDefaultYear    = resourceFilters.year.length === 1    && resourceFilters.year[0]    === CURRENT_YEAR_STR;
    const isDefault = isDefaultQuarter && isDefaultYear &&
      !resourceFilters.search &&
      resourceFilters.client.length === 0 &&
      resourceFilters.status.length === 0;
    return !isDefault;
  };

  const clearAllFilters = () => {
    const defaults = { client: [], status: [], quarter: [CURRENT_QUARTER], year: [CURRENT_YEAR_STR], search: '' };
    setResourceFilters(defaults);
    sessionStorage.removeItem('perfResourceFilters');
  };

  // Persist filters to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('perfResourceFilters', JSON.stringify(resourceFilters));
  }, [resourceFilters]);

  if (loading && view === 'clients') {
    return (
      <div className="performance-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading performance data...</p>
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
          {metrics && (() => {
            // Compute filtered resources for metrics cards
            // Exclude resources marked inactive for the selected quarter
            const filteredForMetrics = allResources.filter(r => {
              const matchesSearch = !resourceFilters.search || r.username?.toLowerCase().includes(resourceFilters.search.toLowerCase());
              const matchesClient = resourceFilters.client.length === 0 || resourceFilters.client.includes(r.client_id);
              const matchesStatus = resourceFilters.status.length === 0 ||
                resourceFilters.status.some(status =>
                  status === 'none' ? !r.latest_report : r.latest_report?.recommendation === status
                );
              // Exclude inactive resources from metrics
              const isInactive = r.quarter_activity_status === 'inactive';
              return matchesSearch && matchesClient && matchesStatus && !isInactive;
            });

            const totalFiltered = filteredForMetrics.length;
            const withReport = filteredForMetrics.filter(r => r.latest_report).length;
            const withoutReport = totalFiltered - withReport;

            // Keep noReportResources in sync with the card count —
            // same source, same filters (quarter, product, inactive excluded)
            const noReportList = filteredForMetrics.filter(r => !r.latest_report);
            if (noReportList.length !== noReportResources.length ||
                noReportList.some((r, i) => r.id !== noReportResources[i]?.id)) {
              setNoReportResources(noReportList);
            }

            // Always show Red / Amber / Green rows
            const distRows = [
              { name: 'Red',   color: '#ef4444', value: filteredForMetrics.filter(r => r.latest_report?.overall_status === 'red').length },
              { name: 'Amber', color: '#f59e0b', value: filteredForMetrics.filter(r => r.latest_report?.overall_status === 'amber').length },
              { name: 'Green', color: '#22c55e', value: filteredForMetrics.filter(r => r.latest_report?.overall_status === 'green').length },
            ];

            // Scorecard breakdown — count each option across filtered resources with reports
            const sc = { delivery: {}, quality: {}, rework: {}, communication: {} };
            filteredForMetrics.forEach(r => {
              const rep = r.latest_report;
              if (!rep) return;
              if (rep.delivery)      sc.delivery[rep.delivery]           = (sc.delivery[rep.delivery] || 0) + 1;
              if (rep.quality)       sc.quality[rep.quality]             = (sc.quality[rep.quality] || 0) + 1;
              if (rep.rework)        sc.rework[rep.rework]               = (sc.rework[rep.rework] || 0) + 1;
              if (rep.communication) sc.communication[rep.communication] = (sc.communication[rep.communication] || 0) + 1;
            });

            const scCategories = [
              {
                key: 'delivery', label: 'Delivery',
                options: [
                  { value: 'yes',    label: 'Yes',    color: '#16a34a' },
                  { value: 'mostly', label: 'Mostly', color: '#f59e0b' },
                  { value: 'not',    label: 'Not',    color: '#dc2626' },
                ]
              },
              {
                key: 'quality', label: 'Quality',
                options: [
                  { value: 'good',  label: 'Good',  color: '#16a34a' },
                  { value: 'mixed', label: 'Mixed', color: '#f59e0b' },
                  { value: 'poor',  label: 'Poor',  color: '#dc2626' },
                ]
              },
              {
                key: 'rework', label: 'Rework',
                options: [
                  { value: 'low',    label: 'Low',    color: '#16a34a' },
                  { value: 'medium', label: 'Medium', color: '#f59e0b' },
                  { value: 'high',   label: 'High',   color: '#dc2626' },
                ]
              },
              {
                key: 'communication', label: 'Communication',
                options: [
                  { value: 'effective',         label: 'Effective',    color: '#16a34a' },
                  { value: 'needs_improvement', label: 'Needs Imp.',   color: '#f59e0b' },
                ]
              },
            ];

            return (
              <div className="metrics-cards-row three-col">
                <div
                  className="metric-card-large perf-total-resources-card"
                  onClick={() => withoutReport > 0 && setShowNoReportModal(true)}
                  style={{ cursor: withoutReport > 0 ? 'pointer' : 'default' }}
                >
                  <h5>Total Resources</h5>
                  <div className="perf-total-resources-body">
                    <div className="perf-total-number">{totalFiltered}</div>
                    <div className="perf-total-meta">
                      <div className="perf-total-label">Resources &amp; Managers</div>
                      <div className="perf-report-bar-wrap">
                        <div className="perf-report-bar">
                          <div
                            className="perf-report-bar-fill"
                            style={{ width: totalFiltered > 0 ? `${Math.round(withReport / totalFiltered * 100)}%` : '0%' }}
                          />
                        </div>
                        <span className="perf-report-bar-label">
                          {withReport}/{totalFiltered} with reports
                        </span>
                      </div>
                      {withoutReport > 0 ? (
                        <div className="perf-missing-tag">
                          <span className="perf-missing-dot" />
                          {withoutReport} without report{withoutReport !== 1 ? 's' : ''} — click to view
                        </div>
                      ) : (
                        <div className="perf-all-good-tag">
                          <CheckCircle size={13} color="#16a34a" />
                          All have reports
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="metric-card-large">
                  <h5>Performance Distribution</h5>
                  <div className="distribution-list">
                    {distRows.map(s => (
                      <div key={s.name} className="dist-row">
                        <span className="dist-dot" style={{ background: s.color }}></span>
                        <span className="dist-name">{s.name}</span>
                        <span className="dist-count" style={{ color: s.color, fontWeight: 700 }}>
                          {withReport === 0 ? 'N/A' : s.value}
                        </span>
                        <span className="dist-pct">
                          {withReport === 0 ? '' : `${Math.round(s.value / withReport * 100)}%`}
                        </span>
                      </div>
                    ))}
                    {withReport === 0 && (
                      <div className="dist-empty" style={{ marginTop: '6px' }}>No reports for current filters</div>
                    )}
                  </div>
                </div>

                {/* Scorecard Breakdown Card */}
                <div className="metric-card-large sc-breakdown-card">
                  <h5>Scorecard Breakdown</h5>
                  {withReport === 0 ? (
                    <div className="dist-empty">No reports for current filters</div>
                  ) : (
                    <div className="sc-categories">
                      {scCategories.map(cat => {
                        const total = cat.options.reduce((sum, o) => sum + (sc[cat.key][o.value] || 0), 0);
                        return (
                          <div key={cat.key} className="sc-category">
                            <span className="sc-category-label">{cat.label}</span>
                            <div className="sc-pills">
                              {cat.options.map(opt => {
                                const count = sc[cat.key][opt.value] || 0;
                                const pct = total > 0 ? Math.round(count / total * 100) : 0;
                                const matchingResources = filteredForMetrics.filter(
                                  r => r.latest_report?.[cat.key] === opt.value
                                );
                                return (
                                  <span
                                    key={opt.value}
                                    className="sc-pill"
                                    style={{
                                      background: count > 0 ? `${opt.color}18` : '#f8fafc',
                                      color: count > 0 ? opt.color : '#cbd5e1',
                                      border: `1px solid ${count > 0 ? `${opt.color}40` : '#e2e8f0'}`,
                                      cursor: count > 0 ? 'pointer' : 'default',
                                    }}
                                    onClick={() => count > 0 && setScorecardModal({
                                      label: `${cat.label} — ${opt.label}`,
                                      color: opt.color,
                                      resources: matchingResources
                                    })}
                                  >
                                    {opt.label}
                                    <strong>{count > 0 ? count : '—'}</strong>
                                  </span>
                                );
                              })}
                              {total > 0 && (
                                <span className="sc-pct-summary">
                                  {cat.options.map(o => {
                                    const count = sc[cat.key][o.value] || 0;
                                    const pct = Math.round(count / total * 100);
                                    return (
                                      <span key={o.value} style={{ color: count > 0 ? o.color : '#cbd5e1' }}>
                                        {pct}%
                                      </span>
                                    );
                                  })}
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
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={resourceFilters.search}
                    onChange={e => setResourceFilters({ ...resourceFilters, search: e.target.value })}
                    className="filter-input"
                  />
                  
                  {/* Multi-select Client Filter */}
                  <div className="multi-select-wrapper">
                    <select
                      multiple
                      value={resourceFilters.client}
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setResourceFilters({ ...resourceFilters, client: selected });
                      }}
                      className="filter-select multi-select"
                      size="1"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="multi-select-label">
                      {resourceFilters.client.length === 0 ? 'All Clients' : 
                       resourceFilters.client.length === 1 ? clients.find(c => c.id === resourceFilters.client[0])?.name :
                       `${resourceFilters.client.length} Clients`}
                    </div>
                  </div>

                  {/* Quarter Filter */}
                  <div className="multi-select-wrapper">
                    <select
                      value={resourceFilters.quarter[0] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setResourceFilters({ ...resourceFilters, quarter: val ? [val] : [] });
                      }}
                      className="filter-select"
                    >
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                    <div className="multi-select-label">
                      {resourceFilters.quarter.length === 0 ? CURRENT_QUARTER :
                       resourceFilters.quarter[0] === CURRENT_QUARTER
                         ? `${CURRENT_QUARTER} (Current)`
                         : resourceFilters.quarter[0]}
                    </div>
                  </div>

                  {/* Year Filter */}
                  <div className="multi-select-wrapper">
                    <select
                      value={resourceFilters.year[0] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setResourceFilters({ ...resourceFilters, year: val ? [val] : [] });
                      }}
                      className="filter-select"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                    <div className="multi-select-label">
                      {resourceFilters.year.length === 0 ? CURRENT_YEAR_STR :
                       resourceFilters.year[0] === CURRENT_YEAR_STR
                         ? `${CURRENT_YEAR_STR} (Current)`
                         : resourceFilters.year[0]}
                    </div>
                  </div>

                  {/* Multi-select Status Filter */}
                  <div className="multi-select-wrapper">
                    <select
                      multiple
                      value={resourceFilters.status}
                      onChange={e => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setResourceFilters({ ...resourceFilters, status: selected });
                      }}
                      className="filter-select multi-select"
                      size="1"
                    >
                      <option value="continue_strong">Continue (Strong)</option>
                      <option value="continue_meets">Continue (Meets)</option>
                      <option value="continue_improvement">Continue (Plan)</option>
                      <option value="role_change">Role Change</option>
                      <option value="replacement">Replacement/Backfill</option>
                      <option value="none">No Report</option>
                    </select>
                    <div className="multi-select-label">
                      {resourceFilters.status.length === 0 ? 'All Recommendations' : 
                       resourceFilters.status.length === 1 ? 
                         (resourceFilters.status[0] === 'continue_strong' ? 'Continue (Strong)' :
                          resourceFilters.status[0] === 'continue_meets' ? 'Continue (Meets)' :
                          resourceFilters.status[0] === 'continue_improvement' ? 'Continue (Plan)' :
                          resourceFilters.status[0] === 'role_change' ? 'Role Change' :
                          resourceFilters.status[0] === 'replacement' ? 'Replacement/Backfill' :
                          'No Report') :
                       `${resourceFilters.status.length} Selected`}
                    </div>
                  </div>

                  {hasActiveFilters() && (
                    <button
                      className="clear-filters-btn"
                      onClick={clearAllFilters}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                <div className="data-table-container">
                  <table className="perf-data-table resources-table">
                    <thead>
                      <tr>
                        <th>RESOURCE</th>
                        <th>CLIENT</th>
                        <th>ROLE / TEAM</th>
                        <th>SCORECARD</th>
                        <th>RATING</th>
                        <th>LAST REPORT</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allResources
                        .filter(r => {
                          const isInactive = r.quarter_activity_status === 'inactive';
                          if (isInactive) return false; // never show inactive resources
                          const matchesSearch = !resourceFilters.search || r.username?.toLowerCase().includes(resourceFilters.search.toLowerCase());
                          const matchesClient = resourceFilters.client.length === 0 || resourceFilters.client.includes(r.client_id);
                          const matchesStatus = resourceFilters.status.length === 0 || 
                            resourceFilters.status.some(status => 
                              status === 'none' ? !r.latest_report : r.latest_report?.recommendation === status
                            );
                          return matchesSearch && matchesClient && matchesStatus;
                        })
                        .map(resource => {
                          const isInactive = resource.quarter_activity_status === 'inactive';
                          // Use client from latest report snapshot, fallback to user's assigned client
                          const clientName = resource.latest_report?.client_name_snapshot 
                            || resource.latest_report?.client_name 
                            || clients.find(c => c.id === resource.client_id)?.name 
                            || '—';
                          const lastReportDate = resource.latest_report?.updatedAt 
                            ? `${new Date(resource.latest_report.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${resource.latest_report.quarter ? (resource.latest_report.quarter.toString().startsWith('Q') ? resource.latest_report.quarter : `Q${resource.latest_report.quarter}`) : '—'} ${resource.latest_report.year || '—'}`
                            : '—';
                          return (
                            <tr
                              key={resource.id}
                              className="perf-table-row"
                              onClick={() => !isInactive && handleResourceClick(resource)}
                              style={isInactive ? { opacity: 0.5, cursor: 'default', background: '#f8fafc' } : {}}
                            >
                              <td>
                                <div className="resource-cell">
                                  <div className="resource-avatar" style={{ background: isInactive ? '#9ca3af' : getAvatarColor(resource.username) }}>
                                    {getInitials(resource.username)}
                                  </div>
                                  <span className="resource-name">{resource.username}</span>
                                </div>
                              </td>
                              <td>
                                {isInactive || !resource.latest_report ? '—' : clientName}
                              </td>
                              <td>
                                <span className="role-team-text">
                                  {isInactive || !resource.latest_report
                                    ? '—'
                                    : resource.latest_report?.role_team || resource.role_name || '—'}
                                </span>
                              </td>
                              <td>
                                {isInactive ? (
                                  <span style={{
                                    display: 'inline-block', padding: '3px 10px',
                                    borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                    background: '#fee2e2', color: '#dc2626',
                                    border: '1px solid #fca5a5'
                                  }}>
                                    Inactive this quarter
                                  </span>
                                ) : resource.latest_report ? (
                                  <div className="scorecard-inline">
                                    <div className={`scorecard-metric delivery-${resource.latest_report.delivery || 'none'}`}>
                                      <span className="metric-label">Delivery</span>
                                      <span className="metric-value">{statusLabel(resource.latest_report.delivery, { yes: 'Yes', mostly: 'Mostly', not: 'Not' })}</span>
                                    </div>
                                    <div className={`scorecard-metric quality-${resource.latest_report.quality || 'none'}`}>
                                      <span className="metric-label">Quality</span>
                                      <span className="metric-value">{statusLabel(resource.latest_report.quality, { good: 'Good', mixed: 'Mixed', poor: 'Poor' })}</span>
                                    </div>
                                    <div className={`scorecard-metric rework-${resource.latest_report.rework || 'none'}`}>
                                      <span className="metric-label">Rework</span>
                                      <span className="metric-value">{statusLabel(resource.latest_report.rework, { high: 'High', medium: 'Medium', low: 'Low' })}</span>
                                    </div>
                                    <div className={`scorecard-metric communication-${resource.latest_report.communication || 'none'}`}>
                                      <span className="metric-label">Comm.</span>
                                      <span className="metric-value">{statusLabel(resource.latest_report.communication, { effective: 'Effective', needs_improvement: 'Needs Imp.' })}</span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Active but no report for the selected quarter */
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '3px 10px', borderRadius: '20px',
                                    fontSize: '12px', fontWeight: 600,
                                    background: '#fef3c7', color: '#92400e',
                                    border: '1px solid #fcd34d'
                                  }}>
                                    No report
                                    {canManagePerformance() && (
                                      <span style={{ fontWeight: 400, color: '#b45309' }}>— Please upload</span>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="rating-display">
                                  {!isInactive && resource.latest_report?.rating ? (
                                    <>
                                      <span className="rating-value">{resource.latest_report.rating}</span>
                                      <span className="rating-stars">{'★'.repeat(Math.round(resource.latest_report.rating))}{'☆'.repeat(5 - Math.round(resource.latest_report.rating))}</span>
                                    </>
                                  ) : (
                                    <span className="rating-empty">—</span>
                                  )}
                                </div>
                              </td>
                              <td>{isInactive ? '—' : lastReportDate}</td>
                              <td>
                                <div className="action-buttons">
                                  {!isInactive && resource.latest_report && (
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
                                  )}
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
              <div className="loading-spinner"></div>
              <p>Loading resources...</p>
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
              <div className="loading-spinner"></div>
              <p>Loading reports...</p>
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
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {canManagePerformance() && (
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
                        <th>CLIENT</th>
                        <th>PRODUCT</th>
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
                            <span className="client-badge">{report.client_name_snapshot || report.client_name || '—'}</span>
                          </td>
                          <td>
                            <span className="product-name">{report.product_name_snapshot || report.product_name || '—'}</span>
                          </td>
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
                            <div className="scorecard-inline">
                              <div className={`scorecard-metric delivery-${report.delivery || 'none'}`}>
                                <span className="metric-label">Delivery</span>
                                <span className="metric-value">{statusLabel(report.delivery, { yes: 'Yes', mostly: 'Mostly', not: 'Not' })}</span>
                              </div>
                              <div className={`scorecard-metric quality-${report.quality || 'none'}`}>
                                <span className="metric-label">Quality</span>
                                <span className="metric-value">{statusLabel(report.quality, { good: 'Good', mixed: 'Mixed', poor: 'Poor' })}</span>
                              </div>
                              <div className={`scorecard-metric rework-${report.rework || 'none'}`}>
                                <span className="metric-label">Rework</span>
                                <span className="metric-value">{statusLabel(report.rework, { high: 'High', medium: 'Medium', low: 'Low' })}</span>
                              </div>
                              <div className={`scorecard-metric communication-${report.communication || 'none'}`}>
                                <span className="metric-label">Comm.</span>
                                <span className="metric-value">{statusLabel(report.communication, { effective: 'Effective', needs_improvement: 'Needs Imp.' })}</span>
                              </div>
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
                              {canManagePerformance() && (
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
                              )}
                              {canManagePerformance() && (
                                <button
                                  className="action-btn delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReport(report.id);
                                  }}
                                  title="Delete Report"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
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

                {/* Client and Product Selection */}
                <h4 className="section-title">Client & Product</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Client *</label>
                    <select 
                      value={confirmForm.client_id} 
                      onChange={e => setConfirmForm({ ...confirmForm, client_id: e.target.value, product_id: '' })}
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id || client._id} value={client.id || client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product *</label>
                    <select 
                      value={confirmForm.product_id} 
                      onChange={e => setConfirmForm({ ...confirmForm, product_id: e.target.value })}
                      disabled={!confirmForm.client_id}
                      required
                    >
                      <option value="">Select Product</option>
                      {products
                        .filter(p => p.client_id === confirmForm.client_id)
                        .map(product => (
                          <option key={product.id || product._id} value={product.id || product._id}>
                            {product.name}
                          </option>
                        ))}
                    </select>
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
                    <label>Client</label>
                    <strong>{selectedReport.client_name_snapshot || selectedReport.client_name || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Product</label>
                    <strong>{selectedReport.product_name_snapshot || selectedReport.product_name || '—'}</strong>
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

      {/* SCORECARD DRILL-DOWN MODAL */}
      {scorecardModal && (
        <div className="modal-overlay" onClick={() => { setScorecardModal(null); setScorecardSearch(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: scorecardModal.color, flexShrink: 0, display: 'inline-block'
                }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{scorecardModal.label}</h2>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    {scorecardModal.resources.length} resource{scorecardModal.resources.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => { setScorecardModal(null); setScorecardSearch(''); }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={scorecardSearch}
                  onChange={e => setScorecardSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px', fontSize: '13px',
                    border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', minHeight: '336px', maxHeight: '336px' }}>
                <table className="perf-data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>RESOURCE</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>CLIENT</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>ROLE / TEAM</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>QUARTER</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>RATING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecardModal.resources
                      .filter(r => !scorecardSearch ||
                        r.username?.toLowerCase().includes(scorecardSearch.toLowerCase()) ||
                        (r.latest_report?.client_name_snapshot || clients.find(c => c.id === r.client_id)?.name || '').toLowerCase().includes(scorecardSearch.toLowerCase())
                      )
                      .map(resource => {
                        const clientName = resource.latest_report?.client_name_snapshot
                          || clients.find(c => c.id === resource.client_id)?.name
                          || '—';
                        return (
                          <tr
                            key={resource.id}
                            className="perf-table-row"
                            style={{ cursor: 'pointer' }}
                            onClick={() => { handleResourceClick(resource); setScorecardModal(null); setScorecardSearch(''); }}
                          >
                            <td>
                              <div className="resource-cell">
                                <div className="resource-avatar" style={{ background: getAvatarColor(resource.username) }}>
                                  {getInitials(resource.username)}
                                </div>
                                <span className="resource-name">{resource.username}</span>
                              </div>
                            </td>
                            <td>{clientName}</td>
                            <td><span className="role-team-text">{resource.latest_report?.role_team || resource.role_name || '—'}</span></td>
                            <td>{resource.latest_report?.quarter ? `${resource.latest_report.quarter} ${resource.latest_report.year}` : '—'}</td>
                            <td>
                              <div className="rating-display">
                                {resource.latest_report?.rating ? (
                                  <>
                                    <span className="rating-value">{resource.latest_report.rating}</span>
                                    <span className="rating-stars">
                                      {'★'.repeat(Math.round(resource.latest_report.rating))}
                                      {'☆'.repeat(5 - Math.round(resource.latest_report.rating))}
                                    </span>
                                  </>
                                ) : <span className="rating-empty">—</span>}
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
        </div>
      )}

      {/* NO REPORT RESOURCES MODAL */}
      {showNoReportModal && (
        <div className="modal-overlay" onClick={() => setShowNoReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '90%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div className="modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Without Performance Reports</h2>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {noReportResources.length} people missing a report this quarter
                </p>
              </div>
              <button onClick={() => setShowNoReportModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>
                ×
              </button>
            </div>

            {/* Search + toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or client..."
                  value={noReportSearch}
                  onChange={e => setNoReportSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px', fontSize: '13px',
                    border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                {[{ key: 'all', label: 'All' }, { key: 'manager', label: 'Managers' }, { key: 'resource', label: 'Resources' }].map(({ key, label }) => (
                  <button key={key} onClick={() => setNoReportRoleFilter(key)} style={{
                    padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '12px',
                    fontWeight: noReportRoleFilter === key ? 600 : 500, cursor: 'pointer',
                    background: noReportRoleFilter === key ? '#fff' : 'transparent',
                    color: noReportRoleFilter === key ? '#0f172a' : '#64748b',
                    boxShadow: noReportRoleFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s'
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', minHeight: '392px', maxHeight: '392px', padding: '12px 20px' }}>
                {(() => {
                  const filtered = noReportResources.filter(r => {
                    const matchesSearch = !noReportSearch ||
                      r.username?.toLowerCase().includes(noReportSearch.toLowerCase()) ||
                      r.client_name?.toLowerCase().includes(noReportSearch.toLowerCase());
                    const matchesRole = noReportRoleFilter === 'all' || r.role_name?.toLowerCase() === noReportRoleFilter;
                    return matchesSearch && matchesRole;
                  });

                if (filtered.length === 0) return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
                    <CheckCircle size={32} color="#22c55e" />
                    <p style={{ margin: 0 }}>{noReportResources.length === 0 ? 'All resources and managers have reports.' : 'No matches found.'}</p>
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {filtered.map(resource => (
                      <div key={resource.id} onClick={() => goToResourceFromModal(resource)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          transition: 'background 0.12s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: getAvatarColor(resource.username),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: '#fff'
                        }}>
                          {getInitials(resource.username)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{resource.username}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{resource.client_name || '—'}</div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                          background: resource.role_name?.toLowerCase() === 'manager' ? '#ede9fe' : '#dbeafe',
                          color: resource.role_name?.toLowerCase() === 'manager' ? '#6d28d9' : '#1d4ed8'
                        }}>
                          {resource.role_name || 'Resource'}
                        </span>
                        <ChevronLeft size={15} style={{ transform: 'rotate(180deg)', color: '#94a3b8', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Performance;
