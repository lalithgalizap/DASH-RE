import React from 'react';

function CategoryModal({ selectedCategory, documents, onClose }) {
  const filteredItems = documents.raidLog.filter(item => item.Category === selectedCategory);

  const categoryColors = {
    'Quality': '#3b82f6',
    'Cost': '#10b981',
    'Stakeholder': '#8b5cf6',
    'Security/Compliance': '#ef4444',
    'Scope': '#f59e0b',
    'Technical': '#06b6d4',
    'Process': '#84cc16',
    'Resource': '#ec4899'
  };

  return (
    <div className="category-modal-overlay" onClick={onClose}>
      <div className="category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="category-modal-header">
          <h3>
            <span
              className="category-color-indicator"
              style={{ backgroundColor: categoryColors[selectedCategory] || '#71717a' }}
            />
            Category: {selectedCategory}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="category-modal-content">
          {filteredItems.length === 0 ? (
            <p className="no-items">No items found in this category.</p>
          ) : (
            <div className="raid-items-list">
              {filteredItems.map((item, index) => (
                <div key={index} className="raid-item-card">
                  <div className="raid-item-header">
                    <span className={`raid-type ${item.Type?.toLowerCase()}`}>{item.Type}</span>
                    <span className={`status-badge ${item.Status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.Status}
                    </span>
                  </div>
                  <h4 className="raid-item-title">{item.Title}</h4>
                  <p className="raid-item-description">{item.Description}</p>
                  <div className="raid-item-details">
                    <div className="detail-row">
                      <span className="detail-label">Owner:</span>
                      <span className="detail-value">{item['RAID Owner'] || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Severity:</span>
                      <span className={`severity ${item.Severity?.toLowerCase()}`}>{item.Severity}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Mitigation:</span>
                      <span className="detail-value">{item['Mitigation Strategy'] || 'N/A'}</span>
                    </div>
                    {item['RAID Response/Plan'] && (
                      <div className="detail-row full-width">
                        <span className="detail-label">Response Plan:</span>
                        <span className="detail-value">{item['RAID Response/Plan']}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryModal;
