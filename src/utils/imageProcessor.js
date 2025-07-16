/**
 * Advanced Image Processing Utility
 * Handles canvas-based image processing with proper error handling and async operations
 */

export class ImageProcessingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ImageProcessingError';
    this.code = code;
  }
}

/**
 * Image processing configuration
 */
const PROCESSING_CONFIG = {
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_DIMENSION: 10,
  MAX_DIMENSION: 1000,
  DEFAULT_THRESHOLD: 128,
  GRAYSCALE_WEIGHTS: {
    red: 0.299,
    green: 0.587,
    blue: 0.114
  }
};

/**
 * Validates image file before processing
 * @param {File} file - Image file to validate
 * @returns {Promise<void>}
 */
export const validateImageFile = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new ImageProcessingError('No file provided', 'NO_FILE'));
      return;
    }

    if (!PROCESSING_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
      reject(new ImageProcessingError(
        `Unsupported file format: ${file.type}. Supported formats: ${PROCESSING_CONFIG.SUPPORTED_FORMATS.join(', ')}`,
        'UNSUPPORTED_FORMAT'
      ));
      return;
    }

    if (file.size > PROCESSING_CONFIG.MAX_FILE_SIZE) {
      reject(new ImageProcessingError(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${(PROCESSING_CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
        'FILE_TOO_LARGE'
      ));
      return;
    }

    resolve();
  });
};

/**
 * Loads image from file with error handling
 * @param {File} file - Image file to load
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Validate image dimensions
      if (img.width < PROCESSING_CONFIG.MIN_DIMENSION || img.height < PROCESSING_CONFIG.MIN_DIMENSION) {
        reject(new ImageProcessingError(
          `Image too small: ${img.width}x${img.height}. Minimum size: ${PROCESSING_CONFIG.MIN_DIMENSION}x${PROCESSING_CONFIG.MIN_DIMENSION}`,
          'IMAGE_TOO_SMALL'
        ));
        return;
      }

      if (img.width > PROCESSING_CONFIG.MAX_DIMENSION || img.height > PROCESSING_CONFIG.MAX_DIMENSION) {
        reject(new ImageProcessingError(
          `Image too large: ${img.width}x${img.height}. Maximum size: ${PROCESSING_CONFIG.MAX_DIMENSION}x${PROCESSING_CONFIG.MAX_DIMENSION}`,
          'IMAGE_TOO_LARGE'
        ));
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      reject(new ImageProcessingError('Failed to load image', 'LOAD_ERROR'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Creates a canvas with specified dimensions
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement}
 */
export const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/**
 * Creates a canvas context optimized for frequent image data reading
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {CanvasRenderingContext2D}
 */
export const createOptimizedContext = (canvas) => {
  return canvas.getContext('2d', { willReadFrequently: true });
};

/**
 * Converts image to grayscale using canvas
 * @param {HTMLImageElement} img - Source image
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @returns {Promise<ImageData>}
 */
export const convertToGrayscale = (img, targetWidth, targetHeight) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = createOptimizedContext(canvas);

      // Clear canvas
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // Draw and resize image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Get image data
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;

      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Apply grayscale conversion using luminance formula
        const gray = Math.round(
          r * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.red +
          g * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.green +
          b * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.blue
        );

        data[i] = gray;     // Red
        data[i + 1] = gray; // Green
        data[i + 2] = gray; // Blue
        // Alpha channel remains unchanged
      }

      resolve(imageData);
    } catch (error) {
      reject(new ImageProcessingError(`Grayscale conversion failed: ${error.message}`, 'GRAYSCALE_ERROR'));
    }
  });
};

/**
 * Converts ImageData to grayscale (for use with existing ImageData)
 * @param {ImageData} imageData - Image data to convert
 * @returns {ImageData} - Grayscale image data
 */
