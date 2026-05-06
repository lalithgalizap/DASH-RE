import React from 'react';
import { getRAGColor, isActiveStatus } from '../utils';
import './modals.css';

const RAG_ROWS = [
  { key: 'red',   label: 'Red',   color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { key: 'amber', label: 'Amber', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  { key: 'green', label: 'Green', color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
];

const RAGProjectsModal = ({ isOpen, onClose, projects }) => {
  if (!isOpen) return null;

  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '680px',
          maxWidth: '95vw',
          height: '560px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Fixed Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Projects by RAG Status
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '22px',
              cursor: 'pointer', color: '#64748b', lineHeight: 1,
              width: '32px', height: '32px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >×</button>
        </div>

        {/* Fixed 3-row body */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateRows: '1fr 1fr 1fr',
          overflow: 'hidden',
          padding: '16px',
          gap: '12px'
        }}>
          {RAG_ROWS.map(rag => {
            const list = activeProjects.filter(
              p => (p.ragStatus || '').toLowerCase() === rag.key
            );
            return (
              <div
                key={rag.key}
                style={{
                  border: `1px solid ${rag.border}`,
                  borderRadius: '10px',
                  background: rag.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: 0
                }}
              >
                {/* Row header — always visible */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px',
                  borderBottom: list.length > 0 ? `1px solid ${rag.border}` : 'none',
                  flexShrink: 0
                }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: rag.color, flexShrink: 0
                  }} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                    {rag.label}
                  </span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '12px', fontWeight: 600,
                    color: rag.color,
                    background: 'white',
                    border: `1px solid ${rag.border}`,
                    borderRadius: '20px',
                    padding: '1px 8px'
                  }}>
                    {list.length}
                  </span>
                </div>

                {/* Scrollable project list */}
                {list.length === 0 ? (
                  <div style={{
                    padding: '10px 14px',
                    fontSize: '12px', color: '#94a3b8', fontStyle: 'italic'
                  }}>
                    No projects
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{
                      width: '100%', borderCollapse: 'collapse',
                      fontSize: '12px'
                    }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.6)' }}>
                          <th style={{ padding: '5px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Project</th>
                          <th style={{ padding: '5px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</th>
                          <th style={{ padding: '5px 14px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Complete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((project, idx) => (
                          <tr
                            key={project.id || project._id}
                            style={{
                              borderTop: idx > 0 ? `1px solid ${rag.border}` : 'none',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.4)'
                            }}
                          >
                            <td style={{ padding: '7px 14px', color: '#0f172a', fontWeight: 500 }}>
                              {project.name}
                            </td>
                            <td style={{ padding: '7px 14px', color: '#475569' }}>
                              {project.status || '—'}
                            </td>
                            <td style={{ padding: '7px 14px', textAlign: 'right', color: '#475569' }}>
                              {project.projectCompletion ?? project.percentComplete ?? 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RAGProjectsModal;
