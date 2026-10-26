/**
 * Canonical application error codes. Must match the OpenAPI
 * `error.code` enum in packages/contracts and server-side errors.
 *
 * Doc ref: docs/01-master-app-plan.md §8.2 Error envelope
 */
export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND_OR_NOT_VISIBLE: 'NOT_FOUND_OR_NOT_VISIBLE',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_REVOKED: 'INVITATION_REVOKED',
  INVITATION_EXHAUSTED: 'INVITATION_EXHAUSTED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  VERSION_SUPERSEDED: 'VERSION_SUPERSEDED',
  STATE_TRANSITION_INVALID: 'STATE_TRANSITION_INVALID',
  IDEMPOTENCY_REPLAY: 'IDEMPOTENCY_REPLAY',
  RATE_LIMITED: 'RATE_LIMITED',
  UPLOAD_REJECTED: 'UPLOAD_REJECTED',
  MEDIA_PENDING_SCAN: 'MEDIA_PENDING_SCAN',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_DISABLED: 'AI_DISABLED',
  SYNC_REQUIRED: 'SYNC_REQUIRED',
  PRIVACY_REQUEST_PENDING: 'PRIVACY_REQUEST_PENDING',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorPayload {
  code: ErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
  fields?: { path: string; code: string; message?: string }[];
  details?: Record<string, unknown>;
}

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly fields?: ApiErrorPayload['fields'],
    public readonly details?: ApiErrorPayload['details'],
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
