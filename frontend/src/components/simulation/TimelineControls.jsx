import React from 'react';

const TimelineControls = ({ trajectoryPoints, currentTimeIndex, onSeek, onPlayPause, onReset, onSpeedChange, playing, speed }) => {
  const totalFrames = trajectoryPoints?.length || 0;
  const currentDate = trajectoryPoints && currentTimeIndex < trajectoryPoints.length
    ? new Date(trajectoryPoints[currentTimeIndex].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return (
    <div style={{
      padding: '20px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '5px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            <span>Frame: {currentTimeIndex} / {Math.max(0, totalFrames - 1)}</span>
            <span>{currentDate}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentTimeIndex}
            onChange={(e) => onSeek?.(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-cyan)',
            }}
            disabled={totalFrames === 0}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onReset}
          disabled={totalFrames === 0 || currentTimeIndex === 0}
          style={buttonStyle}
          title="Reset to start"
        >
          ⏮
        </button>

        <button
          onClick={onPlayPause}
          disabled={totalFrames === 0 || currentTimeIndex >= totalFrames - 1}
          style={{ ...buttonStyle, backgroundColor: playing ? 'var(--accent-red)' : 'var(--accent-cyan)' }}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Speed:</span>
          <select
            value={speed}
            onChange={(e) => onSpeedChange?.(parseInt(e.target.value, 10))}
            style={selectStyle}
          >
            <option value={1}>1x</option>
            <option value={10}>10x</option>
            <option value={100}>100x</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '8px 16px',
  backgroundColor: 'var(--bg-dark)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '1rem',
  transition: 'all 0.2s ease',
  minWidth: '44px',
};

const selectStyle = {
  padding: '6px 10px',
  backgroundColor: 'var(--bg-dark)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  cursor: 'pointer',
};

export default TimelineControls;
