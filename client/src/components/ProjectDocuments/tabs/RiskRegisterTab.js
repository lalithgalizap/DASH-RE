import React from 'react';

function RiskRegisterTab({
  documents,
  riskFilters,
  setRiskFilters,
  selectedRisk,
  setSelectedRisk,
  showRiskModal,
  setShowRiskModal
}) {
  if (!documents?.riskRegister || documents.riskRegister.length === 0) {
    return (
      <div className="document-content">
        <h3>Risk Register</h3>
        <p className="placeholder-text">No risk register data available.</p>
      </div>
    );
  }

  const allColumns = documents.riskRegister.reduce((cols, risk) => {
    Object.keys(risk).forEach(key => {
      if (!cols.includes(key)) {
        cols.push(key);
      }
    });
    return cols;
  }, []);

  const displayColumns = ['ID', 'Risk Description', 'Impact Area', 'Impact Rating', 'Probability', 'Risk Priority', 'Status', 'Mitigation Strategy', 'Risk Owner'];
  const finalDisplayColumns = displayColumns.filter(col => allColumns.includes(col)).slice(0, 9);

  const getUniqueValues = (field) => {
    const values = [...new Set(documents.riskRegister.map(risk => risk[field]).filter(val => {
      return val && val !== field && String(val).trim() !== '';
    }))];
    return values.sort();
  };

  const filterOptions = {
    'Impact Area': getUniqueValues('Impact Area'),
    'Impact Rating': getUniqueValues('Impact Rating'),
    'Probability': getUniqueValues('Probability'),
    'Risk Priority': getUniqueValues('Risk Priority'),
    'Status': getUniqueValues('Status'),
    'Risk Owner': getUniqueValues('Risk Owner'),
    'Mitigation Strategy': getUniqueValues('Mitigation Strategy')
  };

  const filteredRisks = documents.riskRegister.filter(risk => {
    return Object.entries(riskFilters).every(([field, value]) => {
      if (!value) return true;
      return risk[field] === value;
    });
  });

  const resetFilters = () => {
    setRiskFilters({
      'Impact Area': '',
      'Impact Rating': '',
      'Probability': '',
      'Risk Priority': '',
      'Status': '',
      'Risk Owner': '',
      'Mitigation Strategy': ''
    });
  };

  const formatValue = (value, column) => {
    if (value === '' || value === null || value === undefined) return '-';
    if (column === '% Complete') return `${(value * 100).toFixed(0)}%`;
    
    // Convert Excel serial numbers to dates (like MilestonesTab does)
    if (typeof value === 'number' && value > 40000 && value < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + value * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    
    return value;
  };

  const getCellClass = (column, value) => {
    if (column === 'Status') return `status-badge ${value?.toLowerCase().replace(/\s+/g, '-')}`;
    if (column === 'Risk Priority' || column === 'Impact Rating' || column === 'Probability') return `risk-badge ${value?.toLowerCase()}`;
    return '';
  };

  const openRiskModal = (risk) => {
    setSelectedRisk(risk);
    setShowRiskModal(true);
  };

  const renderRiskModal = () => {
    if (!showRiskModal || !selectedRisk) return null;

    // Filter out __EMPTY columns
    const displayColumns = allColumns.filter(col => !col.startsWith('__EMPTY'));

    return (
      <div className="category-modal-overlay" onClick={() => setShowRiskModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span className="category-color-indicator" style={{ backgroundColor: '#ef4444' }} />
              Risk Details: {selectedRisk['Risk Description'] || selectedRisk['ID']}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowRiskModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px'}}>
              {displayColumns.map((col, idx) => {
                const value = selectedRisk[col];
                const cellClass = getCellClass(col, value);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <label style={{fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>{col}</label>
                    <span style={{fontSize: '14px', fontWeight: '500'}}>
                      {cellClass ? (
                        <span className={cellClass}>{formatValue(value, col)}</span>
                      ) : (
                        formatValue(value, col)
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="document-content">
      <div style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Total Risks</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>{documents.riskRegister.length}</div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>High</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#f59e0b'}}>{documents.riskRegister.filter(r => r['Risk Priority'] === 'High').length}</div>
        </div>
      </div>

      <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
        <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
        
        {Object.entries(filterOptions).map(([field, values]) => (
          values.length > 0 && (
            <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
              <select
                value={riskFilters[field]}
                onChange={(e) => setRiskFilters(prev => ({ ...prev, [field]: e.target.value }))}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: riskFilters[field] ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                <option value="">-- Select --</option>
                {values.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          )
        ))}
        
        {Object.values(riskFilters).some(v => v !== '') && (
          <button
            onClick={resetFilters}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      <h3>Risk Register ({filteredRisks.length} of {documents.riskRegister.length} risks)</h3>
      <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
        <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
          <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
            <tr>
              <th style={{whiteSpace: 'nowrap', padding: '8px', width: '30px'}}>+</th>
              {finalDisplayColumns.map((col, idx) => (
                <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRisks.map((risk, index) => (
              <tr key={index} onClick={() => openRiskModal(risk)} style={{cursor: 'pointer'}}>
                <td style={{padding: '6px 8px', textAlign: 'center'}}>▶</td>
                {finalDisplayColumns.map((col, colIdx) => {
                  const value = risk[col];
                  const cellClass = getCellClass(col, value);
                  return (
                    <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {cellClass ? (
                        <span className={cellClass}>{formatValue(value, col)}</span>
                      ) : (
                        formatValue(value, col)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderRiskModal()}
    </div>
  );
}

export default RiskRegisterTab;
