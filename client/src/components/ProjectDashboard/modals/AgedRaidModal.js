import React from 'react';

function AgedRaidModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const raidLog = documents.raidLog || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const agedRaidItems = raidLog.filter(r => {
    if (!r['Date Raised']) return false;
    const raisedDate = convertExcelDateToJS(r['Date Raised']);
    if (!raisedDate) return false;
    return raisedDate < thirtyDaysAgo && 
           r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Aged RAID Items (&gt;30 Days)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {agedRaidItems.length > 0 ? (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Severity</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date Raised</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Days Open</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Owner</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {agedRaidItems.map((item, idx) => {
                  const raisedDate = convertExcelDateToJS(item['Date Raised']);
                  const daysOpen = raisedDate ? Math.floor((today - raisedDate) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', color: '#111827' }}>{item.ID || item['RAID ID']}</td>
                      <td style={{ padding: '10px', color: '#111827', fontWeight: '500' }}>{item.Type}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{item.Description}</td>
                      <td style={{ padding: '10px', color: item.Severity?.toLowerCase() === 'critical' ? '#dc2626' : item.Severity?.toLowerCase() === 'high' ? '#f59e0b' : '#6b7280', fontWeight: '500' }}>{item.Severity || 'N/A'}</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{formatDate(item['Date Raised'])}</td>
                      <td style={{ padding: '10px', color: '#6366f1', fontWeight: '600' }}>{daysOpen} days</td>
                      <td style={{ padding: '10px', color: '#111827' }}>{item.Owner}</td>
                      <td style={{ padding: '10px', color: '#6366f1', fontWeight: '500' }}>{item.Status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No RAID items older than 30 days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgedRaidModal;
