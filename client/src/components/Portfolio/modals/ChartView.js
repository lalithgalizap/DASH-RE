import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ChartView = ({ data, metricKey, metricLabel, color, onBarClick }) => {
  // Sort data by metric value descending and take top 15
  const sortedData = [...data]
    .sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0))
    .slice(0, 15)
    .map(project => ({
      name: project.name.length > 25 ? project.name.substring(0, 25) + '...' : project.name,
      fullName: project.name,
      value: project[metricKey] || 0,
      project: project
    }));

  if (sortedData.length === 0) {
    return (
      <div style={{ 
        padding: '50px 20px', 
        textAlign: 'center', 
        color: '#9ca3af',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', color: '#d1d5db' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <div>No data available for chart visualization</div>
      </div>
    );
  }

  // Calculate max value for dynamic domain - ensures whole numbers only
  const maxValue = Math.max(...sortedData.map(d => d.value));
  const domainMax = maxValue <= 1 ? 2 : Math.ceil(maxValue * 1.15);

  // Gradient ID based on color
  const gradientId = `gradient-${color.replace('#', '')}`;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#1f2937',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontSize: '13px',
          color: '#ffffff',
          minWidth: '160px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.fullName}</div>
          <div style={{ color: color, fontSize: '12px', fontWeight: '500' }}>
            {item.value} {metricLabel}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '360px', 
      padding: '16px 8px',
      background: 'linear-gradient(180deg, #fafbfc 0%, #ffffff 100%)',
      borderRadius: '12px'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <XAxis 
            type="number" 
            domain={[0, domainMax]}
            tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: '500' }}
            axisLine={false}
            tickLine={false}
            tickCount={maxValue <= 1 ? 3 : 6}
            allowDecimals={false}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={140}
            tick={{ 
              fontSize: 12, 
              fill: '#374151', 
              fontWeight: '500'
            }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(243, 244, 246, 0.6)' }}
            animationDuration={200}
          />
          <Bar 
            dataKey="value" 
            fill={`url(#${gradientId})`}
            radius={[0, 6, 6, 0]}
            barSize={24}
            animationDuration={100}
            animationBegin={0}
            animationEasing="ease-out"
            onClick={(data) => onBarClick && onBarClick(data.project)}
            style={{ cursor: 'pointer' }}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#${gradientId})`}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartView;
