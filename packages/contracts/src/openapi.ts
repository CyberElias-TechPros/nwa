/**
 * OpenAPI source lives in openapi/nwa.yaml (introduced W1).
 *
 * In Phase 0 this file simply re-exports the hand-written contract schemas
 * used by the API, web, and Android clients for the W0 scaffold. Generated
 * clients (TS + Kotlin) replace the hand-written DTOs once the OpenAPI is
 * complete; types in @nwa/domain remain authoritative for identity.
 */
export const CONTRACT_VERSION = '0.0.0-wip';

export const API_V1_PREFIX = '/v1';

export const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND_OR_NOT_VISIBLE',
  'INVITATION_EXPIRED',
  'INVITATION_REVOKED',
  'INVITATION_EXHAUSTED',
  'VALIDATION_FAILED',
  'VERSION_CONFLICT',
  'VERSION_SUPERSEDED',
  'STATE_TRANSITION_INVALID',
  'IDEMPOTENCY_REPLAY',
  'RATE_LIMITED',
  'UPLOAD_REJECTED',
  'MEDIA_PENDING_SCAN',
  'AI_UNAVAILABLE',
  'AI_DISABLED',
  'SYNC_REQUIRED',
  'PRIVACY_REQUEST_PENDING',
  'FEATURE_DISABLED',
  'INTERNAL_ERROR',
] as const;
