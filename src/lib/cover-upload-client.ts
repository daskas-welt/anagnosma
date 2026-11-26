'use client';

import { upload } from '@vercel/blob/client';
import { MAX_COVER_SIZE_BYTES } from '@/lib/cover-upload-constants';

export async function uploadCoverFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  if (file.size > MAX_COVER_SIZE_BYTES) {
    throw new Error('Image must be 8 MB or smaller');
  }

  return upload(`covers/${crypto.randomUUID()}`, file, {
    access: 'public',
    contentType: file.type,
    handleUploadUrl: '/api/upload',
  });
}
