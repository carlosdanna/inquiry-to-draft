import "server-only";

import { isProposalesError } from "./errors";

// Turns an error from the Proposales client into a response for our own
// route handlers. Only the safe message is passed on to the browser.
export function proposalesErrorResponse(error: unknown): Response {
  if (!isProposalesError(error)) {
    console.error(error);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }

  console.error(`Proposales ${error.kind} error on ${error.path}:`, error.message);
  const status =
    error.kind === "config" ? 500 : error.kind === "timeout" ? 504 : 502;
  return Response.json({ error: error.message }, { status });
}
