import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

function ResourceManagementTab({
  documents,
  resourceSearch,
  setResourceSearch,
  selectedResource,
  setSelectedResource,
  showResourceModal,
  setShowResourceModal
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

  // Find the actual resource name column from the data
  const resourceNameColumn = findColumn('RESOURCE NAME') || findColumn('Name') || allColumns.find(col => col.toLowerCase().includes('name'));

  // Merge resource data with availability (holidays) by name
  const getResourceWithHolidays = (resource) => {
    const resourceName = resourceNameColumn ? resource[resourceNameColumn] : '';
    
    const availabilityRecords = documents.resourceAvailability?.filter(record => {
      const availName = record['Resource Name'] || '';
      return availName.toLowerCase().trim() === String(resourceName).toLowerCase().trim();
    }) || [];
    
    return { ...resource, holidayCount: availabilityRecords.length, holidayDetails: availabilityRecords };
  };

  // Open resource detail modal
  const openResourceModal = (resource) => {
    const enrichedResource = getResourceWithHolidays(resource);
    setSelectedResource(enrichedResource);
    setShowResourceModal(true);
  };

  // Collapsible Resource Availability Section Component
  const ResourceAvailabilitySection = ({ holidayDetails, formatDate }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const holidayCount = holidayDetails?.length || 0;

    return (
      <div style={{borderTop: '1px solid #e5e7eb'}}>
        {/* Header - Clickable to collapse/expand */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none'
          }}
        >
          <h4 style={{margin: 0, color: '#374151', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            Resource Availability 
            <span style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {holidayCount} records
            </span>
          </h4>
          {isExpanded ? (
            <ChevronUp size={20} color="#6b7280" />
          ) : (
            <ChevronDown size={20} color="#6b7280" />
          )}
        </div>

        {/* Content - Only show when expanded */}
        {isExpanded && (
          <div style={{padding: '16px', backgroundColor: '#ffffff'}}>
            {holidayCount > 0 ? (
              <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{backgroundColor: '#f3f4f6'}}>
                    <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #d1d5db'}}>Unavailability Type</th>
                    <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #d1d5db'}}>Start Date</th>
                    <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #d1d5db'}}>End Date</th>
                    <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #d1d5db'}}>Days Impact</th>
                    <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #d1d5db'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {holidayDetails.map((holiday, idx) => {
                    // Calculate Days Impact from Start Date and End Date
                    const startDate = holiday['Start Date'];
                    const endDate = holiday['End Date'];
                    let daysImpact = '-';
                    
                    if (startDate && endDate) {
                      // Convert Excel dates to JS dates if needed
                      const start = typeof startDate === 'number' && startDate > 40000 
                        ? new Date(Date.UTC(1899, 11, 30) + startDate * 86400 * 1000)
                        : new Date(startDate);
                      const end = typeof endDate === 'number' && endDate > 40000
                        ? new Date(Date.UTC(1899, 11, 30) + endDate * 86400 * 1000)
                        : new Date(endDate);
                      
                      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        const diffTime = end.getTime() - start.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
                        daysImpact = diffDays > 0 ? diffDays : 0;
                      }
                    }
                    
                    return (
                      <tr key={idx} style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '10px'}}>{holiday['Unavailability Type'] || '-'}</td>
                        <td style={{padding: '10px'}}>{formatDate(startDate)}</td>
                        <td style={{padding: '10px'}}>{formatDate(endDate)}</td>
                        <td style={{padding: '10px', fontWeight: '600', color: '#0369a1'}}>{daysImpact}</td>
                        <td style={{padding: '10px'}}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: (holiday['Status'] || '').toLowerCase() === 'approved' ? '#dcfce7' : '#fee2e2',
                            color: (holiday['Status'] || '').toLowerCase() === 'approved' ? '#166534' : '#991b1b'
                          }}>
                            {holiday['Status'] || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{color: '#6b7280', margin: 0, fontStyle: 'italic'}}>No availability records for this resource.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Format date for display
  const formatDate = (value) => {
    if (!value) return '-';
    if (typeof value === 'number' && value > 40000 && value < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + value * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    return value;
  };

  // Render resource detail modal
  const renderResourceModal = () => {
    if (!showResourceModal || !selectedResource) return null;

    return (
      <div className="category-modal-overlay" onClick={() => setShowResourceModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '85vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span style={{display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', marginRight: '10px'}} />
              Resource Details: {(resourceNameColumn ? selectedResource[resourceNameColumn] : null) || 'Unknown'}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowResourceModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            {/* Resource Management Data */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', borderBottom: '1px solid #e5e7eb'}}>
              {allColumns.map((col, idx) => {
                const value = selectedResource[col];
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
                    <span style={{fontSize: '14px', fontWeight: '500'}}>{formatValue(value, col)}</span>
                  </div>
                );
              })}
            </div>

            {/* Resource Availability Section */}
            <ResourceAvailabilitySection holidayDetails={selectedResource.holidayDetails} formatDate={formatDate} />
          </div>
        </div>
      </div>
    );
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
                  const isNameColumn = col.toLowerCase().replace(/\s+/g, '') === 'resourcename';
                  return (
                    <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {isNameColumn ? (
                        <span 
                          onClick={() => openResourceModal(record)}
                          style={{cursor: 'pointer', color: '#2563eb', fontWeight: 500, textDecoration: 'underline'}}
                          title="Click to view details"
                        >
                          {formatValue(value, col)}
                        </span>
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
      {renderResourceModal()}
    </div>
  );
}

export default ResourceManagementTab;
