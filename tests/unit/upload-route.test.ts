import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleUploadMock, requireUserIdMock } = vi.hoisted(() => ({
  handleUploadMock: vi.fn(),
  requireUserIdMock: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({ put: vi.fn() }));
vi.mock('@vercel/blob/client', () => ({
  handleUpload: handleUploadMock,
}));
vi.mock('@/lib/auth-helpers', () => ({
  requireUserId: requireUserIdMock,
}));

import { POST } from '@/app/api/upload/route';

const pathname = 'covers/123e4567-e89b-12d3-a456-426614174000';

function request(body: unknown) {
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Blob cover upload route', () => {
  beforeEach(() => {
    handleUploadMock.mockReset();
    requireUserIdMock.mockReset();
    requireUserIdMock.mockResolvedValue({ userId: 'user_test_a' });
    handleUploadMock.mockImplementation(async (options) => {
      if (options.body.type === 'blob.generate-client-token') {
        await options.onBeforeGenerateToken(
          options.body.payload.pathname,
          options.body.payload.clientPayload,
          options.body.payload.multipart,
        );
        return { type: 'blob.generate-client-token', clientToken: 'token' };
      }
      return { type: 'blob.upload-completed', response: 'ok' };
    });
  });

  it('requires a signed-in user and issues an 8 MB image-only upload token', async () => {
    let tokenOptions: Record<string, unknown> | undefined;
    handleUploadMock.mockImplementation(async (options) => {
      tokenOptions = await options.onBeforeGenerateToken(pathname, null, false);
      return { type: 'blob.generate-client-token', clientToken: 'token' };
    });

    const response = await POST(
      request({
        type: 'blob.generate-client-token',
        payload: { pathname, multipart: false, clientPayload: null },
      }),
    );

    expect(response.status).toBe(200);
    expect(tokenOptions).toMatchObject({
      allowedContentTypes: ['image/*'],
      maximumSizeInBytes: 8 * 1024 * 1024,
    });
  });

  it('rejects token generation for an unauthenticated request', async () => {
    requireUserIdMock.mockResolvedValueOnce({
      error: new Response('unauthorized', { status: 401 }),
    });

    const response = await POST(
      request({
        type: 'blob.generate-client-token',
        payload: { pathname, multipart: false, clientPayload: null },
      }),
    );

    expect(response.status).toBe(401);
    expect(handleUploadMock).not.toHaveBeenCalled();
  });

  it('rejects client-selected paths outside the covers directory', async () => {
    handleUploadMock.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken(
        'avatars/123e4567-e89b-12d3-a456-426614174000',
        null,
        false,
      );
      return { type: 'blob.generate-client-token', clientToken: 'token' };
    });

    const response = await POST(
      request({
        type: 'blob.generate-client-token',
        payload: {
          pathname: 'avatars/123e4567-e89b-12d3-a456-426614174000',
          multipart: false,
          clientPayload: null,
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid cover path' });
  });

  it('routes Blob completion callbacks through signature verification without Clerk auth', async () => {
    requireUserIdMock.mockResolvedValue({
      error: new Response('unauthorized', { status: 401 }),
    });

    const response = await POST(
      request({
        type: 'blob.upload-completed',
        payload: {
          blob: { url: 'https://blob.example/cover', pathname },
          tokenPayload: null,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(requireUserIdMock).not.toHaveBeenCalled();
  });
});
