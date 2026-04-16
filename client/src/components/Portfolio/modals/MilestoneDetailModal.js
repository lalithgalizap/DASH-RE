import React from 'react';
import { convertExcelDateToJS, formatDateDisplay, getRAGColor } from '../utils';

const MilestoneDetailModal = ({ project, onClose, type = 'overdue' }) => {
  if (!project) return null;

  // Get today's date at midnight UTC to match Excel date conversion
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  // Get milestone details based on type
  const milestones = type === 'overdue' 
    ? (project.overdueMilestoneDetails || [])
    : (project.upcomingMilestoneDetails || []);

  const calculateDaysOverdue = (endDateRaw) => {
    const endDate = convertExcelDateToJS(endDateRaw);
    if (!endDate) return null;
    // Convert to UTC timestamp at midnight for accurate day calculation
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    return Math.round((todayUTC - endUTC) / (1000 * 60 * 60 * 24));
  };

  const calculateDaysUntil = (endDateRaw) => {
    const endDate = convertExcelDateToJS(endDateRaw);
    if (!endDate) return null;
    // Convert to UTC timestamp at midnight for accurate day calculation
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    return Math.round((endUTC - todayUTC) / (1000 * 60 * 60 * 24));
  };

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
      zIndex: 1001 
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
        background: 'white', 
        borderRadius: '12px', 
        maxWidth: '1000px', 
        width: '90%', 
        maxHeight: '80vh', 
        overflow: 'auto' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{project.name}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {type === 'overdue' ? 'Overdue Milestones' : 'Upcoming Milestones'} ({milestones.length})
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {milestones.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Milestone Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned Start</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned End</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>
                    {type === 'overdue' ? 'Days Overdue' : 'Days Until'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone, idx) => {
                  const plannedStartRaw = milestone['Planned Start Date'];
                  const plannedEndRaw = milestone['Planned End Date'];
                  const status = milestone['Milestone Status'] || milestone['Status'] || 'Open';
                  
                  const daysValue = type === 'overdue' 
                    ? calculateDaysOverdue(plannedEndRaw)
                    : calculateDaysUntil(plannedEndRaw);
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>
                        {milestone['Milestone / Task Name'] || 'Unnamed Milestone'}
                      </td>
                      <td style={{ padding: '10px', color: '#6b7280' }}>
                        {formatDateDisplay(plannedStartRaw)}
                      </td>
                      <td style={{ padding: '10px', color: '#6b7280' }}>
                        {formatDateDisplay(plannedEndRaw)}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        color: status.toLowerCase() === 'completed' ? '#059669' : '#dc2626',
                        fontWeight: 500 
                      }}>
                        {status}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        color: type === 'overdue' ? '#dc2626' : '#b45309', 
                        fontWeight: 500 
                      }}>
                        {daysValue !== null ? `${daysValue} days` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
              No {type === 'overdue' ? 'overdue' : 'upcoming'} milestones found for this project.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneDetailModal;
