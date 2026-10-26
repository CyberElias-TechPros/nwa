/**
 * Shared client/server error mapping. Clients use this to map API responses
 * to user-facing messages; servers use it to serialize errors per docs/01 §8.2.
 *
 * A message is chosen here only as a last-resort fallback; UI layers should
 * have locale-specific copy. Never expose stack traces or upstream vendor text.
 */
import { ApiErrorPayload, DomainError, ErrorCode } from '@nwa/domain';

export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'You need to sign in to see this.',
  FORBIDDEN: "You can't do that on this plan.",
  NOT_FOUND_OR_NOT_VISIBLE: "We couldn't find that plan.",
  INVITATION_EXPIRED: 'This invitation has expired — ask for a new one.',
  INVITATION_REVOKED: 'This invitation was cancelled.',
  INVITATION_EXHAUSTED: 'This invitation has already been used.',
  VALIDATION_FAILED: 'Something was missing or wrong. Check the marked fields.',
  VERSION_CONFLICT: 'This plan changed since you opened it — review the latest version.',
  VERSION_SUPERSEDED: 'Someone published a new version. Review it first.',
  STATE_TRANSITION_INVALID: "That action doesn't match the current state of the plan.",
  IDEMPOTENCY_REPLAY: 'Request already received — no duplicate was made.',
  RATE_LIMITED: 'Slow down a little. Try again shortly.',
  UPLOAD_REJECTED: 'That file could not be accepted (type or size).',
  MEDIA_PENDING_SCAN: 'Your file is still being checked — wait a moment before sharing.',
  AI_UNAVAILABLE: 'Suggestions are unavailable right now — you can still type.',
  AI_DISABLED: 'Suggestions are turned off — type manually.',
  SYNC_REQUIRED: "We couldn't save yet — check your connection.",
  PRIVACY_REQUEST_PENDING: 'A privacy request is already being processed for this account.',
  FEATURE_DISABLED: 'This feature is not available yet.',
  INTERNAL_ERROR: 'Something went wrong on our side. We have logged it — please try again.',
};

export function serializeError(err: DomainError, requestId: string): ApiErrorPayload {
  return {
    code: err.code,
    message: DEFAULT_ERROR_MESSAGES[err.code] ?? err.message,
    requestId,
    retryable: err.retryable,
    fields: err.fields,
    details: err.details,
  };
}
