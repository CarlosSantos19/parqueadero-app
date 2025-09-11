const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');
const { upload, processImages, cleanupTempFiles } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

// License plate OCR processing
router.post('/plate', 
  authenticateToken,
  upload.single('image'),
  processImages,
  cleanupTempFiles,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
      }

      const imagePath = req.file.path;
      req.tempFiles = [imagePath]; // Mark for cleanup

      // OCR Configuration optimized for license plates
      const ocrOptions = {
        lang: process.env.TESSERACT_LANG || 'eng',
        oem: 1,
        psm: parseInt(process.env.TESSERACT_PSM) || 8, // Single uniform block of text
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      };

      console.log('Starting OCR processing for license plate...');
      
      const { data: { text, confidence } } = await Tesseract.recognize(
        imagePath,
        ocrOptions.lang,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      console.log('Raw OCR text:', text);
      console.log('OCR confidence:', confidence);

      // Clean and process the recognized text
      let cleanedText = text
        .replace(/\s/g, '') // Remove all whitespace
        .replace(/[^A-Z0-9]/g, '') // Keep only alphanumeric
        .toUpperCase();

      console.log('Cleaned text:', cleanedText);

      // Colombian license plate patterns
      const platePatterns = [
        /^[A-Z]{3}[0-9]{3}$/, // Standard format: ABC123
        /^[A-Z]{3}[0-9]{2}[A-Z]$/, // New format: ABC12D
        /^[A-Z]{2}[0-9]{4}$/, // Motorcycle: AB1234
        /^[0-9]{3}[A-Z]{3}$/, // Reverse: 123ABC
      ];

      let detectedPlate = null;
      let patternMatch = false;

      // First, try to find exact pattern matches
      for (const pattern of platePatterns) {
        if (pattern.test(cleanedText)) {
          detectedPlate = cleanedText;
          patternMatch = true;
          break;
        }
      }

      // If no exact match, try to extract potential plates
      if (!detectedPlate && cleanedText.length >= 6) {
        // Try different substring combinations
        const substrings = [];
        
        for (let i = 0; i <= cleanedText.length - 6; i++) {
          substrings.push(cleanedText.substring(i, i + 6));
          if (i <= cleanedText.length - 7) {
            substrings.push(cleanedText.substring(i, i + 7));
          }
        }

        for (const substring of substrings) {
          for (const pattern of platePatterns) {
            if (pattern.test(substring)) {
              detectedPlate = substring;
              break;
            }
          }
          if (detectedPlate) break;
        }
      }

      // Fallback: if still no match but we have reasonable text
      if (!detectedPlate && cleanedText.length === 6) {
        detectedPlate = cleanedText;
      }

      // Calculate confidence score
      let finalConfidence = confidence;
      
      if (patternMatch) {
        finalConfidence = Math.max(confidence, 75); // Boost confidence for pattern matches
      } else if (detectedPlate && detectedPlate.length >= 6) {
        finalConfidence = Math.max(confidence * 0.8, 50); // Moderate confidence
      } else {
        finalConfidence = Math.min(confidence, 40); // Lower confidence
      }

      const result = {
        success: !!detectedPlate,
        plate: detectedPlate,
        confidence: Math.round(finalConfidence),
        rawText: text.trim(),
        cleanedText: cleanedText,
        patternMatch: patternMatch,
        processingTime: Date.now()
      };

      if (result.success) {
        console.log(`✅ License plate detected: ${detectedPlate} (${finalConfidence}% confidence)`);
      } else {
        console.log(`❌ No valid license plate pattern found in: ${cleanedText}`);
      }

      res.json(result);

    } catch (error) {
      console.error('OCR processing error:', error);
      res.status(500).json({
        success: false,
        message: 'OCR processing failed',
        error: error.message
      });
    }
  }
);

// Batch OCR processing for multiple images
router.post('/batch',
  authenticateToken,
  upload.array('images', 10),
  processImages,
  cleanupTempFiles,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one image file is required'
        });
      }

      req.tempFiles = req.files.map(file => file.path);
      
      const results = [];
      
      for (const file of req.files) {
        try {
          const { data: { text, confidence } } = await Tesseract.recognize(
            file.path,
            process.env.TESSERACT_LANG || 'eng'
          );
          
          let cleanedText = text
            .replace(/\s/g, '')
            .replace(/[^A-Z0-9]/g, '')
            .toUpperCase();

          results.push({
            filename: file.originalname,
            success: true,
            text: cleanedText,
            confidence: Math.round(confidence),
            rawText: text.trim()
          });
          
        } catch (ocrError) {
          results.push({
            filename: file.originalname,
            success: false,
            error: ocrError.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Processed ${results.length} images`,
        results: results
      });
      
    } catch (error) {
      console.error('Batch OCR error:', error);
      res.status(500).json({
        success: false,
        message: 'Batch OCR processing failed',
        error: error.message
      });
    }
  }
);

// OCR health check
router.get('/health', async (req, res) => {
  try {
    // Test OCR with a simple synthetic image
    const testResult = await Tesseract.recognize(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'eng'
    );
    
    res.json({
      success: true,
      message: 'OCR service is healthy',
      tesseractVersion: '4.x',
      supportedLanguages: ['eng', 'spa'],
      testConfidence: testResult.data.confidence
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OCR service health check failed',
      error: error.message
    });
  }
});

module.exports = router;