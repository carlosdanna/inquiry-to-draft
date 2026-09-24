export type ProposalesErrorKind =
  | "config"
  | "http"
  | "timeout"
  | "network"
  | "invalid_response";

export type ProposalesIssue = {
  code: string;
  path: (string | number)[];
  message: string;
};

type ProposalesErrorOptions = {
  kind: ProposalesErrorKind;
  message: string;
  path: string;
  status?: number;
  issues?: ProposalesIssue[];
  retryAfterSeconds?: number;
  cause?: unknown;
};

// Every failure from the Proposales client is thrown as this error.
// The message is safe to show to users: Proposales designs its own
// error messages that way, and our own messages never include secrets.
export class ProposalesError extends Error {
  readonly kind: ProposalesErrorKind;
  readonly path: string;
  readonly status?: number;
  readonly issues?: ProposalesIssue[];
  readonly retryAfterSeconds?: number;

  constructor(options: ProposalesErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ProposalesError";
    this.kind = options.kind;
    this.path = options.path;
    this.status = options.status;
    this.issues = options.issues;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isProposalesError(error: unknown): error is ProposalesError {
  return error instanceof ProposalesError;
}
