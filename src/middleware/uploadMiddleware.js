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
 * Flexible middleware that accepts any single image uploaded under common field names:
 * 'image', 'featuredImage', 'coverImage', 'file', 'media'
 */
export const uploadSingleImage = (req, res, next) => {
  const uploader = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'featuredImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'media', maxCount: 1 },
  ]);

  uploader(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
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

    if (req.files) {
      const extractedFile =
        req.files.image?.[0] ||
        req.files.featuredImage?.[0] ||
        req.files.coverImage?.[0] ||
        req.files.file?.[0] ||
        req.files.media?.[0] ||
        (Array.isArray(req.files) ? req.files[0] : null);

      if (extractedFile) {
        req.file = extractedFile;
      }
    }

    next();
  });
};

export default upload;
