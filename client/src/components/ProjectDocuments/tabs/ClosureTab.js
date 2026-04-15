import React from 'react';

function ClosureTab({
  closureFiles,
  selectedFiles,
  closureUploading,
  handleFileSelect,
  handleClosureUpload,
  handleDownload,
  handleDelete
}) {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="document-content">
      <h3>Project Closure</h3>
      
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Add Documents</h4>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
          />
          <button
            onClick={handleClosureUpload}
            disabled={closureUploading || selectedFiles.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: closureUploading || selectedFiles.length === 0 ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: closureUploading || selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {closureUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        {selectedFiles.length > 0 && (
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
            {selectedFiles.length} file(s) selected
          </p>
        )}
      </div>

      {closureFiles.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Uploaded Documents ({closureFiles.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {closureFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => handleDownload(file.filename)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>📄</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#1f2937' }}>
                      {file.originalname || file.filename}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '500' }}>Download</span>
                  <span 
                    style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.filename);
                    }}
                  >
                    Delete
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClosureTab;
