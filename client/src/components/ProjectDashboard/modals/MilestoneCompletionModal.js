import React from 'react';

function MilestoneCompletionModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const milestones = documents.milestoneTracker || [];
  const completedMilestones = milestones.filter(m => 
    m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
  );
  const incompleteMilestones = milestones.filter(m => 
    !m.Status || (m.Status.toLowerCase() !== 'completed' && m.Status.toLowerCase() !== 'complete')
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Milestone Completion Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>COMPLETED</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{completedMilestones.length}</div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>IN PROGRESS</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{incompleteMilestones.length}</div>
            </div>
          </div>

          {completedMilestones.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '12px' }}>Completed Milestones ({completedMilestones.length})</h3>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedMilestones.map((milestone, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned End Date'])}</td>
                      <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{formatDate(milestone['Actual End Date'])}</td>
                      <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{milestone.Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {incompleteMilestones.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '12px' }}>In Progress Milestones ({incompleteMilestones.length})</h3>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteMilestones.map((milestone, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned Start Date'])}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned End Date'])}</td>
                      <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{milestone.Status || 'Not Started'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MilestoneCompletionModal;