export const convertImageDataToGrayscale = (imageData) => {
  const data = imageData.data;
  const grayscaleData = new ImageData(imageData.width, imageData.height);
  const grayscaleArray = grayscaleData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale using luminance formula
    const gray = Math.round(
      r * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.red +
      g * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.green +
      b * PROCESSING_CONFIG.GRAYSCALE_WEIGHTS.blue
    );
    
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
 * @returns {boolean[]} - Array of boolean values representing checkbox states
 */
export const applyThreshold = (imageData, threshold, gridSize) => {
  try {
    const canvas = createCanvas(gridSize, gridSize);
    const ctx = createOptimizedContext(canvas);
    
    // Draw and resize the image data
    const tempCanvas = createCanvas(imageData.width, imageData.height);
    const tempCtx = createOptimizedContext(tempCanvas);
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
  } catch (error) {
    throw new ImageProcessingError(`Threshold application failed: ${error.message}`, 'THRESHOLD_ERROR');
  }
};

/**
 * Calculates optimal threshold using Otsu's method
 * @param {ImageData} imageData - Grayscale image data
 * @returns {number} - Optimal threshold value
 */
export const calculateOtsuThreshold = (imageData) => {
  try {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);

    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      histogram[gray]++;
    }

    const total = histogram.reduce((sum, count) => sum + count, 0);
    let sum = 0;
    
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = PROCESSING_CONFIG.DEFAULT_THRESHOLD;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;

      wF = total - wB;
      if (wF === 0) break;

      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }

    return threshold;
  } catch (error) {
    throw new ImageProcessingError(`Otsu threshold calculation failed: ${error.message}`, 'OTSU_ERROR');
  }
};

/**
 * Main image processing function
 * @param {File} file - Image file to process
 * @param {number} gridSize - Target grid size
 * @param {number} threshold - Brightness threshold
 * @returns {Promise<{checkboxStates: boolean[], threshold: number, imageData: ImageData}>}
 */
export const processImage = async (file, gridSize, threshold = null) => {
  try {
    // Validate file
    await validateImageFile(file);

    // Load image
    const img = await loadImage(file);

    // Convert to grayscale
    const grayscaleData = await convertToGrayscale(img, gridSize, gridSize);

    // Calculate threshold if not provided
    let finalThreshold = threshold;
    if (finalThreshold === null) {
      finalThreshold = calculateOtsuThreshold(grayscaleData);
    }

    // Apply threshold
    const checkboxStates = applyThreshold(grayscaleData, finalThreshold, gridSize);

    return {
      checkboxStates,
      threshold: finalThreshold,
      imageData: grayscaleData
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a preview canvas for debugging
 * @param {ImageData} imageData - Image data to preview
 * @param {number} scale - Scale factor for preview
 * @returns {HTMLCanvasElement}
 */
export const createPreviewCanvas = (imageData, scale = 1) => {
  const canvas = createCanvas(imageData.width * scale, imageData.height * scale);
  const ctx = canvas.getContext('2d');
  
  // Create a temporary canvas to handle the scaling
  const tempCanvas = createCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  // Scale the image
  ctx.imageSmoothingEnabled = false; // For pixel art effect
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  
  return canvas;
};

/**
 * Exports checkbox pattern as image
 * @param {boolean[]} checkboxStates - Checkbox states
 * @param {number} gridSize - Grid size
 * @param {string} exportSize - Export size ('Small', 'Medium', 'Large')
 * @returns {Promise<Blob>}
 */
export const exportAsImage = async (checkboxStates, gridSize, exportSize = 'Medium') => {
  return new Promise((resolve, reject) => {
    try {
      const pixelSize = exportSize === 'Small' ? 4 : exportSize === 'Medium' ? 8 : 12;
      const canvas = createCanvas(gridSize * pixelSize, gridSize * pixelSize);
      const ctx = createOptimizedContext(canvas);

      // Fill background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw pixels
      ctx.fillStyle = 'black';
      for (let i = 0; i < checkboxStates.length; i++) {
        if (checkboxStates[i]) {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        }
      }

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new ImageProcessingError('Failed to create image blob', 'EXPORT_ERROR'));
        }
      }, 'image/png');
    } catch (error) {
      reject(new ImageProcessingError(`Image export failed: ${error.message}`, 'EXPORT_ERROR'));
    }
  });
};

/**
 * Exports checkbox pattern as text
 * @param {boolean[]} checkboxStates - Checkbox states
 * @param {number} gridSize - Grid size
 * @returns {string} - Text pattern
 */
export const exportAsText = (checkboxStates, gridSize) => {
  try {
    let pattern = '';
    for (let i = 0; i < checkboxStates.length; i++) {
      pattern += checkboxStates[i] ? '☒' : '☐';
      if ((i + 1) % gridSize === 0) {
        pattern += '\n';
      }
    }
    return pattern;
  } catch (error) {
    throw new ImageProcessingError(`Text export failed: ${error.message}`, 'EXPORT_ERROR');
  }
};

/**
 * Error handler utility
 * @param {Error} error - Error to handle
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error instanceof ImageProcessingError) {
    return error.message;
  }
  
  // Handle common browser errors
  switch (error.name) {
    case 'QuotaExceededError':
      return 'File too large for processing. Please try a smaller image.';
    case 'SecurityError':
      return 'Security error: Cannot process this image.';
    default:
      return `Processing error: ${error.message}`;
  }
}; 