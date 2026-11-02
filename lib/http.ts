import { NextResponse } from "next/server";

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: { message } }, { status });

/** True when the error came from MongoDB/Mongoose connectivity (cluster down, IP not whitelisted, timeout). */
export function isDatabaseError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Mongo/i.test(name) || /mongo|buffering timed out|topology was destroyed/i.test(message);
}

/**
 * Wrap a route handler so an unreachable database returns a clean JSON 503
 * instead of escaping as an unhandled error (raw 500 + server log noise).
 * Unexpected non-database errors stay a 500.
 */
export function withDatabase<Args extends unknown[]>(handler: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (isDatabaseError(error)) {
        return fail("Our database is temporarily unavailable. Please try again shortly.", 503);
      }
      return fail("Something went wrong on our side. Please try again.", 500);
    }
  };
}
