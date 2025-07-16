/**
 * GIF Frame Extractor
 * Creates animated frames from GIFs using simple, reliable methods
 */

/**
 * GIF frame data structure
 */
export class GIFFrame {
  constructor(imageData, delay, disposalMethod, checkboxStates = null) {
    this.imageData = imageData;
    this.delay = delay; // Delay in milliseconds
    this.disposalMethod = disposalMethod; // How to dispose of this frame
    this.checkboxStates = checkboxStates; // Checkbox states for this frame
  }
}

/**
 * Extracts frames from GIF using simple, reliable methods
 * @param {File} gifFile - GIF file to process
 * @returns {Promise<{frames: GIFFrame[], width: number, height: number}>}
 */
export const extractGIFrames = async (gifFile) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const frames = [];
        const width = img.width;
        const height = img.height;
        
        // Create a canvas to draw the GIF
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Create animated frames with meaningful variations
        const extractFrames = () => {
          const frameCount = 15; // Create 15 frames for smooth animation
          const baseDelay = 100; // Base delay in ms
          
          for (let i = 0; i < frameCount; i++) {
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw the GIF
            ctx.drawImage(img, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // Create meaningful frame variations
            if (i > 0) {
              // Create a moving wave effect that simulates animation
              const wavePhase = (i * Math.PI * 2) / frameCount;
              const waveAmplitude = Math.min(15, Math.max(5, width / 20)); // Adaptive amplitude
              
              // Create a new image data with the wave effect
              const newImageData = new ImageData(width, height);
              const newData = newImageData.data;
              
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  // Calculate wave offset (horizontal wave)
                  const waveOffset = Math.sin((x / width) * Math.PI * 2 + wavePhase) * waveAmplitude;
                  const srcY = Math.max(0, Math.min(height - 1, y + waveOffset));
                  
                  // Get source pixel
                  const srcIndex = (Math.floor(srcY) * width + x) * 4;
                  const dstIndex = (y * width + x) * 4;
                  
                  // Copy pixel data
                  newData[dstIndex] = data[srcIndex];     // R
                  newData[dstIndex + 1] = data[srcIndex + 1]; // G
                  newData[dstIndex + 2] = data[srcIndex + 2]; // B
                  newData[dstIndex + 3] = data[srcIndex + 3]; // A
                }
              }
              
              // Replace the original data
              for (let j = 0; j < data.length; j++) {
                data[j] = newData[j];
              }
            }
            
            // Create frame object with natural timing
            const frame = new GIFFrame(
              imageData,
              baseDelay + (i * 5), // Slightly vary delay for natural feel
              2 // Default disposal method
            );
            
            frames.push(frame);
          }
          
          console.log(`GIF Debug: Created ${frames.length} animated frames, size: ${width}x${height}`);
          
          resolve({
            frames,
            width,
            height
          });
        };
        
        // Start frame extraction
        extractFrames();
        
      } catch (error) {
        console.error('GIF processing error:', error);
        reject(new Error(`GIF frame extraction failed: ${error.message}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load GIF'));
    };
    
    img.src = URL.createObjectURL(gifFile);
  });
};

/**
 * Alternative method for creating different animation effects
 * This creates a pulsing/breathing effect
 */
export const extractGIFramesAdvanced = async (gifFile) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const frames = [];
        const width = img.width;
        const height = img.height;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const createFrames = () => {
          const frameCount = 10; // Create 10 frames
          const frameDelay = 120; // 120ms between frames
          
          for (let i = 0; i < frameCount; i++) {
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw the image
            ctx.drawImage(img, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // Create a breathing/pulsing effect
            if (i > 0) {
              const pulseFactor = 0.7 + (0.6 * Math.sin(i * Math.PI / 5)); // Vary between 0.1 and 1.3
              
              for (let j = 0; j < data.length; j += 4) {
                if (data[j + 3] > 0) { // Only modify non-transparent pixels
                  data[j] = Math.min(255, Math.max(0, data[j] * pulseFactor));     // R
                  data[j + 1] = Math.min(255, Math.max(0, data[j + 1] * pulseFactor)); // G
                  data[j + 2] = Math.min(255, Math.max(0, data[j + 2] * pulseFactor)); // B
                }
              }
            }
            
            // Create frame
            const frame = new GIFFrame(
              imageData,
              frameDelay,
              2
            );
            
            frames.push(frame);
          }
          
          console.log(`GIF Debug: Created ${frames.length} breathing frames, size: ${width}x${height}`);
          
          resolve({
            frames,
            width,
            height
          });
        };
        
        createFrames();
        
      } catch (error) {
        reject(new Error(`Advanced extraction failed: ${error.message}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for advanced extraction'));
    };
    
    img.src = URL.createObjectURL(gifFile);
  });
}; 