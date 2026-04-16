import React from 'react';
import { formatDateDisplay } from '../utils';

const CriticalItemsDetailModal = ({ project, onClose }) => {
  if (!project) return null;

  const risks = (project.openCriticalRisksDetails || []).map(item => ({
    id: item['RAID ID'] || item.ID,
    type: 'Risk',
    title: item.Title || item.Description || 'Risk',
    owner: item['RAID Owner'] || item.Owner || item['Owner'] || item['Risk Owner'] || 'Unassigned',
    severity: item.Severity || 'High',
    dateRaised: item['Date Raised'],
    status: item.Status
  }));

  const issues = (project.openCriticalIssuesDetails || []).map(item => ({
    id: item['RAID ID'] || item.ID,
    type: 'Issue',
    title: item.Title || item.Description || item['Issue Title'] || 'Issue',
    owner: item['RAID Owner'] || item.Owner || item['Owner'] || 'Unassigned',
    severity: item.Severity || 'High',
    dateRaised: item['Date Raised'],
    status: item.Status
  }));

  const allItems = [...risks, ...issues];

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
              Critical Items ({allItems.length})
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
          {allItems.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Severity</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date Raised</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', color: '#111827' }}>{item.id || '-'}</td>
                    <td style={{ 
                      padding: '10px', 
                      color: item.type === 'Risk' ? '#7f1d1d' : '#b45309', 
                      fontWeight: '500' 
                    }}>
                      {item.type}
                    </td>
                    <td style={{ padding: '10px', color: '#111827' }}>{item.title}</td>
                    <td style={{ 
                      padding: '10px', 
                      color: item.severity?.toLowerCase() === 'critical' ? '#dc2626' : 
                             item.severity?.toLowerCase() === 'high' ? '#f59e0b' : '#6b7280', 
                      fontWeight: '500' 
                    }}>
                      {item.severity}
                    </td>
                    <td style={{ padding: '10px', color: '#111827' }}>
                      {formatDateDisplay(item.dateRaised)}
                    </td>
                    <td style={{ padding: '10px', color: '#111827' }}>{item.owner}</td>
                    <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>
                      {item.status || 'Open'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
              No critical items found for this project.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CriticalItemsDetailModal;
