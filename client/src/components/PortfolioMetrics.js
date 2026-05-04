import React from 'react';
import { Clock, Calendar, AlertTriangle, Link2, AlertCircle, ArrowUpCircle } from 'lucide-react';
import './PortfolioMetrics.css';

function PortfolioMetrics({ metrics, onMetricClick }) {
  if (!metrics) return null;

  const handleClick = (filterType) => {
    if (onMetricClick) onMetricClick(filterType);
  };

  const metricCards = [
    {
      key: 'overdue',
      value: metrics.overdueMilestonesTotal || 0,
      label: 'Overdue Milestones',
      sublabel: 'Past due and not completed',
      icon: Clock,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      hasAlert: (metrics.overdueMilestonesTotal || 0) > 0
    },
    {
      key: 'upcoming',
      value: metrics.upcomingMilestonesTotal || 0,
      label: 'Upcoming Milestones',
      sublabel: 'Next 14 days',
      icon: Calendar,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      hasAlert: false
    },
    {
      key: 'criticalRisks',
      value: metrics.openCriticalRisksTotal || 0,
      label: 'Open Critical Risks',
      sublabel: 'Critical / High only',
      icon: AlertTriangle,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      hasAlert: (metrics.openCriticalRisksTotal || 0) > 0
    },
    {
      key: 'dependencies',
      value: metrics.openDependenciesTotal || 0,
      label: 'Open Dependencies',
      sublabel: 'External blocking dependencies',
      icon: Link2,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      hasAlert: (metrics.openDependenciesTotal || 0) > 0
    },
    {
      key: 'criticalIssues',
      value: metrics.openCriticalIssuesTotal || 0,
      label: 'Open Critical Issues',
      sublabel: 'All open issues',
      icon: AlertCircle,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      hasAlert: (metrics.openCriticalIssuesTotal || 0) > 0
    },
    {
      key: 'escalations',
      value: metrics.openEscalationsTotal || 0,
      label: 'Open Escalations',
      sublabel: 'Raised at mainand and not closed',
      icon: ArrowUpCircle,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      hasAlert: (metrics.openEscalationsTotal || 0) > 0
    }
  ];

  return (
    <div className="portfolio-metrics">
      <div className="metrics-section-header">
        <h3 className="metrics-section-title">Key Alerts & Delivery Signals</h3>
      </div>
      <div className="metrics-grid">
        {metricCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.key}
              className="metric-card-modern"
              onClick={() => handleClick(card.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="metric-card-content">
                <div
                  className="metric-icon-container"
                  style={{ backgroundColor: card.iconBg }}
                >
                  <IconComponent size={20} color={card.iconColor} />
                </div>
                <div className="metric-text-content">
                  <div className="metric-label-modern">{card.label}</div>
                  <div className="metric-value-big" style={{ color: card.iconColor }}>{card.value}</div>
                  <div className="metric-sublabel-modern">{card.sublabel}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PortfolioMetrics;
