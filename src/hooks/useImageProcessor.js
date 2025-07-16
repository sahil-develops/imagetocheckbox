import { useState, useCallback } from 'react';
import {
  processImage,
  exportAsImage,
  exportAsText,
  getErrorMessage
} from '../utils/imageProcessor';

/**
 * Custom hook for managing image processing state and operations
 */
export const useImageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  /**
   * Process an image file
   */
  const processImageFile = useCallback(async (file, gridSize, threshold = null) => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await processImage(file, gridSize, threshold);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        setProcessingProgress(0);
        setIsProcessing(false);
      }, 200);

      return result;
    } catch (err) {
      clearInterval(progressInterval);
      setProcessingProgress(0);
      setIsProcessing(false);
      
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Export as image
   */
  const exportImage = useCallback(async (checkboxStates, gridSize, exportSize) => {
    try {
      const blob = await exportAsImage(checkboxStates, gridSize, exportSize);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `checkbox-art-${gridSize}x${gridSize}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Export as text
   */
  const exportText = useCallback((checkboxStates, gridSize) => {
    try {
      const pattern = exportAsText(checkboxStates, gridSize);
      
      // Create and download text file
      const blob = new Blob([pattern], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `checkbox-pattern-${gridSize}x${gridSize}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset processing state
   */
  const resetProcessing = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setProcessingProgress(0);
  }, []);

  return {
    isProcessing,
    error,
    processingProgress,
    processImageFile,
    exportImage,
    exportText,
    clearError,
    resetProcessing
  };
}; 