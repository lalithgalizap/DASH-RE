import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Mail, Clock, Calendar, Save, Settings, ChevronDown, Camera, Download, Database, AlertTriangle } from 'lucide-react';

const DAYS = [
  { value: 'sunday',    label: 'Sunday',    cron: 0 },
  { value: 'monday',    label: 'Monday',    cron: 1 },
  { value: 'tuesday',   label: 'Tuesday',   cron: 2 },
  { value: 'wednesday', label: 'Wednesday', cron: 3 },
  { value: 'thursday',  label: 'Thursday',  cron: 4 },
  { value: 'friday',    label: 'Friday',    cron: 5 },
  { value: 'saturday',  label: 'Saturday',  cron: 6 },
];

const TIMES = [
  '00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00',
  '08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00',
  '20:00','21:00','22:00','23:00',
];

// Parse a cron expression like "0 18 * * 5" → { day: 'friday', time: '18:00' }
const parseCron = (expr) => {
  try {
    const parts = (expr || '').trim().split(/\s+/);
    if (parts.length < 5) return { day: 'friday', time: '18:00' };
    const minute = parts[0];
    const hour   = parts[1];
    const dow    = parseInt(parts[4], 10);
    const dayObj = DAYS.find(d => d.cron === dow) || DAYS[5]; // default friday
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return { day: dayObj.value, time: `${hh}:${mm}` };
  } catch {
    return { day: 'friday', time: '18:00' };
  }
};

// Build cron expression from day name + HH:MM
const buildCron = (dayValue, time) => {
  const [hh, mm] = time.split(':').map(Number);
  const dayObj = DAYS.find(d => d.value === dayValue) || DAYS[5];
  return `${mm} ${hh} * * ${dayObj.cron}`;
};

