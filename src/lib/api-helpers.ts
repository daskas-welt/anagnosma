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

/**
 * True if `err` is a Postgres unique-violation error (SQLSTATE 23505). The
 * `postgres` package throws a `PostgresError` with a `.code` property, but
 * Drizzle wraps that in a `DrizzleQueryError` and re-exposes the original as
 * `.cause` rather than copying `.code` onto itself — so this checks both the
 * error and (one level of) its cause. Lets routes turn a constraint
 * collision into a clean 409 instead of an unhandled 500 that leaks the raw
 * Postgres error message to the caller.
 */
export function isUniqueViolation(err: unknown): boolean {
  const hasCode23505 = (e: unknown): boolean =>
    typeof e === 'object' && e !== null && 'code' in e && (e as { code?: unknown }).code === '23505';
  if (hasCode23505(err)) return true;
  const cause = err instanceof Error ? err.cause : undefined;
  return hasCode23505(cause);
}
