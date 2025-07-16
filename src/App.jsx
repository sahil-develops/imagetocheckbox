import { useState, useRef, useEffect } from 'react'
import { useImageProcessor } from './hooks/useImageProcessor'
import { useAnimatedGIF } from './hooks/useAnimatedGIF'
import ProcessingProgress from './components/ProcessingProgress'
import AnimationControls from './components/AnimationControls'
import './App.css'

function App() {
  const [resolution, setResolution] = useState('Medium (50x50)')
  const [threshold, setThreshold] = useState(128)
  const [checkboxStates, setCheckboxStates] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [exportSize, setExportSize] = useState('Medium')
  const [gridSize, setGridSize] = useState(50)
  const [lastProcessedFile, setLastProcessedFile] = useState(null)
  const [isGIF, setIsGIF] = useState(false)
  const fileInputRef = useRef(null)

  // Use the image processing hook
  const {
    isProcessing: isImageProcessing,
    error: imageError,
    processingProgress: imageProgress,
    processImageFile,
    exportImage,
    exportText,
    clearError: clearImageError,
    resetProcessing: resetImageProcessing
  } = useImageProcessor()

  // Use the animated GIF hook
  const {
    isProcessing: isGIFProcessing,
    isPlaying,
    currentFrame,
    frames,
    error: gifError,
    processingProgress: gifProgress,
    frameCount,
    playbackSpeed,
    processGIF,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    goToFrame,
    setSpeed,
    getCurrentFrameStates,
    exportCurrentFrame,
    exportAllFrames,
    clearFrames
  } = useAnimatedGIF()

  // Update grid size when resolution changes
  useEffect(() => {
    const sizeMap = {
      'Low (30x30)': 30,
      'Medium (50x50)': 50,
      'High (80x80)': 80
    }
    setGridSize(sizeMap[resolution])
  }, [resolution])

  // Initialize checkbox states when grid size changes
  useEffect(() => {
    const newStates = Array(gridSize * gridSize).fill(false)
    setCheckboxStates(newStates)
  }, [gridSize])

  // Handle file upload with GIF detection
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setLastProcessedFile(file)
      
      // Check if it's a GIF
      if (file.type === 'image/gif') {
        setIsGIF(true)
        clearFrames() // Clear any existing frames
        await processGIF(file, gridSize, threshold)
      } else {
        setIsGIF(false)
        const result = await processImageFile(file, gridSize, threshold)
        setCheckboxStates(result.checkboxStates)
        setThreshold(result.threshold)
        setUploadedImage(file)
      }
    } catch (err) {
      console.error('File processing error:', err)
    }
  }

  // Update checkbox states based on current frame for GIFs
  useEffect(() => {
    if (isGIF && frames.length > 0 && currentFrame < frames.length) {
      const currentStates = frames[currentFrame].checkboxStates || []
      const checkedCount = currentStates.filter(state => state).length
      console.log(`App: Updating checkbox states for frame ${currentFrame}, states: ${currentStates.length}, checked: ${checkedCount}`)
      
      // Debug: Check if this frame is different from the previous one
      if (currentFrame > 0) {
        const prevStates = frames[currentFrame - 1].checkboxStates || []
        const prevCheckedCount = prevStates.filter(state => state).length
        const isDifferent = checkedCount !== prevCheckedCount || 
          currentStates.some((state, i) => state !== prevStates[i])
        console.log(`App: Frame ${currentFrame} different from frame ${currentFrame - 1}: ${isDifferent}`)
      }
      
      // Force a new array reference to ensure React detects the change
      setCheckboxStates([...currentStates])
    }
  }, [isGIF, frames, currentFrame])

  // Debug: Monitor checkboxStates changes
  useEffect(() => {
    if (isGIF) {
      const checkedCount = checkboxStates.filter(state => state).length
      console.log(`App: checkboxStates changed, length: ${checkboxStates.length}, checked: ${checkedCount}`)
    }
  }, [checkboxStates, isGIF])

  // Reprocess image when threshold or grid size changes
  useEffect(() => {
    if (lastProcessedFile && !isGIF) {
      const reprocessImage = async () => {
        try {
          const result = await processImageFile(lastProcessedFile, gridSize, threshold)
          setCheckboxStates(result.checkboxStates)
        } catch (err) {
          console.error('Reprocessing error:', err)
        }
      }
      
      reprocessImage()
    }
  }, [threshold, gridSize, lastProcessedFile, isGIF, processImageFile])

  // Auto-calculate threshold
  const calculateAutoThreshold = async () => {
    if (!lastProcessedFile) return

    try {
      if (isGIF) {
        // For GIFs, we'll use the first frame for auto threshold
        const result = await processImageFile(lastProcessedFile, gridSize, null)
        setThreshold(result.threshold)
      } else {
        const result = await processImageFile(lastProcessedFile, gridSize, null)
        setThreshold(result.threshold)
        setCheckboxStates(result.checkboxStates)
      }
    } catch (err) {
      console.error('Auto threshold error:', err)
    }
  }

  // Toggle individual checkbox
  const toggleCheckbox = (index) => {
    if (isGIF) {
      // For GIFs, update the current frame's checkbox states
      const updatedFrames = [...frames]
      if (updatedFrames[currentFrame]) {
        updatedFrames[currentFrame].checkboxStates[index] = !updatedFrames[currentFrame].checkboxStates[index]
        // Update the frames state (this would need to be exposed from the hook)
      }
    } else {
      const newStates = [...checkboxStates]
      newStates[index] = !newStates[index]
      setCheckboxStates(newStates)
    }
  }

  // Invert all checkboxes
  const invertColors = () => {
    if (isGIF) {
      // For GIFs, invert all frames
      const updatedFrames = frames.map(frame => ({
        ...frame,
        checkboxStates: frame.checkboxStates.map(state => !state)
      }))
      // Update frames (would need to be exposed from hook)
    } else {
      setCheckboxStates(checkboxStates.map(state => !state))
    }
  }

  // Clear all checkboxes
  const clearCheckboxes = () => {
    if (isGIF) {
      // For GIFs, clear all frames
      const updatedFrames = frames.map(frame => ({
        ...frame,
        checkboxStates: Array(gridSize * gridSize).fill(false)
      }))
      // Update frames (would need to be exposed from hook)
    } else {
      setCheckboxStates(Array(gridSize * gridSize).fill(false))
    }
  }

  // Save as pixels (image)
  const saveAsPixels = async () => {
    try {
      if (isGIF) {
        await exportCurrentFrame(exportSize)
      } else {
        await exportImage(checkboxStates, gridSize, exportSize)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  // Save as checkboxes (text pattern)
  const saveAsCheckboxes = () => {
    try {
      if (isGIF) {
        // For GIFs, export current frame as text
        const currentStates = getCurrentFrameStates()
        exportText(currentStates, gridSize)
      } else {
        exportText(checkboxStates, gridSize)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  // Export all GIF frames
  const handleExportAllFrames = async () => {
    try {
      const blobs = await exportAllFrames(exportSize)
      // Download all frames as a zip or individual files
      blobs.forEach((blob, index) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `frame_${index + 1}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      })
    } catch (err) {
      console.error('Export all frames error:', err)
    }
  }

  // Retry processing
  const handleRetry = async () => {
    if (isGIF) {
      clearFrames()
      if (lastProcessedFile) {
        try {
          await processGIF(lastProcessedFile, gridSize, threshold)
        } catch (err) {
          console.error('GIF retry error:', err)
        }
      }
    } else {
      clearImageError()
      if (lastProcessedFile) {
        try {
          const result = await processImageFile(lastProcessedFile, gridSize, threshold)
          setCheckboxStates(result.checkboxStates)
          setThreshold(result.threshold)
        } catch (err) {
          console.error('Image retry error:', err)
        }
      }
    }
  }

  // Get current processing state
  const isProcessing = isImageProcessing || isGIFProcessing
  const error = imageError || gifError
  const processingProgress = isGIFProcessing ? gifProgress : imageProgress

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="app-header">
          <h1 className="app-title">Checkbox Sketch</h1>
          {isGIF && frameCount > 0 && (
            <p className="gif-indicator">🎬 Animated GIF: {frameCount} frames</p>
          )}
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          {/* Resolution Selection */}
          <div className="control-section">
            <div className="section-title">Resolution</div>
            <div className="resolution-container">
              {['Low (30x30)', 'Medium (50x50)', 'High (80x80)'].map((res) => (
                <button
                  key={res}
                  className={`resolution-btn ${resolution === res ? 'active' : ''}`}
                  onClick={() => setResolution(res)}
                  disabled={isProcessing}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Brightness Threshold */}
          <div className="control-section">
            <div className="section-title">Brightness Threshold</div>
            <div className="threshold-container">
              <span className="threshold-label">Dark</span>
              <input
                type="range"
                min="0"
                max="255"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="threshold-slider"
                disabled={isProcessing}
              />
              <span className="threshold-label">Light</span>
              <div className="threshold-value">
                <span className="threshold-number">{threshold}/255</span>
                <button
                  onClick={calculateAutoThreshold}
                  className="auto-btn"
                  disabled={!uploadedImage || isProcessing}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="control-section">
            <div className="upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                className="file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="upload-btn"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Upload Image'}
              </button>
              <p className="file-support">
                Supports JPG, PNG, GIF, WebP (Max 10MB) • GIFs create animated checkbox art!
              </p>
            </div>
          </div>
        </div>

        {/* Animation Controls for GIFs */}
        {isGIF && frameCount > 0 && (
          <AnimationControls
            isPlaying={isPlaying}
            currentFrame={currentFrame}
            frameCount={frameCount}
            playbackSpeed={playbackSpeed}
            onPlay={startAnimation}
            onPause={pauseAnimation}
            onStop={stopAnimation}
            onFrameChange={goToFrame}
            onSpeedChange={setSpeed}
            onExportFrame={saveAsPixels}
            onExportAll={handleExportAllFrames}
            disabled={isProcessing}
          />
        )}

        {/* Checkbox Grid */}
        {checkboxStates.length > 0 && (
          <div className="checkbox-container">
            <div 
              className="checkbox-grid"
              key={`grid-${isGIF ? currentFrame : 'static'}`}
              style={{
                gridTemplateColumns: `repeat(${gridSize}, 14px)`,
                gridTemplateRows: `repeat(${gridSize}, 14px)`
              }}
            >
              {checkboxStates.map((isChecked, index) => (
                <div
                  key={`${isGIF ? currentFrame : 'static'}-${index}`}
                  className={`checkbox-item ${isChecked ? 'checked' : ''}`}
                  onClick={() => toggleCheckbox(index)}
                >
                  {isChecked && '✓'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Bar */}
        <div className="control-bar">
          <div className="control-bar-content">
            {/* Left side */}
            <div className="control-group">
              <button 
                onClick={invertColors} 
                className="control-btn"
                disabled={isProcessing || checkboxStates.length === 0}
              >
                Invert Colors
              </button>
              <button 
                onClick={clearCheckboxes} 
                className="control-btn"
                disabled={isProcessing || checkboxStates.length === 0}
              >
                Clear
              </button>
            </div>

            {/* Center */}
            <div className="export-controls">
              <span className="export-label">Export size:</span>
              <select
                value={exportSize}
                onChange={(e) => setExportSize(e.target.value)}
                className="export-dropdown"
                disabled={isProcessing}
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div>

            {/* Right side */}
            <div className="control-group">
              <button 
                onClick={saveAsPixels} 
                className="save-btn"
                disabled={isProcessing || checkboxStates.length === 0}
              >
                {isGIF ? 'Save Current Frame' : 'Save as Pixels'}
              </button>
              <button 
                onClick={saveAsCheckboxes} 
                className="save-btn"
                disabled={isProcessing || checkboxStates.length === 0}
              >
                {isGIF ? 'Save Frame as Text' : 'Save as Checkboxes'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="app-footer">
          <p className="footer-text">
            {isGIF 
              ? '🎬 Animated GIF mode • Click checkboxes to edit • Use controls to play/pause animation'
              : 'Click checkboxes to manually edit • Checked = dark pixels, unchecked = background'
            }
          </p>
        </div>
      </div>

      {/* Processing Progress Overlay */}
      <ProcessingProgress
        isProcessing={isProcessing}
        progress={processingProgress}
        error={error}
        onRetry={handleRetry}
      />
    </div>
  )
}

export default App
