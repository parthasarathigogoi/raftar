import { NextResponse } from "next/server";

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: { message } }, { status });

/** True when the error came from MongoDB/Mongoose connectivity (cluster down, IP not whitelisted, timeout). */
export function isDatabaseError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Mongo/i.test(name) || /mongo|buffering timed out|topology was destroyed/i.test(message);
}

/** Missing server configuration — a deployment fault, never a transient outage. */
function isConfigurationError(error: unknown) {
  return error instanceof Error && error.name === "ConfigurationError";
}

/** Strip credentials from anything before it reaches the logs. */
function redact(value: string) {
  return value.replace(/mongodb(\+srv)?:\/\/[^@\s]*@/gi, "mongodb$1://***@");
}

/**
 * Wrap a route handler so an unreachable database returns a clean JSON 503
 * instead of escaping as an unhandled error (raw 500 + server log noise).
 * Missing configuration is reported as an explicit 500 so the operator can fix
 * it, rather than being disguised as a transient outage.
 */
export function withDatabase<Args extends unknown[]>(handler: (...args: Args) => Promise<Response> | Response) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const detail = redact(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      if (isConfigurationError(error)) {
        const message = error instanceof Error ? error.message : "server configuration is incomplete.";
        console.error(`[raftar] missing server configuration — ${detail}`);
        return fail(`Server configuration error: ${message}`, 500);
      }
      if (isDatabaseError(error)) {
        console.error(`[raftar] database unavailable — ${detail}`);
        return fail("Our database is temporarily unavailable. Please try again shortly.", 503);
      }
      console.error(`[raftar] unhandled API error — ${detail}`);
      return fail("Something went wrong on our side. Please try again.", 500);
    }
  };
}
