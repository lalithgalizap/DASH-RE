import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import '../../ProjectModal.css';

function EditProjectDetailModal({ project, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    actionItem: '',
    riskSummary: '',
    mitigationPlan: '',
    sowStatus: 'Active'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project && isOpen) {
      setFormData({
        actionItem: project.actionItem || '',
        riskSummary: project.riskSummary || '',
        mitigationPlan: project.mitigationPlan || '',
        sowStatus: project.sowStatus || 'Active'
      });
    }
  }, [project, isOpen]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedTimestamp = new Date().toISOString();
      await axios.put(`/api/projects/${project._id || project.id}`, {
        ...project,
        ...formData,
        dashboardUpdatedAt: updatedTimestamp
      });
      onSave({ ...project, ...formData, dashboardUpdatedAt: updatedTimestamp });
      onClose();
    } catch (error) {
      console.error('Error saving project details:', error);
      alert('Error saving project details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Project Details - {project.name}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label>Status</label>
            <input
              type="text"
              name="sowStatus"
              value={formData.sowStatus}
              onChange={handleChange}
              placeholder="Enter status (e.g., Active, Pending, etc.)"
            />
          </div>

          <div className="form-group">
            <label>Action Item</label>
            <textarea
              name="actionItem"
              value={formData.actionItem}
              onChange={handleChange}
              rows="3"
              placeholder="Enter action items for this project..."
            />
          </div>

          <div className="form-group">
            <label>Risk Summary</label>
            <textarea
              name="riskSummary"
              value={formData.riskSummary}
              onChange={handleChange}
              rows="3"
              placeholder="Enter risk summary..."
            />
          </div>

          <div className="form-group">
            <label>Mitigation Plan</label>
            <textarea
              name="mitigationPlan"
              value={formData.mitigationPlan}
              onChange={handleChange}
              rows="4"
              placeholder="Enter mitigation plan details..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProjectDetailModal;
