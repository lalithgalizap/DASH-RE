import React from 'react';

function RaidLogTab({
  documents,
  raidFilters,
  setRaidFilters,
  raidViewMode,
  setRaidViewMode,
  setSelectedCategory,
  setShowCategoryModal,
  setSelectedMitigation,
  setShowMitigationModal
}) {
  if (!documents?.raidLog || documents.raidLog.length === 0) {
    return (
      <div className="document-content">
        <h3>RAID Log</h3>
        <p className="placeholder-text">No RAID items found.</p>
      </div>
    );
  }

  const allColumns = documents.raidLog.reduce((cols, item) => {
    Object.keys(item).forEach(key => {
      if (!cols.includes(key)) {
        cols.push(key);
      }
    });
    return cols;
  }, []);

  const displayColumns = ['RAID ID', 'Type', 'Title', 'Description', 'Status', 'Severity', 'Category', 'Owner', 'Date Raised', 'Mitigation Strategy'];
  const finalDisplayColumns = displayColumns.filter(col => allColumns.includes(col)).slice(0, 10);

  const getUniqueValues = (field) => {
    const values = [...new Set(documents.raidLog.map(item => item[field]).filter(val => {
      return val && String(val).trim() !== '';
    }))];
    return values.sort();
  };

  const filterOptions = {
    Type: getUniqueValues('Type'),
    Category: getUniqueValues('Category'),
    Status: getUniqueValues('Status'),
    Severity: getUniqueValues('Severity'),
    'Mitigation Strategy': getUniqueValues('Mitigation Strategy')
  };

  const filteredItems = documents.raidLog.filter(item => {
    return Object.entries(raidFilters).every(([field, value]) => {
      if (!value) return true;
      return item[field] === value;
    });
  });

  const resetRaidFilters = () => {
    setRaidFilters({
      Type: '',
      Category: '',
      Status: '',
      Severity: '',
      'Mitigation Strategy': ''
    });
  };

  const formatValue = (value, column) => {
    if (value === '' || value === null || value === undefined) return '-';
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
    if (column === 'Severity') return `severity-badge ${value?.toLowerCase()}`;
    if (column === 'Type') return `type-badge ${value?.toLowerCase()}`;
    return '';
  };

  const renderVisualization = () => {
    const stats = {
      byStatus: {},
      byMitigation: {},
      byCategory: {}
    };

    documents.raidLog.forEach(item => {
      stats.byStatus[item.Status] = (stats.byStatus[item.Status] || 0) + 1;
      stats.byMitigation[item['Mitigation Strategy']] = (stats.byMitigation[item['Mitigation Strategy']] || 0) + 1;
      stats.byCategory[item.Category] = (stats.byCategory[item.Category] || 0) + 1;
    });

    const totalItems = documents.raidLog.length;
    const criticalItems = documents.raidLog.filter(item => 
      item.Severity === 'Critical' || item.Severity === 'High'
    ).length;
    const openItems = documents.raidLog.filter(item => 
      item.Status !== 'Closed' && item.Status !== 'Complete'
    ).length;
    const overdueItems = documents.raidLog.filter(item => 
      item.Status === 'Behind'
    ).length;

    return (
      <div className="raid-visualization-container">
        <div className="executive-summary">
          <div className="summary-card critical">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <div className="summary-value">{criticalItems}</div>
              <div className="summary-label">High Priority</div>
              <div className="summary-sublabel">{Math.round((criticalItems/totalItems)*100)}% of total</div>
            </div>
          </div>
          <div className="summary-card open">
            <div className="summary-icon">📋</div>
            <div className="summary-content">
              <div className="summary-value">{openItems}</div>
              <div className="summary-label">Open Items</div>
              <div className="summary-sublabel">{Math.round((openItems/totalItems)*100)}% active</div>
            </div>
          </div>
          <div className="summary-card overdue">
            <div className="summary-icon">🔴</div>
            <div className="summary-content">
              <div className="summary-value">{overdueItems}</div>
              <div className="summary-label">Behind Schedule</div>
              <div className="summary-sublabel">Needs attention</div>
            </div>
          </div>
          <div className="summary-card total">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <div className="summary-value">{totalItems}</div>
              <div className="summary-label">Total RAIDs</div>
              <div className="summary-sublabel">Tracked items</div>
            </div>
          </div>
        </div>

        {/* Top Row: Status Overview & Mitigation Strategy */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
          {/* Status Overview - Bar Chart */}
          <div className="viz-card">
            <h4>Status Overview</h4>
            <div className="column-chart">
              <div className="chart-area">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const percentage = Math.round((count / totalItems) * 100);
                  const maxCount = Math.max(...Object.values(stats.byStatus));
                  const heightPercent = count > 0 ? Math.min(Math.max((count / (maxCount || 1)) * 100, 8), 100) : 0;
                  const statusColors = {
                    'Not Started': '#6b7280',
                    'In-Progress': '#3b82f6',
                    'Behind': '#ef4444',
                    'Closed': '#22c55e',
                    'Complete': '#22c55e'
                  };
                  return (
                    <div key={status} className="column-item">
                      <div className="column-bar-container">
                        <div
                          className="column-bar"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: statusColors[status] || '#71717a',
                            minHeight: count > 0 ? '20px' : '0'
                          }}
                          title={`${status}: ${count} (${percentage}%)`}
                        />
                        <span className="column-value">{count} <span className="column-percentage-inline">({percentage}%)</span></span>
                      </div>
                      <div className="column-label">{status}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chart-axis">
                <span className="axis-label">Status</span>
              </div>
            </div>
          </div>

          {/* Mitigation Strategy - Donut Chart */}
          <div className="viz-card">
            <h4>Mitigation Strategy</h4>
            <div className="donut-chart-container">
              <svg viewBox="0 0 200 200" className="donut-chart">
                <text x="100" y="95" textAnchor="middle" className="donut-center-label">Total</text>
                <text x="100" y="115" textAnchor="middle" className="donut-center-value">{totalItems}</text>
                {(() => {
                  let cumulativePercent = 0;
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#14b8a6', '#f97316'];
                  return Object.entries(stats.byMitigation).map(([strategy, count], index) => {
                    const percentage = count / totalItems;
                    const startAngle = cumulativePercent * 360;
                    cumulativePercent += percentage;
                    const endAngle = cumulativePercent * 360;

                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (endAngle - 90) * Math.PI / 180;

                    const x1 = 100 + 70 * Math.cos(startRad);
                    const y1 = 100 + 70 * Math.sin(startRad);
                    const x2 = 100 + 70 * Math.cos(endRad);
                    const y2 = 100 + 70 * Math.sin(endRad);

                    const largeArc = percentage > 0.5 ? 1 : 0;

                    const pathData = [
                      `M 100 100`,
                      `L ${x1} ${y1}`,
                      `A 70 70 0 ${largeArc} 1 ${x2} ${y2}`,
                      `Z`
                    ].join(' ');

                    return (
                      <path
                        key={strategy}
                        d={pathData}
                        fill={colors[index % colors.length]}
                        stroke="white"
                        strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedMitigation(strategy);
                          setShowMitigationModal(true);
                        }}
                        title={`${strategy}: ${count} (${Math.round(percentage * 100)}%)`}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="donut-legend">
                {Object.entries(stats.byMitigation).map(([strategy, count], index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#14b8a6', '#f97316'];
                  const percentage = Math.round((count / totalItems) * 100);
                  return (
                    <div
                      key={strategy}
                      className="legend-item clickable-legend"
                      onClick={() => {
                        setSelectedMitigation(strategy);
                        setShowMitigationModal(true);
                      }}
                    >
                      <span className="legend-color" style={{ backgroundColor: colors[index % 8] }} />
                      <div className="legend-text">
                        <span className="legend-label">{strategy}</span>
                        <span className="legend-count">{count} ({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Items by Category - Full Width */}
        <div className="viz-card" style={{width: '100%'}}>
          <h4>Items by Category</h4>
          <div className="column-chart">
            <div className="chart-area">
              {Object.entries(stats.byCategory).map(([category, count], index) => {
                const percentage = Math.round((count / totalItems) * 100);
                const maxCount = Math.max(...Object.values(stats.byCategory));
                const heightPercent = count > 0 ? Math.min(Math.max((count / (maxCount || 1)) * 100, 8), 100) : 0;
                const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#6366f1', '#84cc16'];
                const barColor = colors[index % colors.length];
                return (
                  <div
                    key={category}
                    className="column-item clickable"
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryModal(true);
                    }}
                  >
                    <div className="column-bar-container">
                      <div
                        className="column-bar"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: barColor,
                          minHeight: count > 0 ? '20px' : '0'
                        }}
                        title={`${category}: ${count} (${percentage}%)`}
                      />
                      <span className="column-value">{count} ({percentage}%)</span>
                    </div>
                    <div className="column-label">{category}</div>
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
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3>RAID Log ({filteredItems.length} of {documents.raidLog.length} items)</h3>
        <div style={{display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px'}}>
          <button
            onClick={() => setRaidViewMode('table')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              background: raidViewMode === 'table' ? '#ffffff' : 'transparent',
              color: raidViewMode === 'table' ? '#111827' : '#6b7280',
              boxShadow: raidViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Table View
          </button>
          <button
            onClick={() => setRaidViewMode('visualization')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              background: raidViewMode === 'visualization' ? '#ffffff' : 'transparent',
              color: raidViewMode === 'visualization' ? '#111827' : '#6b7280',
              boxShadow: raidViewMode === 'visualization' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Visualization
          </button>
        </div>
      </div>

      {raidViewMode === 'visualization' ? (
        renderVisualization()
      ) : (
        <>
          {/* RAID Stats Summary */}
          <div style={{display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '120px', background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#dc2626'}}>{documents.raidDashboard?.risks || 0}</div>
              <div style={{fontSize: '12px', color: '#991b1b', fontWeight: '600'}}>Risks</div>
            </div>
            <div style={{flex: 1, minWidth: '120px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#2563eb'}}>{documents.raidDashboard?.assumptions || 0}</div>
              <div style={{fontSize: '12px', color: '#1e40af', fontWeight: '600'}}>Assumptions</div>
            </div>
            <div style={{flex: 1, minWidth: '120px', background: '#fef3c7', border: '1px solid #fcd34d', padding: '12px 16px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#d97706'}}>{documents.raidDashboard?.issues || 0}</div>
              <div style={{fontSize: '12px', color: '#92400e', fontWeight: '600'}}>Issues</div>
            </div>
            <div style={{flex: 1, minWidth: '120px', background: '#f0fdf4', border: '1px solid #86efac', padding: '12px 16px', borderRadius: '8px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#16a34a'}}>{documents.raidDashboard?.dependencies || 0}</div>
              <div style={{fontSize: '12px', color: '#166534', fontWeight: '600'}}>Dependencies</div>
            </div>
          </div>
          <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
            <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
            
            {Object.entries(filterOptions).map(([field, values]) => (
              values.length > 0 && (
                <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
                  <select
                    value={raidFilters[field]}
                    onChange={(e) => setRaidFilters(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: raidFilters[field] ? '#dbeafe' : 'white',
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
            
            {Object.values(raidFilters).some(v => v !== '') && (
              <button
                onClick={resetRaidFilters}
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
                  {finalDisplayColumns.map((col, idx) => (
                    <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={index}>
                    {finalDisplayColumns.map((col, colIdx) => {
                      const value = item[col];
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
        </>
      )}
    </div>
  );
}

export default RaidLogTab;
