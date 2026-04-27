import React from 'react';

const ViewToggle = ({ view, onChange, showHistory = false }) => {
  const buttonCount = showHistory ? 3 : 2;
  const pillWidth = `${100 / buttonCount}%`;
  const pillLeft = view === 'list' ? '0%' : view === 'chart' ? `${100 / buttonCount}%` : `${(2 * 100) / buttonCount}%`;

  return (
    <div style={{ 
      display: 'inline-flex', 
      backgroundColor: '#e5e7eb', 
      borderRadius: '10px', 
      padding: '3px',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        position: 'relative'
      }}>
        {/* Animated background pill */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: pillLeft,
          width: pillWidth,
          height: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0
        }} />
        
        <button
          onClick={() => onChange('list')}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: view === 'list' ? '#1f2937' : '#6b7280',
            fontSize: '13px',
            fontWeight: view === 'list' ? '600' : '500',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          List
        </button>
        <button
          onClick={() => onChange('chart')}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: view === 'chart' ? '#1f2937' : '#6b7280',
            fontSize: '13px',
            fontWeight: view === 'chart' ? '600' : '500',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          Chart
        </button>
        {showHistory && (
          <button
            onClick={() => onChange('history')}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: view === 'history' ? '#1f2937' : '#6b7280',
              fontSize: '13px',
              fontWeight: view === 'history' ? '600' : '500',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </button>
        )}
      </div>
    </div>
  );
};

export default ViewToggle;
