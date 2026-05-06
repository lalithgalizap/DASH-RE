import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import './modals.css';

function EditProjectDetailModal({ project, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    sowStatus: '',
    actionItem: '',
    riskSummary: '',
    mitigationPlan: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        sowStatus:      project.sowStatus      || '',
        actionItem:     project.actionItem     || '',
        riskSummary:    project.riskSummary    || '',
        mitigationPlan: project.mitigationPlan || '',
      });
    }
  }, [project, isOpen]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dashboardUpdatedAt = new Date().toISOString();
      await axios.put(`/api/projects/${project._id || project.id}`, {
        ...project,
        ...formData,
        dashboardUpdatedAt,
      });
      onSave({ ...project, ...formData, dashboardUpdatedAt });
      onClose();
    } catch (err) {
      console.error('Error saving project details:', err);
      alert('Error saving project details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  /* ── shared field label style ── */
  const labelStyle = {
    display: 'block',
    fontSize: '11px', fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '6px',
  };

  /* ── shared input / textarea base style ── */
  const fieldBase = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '13px',
    color: '#111827',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          /* ── Same fixed dimensions as ProjectViewModal ── */
          width: '760px',
          maxWidth: '94vw',
          height: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ════ FIXED HEADER ════ */}
        <div style={{
          flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 20px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Edit Project Details
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', display: 'flex', alignItems: 'center',
              padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ════ SCROLLABLE FORM BODY ════ */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            {/* Status — single-line input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Status</label>
              <input
                type="text"
                name="sowStatus"
                value={formData.sowStatus}
                onChange={handleChange}
                placeholder="e.g. Active, On Hold, Completed…"
                style={fieldBase}
                onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                onBlur={e  => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {/* Three textareas — stacked vertically, equal height */}
            {[
              { name: 'actionItem',     label: 'Action Item',     placeholder: 'Enter action items…' },
              { name: 'riskSummary',    label: 'Risk Summary',    placeholder: 'Enter risk summary…' },
              { name: 'mitigationPlan', label: 'Mitigation Plan', placeholder: 'Enter mitigation plan…' },
            ].map(({ name, label, placeholder }) => (
              <div key={name} style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{label}</label>
                <textarea
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  style={{
                    ...fieldBase,
                    resize: 'none',
                    height: '80px',   /* identical fixed height for all three */
                  }}
                  onFocus={e => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={e  => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            ))}
          </div>

          {/* ════ FIXED FOOTER ════ */}
          <div style={{
            flexShrink: 0,
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
            padding: '14px 20px',
            borderTop: '1px solid #e5e7eb',
            background: 'white',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px', fontSize: '13px', fontWeight: 500,
                border: '1px solid #e5e7eb', borderRadius: '6px',
                background: 'white', color: '#374151', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px', fontSize: '13px', fontWeight: 600,
                border: 'none', borderRadius: '6px',
                background: saving ? '#6ee7b7' : '#10b981',
                color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProjectDetailModal;
