import { NextResponse } from 'next/server';

/**
 * Parses a request body as JSON, returning a clean 400 response instead of
 * letting a malformed-body error propagate into an unhandled 500.
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return { error: NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }) };
  }
}

/**
 * Parses a route param expected to be a numeric id. Returns null (instead of
 * NaN) for missing/non-numeric input so callers can respond with a clean 400.
 */
export function parseId(idParam: string): number | null {
  if (!/^-?\d+$/.test(idParam.trim())) return null;
  const id = Number(idParam);
  return Number.isNaN(id) ? null : id;
}
