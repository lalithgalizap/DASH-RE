import React from 'react';

function ProjectPlanTab({
  documents,
  planFilters,
  setPlanFilters,
  selectedTask,
  setSelectedTask,
  showTaskModal,
  setShowTaskModal
}) {
  if (!documents?.projectPlan || documents.projectPlan.length === 0) {
    return (
      <div className="document-content">
        <h3>Project Plan</h3>
        <p className="placeholder-text">No project plan data available.</p>
      </div>
    );
  }

  const allColumns = documents.projectPlan.reduce((cols, task) => {
    Object.keys(task).forEach(key => {
      if (!cols.includes(key) && key !== '_MilestoneSeq') {
        cols.push(key);
      }
    });
    return cols;
  }, []);

  const initialColumns = [
    'Task ID', 'WBS', 'Phase', 'Task Name', 'Task Type', 'Owner', 
    'Status', '% Complete', 'RAG Status', 'Predecessor ID', 
    'Support Team / Function', 'Planned Start Date'
  ].filter(col => allColumns.includes(col));

  const getUniqueValues = (field) => {
    const values = [...new Set(documents.projectPlan.map(task => task[field]).filter(val => {
      return val && val !== field && String(val).trim() !== '';
    }))];
    return values.sort();
  };

  const filterOptions = {
    Phase: getUniqueValues('Phase'),
    'Task Type': getUniqueValues('Task Type'),
    Owner: getUniqueValues('Owner'),
    Status: getUniqueValues('Status'),
    'RAG Status': getUniqueValues('RAG Status')
  };

  const filteredTasks = documents.projectPlan.filter(task => {
    return Object.entries(planFilters).every(([field, value]) => {
      if (!value) return true;
      return task[field] === value;
    });
  });

  const resetFilters = () => {
    setPlanFilters({
      Phase: '',
      'Task Type': '',
      Owner: '',
      Status: '',
      'RAG Status': ''
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
    if (column === 'Status') return `status-badge ${value?.toLowerCase().replace(/\s+/g, '-')}`;
    if (column === 'RAG Status') return `rag-indicator ${value?.toLowerCase()}`;
    return '';
  };

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const renderTaskModal = () => {
    if (!showTaskModal || !selectedTask) return null;

    return (
      <div className="category-modal-overlay" onClick={() => setShowTaskModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span className="category-color-indicator" style={{ backgroundColor: '#3b82f6' }} />
              Task Details: {selectedTask['Task Name'] || selectedTask['Task ID']}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowTaskModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            <div className="task-detail-tile" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px'}}>
              {allColumns.map((col, idx) => {
                const value = selectedTask[col];
                const cellClass = getCellClass(col, value);
                return (
                  <div key={idx} className="detail-item" style={{
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
      <div className="plan-stats" style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Total Tasks</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>{documents.projectPlan.length}</div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Completed</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#16a34a'}}>{documents.projectPlan.filter(t => t.Status === 'Completed').length}</div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>In Progress</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#2563eb'}}>{documents.projectPlan.filter(t => t.Status?.toLowerCase().replace(/\s+/g, '-') === 'in-progress' || t.Status?.toLowerCase() === 'in progress').length}</div>
        </div>
        <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>RAG Red</div>
          <div style={{fontSize: '28px', fontWeight: '600', color: '#dc2626'}}>{documents.projectPlan.filter(t => t['RAG Status'] === 'Red').length}</div>
        </div>
      </div>

      <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
        <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
        
        {Object.entries(filterOptions).map(([field, values]) => (
          values.length > 0 && (
            <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
              <select
                value={planFilters[field]}
                onChange={(e) => setPlanFilters(prev => ({ ...prev, [field]: e.target.value }))}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: planFilters[field] ? '#dbeafe' : 'white',
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
        
        {Object.values(planFilters).some(v => v !== '') && (
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

      <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
        <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
          <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
            <tr>
              <th style={{whiteSpace: 'nowrap', padding: '8px', width: '30px'}}>+</th>
              {initialColumns.map((col, idx) => (
                <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task, index) => (
              <tr key={index} onClick={() => openTaskModal(task)} style={{cursor: 'pointer'}}>
                <td style={{padding: '6px 8px', textAlign: 'center'}}>
                  ▶
                </td>
                {initialColumns.map((col, colIdx) => {
                  const value = task[col];
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
      {renderTaskModal()}
    </div>
  );
}

export default ProjectPlanTab;
