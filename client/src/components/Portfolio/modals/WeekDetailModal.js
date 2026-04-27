import React from 'react';
import './modals.css';

const WeekDetailModal = ({ isOpen, onClose, weekData, metricLabel, color }) => {
  if (!isOpen || !weekData) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const projects = weekData.projects || [];
  // Use total from transformed data (weekData.total), fallback to value or 0
  const total = weekData.total || weekData.value || 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        width: '90%'
      }}>
        <div className="modal-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Week Ending {formatDate(weekData.weekEnding)}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              {metricLabel} Breakdown by Project
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer'
          }}>×</button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Total {metricLabel}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '700', color: color }}>
                {total}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Projects with Data</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '600', color: '#374151' }}>
                {projects.length}
              </p>
            </div>
          </div>

          {/* Project List */}
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            By Project
          </h3>

          {projects.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
              No projects with {metricLabel.toLowerCase()} for this week.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.map((project, idx) => {
                const percentage = total > 0 ? ((project.value / total) * 100).toFixed(1) : 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '500', color: '#374151', fontSize: '14px' }}>
                        {project.projectName}
                      </p>
                      {project.client && (
                        <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '12px' }}>
                          {project.client}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: '600', color: color, fontSize: '16px' }}>
                        {project.value}
                      </p>
                      <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '12px' }}>
                        {percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeekDetailModal;
