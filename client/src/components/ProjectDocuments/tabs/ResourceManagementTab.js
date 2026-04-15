import React from 'react';
import { Search } from 'lucide-react';

function ResourceManagementTab({
  documents,
  resourceSearch,
  setResourceSearch
}) {
  if (!documents?.resourceManagementPlan || documents.resourceManagementPlan.length === 0) {
    return (
      <div className="document-content">
        <h3>Resource Management</h3>
        <p className="placeholder-text">No resource management data available.</p>
      </div>
    );
  }

  const allColumns = documents.resourceManagementPlan.reduce((cols, resource) => {
    Object.keys(resource).forEach(key => {
      if (!cols.includes(key)) {
        cols.push(key);
      }
    });
    return cols;
  }, []);

  // Helper to find column case-insensitively
  const findColumn = (name) => allColumns.find(col => col.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, ''));
  
  // Priority columns to show first (if they exist)
  const priorityColumnNames = [
    'RESOURCE NAME', 'ZAPCOM ID', 'ROLE', 'WORKSTREAM / FUNCTION', 
    'ALLOCATION %', 'START DATE', 'END DATE', 'STATUS', 
    'CRITICALITY', 'PRIMARY MANAGER / LEAD', 'BACKUP / SECONDARY OWNER', 'NOTES', 'ALLOCATION STATUS'
  ];
  const priorityColumns = priorityColumnNames.map(findColumn).filter(Boolean);

  // Columns to display in table
  const displayColumns = [...priorityColumns, ...allColumns.filter(col => !priorityColumns.includes(col))];

  // Filter out empty rows and apply search
  const filteredResources = documents.resourceManagementPlan.filter(record => {
    // Check if row has any non-empty data
    const hasData = displayColumns.some(col => {
      const value = record[col];
      return value && String(value).trim() !== '' && String(value) !== '-';
    });
    if (!hasData) return false;
    
    // Apply search filter
    if (!resourceSearch.trim()) return true;
    const searchLower = resourceSearch.toLowerCase();
    return displayColumns.some(col => {
      const value = record[col];
      if (value && String(value).toLowerCase().includes(searchLower)) {
        return true;
      }
      return false;
    });
  });

  // Format cell value
  const formatValue = (value, column) => {
    if (value === '' || value === null || value === undefined) return '-';
    if (typeof value === 'number' && column.includes('%')) return `${(value * 100).toFixed(0)}%`;
    if (typeof value === 'number' && value > 40000 && value < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + value * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    return value;
  };

  return (
    <div className="document-content">
      <h3>Resource Management</h3>

      {/* Search Bar */}
      <div style={{marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center'}}>
        <div style={{position: 'relative', flex: 1, maxWidth: '400px'}}>
          <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} />
          <input
            type="text"
            placeholder="Search resources by name, role, status, or any field..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white'
            }}
          />
        </div>
        {resourceSearch && (
          <button
            onClick={() => setResourceSearch('')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear Search
          </button>
        )}
        <span style={{fontSize: '13px', color: '#6b7280', marginLeft: 'auto'}}>
          Showing {filteredResources.length} of {documents.resourceManagementPlan.length} resources
        </span>
      </div>

      {/* Table */}
      <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
        <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
          <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
            <tr>
              {displayColumns.map((col, idx) => (
                <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((record, index) => (
              <tr key={index}>
                {displayColumns.map((col, colIdx) => {
                  const value = record[col];
                  return (
                    <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {formatValue(value, col)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResourceManagementTab;
