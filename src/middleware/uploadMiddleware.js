import multer from 'multer';

// Use memory storage to process image buffer directly
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// File filter validation
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Invalid image format. Only JPG, JPEG, PNG, and WEBP images are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

// 10MB maximum file size limit
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

/**
 * Flexible middleware that accepts multiple images (up to 10) uploaded under common field names:
 * 'images', 'image', 'featuredImage', 'featuredImages', 'coverImage', 'files', 'file', 'media'
 */
export const uploadMultipleImages = (req, res, next) => {
  const uploader = upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'images', maxCount: 10 },
    { name: 'featuredImage', maxCount: 10 },
    { name: 'featuredImages', maxCount: 10 },
    { name: 'coverImage', maxCount: 10 },
    { name: 'file', maxCount: 10 },
    { name: 'files', maxCount: 10 },
    { name: 'media', maxCount: 10 },
  ]);

  uploader(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded. Maximum 10 images allowed per request.',
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }

    let extractedFiles = [];

    if (req.files) {
      if (Array.isArray(req.files)) {
        extractedFiles = req.files;
      } else {
        const fieldNames = [
          'image',
          'images',
          'featuredImage',
          'featuredImages',
          'coverImage',
          'file',
          'files',
          'media',
        ];
        for (const field of fieldNames) {
          if (Array.isArray(req.files[field])) {
            extractedFiles.push(...req.files[field]);
          }
        }
      }
    }

    if (req.file) {
      extractedFiles.push(req.file);
    }

    if (extractedFiles.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded. Maximum 10 images allowed per request.',
      });
    }

    req.files = extractedFiles;
    if (extractedFiles.length > 0) {
      req.file = extractedFiles[0]; // for single-file consumers
    }

    next();
  });
};

/**
 * Flexible middleware that accepts any single image uploaded under common field names:
 * 'image', 'featuredImage', 'coverImage', 'file', 'media'
 */
export const uploadSingleImage = uploadMultipleImages;

export default upload;
