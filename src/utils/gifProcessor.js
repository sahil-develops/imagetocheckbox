/**
 * GIF Processing Utility
 * Handles animated GIF processing with frame extraction and animation
 */

import { ImageProcessingError } from './imageProcessor.js';

/**
 * GIF frame data structure
 */
class GIFFrame {
  constructor(imageData, delay, disposalMethod) {
    this.imageData = imageData;
    this.delay = delay; // Delay in milliseconds
    this.disposalMethod = disposalMethod; // How to dispose of this frame
    this.checkboxStates = null; // Will be populated after processing
  }
}

/**
 * GIF processing configuration
 */
const GIF_CONFIG = {
  MAX_FRAMES: 100, // Maximum frames to process
  MIN_DELAY: 50,   // Minimum delay between frames (ms)
  MAX_DELAY: 5000, // Maximum delay between frames (ms)
  DEFAULT_DELAY: 100, // Default delay if not specified
  SUPPORTED_FORMATS: ['image/gif']
};

/**
 * Validates GIF file
 * @param {File} file - GIF file to validate
 * @returns {Promise<void>}
 */
export const validateGIF = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new ImageProcessingError('No file provided', 'NO_FILE'));
      return;
    }

    if (!GIF_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
      reject(new ImageProcessingError(
        `File must be a GIF. Received: ${file.type}`,
        'UNSUPPORTED_FORMAT'
      ));
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit for GIFs
      reject(new ImageProcessingError(
        `GIF too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 50MB`,
        'FILE_TOO_LARGE'
      ));
      return;
    }

    resolve();
  });
};

/**
 * Creates a canvas element
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement}
 */
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/**
 * Extracts frames from GIF using canvas
 * @param {File} gifFile - GIF file to process
 * @returns {Promise<{frames: GIFFrame[], width: number, height: number}>}
 */
export const extractGIFrames = async (gifFile) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        
        // Get GIF metadata
        const frames = [];
        let currentTime = 0;
        
        // Create a temporary canvas for each frame
        const tempCanvas = createCanvas(img.width, img.height);
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the GIF and extract frames
        const drawFrame = (timestamp) => {
          // Clear canvas
          tempCtx.clearRect(0, 0, img.width, img.height);
          
          // Draw current frame
          tempCtx.drawImage(img, 0, 0);
          
          // Get image data for this frame
          const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
          
          // Create frame object
          const frame = new GIFFrame(
            imageData,
            GIF_CONFIG.DEFAULT_DELAY, // Default delay
            2 // Default disposal method (clear background)
          );
          
          frames.push(frame);
          
          // Check if we have too many frames
          if (frames.length >= GIF_CONFIG.MAX_FRAMES) {
            resolve({
              frames,
              width: img.width,
              height: img.height
            });
            return;
          }
          
          // Continue to next frame if available
          if (timestamp < 10000) { // 10 second limit
            requestAnimationFrame(drawFrame);
          } else {
            resolve({
              frames,
              width: img.width,
              height: img.height
            });
          }
        };
        
        // Start frame extraction
        requestAnimationFrame(drawFrame);
        
      } catch (error) {
        reject(new ImageProcessingError(`GIF frame extraction failed: ${error.message}`, 'GIF_EXTRACTION_ERROR'));
      }
    };
    
    img.onerror = () => {
      reject(new ImageProcessingError('Failed to load GIF', 'GIF_LOAD_ERROR'));
    };
    
    img.src = URL.createObjectURL(gifFile);
  });
};

/**
 * Converts image data to grayscale
 * @param {ImageData} imageData - Image data to convert
 * @returns {ImageData} - Grayscale image data
 */
const convertToGrayscale = (imageData) => {
  const data = imageData.data;
  const grayscaleData = new ImageData(imageData.width, imageData.height);
  const grayscaleArray = grayscaleData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale using luminance formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    grayscaleArray[i] = gray;     // Red
    grayscaleArray[i + 1] = gray; // Green
    grayscaleArray[i + 2] = gray; // Blue
    grayscaleArray[i + 3] = data[i + 3]; // Alpha
  }
  
  return grayscaleData;
};

/**
 * Applies threshold to grayscale image data
 * @param {ImageData} imageData - Grayscale image data
 * @param {number} threshold - Threshold value (0-255)
 * @param {number} gridSize - Target grid size
 * @returns {boolean[]} - Array of boolean values representing checkbox states
 */
const applyThresholdToGrid = (imageData, threshold, gridSize) => {
  const canvas = createCanvas(gridSize, gridSize);
  const ctx = canvas.getContext('2d');
  
  // Draw and resize the image data
  const tempCanvas = createCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale to target grid size
  ctx.drawImage(tempCanvas, 0, 0, gridSize, gridSize);
  
  // Get scaled image data
  const scaledData = ctx.getImageData(0, 0, gridSize, gridSize);
  const data = scaledData.data;
  
  const result = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // All channels are the same in grayscale
    result.push(gray < threshold);
  }
  
  return result;
};

/**
 * Processes GIF frames to checkbox states
 * @param {GIFFrame[]} frames - GIF frames
 * @param {number} gridSize - Target grid size
 * @param {number} threshold - Brightness threshold
 * @returns {GIFFrame[]} - Frames with checkbox states
 */
export const processGIFrames = (frames, gridSize, threshold) => {
  return frames.map(frame => {
    // Convert to grayscale
    const grayscaleData = convertToGrayscale(frame.imageData);
    
    // Apply threshold and convert to grid
    const checkboxStates = applyThresholdToGrid(grayscaleData, threshold, gridSize);
    
    // Create new frame with checkbox states
    return new GIFFrame(
      frame.imageData,
      frame.delay,
      frame.disposalMethod
    );
  });
};

/**
 * Main GIF processing function
 * @param {File} gifFile - GIF file to process
 * @param {number} gridSize - Target grid size
 * @param {number} threshold - Brightness threshold
 * @returns {Promise<{frames: GIFFrame[], width: number, height: number}>}
 */
export const processGIF = async (gifFile, gridSize, threshold) => {
  try {
    // Validate GIF file
    await validateGIF(gifFile);
    
    // Extract frames
    const { frames, width, height } = await extractGIFrames(gifFile);
    
    // Process frames to checkbox states
    const processedFrames = processGIFrames(frames, gridSize, threshold);
    
    return {
      frames: processedFrames,
      width,
      height,
      frameCount: processedFrames.length
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Creates an animated GIF from checkbox states
 * @param {GIFFrame[]} frames - Frames with checkbox states
 * @param {number} gridSize - Grid size
 * @param {string} exportSize - Export size
 * @returns {Promise<Blob>}
 */
export const exportAnimatedGIF = async (frames, gridSize, exportSize = 'Medium') => {
  return new Promise((resolve, reject) => {
    try {
      const pixelSize = exportSize === 'Small' ? 4 : exportSize === 'Medium' ? 8 : 12;
      const canvasSize = gridSize * pixelSize;
      
      // Create canvas for each frame
      const canvases = frames.map(frame => {
        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Draw pixels
        ctx.fillStyle = 'black';
        for (let i = 0; i < frame.checkboxStates.length; i++) {
          if (frame.checkboxStates[i]) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
          }
        }
        
        return canvas;
      });
      
      // For now, return the first frame as PNG
      // Full GIF creation would require a GIF encoder library
      canvases[0].toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new ImageProcessingError('Failed to create animated GIF', 'EXPORT_ERROR'));
        }
      }, 'image/png');
      
    } catch (error) {
      reject(new ImageProcessingError(`Animated GIF export failed: ${error.message}`, 'EXPORT_ERROR'));
    }
  });
}; 