import React, { useState, useMemo } from 'react';
import { Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp, X } from 'lucide-react';

function MilestoneVarianceModal({ isOpen, onClose, projects }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'details'

  // Calculate variance data for each project
  const projectsWithVariance = useMemo(() => {
    if (!isOpen) return [];
    return (projects || []).map(project => {
      const milestones = project.allMilestoneDetails || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Milestones that should be done by today
      const milestonesDueByToday = milestones.filter(m => {
        if (!m['Planned End Date']) return false;
        const endDate = convertExcelDateToJS(m['Planned End Date']);
        if (!endDate) return false;
        endDate.setHours(0, 0, 0, 0);
        return endDate <= today;
      });

      const totalDue = milestonesDueByToday.length;
      const completedDue = milestonesDueByToday.filter(m => 
        m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
      ).length;

      const plannedProgress = totalDue > 0 ? 100 : 0;
      const actualProgress = totalDue > 0 ? Math.round((completedDue / totalDue) * 100) : 0;
      const variance = actualProgress - plannedProgress;

      // Categorize milestones
      const behindMilestones = milestonesDueByToday.filter(m => {
        const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
        return !isCompleted;
      });

      const completedMilestones = milestonesDueByToday.filter(m => 
        m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
      );

      return {
        ...project,
        totalDue,
        completedDue,
        plannedProgress,
        actualProgress,
        variance,
        behindMilestones,
        completedMilestones,
        status: variance >= 0 ? 'ahead' : variance > -20 ? 'at-risk' : 'behind'
      };
    }).filter(p => p.totalDue > 0); // Only show projects with milestones due
  }, [projects]);

  // Filter by search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projectsWithVariance;
    const query = searchQuery.toLowerCase();
    return projectsWithVariance.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.clients || '').toLowerCase().includes(query)
    );
  }, [projectsWithVariance, searchQuery]);

  // Summary stats
  const summary = useMemo(() => {
    const ahead = filteredProjects.filter(p => p.variance >= 0);
    const atRisk = filteredProjects.filter(p => p.variance < 0 && p.variance > -20);
    const behind = filteredProjects.filter(p => p.variance <= -20);
    
    return {
      ahead: { count: ahead.length, projects: ahead },
      atRisk: { count: atRisk.length, projects: atRisk },
      behind: { count: behind.length, projects: behind }
    };
  }, [filteredProjects]);

  // Early return after all hooks
  if (!isOpen) return null;

  const convertExcelDateToJS = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
      return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
    }
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = convertExcelDateToJS(dateValue);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="category-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <TrendingUp size={24} color="#2563eb" />
              Planned vs Actual Progress
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '13px', 
              color: '#64748b' 
            }}>
              Milestone variance analysis across {filteredProjects.length} projects
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={22} color="#64748b" />
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '8px'
            }}>
              <CheckCircle size={18} color="#16a34a" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>AHEAD</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>
              {summary.ahead.count}
            </div>
            <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>
              Projects on/ ahead of schedule
            </div>
          </div>

          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '8px'
            }}>
              <Clock size={18} color="#f59e0b" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>AT RISK</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>
              {summary.atRisk.count}
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
              Minor delays (&lt;20%)
            </div>
          </div>

          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '8px'
            }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b' }}>BEHIND</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>
              {summary.behind.count}
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
              Significant delays (≥20%)
            </div>
          </div>
        </div>

        {/* Search & Toggle */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          alignItems: 'center'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '8px 12px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                background: 'transparent',
                color: '#1e293b'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size="16" color="#94a3b8" />
              </button>
            )}
          </div>

          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '500',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'summary' ? 'white' : 'transparent',
                color: viewMode === 'summary' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'summary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('details')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '500',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewMode === 'details' ? 'white' : 'transparent',
                color: viewMode === 'details' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Details
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px', maxHeight: '400px', overflowY: 'auto' }}>
          {filteredProjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b'
            }}>
              <Calendar size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                No milestone data available
              </p>
              <p style={{ fontSize: '14px' }}>
                Projects need milestones with planned end dates to calculate variance.
              </p>
            </div>
          ) : viewMode === 'summary' ? (
            // Summary View - Project Cards
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredProjects.map(project => (
                <div
                  key={project.id || project._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    gap: '16px',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {project.clients || 'No client assigned'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                      Milestones Due
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                      {project.totalDue}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                      Completed
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>
                      {project.completedDue}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                      Behind
                    </div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: project.behindMilestones.length > 0 ? '#dc2626' : '#16a34a'
                    }}>
                      {project.behindMilestones.length}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700',
                      color: project.variance >= 0 ? '#16a34a' : project.variance > -20 ? '#f59e0b' : '#dc2626'
                    }}>
                      {project.variance >= 0 ? '+' : ''}{project.variance}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      variance
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Details View - Milestone Lists
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredProjects.map(project => (
                <div
                  key={project.id || project._id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Project Header */}
                  <div style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {project.name}
                      </span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#64748b',
                        marginLeft: '12px'
                      }}>
                        {project.completedDue}/{project.totalDue} completed
                      </span>
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: project.variance >= 0 ? '#16a34a' : project.variance > -20 ? '#f59e0b' : '#dc2626'
                    }}>
                      {project.variance >= 0 ? '+' : ''}{project.variance}%
                    </span>
                  </div>

                  {/* Behind Milestones */}
                  {project.behindMilestones.length > 0 && (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#dc2626',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertTriangle size={14} />
                        Behind Schedule ({project.behindMilestones.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {project.behindMilestones.map((m, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: '#fef2f2',
                              borderRadius: '6px',
                              fontSize: '13px'
                            }}
                          >
                            <span style={{ color: '#1e293b', fontWeight: '500' }}>
                              {m['Milestone / Task Name'] || m['Milestone Ref'] || 'Unnamed Milestone'}
                            </span>
                            <span style={{ color: '#dc2626', fontSize: '12px' }}>
                              Due: {formatDate(m['Planned End Date'])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Milestones */}
                  {project.completedMilestones.length > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: project.behindMilestones.length > 0 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#16a34a',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <CheckCircle size={14} />
                        Completed ({project.completedMilestones.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {project.completedMilestones.slice(0, 3).map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '4px 10px',
                              background: '#f0fdf4',
                              borderRadius: '20px',
                              fontSize: '12px',
                              color: '#166534'
                            }}
                          >
                            {m['Milestone / Task Name'] || m['Milestone Ref'] || 'Unnamed'}
                          </span>
                        ))}
                        {project.completedMilestones.length > 3 && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            +{project.completedMilestones.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MilestoneVarianceModal;
