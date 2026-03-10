import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

/**
 * Compresses an image file before uploading.
 * Targets ~300KB for regular images, ~100KB for avatars.
 */
export async function compressImage(file: File, preset: 'avatar' | 'post' | 'memory' | 'proof' = 'post'): Promise<File> {
  // Only compress image files
  if (!file.type.startsWith('image/')) return file;

  const presetOptions: Record<string, CompressOptions> = {
    avatar: { maxSizeMB: 0.15, maxWidthOrHeight: 400 },
    post:   { maxSizeMB: 0.5,  maxWidthOrHeight: 1200 },
    memory: { maxSizeMB: 0.6,  maxWidthOrHeight: 1600 },
    proof:  { maxSizeMB: 0.8,  maxWidthOrHeight: 1800 },
  };

  const opts = presetOptions[preset];

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.82,
    });
    return compressed;
  } catch {
    // If compression fails, return original
    return file;
  }
}

/**
 * Compresses multiple images in parallel
 */
export async function compressImages(files: File[], preset: 'avatar' | 'post' | 'memory' | 'proof' = 'post'): Promise<File[]> {
  return Promise.all(files.map(f => compressImage(f, preset)));
}

/**
 * Validate file size limits
 */
export function validateFileSize(file: File, maxMB: number): boolean {
  return file.size <= maxMB * 1024 * 1024;
}
