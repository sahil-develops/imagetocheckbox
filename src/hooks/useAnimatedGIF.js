import { useState, useRef, useCallback, useEffect } from 'react';
import { extractGIFrames } from '../utils/gifFrameExtractor';
import { convertImageDataToGrayscale, applyThreshold } from '../utils/imageProcessor';

/**
 * Custom hook for managing animated GIF processing and playback
 */
export const useAnimatedGIF = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frames, setFrames] = useState([]);
  const [error, setError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x speed
  
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const currentFrameRef = useRef(0);

  // Handle animation state changes
  useEffect(() => {
    if (!isPlaying && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isPlaying]);

  // Update ref when currentFrame changes
  useEffect(() => {
    currentFrameRef.current = currentFrame;
  }, [currentFrame]);

  /**
   * Process GIF file and extract frames
   */
  const processGIF = useCallback(async (file, gridSize, threshold) => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    setFrames([]);
    setCurrentFrame(0);
    setIsPlaying(false);

    try {
      // Extract frames from GIF
      setProcessingProgress(20);
      const { frames: extractedFrames, width, height } = await extractGIFrames(file);
      
      setProcessingProgress(40);
      
      // Process each frame to checkbox states
      const processedFrames = [];
      const totalFrames = extractedFrames.length;
      
      for (let i = 0; i < totalFrames; i++) {
        const frame = extractedFrames[i];
        
        // Convert to grayscale
        const grayscaleData = convertImageDataToGrayscale(frame.imageData);
        
        // Apply threshold and convert to grid
        const checkboxStates = applyThreshold(grayscaleData, threshold, gridSize);
        
        // Create processed frame
        const processedFrame = {
          ...frame,
          checkboxStates,
          delay: frame.delay || 100
        };
        
        processedFrames.push(processedFrame);
        
        // Update progress
        const progress = 40 + (i / totalFrames) * 50;
        setProcessingProgress(Math.round(progress));
      }
      
      setProcessingProgress(100);
      setFrames(processedFrames);
      setFrameCount(processedFrames.length);
      
      // Small delay to show completion
      setTimeout(() => {
        setProcessingProgress(0);
        setIsProcessing(false);
      }, 200);

      return processedFrames;
    } catch (err) {
      setProcessingProgress(0);
      setIsProcessing(false);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Start animation playback
   */
  const startAnimation = useCallback(() => {
    if (frames.length === 0) return;
    

    setIsPlaying(true);
    setCurrentFrame(0);
    currentFrameRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    
    const animate = (currentTime) => {
      const currentFrameIndex = currentFrameRef.current;
      const frame = frames[currentFrameIndex];
      const frameDelay = frame.delay / playbackSpeed;
      
      if (currentTime - lastFrameTimeRef.current >= frameDelay) {
        const nextFrame = (currentFrameIndex + 1) % frames.length;
        setCurrentFrame(nextFrame);
        currentFrameRef.current = nextFrame;
        lastFrameTimeRef.current = currentTime;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [frames, playbackSpeed]);

  /**
   * Stop animation playback
   */
  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setCurrentFrame(0);
    currentFrameRef.current = 0;
  }, []);

  /**
   * Pause animation
   */
  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /**
   * Resume animation
   */
  const resumeAnimation = useCallback(() => {
    if (frames.length > 0) {
      startAnimation();
    }
  }, [frames, startAnimation]);

  /**
   * Go to specific frame
   */
  const goToFrame = useCallback((frameIndex) => {
    if (frameIndex >= 0 && frameIndex < frames.length) {
      setCurrentFrame(frameIndex);
      currentFrameRef.current = frameIndex;
    }
  }, [frames.length]);

  /**
   * Set playback speed
   */
  const setSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
  }, []);

  /**
   * Get current frame's checkbox states
   */
  const getCurrentFrameStates = useCallback(() => {
    if (frames.length === 0 || currentFrame >= frames.length) {
      return [];
    }
    return frames[currentFrame].checkboxStates || [];
  }, [frames, currentFrame]);

  /**
   * Export current frame as image
   */
  const exportCurrentFrame = useCallback(async (exportSize = 'Medium') => {
    if (frames.length === 0) return;
    
    const currentStates = getCurrentFrameStates();
    if (currentStates.length === 0) return;
    
    // Use the image processor's export function
    const { exportAsImage } = await import('../utils/imageProcessor');
    return await exportAsImage(currentStates, Math.sqrt(currentStates.length), exportSize);
  }, [frames, getCurrentFrameStates]);

  /**
   * Export all frames as sequence
   */
  const exportAllFrames = useCallback(async (exportSize = 'Medium') => {
    if (frames.length === 0) return;
    
    const gridSize = Math.sqrt(frames[0].checkboxStates.length);
    const { exportAsImage } = await import('../utils/imageProcessor');
    
    const blobs = [];
    for (let i = 0; i < frames.length; i++) {
      const blob = await exportAsImage(frames[i].checkboxStates, gridSize, exportSize);
      blobs.push(blob);
    }
    
    return blobs;
  }, [frames]);

  /**
   * Clear all frames
   */
  const clearFrames = useCallback(() => {
    stopAnimation();
    setFrames([]);
    setCurrentFrame(0);
    setFrameCount(0);
    setError(null);
  }, [stopAnimation]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    // State
    isProcessing,
    isPlaying,
    currentFrame,
    frames,
    error,
    processingProgress,
    frameCount,
    playbackSpeed,
    
    // Actions
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
  };
}; 