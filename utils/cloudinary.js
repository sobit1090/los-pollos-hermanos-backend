import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer.memoryStorage()
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{public_id: string, url: string}>}
 */
export const uploadToCloudinary = (buffer, folder = "los-pollos") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          { quality: "auto", fetch_format: "auto" },
          { width: 800, crop: "limit" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ public_id: result.public_id, url: result.secure_url });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary
 * @param {string} publicId
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
