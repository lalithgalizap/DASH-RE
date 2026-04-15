import React from 'react';

function OpenRisksModal({ documents, convertExcelDateToJS, formatDate, onClose }) {
  const raidLog = documents.raidLog || [];
  
  const openRisks = raidLog.filter(r => 
    r.Type && r.Type.toLowerCase() === 'risk' && 
    r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved' &&
    r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical')
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Open Risks (High & Critical Severity)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          {openRisks.length > 0 ? (
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
                {openRisks.map((risk, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px', color: '#111827' }}>{risk.ID || risk['RAID ID']}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{risk.Description}</td>
                    <td style={{ padding: '10px', color: risk.Severity?.toLowerCase() === 'critical' ? '#dc2626' : '#f59e0b', fontWeight: '600' }}>{risk.Severity}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{formatDate(risk['Date Raised'])}</td>
                    <td style={{ padding: '10px', color: '#111827' }}>{risk.Owner}</td>
                    <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{risk.Status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No open risks with High or Critical severity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OpenRisksModal;
