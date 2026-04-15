import React from 'react';

function StakeholdersTab({
  documents,
  stakeholderSearch,
  setStakeholderSearch,
  selectedStakeholder,
  setSelectedStakeholder,
  showStakeholderModal,
  setShowStakeholderModal
}) {
  if (!documents?.stakeholderRegister || documents.stakeholderRegister.length === 0) {
    return (
      <div className="document-content">
        <h3>Stakeholder Register</h3>
        <p className="placeholder-text">No stakeholder data available.</p>
      </div>
    );
  }

  const allColumns = documents.stakeholderRegister.reduce((cols, s) => {
    Object.keys(s).forEach(key => {
      if (!cols.includes(key)) cols.push(key);
    });
    return cols;
  }, []);

  const filteredStakeholders = stakeholderSearch.trim() === '' 
    ? documents.stakeholderRegister 
    : documents.stakeholderRegister.filter(s => {
        const searchTerm = stakeholderSearch.toLowerCase();
        return (
          String(s['Name'] || '').toLowerCase().includes(searchTerm) ||
          String(s['Designation / Role'] || '').toLowerCase().includes(searchTerm) ||
          String(s['Role'] || '').toLowerCase().includes(searchTerm)
        );
      });

  const openStakeholderModal = (stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setShowStakeholderModal(true);
  };

  const renderStakeholderDetailModal = () => {
    if (!showStakeholderModal || !selectedStakeholder) return null;

    return (
      <div className="category-modal-overlay" onClick={() => setShowStakeholderModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', maxHeight: '80vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span className="category-color-indicator" style={{ backgroundColor: '#8b5cf6' }} />
              Stakeholder Details: {selectedStakeholder['Name']}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowStakeholderModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '16px'}}>
              {allColumns.map((col, idx) => (
                <div key={idx} style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <label style={{fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>{col}</label>
                  <span style={{fontSize: '14px', fontWeight: '500'}}>{selectedStakeholder[col] || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="document-content">
      <h3>Stakeholder Register ({filteredStakeholders.length} of {documents.stakeholderRegister.length})</h3>
      
      {/* Search Bar */}
      <div style={{marginBottom: '16px'}}>
        <input
          type="text"
          placeholder="Search stakeholders..."
          value={stakeholderSearch}
          onChange={(e) => setStakeholderSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white'
          }}
        />
      </div>
      
      {/* Stakeholder List */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {filteredStakeholders.map((stakeholder, index) => (
          <div 
            key={index} 
            onClick={() => openStakeholderModal(stakeholder)}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '14px 16px', 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1}}>
              <span style={{fontSize: '20px'}}>👤</span>
              <div style={{minWidth: '180px'}}>
                <div style={{fontWeight: '600', color: '#1f2937', fontSize: '14px'}}>{stakeholder['Name']}</div>
                <div style={{color: '#6b7280', fontSize: '12px'}}>{stakeholder['Designation / Role']}</div>
              </div>
              
              {/* Additional Fields */}
              <div style={{display: 'flex', gap: '16px', flex: 1, justifyContent: 'center'}}>
                <div style={{textAlign: 'center', minWidth: '80px'}}>
                  <div style={{fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px'}}>Role</div>
                  <div style={{fontSize: '12px', color: '#374151', fontWeight: '500'}}>{stakeholder['Role'] || '-'}</div>
                </div>
              </div>
            </div>
            <span style={{color: '#9ca3af', fontSize: '12px'}}>View →</span>
          </div>
        ))}
      </div>
      
      {/* Stakeholder Detail Modal */}
      {renderStakeholderDetailModal()}
    </div>
  );
}

export default StakeholdersTab;
