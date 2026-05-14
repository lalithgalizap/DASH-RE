import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getProjectOwner, formatDate } from '../utils';
import { useNavigate } from 'react-router-dom';
import './modals.css';

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
  return parsed.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

/* ── Stat box for metrics ── */
function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 8px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
    }}>
      <span style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>
        {value ?? 0}
      </span>
      <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  );
}

function ProjectViewModal({ project, isOpen, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('health');

  if (!isOpen || !project) return null;

  const projectId = project._id || project.id;
  const rag = project.ragStatus || 'Green';
  const rc = ragColor(rag);

  /* ── shared label style ── */
  const labelStyle = {
    width: '150px', flexShrink: 0,
    fontSize: '12px', fontWeight: 600, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  /* ── shared value style ── */
  const valueStyle = {
    flex: 1, fontSize: '13px', color: '#111827',
    lineHeight: 1.6, wordBreak: 'break-word',
  };

  /* ── empty value style ── */
  const emptyStyle = { ...valueStyle, color: '#9ca3af' };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          width: '760px',
          maxWidth: '94vw',
          /* Fixed height — never resizes on tab switch */
          height: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ════ FIXED HEADER ════ */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '18px 20px 12px',
          }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                  {project.name}
                </h2>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '2px 10px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: 600,
                  background: rc + '18', color: rc,
                  border: `1px solid ${rc}40`, flexShrink: 0,
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: rc }} />
                  {rag}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '5px', flexWrap: 'wrap' }}>
                {project.clients && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    <span style={{ color: '#9ca3af' }}>Client: </span>{project.clients}
                  </span>
                )}
                {getProjectOwner(project) && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    <span style={{ color: '#9ca3af' }}>Owner: </span>{getProjectOwner(project)}
                  </span>
                )}
                {project.spoc && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    <span style={{ color: '#9ca3af' }}>SPOC: </span>{project.spoc}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => { window.open(`/project/${projectId}`, '_blank'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', fontSize: '12px', fontWeight: 500,
                  border: '1px solid #e5e7eb', borderRadius: '6px',
                  background: 'white', color: '#374151', cursor: 'pointer',
                }}
              >
                <ExternalLink size={13} />
                Open Project
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7280', fontSize: '22px', lineHeight: 1,
                  padding: '4px 6px', borderRadius: '6px',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', padding: '0 20px' }}>
            {[
              { key: 'health',  label: 'Portfolio Health' },
              { key: 'metrics', label: 'Portfolio Metrics' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: activeTab === tab.key ? '#2563eb' : '#6b7280',
                  borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'color 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ════ BODY — fixed height, only data area scrolls ════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* ── PORTFOLIO HEALTH ── */}
          {activeTab === 'health' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: 0 }}>

              {/* Top row: Status + Updated At side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Status',     value: project.sowStatus },
                  { label: 'Updated At', value: formatUpdatedAt(project.dashboardUpdatedAt) },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: '#f8fafc', border: '1px solid #e5e7eb',
                    borderRadius: '8px', padding: '14px 16px',
                  }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 700, color: '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '13px', color: value ? '#111827' : '#9ca3af', lineHeight: 1.5 }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom three: Action Item, Risk Summary, Mitigation Plan — each full width, scrollable content */}
              {[
                { label: 'Action Item',     value: project.actionItem },
                { label: 'Risk Summary',    value: project.riskSummary },
                { label: 'Mitigation Plan', value: project.mitigationPlan },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: '8px', padding: '14px 16px', marginBottom: '12px',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: '#9ca3af',
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: '13px', color: value ? '#111827' : '#9ca3af',
                    lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  }}>
                    {value || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PORTFOLIO METRICS ── */}
          {activeTab === 'metrics' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: 0 }}>

              {/* 6 stat boxes */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <StatBox
                  label="Overdue Milestones"
                  value={project.overdueMilestones ?? 0}
                  color={(project.overdueMilestones || 0) > 0 ? '#ef4444' : '#6b7280'}
                />
                <StatBox
                  label="Upcoming Milestones"
                  value={project.upcomingMilestones ?? 0}
                  color={(project.upcomingMilestones || 0) > 0 ? '#f59e0b' : '#6b7280'}
                />
                <StatBox
                  label="Critical Risks"
                  value={project.openCriticalRisks ?? 0}
                  color={(project.openCriticalRisks || 0) > 0 ? '#ef4444' : '#6b7280'}
                />
                <StatBox
                  label="Critical Issues"
                  value={project.openCriticalIssues ?? 0}
                  color={(project.openCriticalIssues || 0) > 0 ? '#ef4444' : '#6b7280'}
                />
                <StatBox
                  label="Escalations"
                  value={project.openEscalations ?? 0}
                  color={(project.openEscalations || 0) > 0 ? '#f59e0b' : '#6b7280'}
                />
                <StatBox
                  label="Dependencies"
                  value={project.openDependencies ?? 0}
                  color={(project.openDependencies || 0) > 0 ? '#f59e0b' : '#6b7280'}
                />
              </div>

              {/* Project info rows — no duplication, different fields */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                {[
                  { label: 'Owner',        value: getProjectOwner(project) },
                  { label: 'Client',       value: project.clients },
                  { label: 'SPOC',         value: project.spoc },
                  { label: 'Last Updated', value: formatDate(project.lastModified || project.updated_at) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      padding: '10px 0',
                      borderBottom: '1px solid #f1f5f9',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={labelStyle}>{label}</span>
                    <span style={value ? valueStyle : emptyStyle}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectViewModal;
