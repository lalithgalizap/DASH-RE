import React from 'react';

function OpenIssuesModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const raidLog = documents.raidLog || [];
  
  const openIssues = raidLog.filter(r => 
    r.Type && r.Type.toLowerCase() === 'issue' && 
    r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Open Issues</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {openIssues.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Severity</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date Raised</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {openIssues.map((issue, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', color: '#111827' }}>{issue.ID || issue['RAID ID']}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{issue.Description}</td>
                    <td style={{ padding: '10px', color: issue.Severity?.toLowerCase() === 'critical' ? '#dc2626' : issue.Severity?.toLowerCase() === 'high' ? '#f59e0b' : '#6b7280', fontWeight: '500' }}>{issue.Severity || 'N/A'}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{formatDate(issue['Date Raised'])}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{issue.Owner}</td>
                    <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>{issue.Status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No open issues.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OpenIssuesModal;