// ─── Reusable time dropdown ───────────────────────────────────────────────────
function TimeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = (t) => new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '8px',
          border: `1px solid ${open ? '#2563eb' : '#e2e8f0'}`,
          fontSize: '14px', color: '#374151', backgroundColor: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '8px', textAlign: 'left'
        }}
      >
        <span>{label(value)}</span>
        <ChevronDown size={16} color="#94a3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
          maxHeight: '200px', overflowY: 'auto'
        }}>
          {TIMES.map(t => {
            const sel = value === t;
            return (
              <div key={t}
                onMouseDown={() => { onChange(t); setOpen(false); }}
                style={{
                  padding: '9px 14px', fontSize: '14px', cursor: 'pointer',
                  color: sel ? '#2563eb' : '#374151', fontWeight: sel ? 600 : 400,
                  backgroundColor: sel ? '#eff6ff' : 'transparent',
                  borderBottom: '1px solid #f8fafc'
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {label(t)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Snapshot row (reused in both inline list and full modal) ─────────────────
function SnapshotRow({ s, confirmDeleteId, deletingId, setConfirmDeleteId, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: '8px',
      border: '1px solid #f1f5f9', background: '#fafafa', gap: '10px'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
          Week {s.weekNumber}, {s.year}
          <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '6px', fontSize: '12px' }}>
            ending {s.weekEnding}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          {s.activeProjectCount} active · {s.metrics?.overdueMilestones ?? 0} overdue · {s.metrics?.openCriticalRisks ?? 0} risks · {s.metrics?.openCriticalIssues ?? 0} issues
        </div>
      </div>
      {confirmDeleteId === s.id ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={11} /> Delete?
          </span>
          <button onClick={() => onDelete(s.id)} disabled={deletingId === s.id} style={{
            padding: '3px 8px', fontSize: '11px', fontWeight: '600',
            background: '#dc2626', color: 'white', border: 'none',
            borderRadius: '5px', cursor: deletingId === s.id ? 'not-allowed' : 'pointer',
            opacity: deletingId === s.id ? 0.6 : 1
          }}>
            {deletingId === s.id ? '…' : 'Yes'}
          </button>
          <button onClick={() => setConfirmDeleteId(null)} style={{
            padding: '3px 8px', fontSize: '11px', fontWeight: '500',
            background: '#f1f5f9', color: '#374151', border: 'none',
            borderRadius: '5px', cursor: 'pointer'
          }}>
            No
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmDeleteId(s.id)} title="Delete snapshot" style={{
          padding: '5px', borderRadius: '6px', border: '1px solid #fee2e2',
          background: 'white', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#ef4444',
          flexShrink: 0, transition: 'all 0.15s ease'
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// ─── All Snapshots Modal ──────────────────────────────────────────────────────
function AllSnapshotsModal({ snapshots, onClose, confirmDeleteId, deletingId, setConfirmDeleteId, onDelete }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2100
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#ffffff', borderRadius: '16px', maxWidth: '560px',
        width: '90%', height: '600px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
              All Snapshots
            </h3>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
              {snapshots.length}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
            borderRadius: '8px', display: 'flex', alignItems: 'center', color: '#64748b'
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          padding: '8px 12px', background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9', flexShrink: 0
        }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Week / Metrics</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</span>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>
              No snapshots stored yet
            </div>
          ) : snapshots.map(s => (
            <SnapshotRow
              key={s.id} s={s}
              confirmDeleteId={confirmDeleteId} deletingId={deletingId}
              setConfirmDeleteId={setConfirmDeleteId}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
function ExportSettingsModal({ isOpen, onClose }) {
  // Which job panel is visible: 'export' | 'snapshot'
  const [activeJob, setActiveJob] = useState('export');

  const handleJobSwitch = (job) => {
    setActiveJob(job);
    if (job === 'snapshot' && snapshots.length === 0) {
      fetchSnapshotList();
    }
  };

  // ── Export Email Job state ──
  const [scheduleDay,    setScheduleDay]    = useState('friday');
  const [scheduleTime,   setScheduleTime]   = useState('18:00');
  const [recipients,     setRecipients]     = useState(['']);
  const [isActive,       setIsActive]       = useState(false);
  const [lastSent,       setLastSent]       = useState(null);
  const [lastSentStatus, setLastSentStatus] = useState(null);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [exportError,    setExportError]    = useState(null);
  const [exportSuccess,  setExportSuccess]  = useState(null);

  // ── Metric Snapshot Job state ──
  const [snapDay,        setSnapDay]        = useState('friday');
  const [snapTime,       setSnapTime]       = useState('18:00');
  const [snapEnabled,    setSnapEnabled]    = useState(true);
  const [snapLoading,    setSnapLoading]    = useState(false);
  const [snapError,      setSnapError]      = useState(null);
  const [snapSuccess,    setSnapSuccess]    = useState(null);
  const [snapTriggering, setSnapTriggering] = useState(false);

  // ── Snapshot list state ──
  const [snapshots,       setSnapshots]       = useState([
    { id: '1', weekNumber: 20, year: 2026, weekEnding: '2026-05-16', activeProjectCount: 14, projectCount: 18, metrics: { overdueMilestones: 3, upcomingMilestones: 7, openCriticalRisks: 2, openCriticalIssues: 1, openEscalations: 0, openDependencies: 4 } },
    { id: '2', weekNumber: 19, year: 2026, weekEnding: '2026-05-09', activeProjectCount: 13, projectCount: 18, metrics: { overdueMilestones: 5, upcomingMilestones: 9, openCriticalRisks: 3, openCriticalIssues: 2, openEscalations: 1, openDependencies: 3 } },
    { id: '3', weekNumber: 18, year: 2026, weekEnding: '2026-05-02', activeProjectCount: 15, projectCount: 19, metrics: { overdueMilestones: 2, upcomingMilestones: 6, openCriticalRisks: 1, openCriticalIssues: 0, openEscalations: 0, openDependencies: 2 } },
    { id: '4', weekNumber: 17, year: 2026, weekEnding: '2026-04-25', activeProjectCount: 15, projectCount: 19, metrics: { overdueMilestones: 4, upcomingMilestones: 8, openCriticalRisks: 4, openCriticalIssues: 3, openEscalations: 2, openDependencies: 5 } },
    { id: '5', weekNumber: 16, year: 2026, weekEnding: '2026-04-18', activeProjectCount: 12, projectCount: 17, metrics: { overdueMilestones: 6, upcomingMilestones: 5, openCriticalRisks: 2, openCriticalIssues: 1, openEscalations: 1, openDependencies: 3 } },
    { id: '6', weekNumber: 15, year: 2026, weekEnding: '2026-04-11', activeProjectCount: 11, projectCount: 16, metrics: { overdueMilestones: 1, upcomingMilestones: 4, openCriticalRisks: 0, openCriticalIssues: 0, openEscalations: 0, openDependencies: 1 } },
    { id: '7', weekNumber: 14, year: 2026, weekEnding: '2026-04-04', activeProjectCount: 13, projectCount: 17, metrics: { overdueMilestones: 3, upcomingMilestones: 7, openCriticalRisks: 1, openCriticalIssues: 2, openEscalations: 0, openDependencies: 2 } },
  ]);
  const [snapshotsLoading,setSnapshotsLoading]= useState(false);
  const [deletingId,      setDeletingId]      = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showAllSnapshots,setShowAllSnapshots]= useState(false);

  // ── Fetch both on open ──
  useEffect(() => {
    if (isOpen) {
      fetchExportSchedule();
      fetchSnapshotSchedule();
      if (activeJob === 'snapshot') fetchSnapshotList();
    }
  }, [isOpen]);

  const fetchExportSchedule = async () => {
    try {
      const { data } = await axios.get('/api/export-schedule');
      setScheduleDay(data.scheduleDay || 'friday');
      setScheduleTime(data.scheduleTime || '18:00');
      setRecipients(data.recipients?.length > 0 ? data.recipients : ['']);
      setIsActive(data.isActive || false);
      setLastSent(data.lastSent);
      setLastSentStatus(data.lastSentStatus);
      setExportError(null);
    } catch (err) {
      console.error('Error fetching export schedule:', err);
      setExportError('Failed to load export schedule');
    }
  };

  const fetchSnapshotSchedule = async () => {
    try {
      const { data } = await axios.get('/api/metrics/snapshot-schedule');
      setSnapEnabled(data.enabled !== false);
      const parsed = parseCron(data.cronExpression);
      setSnapDay(parsed.day);
      setSnapTime(parsed.time);
      setSnapError(null);
    } catch (err) {
      console.error('Error fetching snapshot schedule:', err);
    }
  };

  const fetchSnapshotList = async () => {
    setSnapshotsLoading(true);
    try {
      const { data } = await axios.get('/api/metrics/snapshots');
      setSnapshots(data);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const handleDeleteSnapshot = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/metrics/snapshots/${id}`);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error deleting snapshot:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Export Job handlers ──
  const handleAddRecipient    = () => setRecipients([...recipients, '']);
  const handleRemoveRecipient = (i) => setRecipients(recipients.length > 1 ? recipients.filter((_, idx) => idx !== i) : ['']);
  const handleRecipientChange = (i, v) => { const r = [...recipients]; r[i] = v; setRecipients(r); };

  const handleExportSave = async () => {
    setExportLoading(true); setExportError(null); setExportSuccess(null);
    const valid = recipients.filter(e => e.trim() !== '');
    if (!valid.length) { setExportError('Please add at least one recipient email'); setExportLoading(false); return; }
    try {
      await axios.post('/api/export-schedule', {
        scheduleDay, scheduleTime, recipients: valid, format: 'excel', isActive: true
      });
      setExportSuccess('Export schedule saved successfully');
      setIsActive(true);
    } catch (err) {
      setExportError(err.response?.data?.error || 'Failed to save export schedule');
    } finally { setExportLoading(false); }
  };

  const handleExportTrigger = async () => {
    setExportLoading(true); setExportError(null); setExportSuccess(null);
    try {
      const { data } = await axios.post('/api/export-schedule/trigger');
      setExportSuccess(data.message || 'Export sent successfully');
      fetchExportSchedule();
    } catch (err) {
      setExportError(err.response?.data?.error || 'Failed to trigger export');
    } finally { setExportLoading(false); }
  };

  // ── Snapshot Job handlers ──
  const handleSnapshotSave = async () => {
    setSnapLoading(true); setSnapError(null); setSnapSuccess(null);
    try {
      const cronExpression = buildCron(snapDay, snapTime);
      const dayLabel = DAYS.find(d => d.value === snapDay)?.label || snapDay;
      const timeLabel = new Date(`2000-01-01T${snapTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await axios.put('/api/metrics/snapshot-schedule', {
        cronExpression,
        label: `Every ${dayLabel} at ${timeLabel} CST`,
        enabled: snapEnabled,
      });
      setSnapSuccess('Snapshot schedule saved successfully');
    } catch (err) {
      setSnapError(err.response?.data?.error || 'Failed to save snapshot schedule');
    } finally { setSnapLoading(false); }
  };

  const handleSnapshotToggle = async () => {
    const newEnabled = !snapEnabled;
    setSnapEnabled(newEnabled);
    try {
      await axios.put('/api/metrics/snapshot-schedule', {
        cronExpression: buildCron(snapDay, snapTime),
        enabled: newEnabled,
      });
    } catch (err) {
      setSnapEnabled(!newEnabled); // revert on error
      console.error('Error toggling snapshot job:', err);
    }
  };

  const handleSnapshotTrigger = async () => {
    setSnapTriggering(true); setSnapError(null); setSnapSuccess(null);
    try {
      await axios.post('/api/metrics/snapshot');
      setSnapSuccess('Snapshot created successfully');
      fetchSnapshotList();
    } catch (err) {
      setSnapError(err.response?.data?.error || 'Failed to trigger snapshot');
    } finally { setSnapTriggering(false); }
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, animation: 'fadeIn 0.2s ease'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#ffffff', borderRadius: '16px', maxWidth: '520px',
        width: '90%', height: '680px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, gap: '12px'
        }}>
          {/* Icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Settings size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                {activeJob === 'export' ? 'Export Schedule Settings' : 'Snapshot Job Settings'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                {activeJob === 'export' ? 'Automated portfolio exports via email' : 'Weekly metric snapshot schedule'}
              </p>
            </div>
          </div>

          {/* Job switcher toggle */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#f1f5f9', borderRadius: '8px', padding: '3px', flexShrink: 0
          }}>
            <button
              onClick={() => handleJobSwitch('export')}
              title="Portfolio Export Job"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                background: activeJob === 'export' ? 'white' : 'transparent',
                color: activeJob === 'export' ? '#2563eb' : '#64748b',
                boxShadow: activeJob === 'export' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={13} />
              Export
            </button>
            <button
              onClick={() => handleJobSwitch('snapshot')}
              title="Metric Snapshot Job"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                background: activeJob === 'snapshot' ? 'white' : 'transparent',
                color: activeJob === 'snapshot' ? '#2563eb' : '#64748b',
                boxShadow: activeJob === 'snapshot' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Camera size={13} />
              Snapshot
            </button>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', transition: 'all 0.15s ease', flexShrink: 0
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

          {/* ════ EXPORT JOB PANEL ════ */}
          {activeJob === 'export' && (<>

            {/* Status badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: isActive ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? '#2563eb' : '#94a3b8' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: isActive ? '#2563eb' : '#64748b' }}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {lastSent && (
                <span style={{ fontSize: '13px', color: lastSentStatus === 'success' ? '#2563eb' : '#dc2626' }}>
                  Last sent: {formatDate(lastSent)}{lastSentStatus === 'failed' && ' (Failed)'}
                </span>
              )}
            </div>

            {/* Schedule */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                <Calendar size={16} /> Send Export
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#374151',
                  backgroundColor: 'white', cursor: 'pointer'
                }}>
                  {DAYS.map(d => <option key={d.value} value={d.value}>Every {d.label}</option>)}
                </select>
                <TimeDropdown value={scheduleTime} onChange={setScheduleTime} />
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                <Mail size={16} /> Recipients
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipients.map((email, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px' }}>
                    <input type="email" placeholder="email@company.com" value={email}
                      onChange={e => handleRecipientChange(i, e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#374151' }}
                    />
                    <button onClick={() => handleRemoveRecipient(i)}
                      disabled={recipients.length === 1 && email === ''}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={handleAddRecipient} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1',
                  backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#64748b', transition: 'all 0.15s ease'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#475569'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Plus size={16} /> Add Another Email
                </button>
              </div>
            </div>

            {/* Messages */}
            {exportError && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{exportError}</div>}
            {exportSuccess && <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', fontSize: '14px' }}>{exportSuccess}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={handleExportTrigger} disabled={exportLoading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: 'white', cursor: exportLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '500', color: exportLoading ? '#94a3b8' : '#374151',
                flex: 1, opacity: exportLoading ? 0.6 : 1
              }}>
                <Clock size={16} /> Trigger Now
              </button>
              <button onClick={handleExportSave} disabled={exportLoading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: exportLoading ? '#2563eb80' : '#2563eb',
                cursor: exportLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '600', color: 'white', flex: 1, transition: 'all 0.15s ease'
              }}>
                <Save size={16} /> Save Schedule
              </button>
            </div>
          </>)}

          {/* ════ SNAPSHOT JOB PANEL ════ */}
          {activeJob === 'snapshot' && (<>

            {/* Status + enable toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: snapEnabled ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${snapEnabled ? '#2563eb' : '#e2e8f0'}`,
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: snapEnabled ? '#2563eb' : '#94a3b8' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: snapEnabled ? '#2563eb' : '#64748b' }}>
                  {snapEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              {/* Enable/disable toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{snapEnabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={handleSnapshotToggle}
                  title={snapEnabled ? 'Disable snapshot job' : 'Enable snapshot job'}
                  style={{
                    position: 'relative', width: '40px', height: '22px', borderRadius: '11px',
                    border: 'none', cursor: 'pointer',
                    background: snapEnabled ? '#2563eb' : '#cbd5e1',
                    transition: 'background 0.2s ease', padding: 0
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: snapEnabled ? '21px' : '3px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                <Calendar size={16} /> Run Snapshot
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select value={snapDay} onChange={e => setSnapDay(e.target.value)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#374151',
                  backgroundColor: 'white', cursor: 'pointer'
                }}>
                  {DAYS.map(d => <option key={d.value} value={d.value}>Every {d.label}</option>)}
                </select>
                <TimeDropdown value={snapTime} onChange={setSnapTime} />
              </div>
            </div>

            {/* Info note */}
            <div style={{
              padding: '10px 14px', backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: '13px', color: '#64748b', lineHeight: 1.5
            }}>
              <strong style={{ color: '#374151' }}>What this does:</strong> Takes a weekly snapshot of all portfolio metrics (overdue milestones, risks, issues, escalations, dependencies) and stores them for trend charts. Runs in CST timezone.
            </div>

            {/* Messages */}
            {snapError && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{snapError}</div>}
            {snapSuccess && <div style={{ padding: '12px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', fontSize: '14px' }}>{snapSuccess}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={handleSnapshotTrigger} disabled={snapTriggering} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: 'white', cursor: snapTriggering ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '500', color: snapTriggering ? '#94a3b8' : '#374151',
                flex: 1, opacity: snapTriggering ? 0.6 : 1
              }}>
                <Clock size={16} /> Trigger Now
              </button>
              <button onClick={handleSnapshotSave} disabled={snapLoading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px 20px', borderRadius: '8px', border: 'none',
                backgroundColor: snapLoading ? '#2563eb80' : '#2563eb',
                cursor: snapLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '600', color: 'white', flex: 1, transition: 'all 0.15s ease'
              }}>
                <Save size={16} /> Save Schedule
              </button>
            </div>

            {/* ── Stored Snapshots List ── */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  <Database size={15} />
                  Stored Snapshots
                  {snapshots.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', background: '#f1f5f9', padding: '1px 7px', borderRadius: '10px' }}>
                      {snapshots.length}
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {snapshots.length > 3 && (
                    <button onClick={() => setShowAllSnapshots(true)} style={{
                      fontSize: '12px', color: '#2563eb', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '2px 6px', fontWeight: '600'
                    }}>
                      View All ({snapshots.length})
                    </button>
                  )}
                  <button onClick={fetchSnapshotList} disabled={snapshotsLoading} style={{
                    fontSize: '12px', color: '#64748b', background: 'none', border: 'none',
                    cursor: snapshotsLoading ? 'not-allowed' : 'pointer', padding: '2px 6px',
                    opacity: snapshotsLoading ? 0.5 : 1
                  }}>
                    {snapshotsLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {snapshotsLoading && snapshots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  Loading snapshots…
                </div>
              ) : snapshots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  No snapshots stored yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {snapshots.slice(0, 3).map(s => (
                    <SnapshotRow
                      key={s.id} s={s}
                      confirmDeleteId={confirmDeleteId} deletingId={deletingId}
                      setConfirmDeleteId={setConfirmDeleteId}
                      onDelete={handleDeleteSnapshot}
                    />
                  ))}
                  {snapshots.length > 3 && (
                    <button onClick={() => setShowAllSnapshots(true)} style={{
                      marginTop: '4px', padding: '8px', borderRadius: '8px',
                      border: '1px dashed #cbd5e1', background: 'transparent',
                      fontSize: '13px', color: '#64748b', cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#374151'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                    >
                      + {snapshots.length - 3} more snapshots — View All
                    </button>
                  )}
                </div>
              )}
            </div>
          </>)}

        </div>
      </div>

      {/* All Snapshots sub-modal */}
      {showAllSnapshots && (
        <AllSnapshotsModal
          snapshots={snapshots}
          onClose={() => { setShowAllSnapshots(false); setConfirmDeleteId(null); }}
          confirmDeleteId={confirmDeleteId}
          deletingId={deletingId}
          setConfirmDeleteId={setConfirmDeleteId}
          onDelete={handleDeleteSnapshot}
        />
      )}
    </div>
  );
}

export default ExportSettingsModal;
