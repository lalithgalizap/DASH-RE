import React, { useState, useMemo, useEffect } from 'react';
import { getRAGColor, getProjectOwner, isActiveStatus } from '../utils';
import MilestoneDetailModal from './MilestoneDetailModal';
import WeekDetailModal from './WeekDetailModal';
import ViewToggle from './ViewToggle';
import ChartView from './ChartView';
import './modals.css';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';

// Color palette for projects
const PROJECT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const UpcomingMilestonesModal = ({ isOpen, onClose, projects, selectedClient }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'chart' | 'history'
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [allProjectNames, setAllProjectNames] = useState([]);
  const [selectedWeekData, setSelectedWeekData] = useState(null);

  // Filter out completed/cancelled projects
  const activeProjects = (projects || []).filter(p => isActiveStatus(p.status));
  const projectsWithUpcoming = activeProjects.filter(p => (p.upcomingMilestones || 0) > 0);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithUpcoming;
    const term = searchTerm.toLowerCase();
    return projectsWithUpcoming.filter(p => 
      (p.name?.toLowerCase() || '').includes(term) ||
      (getProjectOwner(p)?.toLowerCase() || '').includes(term)
    );
  }, [projectsWithUpcoming, searchTerm]);

  // Fetch history data when viewMode is 'history'
  useEffect(() => {
    if (viewMode !== 'history' || !isOpen) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const token = localStorage.getItem('token');
        const clientParam = selectedClient && selectedClient !== 'All' ? `&client=${encodeURIComponent(selectedClient)}` : '';
        const response = await axios.get(
          `/api/metrics/history?metric=upcomingMilestonesTotal&weeks=5${clientParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setAllProjectNames(response.data.allProjectNames || []);

        const rawData = response.data.data || [];
        const transformedData = rawData.map(week => {
          const weekData = {
            weekEnding: week.weekEnding,
            formattedDate: formatDate(week.weekEnding),
            total: week.value,
            projects: week.projects || []
          };
          (week.projects || []).forEach(p => {
            weekData[p.projectName] = p.value;
          });
          return weekData;
        });

        setHistoryData(transformedData);
      } catch (err) {
        console.error('Error fetching history:', err);
        setHistoryError('Failed to load history data');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [viewMode, isOpen, selectedClient]);

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip for history chart with project breakdown
  const HistoryTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const projects = data.projects || [];

      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '320px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
            Week ending: {formatDate(data.weekEnding)}
          </p>
          <p style={{ margin: '0 0 8px 0', color: '#3b82f6', fontWeight: 600 }}>
            Total Upcoming: {data.value}
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '13px' }}>
            Active Projects: {data.projectCount} | Total: {data.totalProjects}
          </p>

          {projects.length > 0 && (
            <>
              <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                By Project:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {projects.slice(0, 8).map((project, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '3px 0',
                    borderBottom: idx < projects.length - 1 && idx < 7 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <span style={{ color: '#4b5563', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.projectName}
                    </span>
                    <span style={{ color: '#3b82f6', fontWeight: 600, marginLeft: '12px' }}>
                      {project.value}
                    </span>
                  </div>
                ))}
                {projects.length > 8 && (
                  <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                    + {projects.length - 8} more projects
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000 
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        maxWidth: '800px', 
        maxHeight: '80vh', 
        overflow: 'auto', 
        width: '90%' 
      }}>
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Upcoming Milestones</h2>
          <button onClick={onClose} style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer' 
          }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {/* View Toggle + Search */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            gap: '12px'
          }}>
            <ViewToggle view={viewMode} onChange={setViewMode} showHistory={true} />
            
            {viewMode === 'list' && projectsWithUpcoming.length > 4 && (
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects or owners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 40px',
                    fontSize: '13px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
          
          {viewMode === 'list' && searchTerm && (
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '12px', 
              color: '#6b7280'
            }}>
              Showing {filteredProjects.length} of {projectsWithUpcoming.length} projects
            </div>
          )}

          {/* Content Area */}
          {viewMode === 'history' ? (
            <div style={{ height: '350px' }}>
              {historyLoading && (
                <div style={{ textAlign: 'center', padding: '80px' }}>
                  <div className="loading-spinner" />
                  <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading history...</p>
                </div>
              )}
              {historyError && (
                <div style={{ textAlign: 'center', padding: '80px', color: '#dc2626' }}>
                  {historyError}
                </div>
              )}
              {!historyLoading && !historyError && historyData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
                  <p>No history data available yet.</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    Data will be collected weekly starting from the next Friday at 6 PM CST.
                  </p>
                </div>
              )}
              {!historyLoading && !historyError && historyData.length > 0 && allProjectNames.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
                  <p>No data for selected client.</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    Try selecting a different client or "All" to see all projects.
                  </p>
                </div>
              )}
              {!historyLoading && !historyError && historyData.length > 0 && allProjectNames.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={historyData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<HistoryTooltip />} />
                    {/* Render a Bar for each project - stacked */}
                    {allProjectNames.map((projectName, idx) => (
                      <Bar
                        key={projectName}
                        dataKey={projectName}
                        stackId="total"
                        fill={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                        radius={idx === allProjectNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        maxBarSize={60}
                        onClick={(data) => setSelectedWeekData(data.payload)}
                        style={{ cursor: 'pointer' }}
                      >
                        <LabelList
                          dataKey={projectName}
                          position="inside"
                          content={(props) => {
                            const { value, x, y, width, height } = props;
                            if (!value || value === 0 || height < 20) return null;
                            return (
                              <text
                                x={x + width / 2}
                                y={y + height / 2}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="10"
                                fontWeight="600"
                              >
                                {projectName.length > 8 ? projectName.substring(0, 6) + '..' : projectName}
                              </text>
                            );
                          }}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div style={{ 
              maxHeight: '350px', 
              overflowY: 'auto'
            }}>
              <div className="critical-accordion" style={{ border: 'none' }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects
                    .sort((a, b) => (b.upcomingMilestones || 0) - (a.upcomingMilestones || 0))
                    .map(project => (
                      <div key={`upcoming-${project.id || project._id}`} className="critical-project">
                        <button
                          type="button"
                          className="critical-project-header"
                          onClick={() => setSelectedProject(project)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="critical-project-info">
                            <div className="critical-project-name">{project.name}</div>
                            <div className="critical-meta">
                              <span>{getProjectOwner(project)}</span>
                              <span>•</span>
                              <span>{project.upcomingMilestones} upcoming</span>
                            </div>
                          </div>
                          <div className="critical-project-right">
                            <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px', marginRight: '12px' }}>
                              {project.upcomingMilestones} upcoming
                            </span>
                            <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                            <span className="critical-chevron">⌄</span>
                          </div>
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="rag-summary-empty" style={{ padding: '40px 20px' }}>
                    {searchTerm ? 'No projects match your search' : 'No projects with upcoming milestones'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <ChartView 
              data={filteredProjects}
              metricKey="upcomingMilestones"
              metricLabel="upcoming milestones"
              color="#3b82f6"
              onBarClick={setSelectedProject}
            />
          )}
        </div>
      </div>
      
      {/* Milestone Detail Modal */}
      {selectedProject && (
        <MilestoneDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          type="upcoming"
        />
      )}

      {/* Week Detail Modal */}
      {selectedWeekData && (
        <WeekDetailModal
          isOpen={!!selectedWeekData}
          onClose={() => setSelectedWeekData(null)}
          weekData={selectedWeekData}
          metricLabel="Upcoming Milestones"
          color="#3b82f6"
        />
      )}
    </div>
  );
};

export default UpcomingMilestonesModal;
