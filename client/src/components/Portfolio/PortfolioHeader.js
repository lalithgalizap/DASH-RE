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
          <span className="exec-label">{item.label}</span>
          <span className="exec-value">
            {item.valueJSX || item.value}
          </span>
          <span className="exec-helper">{item.helper}</span>
        </button>
      ))}
    </section>
  );
};

export default PortfolioHeader;
