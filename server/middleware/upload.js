const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Ensure upload directories exist
const ensureDirectories = async () => {
  const directories = [
    'uploads',
    'uploads/employees',
    'uploads/visitors', 
    'uploads/vehicles',
    'uploads/licenses',
    'uploads/temp'
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

// Initialize directories
ensureDirectories().catch(console.error);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/temp';
    
    // Determine upload path based on field name
    if (file.fieldname === 'photo') {
      uploadPath = 'uploads/employees';
    } else if (file.fieldname === 'licensePhoto') {
      uploadPath = 'uploads/licenses';
    } else if (file.fieldname === 'visitorPhoto') {
      uploadPath = 'uploads/visitors';
    } else if (file.fieldname === 'ownershipDocument') {
      uploadPath = 'uploads/vehicles';
    } else if (file.fieldname === 'image') {
      uploadPath = 'uploads/temp';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    photo: ['image/jpeg', 'image/jpg', 'image/png'],
    licensePhoto: ['image/jpeg', 'image/jpg', 'image/png'],
    visitorPhoto: ['image/jpeg', 'image/jpg', 'image/png'],
    ownershipDocument: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    image: ['image/jpeg', 'image/jpg', 'image/png']
  };

  const fieldAllowedTypes = allowedTypes[file.fieldname] || allowedTypes.image;
  
  if (fieldAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldAllowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 10
  },
  fileFilter: fileFilter
});

// Image processing middleware
const processImages = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  try {
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    for (const file of files) {
      if (file && file.mimetype.startsWith('image/')) {
        const { path: filepath, filename } = file;
        
        // Different processing based on image type
        if (file.fieldname === 'photo' || file.fieldname === 'visitorPhoto') {
          // Face photos - optimize for recognition
          await sharp(filepath)
            .resize(800, 800, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ 
              quality: 85,
              progressive: true 
            })
            .toFile(filepath.replace(path.extname(filepath), '_processed.jpg'));
            
          // Replace original with processed
          await fs.unlink(filepath);
          await fs.rename(
            filepath.replace(path.extname(filepath), '_processed.jpg'),
            filepath.replace(path.extname(filepath), '.jpg')
          );
          
          file.filename = filename.replace(path.extname(filename), '.jpg');
          file.path = filepath.replace(path.extname(filepath), '.jpg');
          
        } else if (file.fieldname === 'image') {
          // License plate images - optimize for OCR
          await sharp(filepath)
            .resize(1200, 800, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .sharpen()
            .normalize()
            .jpeg({ 
              quality: 90,
              progressive: true 
            })
            .toFile(filepath.replace(path.extname(filepath), '_processed.jpg'));
            
          // Replace original with processed
          await fs.unlink(filepath);
          await fs.rename(
            filepath.replace(path.extname(filepath), '_processed.jpg'),
            filepath.replace(path.extname(filepath), '.jpg')
          );
          
          file.filename = filename.replace(path.extname(filename), '.jpg');
          file.path = filepath.replace(path.extname(filepath), '.jpg');
          
        } else {
          // General documents - light compression
          await sharp(filepath)
            .resize(1600, 1200, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ 
              quality: 80,
              progressive: true 
            })
            .toFile(filepath.replace(path.extname(filepath), '_processed.jpg'));
            
          // Replace original with processed
          await fs.unlink(filepath);
          await fs.rename(
            filepath.replace(path.extname(filepath), '_processed.jpg'),
            filepath.replace(path.extname(filepath), '.jpg')
          );
          
          file.filename = filename.replace(path.extname(filename), '.jpg');
          file.path = filepath.replace(path.extname(filepath), '.jpg');
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(error);
  }
};

// Cleanup temporary files
const cleanupTempFiles = async (req, res, next) => {
  try {
    // This runs after response
    res.on('finish', async () => {
      if (req.tempFiles && req.tempFiles.length > 0) {
        for (const filepath of req.tempFiles) {
          try {
            await fs.unlink(filepath);
          } catch (error) {
            console.error('Cleanup error:', error);
          }
        }
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  processImages,
  cleanupTempFiles,
  ensureDirectories
};