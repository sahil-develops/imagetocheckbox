import React from 'react';

const ProcessingProgress = ({ isProcessing, progress, error, onRetry }) => {
  if (!isProcessing && !error) return null;

  return (
    <div className="processing-overlay">
      <div className="processing-modal">
        {isProcessing && (
          <>
            <div className="processing-spinner">
              <div className="spinner"></div>
            </div>
            <h3 className="processing-title">Processing Image...</h3>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
            <p className="processing-description">
              Converting image to checkbox art...
            </p>
          </>
        )}
        
        {error && (
          <>
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Processing Error</h3>
            <p className="error-message">{error}</p>
            {onRetry && (
              <button onClick={onRetry} className="retry-btn">
                Try Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessingProgress; 