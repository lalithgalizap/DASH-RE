import React from 'react';

function ProjectCharterTab({
  documents,
  projectName,
  scopeIncluded,
  scopeExcluded,
  isEditingScope,
  savingScope,
  canEdit,
  setScopeIncluded,
  setScopeExcluded,
  setIsEditingScope,
  saveScope,
  fetchScope
}) {
  if (!documents?.projectCharter || Object.keys(documents.projectCharter).length === 0) {
    return (
      <div className="document-content">
        <h3>Project Charter</h3>
        <p className="placeholder-text">No project charter data available.</p>
      </div>
    );
  }

  const charter = documents.projectCharter;
  const { basicInfo } = charter;

  const formatCurrency = (val) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
    return val || 'N/A';
  };

  const formatDate = (val) => {
    if (!val) return 'N/A';
    
    if (typeof val === 'number' && val > 40000 && val < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + val * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    
    if (typeof val === 'string' && val.includes('-')) {
      const date = new Date(val);
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    
    return val;
  };

  const parseScopeItems = (text) => {
    if (!text) return [];
    return text.split('\n').filter(item => item.trim());
  };

  return (
    <div className="document-content charter-content">
      <div className="charter-header-banner">
        <h1 className="charter-title">
          {basicInfo?.projectName || projectName || 'Project Charter'}
          {basicInfo?.client && (
            <span className="charter-client"> - {basicInfo.client}</span>
          )}
        </h1>
      </div>

      <div className="charter-basic-info">
        <div className="info-row">
          <div className="info-cell">
            <label>Project Name</label>
            <div className="info-value">{basicInfo?.projectName || 'N/A'}</div>
          </div>
          <div className="info-cell">
            <label>Project Manager</label>
            <div className="info-value">{basicInfo?.projectManager || 'N/A'}</div>
          </div>
          <div className="info-cell">
            <label>Project Sponsor</label>
            <div className="info-value">{basicInfo?.projectSponsor || 'N/A'}</div>
          </div>
        </div>
        
        <div className="info-row">
          <div className="info-cell">
            <label>Client</label>
            <div className="info-value">{basicInfo?.client || 'N/A'}</div>
          </div>
          <div className="info-cell">
            <label>Project Start Date</label>
            <div className="info-value">{formatDate(basicInfo?.projectStartDate)}</div>
          </div>
          <div className="info-cell">
            <label>Forecast End Date</label>
            <div className="info-value">{formatDate(basicInfo?.forecastEndDate)}</div>
          </div>
        </div>
        
        <div className="info-row">
          <div className="info-cell">
            <label>Estimated Duration</label>
            <div className="info-value">{basicInfo?.estimatedDuration ? `${basicInfo.estimatedDuration} days` : 'N/A'}</div>
          </div>
          <div className="info-cell">
            <label>Estimated Budget</label>
            <div className="info-value budget">{formatCurrency(basicInfo?.estimatedBudget)}</div>
          </div>
          <div className="info-cell">
            <label>Project Complexity</label>
            <div className={`info-value complexity ${basicInfo?.projectComplexity?.toLowerCase()}`}>
              {basicInfo?.projectComplexity || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="charter-section scope-section" style={{marginTop: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
          <h4>Scope Definition</h4>
          {!isEditingScope ? (
            canEdit && (
              <button 
                className="edit-btn"
                onClick={() => setIsEditingScope(true)}
                style={{padding: '6px 12px', fontSize: '12px'}}
              >
                Edit Scope
              </button>
            )
          ) : (
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                className="save-btn"
                onClick={saveScope}
                disabled={savingScope}
                style={{padding: '6px 12px', fontSize: '12px'}}
              >
                {savingScope ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setIsEditingScope(false);
                  fetchScope();
                }}
                disabled={savingScope}
                style={{padding: '6px 12px', fontSize: '12px'}}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        <div className="scope-grid">
          <div className="scope-column included">
            <h5>In Scope</h5>
            {isEditingScope ? (
              <textarea
                value={scopeIncluded}
                onChange={(e) => setScopeIncluded(e.target.value)}
                placeholder="Enter scope items (one per line)"
                style={{width: '100%', minHeight: '150px', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd'}}
              />
            ) : (
              <ul>
                {parseScopeItems(scopeIncluded).length > 0 ? (
                  parseScopeItems(scopeIncluded).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))
                ) : (
                  <li className="no-data">No scope items defined. Click Edit to add.</li>
                )}
              </ul>
            )}
          </div>
          <div className="scope-column excluded">
            <h5>Out of Scope</h5>
            {isEditingScope ? (
              <textarea
                value={scopeExcluded}
                onChange={(e) => setScopeExcluded(e.target.value)}
                placeholder="Enter excluded items (one per line)"
                style={{width: '100%', minHeight: '150px', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd'}}
              />
            ) : (
              <ul>
                {parseScopeItems(scopeExcluded).length > 0 ? (
                  parseScopeItems(scopeExcluded).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))
                ) : (
                  <li className="no-data">No exclusions defined. Click Edit to add.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCharterTab;
