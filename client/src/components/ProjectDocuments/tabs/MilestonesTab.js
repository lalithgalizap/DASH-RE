import React from 'react';

function MilestonesTab({
  documents,
  milestoneFilters,
  setMilestoneFilters,
  selectedMilestone,
  setSelectedMilestone,
  showMilestoneModal,
  setShowMilestoneModal
}) {
  if (!documents?.milestoneTracker || documents.milestoneTracker.length === 0) {
    return (
      <div className="document-content">
        <h3>Milestone Tracker</h3>
        <p className="placeholder-text">No milestone data available.</p>
      </div>
    );
  }

  const allColumns = documents.milestoneTracker.reduce((cols, milestone) => {
    Object.keys(milestone).forEach(key => {
      if (!cols.includes(key)) {
        cols.push(key);
      }
    });
    return cols;
  }, []);

  const displayColumns = ['Milestone Ref', 'Milestone / Task Name', 'Phase', 'Planned Start Date', 'Planned End Date', 'Status', 'Owner', 'WBS'];
  const finalDisplayColumns = displayColumns.length > 0 ? displayColumns : allColumns.slice(0, 8);

  const getUniqueValues = (field) => {
    const values = [...new Set(documents.milestoneTracker.map(milestone => milestone[field]).filter(val => {
      return val && val !== field && String(val).trim() !== '';
    }))];
    return values.sort();
  };

  const filterOptions = {
    'Status': getUniqueValues('Status'),
    'Owner': getUniqueValues('Owner'),
    'WBS': getUniqueValues('WBS')
  };

  const filteredMilestones = documents.milestoneTracker.filter(milestone => {
    return Object.entries(milestoneFilters).every(([field, value]) => {
      if (!value) return true;
      return milestone[field] === value;
    });
  });

  const resetFilters = () => {
    setMilestoneFilters({
      'Status': '',
      'Owner': '',
      'WBS': ''
    });
  };

  const formatValue = (value, column) => {
    if (value === '' || value === null || value === undefined) return '-';
    if (column === '% Complete') return `${(value * 100).toFixed(0)}%`;
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
    if (column === 'Status' && typeof value === 'string') return `status-badge ${value.toLowerCase().replace(/\s+/g, '-')}`;
    return '';
  };

  const openMilestoneModal = (milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneModal(true);
  };

  const renderMilestoneModal = () => {
    if (!showMilestoneModal || !selectedMilestone) return null;

    return (
      <div className="category-modal-overlay" onClick={() => setShowMilestoneModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span className="category-color-indicator" style={{ backgroundColor: '#10b981' }} />
              Milestone Details: {selectedMilestone['Milestone / Task Name'] || selectedMilestone['Milestone Ref']}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowMilestoneModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px'}}>
              {allColumns.map((col, idx) => {
                const value = selectedMilestone[col];
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
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Total Milestones</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>{documents.milestoneTracker.length}</div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Completed</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#16a34a'}}>
            {documents.milestoneTracker.filter(m => m['Status'] === 'Completed' || m['Status'] === 'Complete' || m['% Complete'] === 1).length}
          </div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>In Progress</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#2563eb'}}>
            {documents.milestoneTracker.filter(m => m['Status'] === 'In Progress' || m['Status'] === 'In-Progress' || (m['% Complete'] > 0 && m['% Complete'] < 1)).length}
          </div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Delayed</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#dc2626'}}>
            {documents.milestoneTracker.filter(m => m['Variance (Days)'] > 0 || m['Status'] === 'Delayed' || m['Status'] === 'Behind').length}
          </div>
        </div>
      </div>

      <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
        <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
        
        {Object.entries(filterOptions).map(([field, values]) => (
          values.length > 0 && (
            <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
              <select
                value={milestoneFilters[field]}
                onChange={(e) => setMilestoneFilters(prev => ({ ...prev, [field]: e.target.value }))}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: milestoneFilters[field] ? '#dbeafe' : 'white',
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
        
        {Object.values(milestoneFilters).some(v => v !== '') && (
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

      <h3>Milestone Tracker ({filteredMilestones.length} of {documents.milestoneTracker.length} milestones)</h3>
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
            {filteredMilestones.map((milestone, index) => (
              <tr key={index} onClick={() => openMilestoneModal(milestone)} style={{cursor: 'pointer'}}>
                <td style={{padding: '6px 8px', textAlign: 'center'}}>▶</td>
                {finalDisplayColumns.map((col, colIdx) => {
                  const value = milestone[col];
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
      {renderMilestoneModal()}
    </div>
  );
}

export default MilestonesTab;
