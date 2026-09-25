export type JevErrorKind =
  | "config"
  | "http"
  | "timeout"
  | "network"
  | "invalid_response";

type JevErrorOptions = {
  kind: JevErrorKind;
  message: string;
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
};

// Every failure from the Jev client is thrown as this error.
// Our messages never include the key or the email text.
export class JevError extends Error {
  readonly kind: JevErrorKind;
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(options: JevErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "JevError";
    this.kind = options.kind;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isJevError(error: unknown): error is JevError {
  return error instanceof JevError;
}
