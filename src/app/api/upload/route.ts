import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — plenty for a book cover image

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json(
      { error: 'file must be an image' },
      { status: 400 },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'image is too large (max 8MB)' },
      { status: 400 },
    );
  }

  if (!request.body) {
    return NextResponse.json(
      { error: 'no file body received' },
      { status: 400 },
    );
  }

  const filenameHeader = request.headers.get('x-filename') ?? 'cover';
  const extension = filenameHeader.includes('.')
    ? filenameHeader.split('.').pop()
    : contentType.split('/')[1];
  const pathname = `covers/${crypto.randomUUID()}.${extension}`;

  const blob = await put(pathname, request.body, {
    access: 'public',
    contentType,
  });

  return NextResponse.json({ url: blob.url });
}
