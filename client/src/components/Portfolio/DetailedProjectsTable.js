import React, { useState, useMemo } from 'react';
import { Edit2, Download, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { getProjectOwner, formatDate } from './utils';
import EditProjectDetailModal from './modals/EditProjectDetailModal';
import ProjectViewModal from './modals/ProjectViewModal';
import './modals/modals.css';

function DetailedProjectsTable({ projects, onProjectClick, onProjectUpdate }) {
  const { hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalViewMode, setModalViewMode] = useState('detailed');
  const [modalSearch, setModalSearch] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  const sortedProjects = useMemo(() => {
    const getTimestamp = (p) => new Date(p.dashboardUpdatedAt || p.lastModified || p.updated_at || 0);
    return [...projects].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [projects]);

  const displayedProjects = sortedProjects.slice(0, 3);
  const hiddenCount = projects.length - 3;

  const ragColor = (ragStatus) => {
    switch (ragStatus?.toLowerCase()) {
      case 'red':   return '#ef4444';
      case 'amber': return '#f59e0b';
      case 'green': return '#10b981';
      default:      return '#9ca3af';
    }
  };

  const formatUpdatedAt = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleExport = (projectList) => {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Portfolio Health ──────────────────────────────────────────
    const healthRows = projectList.map(p => ({
      'Project Name':    p.name || '',
      'SPOC':            p.spoc || '',
      'RAG':             p.ragStatus || 'Green',
      'Status':          p.sowStatus || '',
      'Action Item':     p.actionItem || '',
      'Risk Summary':    p.riskSummary || '',
      'Mitigation Plan': p.mitigationPlan || '',
      'Updated At':      formatUpdatedAt(p.dashboardUpdatedAt),
    }));
    const healthSheet = XLSX.utils.json_to_sheet(
      healthRows.length ? healthRows : [{ 'Project Name': 'No data' }]
    );
    // Column widths
    healthSheet['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
      { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, healthSheet, 'Portfolio Health');

    // ── Sheet 2: Portfolio Metrics ─────────────────────────────────────────
    const metricsRows = projectList.map(p => ({
      'Project Name':        p.name || '',
      'Owner':               getProjectOwner(p) || '',
      'Client':              p.clients || '',
      'Overdue Milestones':  p.overdueMilestones ?? 0,
      'Upcoming Milestones': p.upcomingMilestones ?? 0,
      'Open Critical Risks': p.openCriticalRisks ?? 0,
      'Open Critical Issues':p.openCriticalIssues ?? 0,
      'Open Escalations':    p.openEscalations ?? 0,
      'Open Dependencies':   p.openDependencies ?? 0,
      'Project Completion %':p.projectCompletion ?? 0,
      'Last Updated':        formatDate(p.lastModified || p.updated_at),
    }));
    const metricsSheet = XLSX.utils.json_to_sheet(
      metricsRows.length ? metricsRows : [{ 'Project Name': 'No data' }]
    );
    metricsSheet['!cols'] = [
      { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 20 },
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 },
      { wch: 20 }, { wch: 22 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, metricsSheet, 'Portfolio Metrics');

    // ── Download ───────────────────────────────────────────────────────────
    XLSX.writeFile(wb, 'portfolio_export.xlsx');
  };

  // Filtered projects for modal search
  const modalFilteredProjects = useMemo(() => {
    if (!modalSearch.trim()) return sortedProjects;
    const q = modalSearch.toLowerCase();
    return sortedProjects.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.clients || '').toLowerCase().includes(q) ||
      (p.spoc || '').toLowerCase().includes(q) ||
      (getProjectOwner(p) || '').toLowerCase().includes(q)
    );
  }, [sortedProjects, modalSearch]);

  const closeModal = () => {
    setShowAllModal(false);
    setModalSearch('');
  };

  return (
    <div className="portfolio-table-section">
      {/* ── Inline table header ── */}
      <div className="portfolio-table-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>All Projects</h3>
        <span className="project-count">{projects.length} projects</span>
        <button
          className="export-btn"
          onClick={(e) => { e.stopPropagation(); handleExport(sortedProjects); }}
          title="Export to CSV"
        >
          <Download size={16} />
          Export
        </button>
        <button className={`collapse-btn ${isCollapsed ? 'collapsed' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* ── Inline preview table (top 3) ── */}
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Project Name</th><th>SPOC</th><th>RAG</th><th>Status</th>
                <th>Action Item</th><th>Risk Summary</th><th>Mitigation Plan</th>
                <th>Updated At</th><th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProjects.map((project) => (
                <tr key={project._id || project.id} className="project-row">
                  <td onClick={() => onProjectClick(project)} style={{ cursor: 'pointer' }}>
                    <div className="project-name-cell clickable" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{project.name}</span>
                      <svg className="external-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </td>
                  <td><div style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.spoc || '—'}</div></td>
                  <td>
                    <div className="rag-cell">
                      <span className="rag-indicator" style={{ backgroundColor: ragColor(project.ragStatus) }} />
                      <span className="rag-text">{project.ragStatus || 'Green'}</span>
                    </div>
                  </td>
                  <td><div className="tooltip-cell" style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.sowStatus || '—'}>{project.sowStatus || '—'}</div></td>
                  <td><div className="tooltip-cell" style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.actionItem || '—'}><span className="ellipsis-text">{project.actionItem || '—'}</span></div></td>
                  <td><div className="tooltip-cell" style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.riskSummary || '—'}><span className="ellipsis-text">{project.riskSummary || '—'}</span></div></td>
                  <td><div className="tooltip-cell" style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.mitigationPlan || '—'}><span className="ellipsis-text">{project.mitigationPlan || '—'}</span></div></td>
                  <td><div style={{ fontSize: '13px', color: '#374151' }} title={formatUpdatedAt(project.dashboardUpdatedAt)}>{formatUpdatedAt(project.dashboardUpdatedAt)}</div></td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        className="action-btn view-btn"
                        onClick={() => setViewingProject(project)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      {hasPermission('portfolio_health', 'edit') && (
                        <button className="action-btn edit-btn" onClick={() => setEditingProject(project)} title="Edit Details">
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '14px' }}>
              No projects found
            </div>
          )}

          {hiddenCount > 0 && (
            <div className="show-all-projects">
              <button onClick={() => setShowAllModal(true)}>
                Show all {projects.length} projects
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          All Projects Modal
      ══════════════════════════════════════════ */}
      {showAllModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1100px', maxHeight: '80vh', overflow: 'auto', width: '92%' }}
          >
            {/* ── Header ── */}
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                All Projects
              </h2>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* ── Body ── */}
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Toggle + Export row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                {/* View toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
                  {[
                    { key: 'detailed', label: 'Portfolio Health' },
                    { key: 'metrics',  label: 'Portfolio Metrics' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setModalViewMode(key)}
                      style={{
                        padding: '6px 14px', fontSize: '13px', fontWeight: 600,
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: modalViewMode === key ? '#2563eb' : 'transparent',
                        color: modalViewMode === key ? 'white' : '#64748b',
                        transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Export */}
                <button
                  onClick={() => handleExport(modalFilteredProjects)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', fontSize: '13px', fontWeight: 500,
                    border: '1px solid #e5e7eb', borderRadius: '6px',
                    cursor: 'pointer', background: 'white', color: '#374151',
                    whiteSpace: 'nowrap', flexShrink: 0
                  }}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>

              {/* Search + result count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by project, client, SPOC or owner…"
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 32px 8px 38px',
                      fontSize: '13px', border: '1px solid #e5e7eb',
                      borderRadius: '8px', outline: 'none', color: '#111827',
                      boxSizing: 'border-box'
                    }}
                  />
                  {modalSearch && (
                    <button
                      onClick={() => setModalSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {modalSearch && (
                  <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    Showing {modalFilteredProjects.length} of {projects.length} projects
                  </span>
                )}
              </div>

              {/* Table */}
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {modalViewMode === 'detailed' ? (
                  <ModalDetailedTable
                    projects={modalFilteredProjects}
                    onProjectClick={onProjectClick}
                    onEditProject={setEditingProject}
                    onViewProject={setViewingProject}
                    hasPermission={hasPermission}
                    ragColor={ragColor}
                    formatUpdatedAt={formatUpdatedAt}
                  />
                ) : (
                  <ModalMetricsTable
                    projects={modalFilteredProjects}
                    onProjectClick={onProjectClick}
                    onViewProject={setViewingProject}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <EditProjectDetailModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={(updatedProject) => {
          if (onProjectUpdate) onProjectUpdate(updatedProject);
          setEditingProject(null);
        }}
      />

      <ProjectViewModal
        project={viewingProject}
        isOpen={!!viewingProject}
        onClose={() => setViewingProject(null)}
      />
    </div>
  );
}

export default DetailedProjectsTable;

/* ─────────────────────────────────────────────
   Portfolio Health table (inside modal)
───────────────────────────────────────────── */
function ModalDetailedTable({ projects, onProjectClick, onEditProject, onViewProject, hasPermission, ragColor, formatUpdatedAt }) {
  const COLS = [
    { label: 'Project Name', width: null },
    { label: 'SPOC',         width: '110px' },
    { label: 'RAG',          width: '90px' },
    { label: 'Status',       width: '110px' },
    { label: 'Action Item',  width: null },
    { label: 'Risk Summary', width: null },
    { label: 'Mitigation Plan', width: null },
    { label: 'Updated At',   width: '155px' },
    { label: 'Actions',      width: '70px', center: true },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
          {COLS.map(({ label, width, center }) => (
            <th key={label} style={{
              padding: '10px 14px', textAlign: center ? 'center' : 'left',
              fontSize: '11px', fontWeight: 700, color: '#64748b',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', position: 'sticky', top: 0,
              background: '#f8fafc', zIndex: 1,
              ...(width ? { width } : {})
            }}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.length === 0 ? (
          <tr>
            <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' }}>
              No projects match your search
            </td>
          </tr>
        ) : projects.map((project, idx) => (
          <tr
            key={project._id || project.id}
            style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
          >
            <td style={{ padding: '11px 14px' }}>
              <div
                onClick={() => onProjectClick(project)}
                style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {project.name}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            </td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.spoc || '—'}</td>
            <td style={{ padding: '11px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0, backgroundColor: ragColor(project.ragStatus) }} />
                <span style={{ fontSize: '13px', color: '#374151' }}>{project.ragStatus || 'Green'}</span>
              </div>
            </td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.sowStatus || '—'}>{project.sowStatus || '—'}</td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.actionItem || '—'}>{project.actionItem || '—'}</td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.riskSummary || '—'}>{project.riskSummary || '—'}</td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.mitigationPlan || '—'}>{project.mitigationPlan || '—'}</td>
            <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatUpdatedAt(project.dashboardUpdatedAt)}</td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <button
                  onClick={() => onViewProject(project)}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: '#2563eb', display: 'inline-flex', alignItems: 'center' }}
                  title="View Details"
                >
                  <Eye size={13} />
                </button>
                {hasPermission('portfolio_health', 'edit') && (
                  <button
                    onClick={() => onEditProject(project)}
                    style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: '#6b7280', display: 'inline-flex', alignItems: 'center' }}
                    title="Edit Details"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────
   Portfolio Metrics table (inside modal)
───────────────────────────────────────────── */
function ModalMetricsTable({ projects, onProjectClick, onViewProject }) {
  const COLS = [
    { label: 'Project',      width: null },
    { label: 'Owner',        width: '130px' },
    { label: 'Client',       width: '130px' },
    { label: 'Overdue',      width: '90px',  center: true },
    { label: 'Upcoming',     width: '100px', center: true },
    { label: 'Risks',        width: '80px',  center: true },
    { label: 'Issues',       width: '80px',  center: true },
    { label: 'Last Updated', width: '145px' },
    { label: 'Actions',      width: '70px',  center: true },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
          {COLS.map(({ label, width, center }) => (
            <th key={label} style={{
              padding: '10px 14px', textAlign: center ? 'center' : 'left',
              fontSize: '11px', fontWeight: 700, color: '#64748b',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', position: 'sticky', top: 0,
              background: '#f8fafc', zIndex: 1,
              ...(width ? { width } : {})
            }}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.length === 0 ? (
          <tr>
            <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' }}>
              No projects match your search
            </td>
          </tr>
        ) : projects.map((project, idx) => (
          <tr
            key={project._id || project.id}
            style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
          >
            <td style={{ padding: '11px 14px' }}>
              <div
                onClick={() => onProjectClick(project)}
                style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {project.name}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            </td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProjectOwner(project) || '—'}</td>
            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.clients || '—'}</td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: (project.overdueMilestones || 0) > 0 ? '#ef4444' : '#6b7280' }}>
                {project.overdueMilestones ?? '—'}
              </span>
            </td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: (project.upcomingMilestones || 0) > 0 ? '#f59e0b' : '#6b7280' }}>
                {project.upcomingMilestones ?? '—'}
              </span>
            </td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: (project.openCriticalRisks || 0) > 0 ? '#ef4444' : '#6b7280' }}>
                {project.openCriticalRisks ?? '—'}
              </span>
            </td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: (project.openCriticalIssues || 0) > 0 ? '#ef4444' : '#6b7280' }}>
                {project.openCriticalIssues ?? '—'}
              </span>
            </td>
            <td style={{ padding: '11px 14px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {formatDate(project.lastModified || project.updated_at)}
            </td>
            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
              <button
                onClick={() => onViewProject(project)}
                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: '#2563eb', display: 'inline-flex', alignItems: 'center' }}
                title="View Details"
              >
                <Eye size={13} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
