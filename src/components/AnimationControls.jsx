import React from 'react';

const AnimationControls = ({
  isPlaying,
  currentFrame,
  frameCount,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onFrameChange,
  onSpeedChange,
  onExportFrame,
  onExportAll,
  disabled = false
}) => {
  if (frameCount === 0) return null;

  return (
    <div className="animation-controls">
      <div className="animation-header">
        <h3 className="animation-title">Animation Controls</h3>
        <div className="frame-info">
          Frame {currentFrame + 1} of {frameCount}
        </div>
      </div>

      <div className="control-buttons">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="control-btn primary"
          disabled={disabled}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        
        <button
          onClick={onStop}
          className="control-btn"
          disabled={disabled}
        >
          ⏹️ Stop
        </button>
      </div>

      <div className="frame-controls">
        <label className="frame-slider-label">Frame:</label>
        <input
          type="range"
          min="0"
          max={Math.max(0, frameCount - 1)}
          value={currentFrame}
          onChange={(e) => onFrameChange(parseInt(e.target.value))}
          className="frame-slider"
          disabled={disabled}
        />
        <span className="frame-number">{currentFrame + 1}</span>
      </div>

      <div className="speed-controls">
        <label className="speed-label">Speed:</label>
        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="speed-select"
          disabled={disabled}
        >
          <option value={0.25}>0.25x (Slow)</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x (Normal)</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x (Fast)</option>
          <option value={4}>4x (Very Fast)</option>
        </select>
      </div>

      <div className="export-controls">
        <button
          onClick={onExportFrame}
          className="export-btn"
          disabled={disabled}
        >
          📷 Export Current Frame
        </button>
        
        <button
          onClick={onExportAll}
          className="export-btn"
          disabled={disabled}
        >
          🎬 Export All Frames
        </button>
      </div>
    </div>
  );
};

export default AnimationControls; 