import React from 'react';

const PortfolioHeader = ({ summaryHighlights, onHighlightClick }) => {
  return (
    <section className="portfolio-exec-strip">
      {summaryHighlights.map(item => (
        <button
          key={item.label}
          type="button"
          className={`exec-card exec-${item.tone} exec-clickable`}
          onClick={() => onHighlightClick(item.type)}
        >
          <div className="exec-card-content">
            {item.icon && (
              <div className="exec-icon-container" style={{ backgroundColor: item.iconBg }}>
                {item.icon}
              </div>
            )}
            <div className="exec-text-content">
              <span className="exec-label">{item.label}</span>
              <span className="exec-value">
                {item.valueJSX || item.value}
              </span>
              <span className="exec-helper">{item.helper}</span>
            </div>
          </div>
        </button>
      ))}
    </section>
  );
};

export default PortfolioHeader;
