import React from 'react';
import { getProjectOwner, formatRelativeTime } from './utils';

const RAGProjectCardCompact = ({ 
  project, 
  onClick,
  onToggle
}) => {
  const owner = getProjectOwner(project);
  const overdueCount = project.overdueMilestones || 0;
  const riskCount = project.openCriticalRisks || 0;
  const issueCount = project.openCriticalIssues || 0;
  const escalationCount = project.openEscalations || 0;
  
  return (
    <div 
      className="rag-project-card-compact"
      onClick={onClick}
    >
      <div className="rag-compact-main">
        <div className="rag-compact-name">{project.name}</div>
        <div className="rag-compact-owner">{owner}</div>
      </div>
      
      <div className="rag-compact-badges">
        {escalationCount > 0 && (
          <span className="rag-badge rag-badge-escalation" title="Escalations">
            {escalationCount}
          </span>
        )}
        {overdueCount > 0 && (
          <span className="rag-badge rag-badge-overdue" title="Overdue Milestones">
            {overdueCount}
          </span>
        )}
        {riskCount > 0 && (
          <span className="rag-badge rag-badge-risk" title="Critical Risks">
            {riskCount}
          </span>
        )}
        {issueCount > 0 && (
          <span className="rag-badge rag-badge-issue" title="Critical Issues">
            {issueCount}
          </span>
        )}
      </div>
      
      <div className="rag-compact-meta">
        <span className="rag-compact-updated">
          {formatRelativeTime(project.lastModified)}
        </span>
        <button 
          className="rag-compact-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title="View timeline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RAGProjectCardCompact;
