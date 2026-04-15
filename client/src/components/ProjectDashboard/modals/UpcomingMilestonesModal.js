import React from 'react';

function UpcomingMilestonesModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const milestones = documents.milestoneTracker || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const upcomingMilestones = milestones.filter(m => {
    if (!m['Planned End Date']) return false;
    const endDate = convertExcelDateToJS(m['Planned End Date']);
    if (!endDate) return false;
    endDate.setHours(0, 0, 0, 0);
    const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
    return endDate >= today && endDate <= fourteenDaysFromNow && !isCompleted;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Upcoming Milestones (Next 14 Days)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {upcomingMilestones.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Milestone Ref</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Milestone Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned Start</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned End</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Days Until Due</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingMilestones.map((milestone, idx) => {
                  const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                  const daysUntilDue = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned Start Date'])}</td>
                      <td style={{ padding: '10px', color: '#3b82f6', fontWeight: '500' }}>{formatDate(milestone['Planned End Date'])}</td>
                      <td style={{ padding: '10px', color: '#3b82f6', fontWeight: '600' }}>{daysUntilDue} days</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{milestone.Status || 'Not Started'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No upcoming milestones in the next 14 days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpcomingMilestonesModal;
