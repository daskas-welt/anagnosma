import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireUserId } from '@/lib/auth-helpers';
import {
  ALLOWED_COVER_CONTENT_TYPES,
  MAX_COVER_SIZE_BYTES,
} from '@/lib/cover-upload-constants';

const COVER_PATH_PATTERN = /^covers\/[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('type' in body)) {
    return NextResponse.json(
      { error: 'invalid upload request' },
      { status: 400 },
    );
  }

  // This endpoint is public at the proxy layer so Vercel Blob can deliver its
  // signed completion callback. Token generation still requires a Clerk user;
  // handleUpload verifies the signature on completion callbacks.
  if (body.type === 'blob.generate-client-token') {
    const { error: authError } = await requireUserId();
    if (authError) return authError;
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!COVER_PATH_PATTERN.test(pathname)) {
          throw new Error('invalid cover path');
        }
        return {
          allowedContentTypes: ALLOWED_COVER_CONTENT_TYPES,
          maximumSizeInBytes: MAX_COVER_SIZE_BYTES,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'could not process upload',
      },
      { status: 400 },
    );
  }
}
