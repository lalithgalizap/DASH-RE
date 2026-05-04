import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Mail, Clock, Calendar, FileText, Send, Save, Settings } from 'lucide-react';

const DAYS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' }
];

const TIMES = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

function ExportSettingsModal({ isOpen, onClose }) {
  const [scheduleDay, setScheduleDay] = useState('friday');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [recipients, setRecipients] = useState(['']);
  const [format, setFormat] = useState('csv');
  const [isActive, setIsActive] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [lastSentStatus, setLastSentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSchedule();
    }
  }, [isOpen]);

  const fetchSchedule = async () => {
    try {
      const response = await axios.get('/api/export-schedule');
      const data = response.data;
      setScheduleDay(data.scheduleDay || 'friday');
      setScheduleTime(data.scheduleTime || '18:00');
      setRecipients(data.recipients?.length > 0 ? data.recipients : ['']);
      setFormat(data.format || 'csv');
      setIsActive(data.isActive || false);
      setLastSent(data.lastSent);
      setLastSentStatus(data.lastSentStatus);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load export schedule');
    }
  };

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    } else {
      setRecipients(['']);
    }
  };

  const handleRecipientChange = (index, value) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Filter out empty recipients
    const validRecipients = recipients.filter(email => email.trim() !== '');

    if (validRecipients.length === 0) {
      setError('Please add at least one recipient email');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/export-schedule', {
        scheduleDay,
        scheduleTime,
        recipients: validRecipients,
        format,
        isActive: true
      });
      setSuccess('Export schedule saved successfully');
      setIsActive(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save export schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const validRecipients = recipients.filter(email => email.trim() !== '');

    if (validRecipients.length === 0) {
      setError('Please add at least one recipient email');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/export-schedule/test', {
        recipients: validRecipients,
        format
      });
      setSuccess(response.data.message || 'Test email sent successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/export-schedule/trigger');
      setSuccess(response.data.message || 'Export sent successfully');
      fetchSchedule();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger export');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={18} color="white" />
            </div>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0
              }}>
                Export Schedule Settings
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                margin: '4px 0 0 0'
              }}>
                Automated portfolio exports via email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: isActive ? '#eff6ff' : '#f8fafc',
            border: `1px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isActive ? '#2563eb' : '#94a3b8'
              }} />
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: isActive ? '#2563eb' : '#64748b'
              }}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {lastSent && (
              <span style={{
                fontSize: '13px',
                color: lastSentStatus === 'success' ? '#2563eb' : '#dc2626'
              }}>
                Last sent: {formatDate(lastSent)}
                {lastSentStatus === 'failed' && ' (Failed)'}
              </span>
            )}
          </div>

          {/* Schedule Section */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}>
              <Calendar size={16} />
              Send Export
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={scheduleDay}
                onChange={(e) => setScheduleDay(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#374151',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {DAYS.map(day => (
                  <option key={day.value} value={day.value}>Every {day.label}</option>
                ))}
              </select>
              <select
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#374151',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {TIMES.map(time => (
                  <option key={time} value={time}>
                    {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipients Section */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}>
              <Mail size={16} />
              Recipients
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipients.map((email, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '14px',
                      color: '#374151'
                    }}
                  />
                  <button
                    onClick={() => handleRemoveRecipient(index)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444'
                    }}
                    disabled={recipients.length === 1 && email === ''}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddRecipient}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.color = '#475569';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <Plus size={16} />
                Add Another Email
              </button>
            </div>
          </div>

          {/* Format Section */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}>
              <FileText size={16} />
              Export Format
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setFormat('csv')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `2px solid ${format === 'csv' ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: format === 'csv' ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: format === 'csv' ? '600' : '500',
                  color: format === 'csv' ? '#2563eb' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                CSV
              </button>
              <button
                onClick={() => setFormat('excel')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `2px solid ${format === 'excel' ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: format === 'excel' ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: format === 'excel' ? '600' : '500',
                  color: format === 'excel' ? '#2563eb' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Excel
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#2563eb',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleTestEmail}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: loading ? '#94a3b8' : '#374151',
                flex: 1,
                opacity: loading ? 0.6 : 1
              }}
            >
              <Send size={16} />
              Send Test
            </button>
            <button
              onClick={handleManualTrigger}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: loading ? '#94a3b8' : '#374151',
                flex: 1,
                opacity: loading ? 0.6 : 1
              }}
            >
              <Clock size={16} />
              Trigger Now
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#2563eb80' : '#2563eb',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                flex: 1,
                transition: 'all 0.15s ease'
              }}
            >
              <Save size={16} />
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportSettingsModal;
