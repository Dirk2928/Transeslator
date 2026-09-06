// lib/client/compress.ts
'use client'; // ← Required for browser-only code

import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

/**
 * Compress files client-side BEFORE upload to stay under Vercel's 4.5MB limit.
 * Only processes images and PDFs; other formats pass through unchanged.
 */
export async function compressFile(file: File): Promise<File> {
  // Skip non-compressible formats
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    return file;
  }

  try {
    // IMAGES: Compress to <4MB while preserving OCR quality
    if (file.type.startsWith('image/')) {
      return await imageCompression(file, {
        maxSizeMB: 4,
        maxWidthOrHeight: 8192, // High-res for better OCR
        useWebWorker: true,
        initialQuality: 0.85,
        preserveExif: false
      });
    }

    // PDFs: Compress if >3.5MB (leave buffer under 4.5MB limit)
    if (file.type === 'application/pdf' && file.size > 3.5 * 1024 * 1024) {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      
      // Re-save with compression optimizations
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        objectsPerTick: 100,
        updateFieldAppearances: false
      });

      const fileBytes = new Uint8Array(compressedBytes.byteLength);
      fileBytes.set(compressedBytes);

      return new File([fileBytes.buffer], file.name, {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    }
  } catch (err) {
    console.warn('Compression failed, using original file:', err);
  }

  return file; // Fallback to original on error
}

/**
 * Compress multiple files in parallel (safe for browser)
 */
export async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressFile));
}