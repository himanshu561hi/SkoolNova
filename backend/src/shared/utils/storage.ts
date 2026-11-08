import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { v2 as cloudinary } from 'cloudinary';
import ImageKit from 'imagekit';
import { env } from '../../config/env.js';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Cloudinary if credentials are provided
const hasCloudinary = Boolean(
  env.CLOUDINARY_URL ||
  (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
);

if (hasCloudinary) {
  if (env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: env.CLOUDINARY_URL,
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

// Initialize ImageKit if credentials are provided
const hasImageKit = Boolean(
  env.IMAGEKIT_PUBLIC_KEY &&
  env.IMAGEKIT_PRIVATE_KEY &&
  env.IMAGEKIT_URL_ENDPOINT
);

let imagekitClient: ImageKit | null = null;
if (hasImageKit) {
  imagekitClient = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT!,
  });
}

/**
 * Helper to convert stream to Buffer for ImageKit
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Upload file to Cloudinary
 */
async function uploadToCloudinary(fileStream: NodeJS.ReadableStream, originalFilename: string) {
  const ext = path.extname(originalFilename);
  const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `digischool/${Date.now()}_${safeBase}`;

  return new Promise<{ filename: string; originalFilename: string; fileUrl: string; provider: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'auto', // supports images, pdfs, documents
          folder: 'digischool_uploads',
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload returned empty response'));
          }
          resolve({
            filename: result.public_id,
            originalFilename,
            fileUrl: result.secure_url,
            provider: 'cloudinary',
          });
        }
      );

      fileStream.pipe(uploadStream);
    }
  );
}

/**
 * Upload file to ImageKit
 */
async function uploadToImageKit(fileStream: NodeJS.ReadableStream, originalFilename: string) {
  if (!imagekitClient) {
    throw new Error('ImageKit client not initialized');
  }

  const buffer = await streamToBuffer(fileStream);
  const result = await imagekitClient.upload({
    file: buffer,
    fileName: originalFilename,
    folder: '/digischool_uploads',
    useUniqueFileName: true,
  });

  return {
    filename: result.fileId,
    originalFilename,
    fileUrl: result.url,
    provider: 'imagekit',
  };
}

/**
 * Fallback: Upload file to local disk
 */
async function uploadToLocal(fileStream: NodeJS.ReadableStream, originalFilename: string) {
  const ext = path.extname(originalFilename);
  const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${ext}`;
  const targetPath = path.join(uploadDir, uniqueName);

  await pipeline(fileStream, fs.createWriteStream(targetPath));

  return {
    filename: uniqueName,
    originalFilename,
    fileUrl: `/api/v1/uploads/${uniqueName}`,
    provider: 'local',
  };
}

/**
 * Unified saveUploadedFile dispatcher:
 * Automatically uses ImageKit or Cloudinary when configured,
 * otherwise falls back gracefully to local disk storage.
 */
export async function saveUploadedFile(fileStream: NodeJS.ReadableStream, originalFilename: string) {
  // If ImageKit explicitly selected or configured
  if (env.STORAGE_PROVIDER === 'imagekit' && hasImageKit) {
    return uploadToImageKit(fileStream, originalFilename);
  }

  // If Cloudinary explicitly selected or configured
  if (hasCloudinary) {
    return uploadToCloudinary(fileStream, originalFilename);
  }

  // If ImageKit available without Cloudinary
  if (hasImageKit) {
    return uploadToImageKit(fileStream, originalFilename);
  }

  // Fallback to local storage (e.g. offline dev / testing)
  return uploadToLocal(fileStream, originalFilename);
}

export function getUploadFilePath(filename: string): string | null {
  const safeFilename = path.basename(filename);
  const filePath = path.join(uploadDir, safeFilename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
