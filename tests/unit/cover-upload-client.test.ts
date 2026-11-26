import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
}));

vi.mock('@vercel/blob/client', () => ({ upload: uploadMock }));

import { uploadCoverFile } from '@/lib/cover-upload-client';
import { MAX_COVER_SIZE_BYTES } from '@/lib/cover-upload-constants';

describe('uploadCoverFile', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({
      url: 'https://blob.example/covers/cover',
    });
  });

  it('uploads a public cover through the client-upload token route', async () => {
    const file = {
      size: MAX_COVER_SIZE_BYTES,
      type: 'image/png',
    } as File;

    const result = await uploadCoverFile(file);

    expect(result.url).toBe('https://blob.example/covers/cover');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^covers\/[0-9a-f-]{36}$/),
      file,
      {
        access: 'public',
        contentType: 'image/png',
        handleUploadUrl: '/api/upload',
      },
    );
  });

  it('rejects files over 8 MB before requesting a Blob token', async () => {
    const file = {
      size: MAX_COVER_SIZE_BYTES + 1,
      type: 'image/png',
    } as File;

    await expect(uploadCoverFile(file)).rejects.toThrow(
      'Image must be 8 MB or smaller',
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
