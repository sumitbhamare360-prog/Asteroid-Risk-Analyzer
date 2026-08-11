import React from 'react';

const RiskBadge = ({ score }) => {
  const numericScore = parseFloat(score);
  
  let label = 'Unknown';
  let colorVar = 'var(--text-muted)';
  let bgColor = 'rgba(255, 255, 255, 0.1)';

  if (numericScore >= 0 && numericScore < 3) {
    label = 'Low';
    colorVar = '#00ff00'; // Green
    bgColor = 'rgba(0, 255, 0, 0.1)';
  } else if (numericScore >= 3 && numericScore < 6) {
    label = 'Moderate';
    colorVar = 'var(--accent-amber)'; // Yellow
    bgColor = 'rgba(255, 191, 0, 0.1)';
  } else if (numericScore >= 6 && numericScore < 8) {
    label = 'High';
    colorVar = '#ff8800'; // Orange
    bgColor = 'rgba(255, 136, 0, 0.1)';
  } else if (numericScore >= 8) {
    label = 'Severe';
    colorVar = 'var(--accent-red)'; // Red
    bgColor = 'rgba(255, 51, 51, 0.1)';
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      backgroundColor: bgColor,
      border: `1px solid ${colorVar}`,
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colorVar,
        boxShadow: `0 0 6px ${colorVar}`
      }}></div>
      <span style={{ color: colorVar, fontWeight: 'bold', fontSize: '0.85rem' }}>
        {label} ({numericScore.toFixed(1)})
      </span>
    </div>
  );
};

export default RiskBadge;
