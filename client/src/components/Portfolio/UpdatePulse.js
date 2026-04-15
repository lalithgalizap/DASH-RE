import React from 'react';
import { formatRelativeTime } from './utils';

const UpdatePulse = ({ freshnessLists }) => {
  const freshnessBarWidth = (dateString, invert = false) => {
    if (!dateString) return invert ? '15%' : '85%';
    const diffDays = Math.min(14, Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))));
    const width = invert ? Math.min(90, diffDays * 6 + 20) : Math.max(15, 90 - diffDays * 6);
    return `${width}%`;
  };

  return (
    <section className="freshness-card">
      <div className="freshness-header">
        <h3>Update Pulse</h3>
        <span>{freshnessLists.fresh.length} updated / {freshnessLists.stale.length + freshnessLists.missing.length} pending</span>
      </div>
      <div className="freshness-groups">
        <div className="freshness-group">
          <h4>Updated this week</h4>
          {freshnessLists.fresh.length === 0 && <p className="freshness-empty">No recent updates</p>}
          {freshnessLists.fresh.slice(0, 5).map(project => (
            <div key={`fresh-${project.id || project._id}`} className="freshness-row">
              <div>
                <div className="freshness-name">{project.name}</div>
                <div className="freshness-meta">{formatRelativeTime(project.lastModified)}</div>
              </div>
              <div className="freshness-bar fill">
                <span style={{ width: freshnessBarWidth(project.lastModified) }}></span>
              </div>
            </div>
          ))}
        </div>
        <div className="freshness-group">
          <h4>Needs update</h4>
          {freshnessLists.stale.length === 0 && <p className="freshness-empty">All projects up to date</p>}
          {freshnessLists.stale.slice(0, 5).map(project => (
            <div key={`stale-${project.id || project._id}`} className="freshness-row">
              <div>
                <div className="freshness-name">{project.name}</div>
                <div className="freshness-meta">Last touch: {formatRelativeTime(project.lastModified)}</div>
              </div>
              <div className="freshness-bar outline">
                <span style={{ width: freshnessBarWidth(project.lastModified, true) }}></span>
              </div>
            </div>
          ))}
        </div>
        <div className="freshness-group">
          <h4>No data yet</h4>
          {freshnessLists.missing.length === 0 && <p className="freshness-empty">All projects reporting</p>}
          {freshnessLists.missing.slice(0, 4).map(project => (
            <div key={`missing-${project.id || project._id}`} className="freshness-row no-data">
              <div>
                <div className="freshness-name">{project.name}</div>
                <div className="freshness-meta">Awaiting first upload</div>
              </div>
              <span className="freshness-tag">Follow up</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpdatePulse;
