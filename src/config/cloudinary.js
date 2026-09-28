import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image buffer directly to Cloudinary
 *
 * @param {Buffer} fileBuffer
 * @param {string} [folder='skylink/blogs']
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImageToCloudinary = (fileBuffer, folder = 'skylink/blogs') => {
  return new Promise((resolve, reject) => {
    // Re-verify config in case env loaded later
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete an image asset from Cloudinary by its public ID
 *
 * @param {string} publicId
 * @returns {Promise<Object|null>}
 */
export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`⚠️ Failed to delete Cloudinary image (${publicId}):`, error.message);
    return null;
  }
};

export default cloudinary;
