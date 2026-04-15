import React from 'react';

function OverdueTasksModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const tasks = documents.projectPlan || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter(t => {
    if (!t['Planned End Date']) return false;
    const endDate = convertExcelDateToJS(t['Planned End Date']);
    if (!endDate) return false;
    endDate.setHours(0, 0, 0, 0);
    const isCompleted = t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete');
    return endDate < today && !isCompleted;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Overdue Tasks</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {overdueTasks.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Task ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Task Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned Start</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Planned End</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Days Overdue</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.map((task, idx) => {
                  const endDate = convertExcelDateToJS(task['Planned End Date']);
                  const daysOverdue = Math.abs(Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned Start Date'])}</td>
                      <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{formatDate(task['Planned End Date'])}</td>
                      <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '600' }}>{daysOverdue} days</td>
                      <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{task.Status || 'Not Started'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No overdue tasks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverdueTasksModal;
