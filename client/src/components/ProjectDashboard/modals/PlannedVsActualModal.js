import React from 'react';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

function PlannedVsActualModal({ documents, analyzeTaskPerformance, convertExcelDateToJS, onClose }) {
  const taskPerformance = analyzeTaskPerformance();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Planned vs Actual - Task Performance Breakdown</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
        </div>
        
        <div className="modal-body" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>COMPLETED</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{taskPerformance.completed.length}</div>
              <div style={{ fontSize: '11px', color: '#15803d' }}>Tasks with status Completed</div>
            </div>
            
            <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600', marginBottom: '4px' }}>IN PROGRESS</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{taskPerformance.inProgress.length}</div>
              <div style={{ fontSize: '11px', color: '#1d4ed8' }}>Tasks currently in progress</div>
            </div>
            
            <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>NOT STARTED</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#6b7280' }}>{taskPerformance.notStarted.length}</div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>Tasks yet to begin</div>
            </div>
            
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#7e22ce', fontWeight: '600', marginBottom: '4px' }}>TOTAL TASKS</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#9333ea' }}>{taskPerformance.total.length}</div>
              <div style={{ fontSize: '11px', color: '#a855f7' }}>All project tasks</div>
            </div>
          </div>

          {taskPerformance.hasActualDates && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                Performance Analysis (Based on Actual Dates)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>ON SCHEDULE</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{taskPerformance.onSchedule.length}</div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>Started and ended on time</div>
                </div>
                
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>DELAYED START</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{taskPerformance.delayedStart.length}</div>
                  <div style={{ fontSize: '11px', color: '#b45309' }}>Started after planned date</div>
                </div>
                
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600', marginBottom: '4px' }}>LATE FINISH</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{taskPerformance.lateFinish.length}</div>
                  <div style={{ fontSize: '11px', color: '#b91c1c' }}>Ended after planned date</div>
                </div>
              </div>

              {/* Task Tables */}
              {taskPerformance.onSchedule.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> On Schedule Tasks ({taskPerformance.onSchedule.length})
                  </h3>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskPerformance.onSchedule.map((task, idx) => {
                        const plannedStart = convertExcelDateToJS(task['Planned Start Date']);
                        const actualStart = convertExcelDateToJS(task['Actual Start Date']);
                        const plannedEnd = convertExcelDateToJS(task['Planned End Date']);
                        const actualEnd = convertExcelDateToJS(task['Actual End Date']);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                            <td style={{ padding: '10px', color: '#6b7280' }}>{plannedStart ? plannedStart.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#16a34a' }}>{actualStart ? actualStart.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#6b7280' }}>{plannedEnd ? plannedEnd.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#16a34a' }}>{actualEnd ? actualEnd.toLocaleDateString() : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {taskPerformance.delayedStart.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Delayed Start Tasks ({taskPerformance.delayedStart.length})
                  </h3>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Delay (Days)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskPerformance.delayedStart.map((task, idx) => {
                        const plannedStart = convertExcelDateToJS(task['Planned Start Date']);
                        const actualStart = convertExcelDateToJS(task['Actual Start Date']);
                        const delayDays = plannedStart && actualStart ? Math.ceil((actualStart - plannedStart) / (1000 * 60 * 60 * 24)) : 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                            <td style={{ padding: '10px', color: '#6b7280' }}>{plannedStart ? plannedStart.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#f59e0b' }}>{actualStart ? actualStart.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '600' }}>{delayDays > 0 ? `+${delayDays}` : delayDays}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {taskPerformance.lateFinish.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} /> Late Finish Tasks ({taskPerformance.lateFinish.length})
                  </h3>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Overrun (Days)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskPerformance.lateFinish.map((task, idx) => {
                        const plannedEnd = convertExcelDateToJS(task['Planned End Date']);
                        const actualEnd = convertExcelDateToJS(task['Actual End Date']);
                        const overrunDays = plannedEnd && actualEnd ? Math.ceil((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24)) : 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                            <td style={{ padding: '10px', color: '#6b7280' }}>{plannedEnd ? plannedEnd.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#dc2626' }}>{actualEnd ? actualEnd.toLocaleDateString() : '-'}</td>
                            <td style={{ padding: '10px', color: '#dc2626', fontWeight: '600' }}>{overrunDays > 0 ? `+${overrunDays}` : overrunDays}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {taskPerformance.total.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No tasks found. Add tasks to the project plan to see performance metrics.</p>
            </div>
          )}

          {/* All Tasks Table */}
          {taskPerformance.total.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> All Tasks ({taskPerformance.total.length})
              </h3>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual Start</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                  </tr>
                </thead>
                <tbody>
                  {taskPerformance.total.map((task, idx) => {
                    const plannedStart = convertExcelDateToJS(task['Planned Start Date']);
                    const actualStart = convertExcelDateToJS(task['Actual Start Date']);
                    const plannedEnd = convertExcelDateToJS(task['Planned End Date']);
                    const actualEnd = convertExcelDateToJS(task['Actual End Date']);
                    const status = task['Status'] || '-';
                    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                        <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                        <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                        <td style={{ padding: '10px' }}>
                          <span className={`status-badge ${statusClass}`}>{status}</span>
                        </td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{plannedStart ? plannedStart.toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '10px', color: actualStart ? '#16a34a' : '#6b7280' }}>{actualStart ? actualStart.toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{plannedEnd ? plannedEnd.toLocaleDateString() : '-'}</td>
                        <td style={{ padding: '10px', color: actualEnd ? '#16a34a' : '#6b7280' }}>{actualEnd ? actualEnd.toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlannedVsActualModal;
