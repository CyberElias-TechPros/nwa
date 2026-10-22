import { ErrorHandler } from 'hono';
import { DomainError, ErrorCode } from '@nwa/domain';
import { DEFAULT_ERROR_MESSAGES } from '@nwa/contracts/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') ?? 'unknown';
  if (err instanceof DomainError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: DEFAULT_ERROR_MESSAGES[err.code] ?? err.message,
          requestId,
          retryable: err.retryable,
          fields: err.fields,
          details: err.details,
        },
      },
      err.code === ErrorCode.UNAUTHENTICATED ? 401
      : err.code === ErrorCode.FORBIDDEN ? 403
      : err.code === ErrorCode.NOT_FOUND_OR_NOT_VISIBLE ? 404
      : err.code === ErrorCode.RATE_LIMITED ? 429
      : err.code === ErrorCode.VERSION_CONFLICT || err.code === ErrorCode.VERSION_SUPERSEDED ? 409
      : err.code === ErrorCode.VALIDATION_FAILED ? 400
      : 400,
    );
  }
  // Unknown: do not leak stack or message.
  console.error('unhandled error', err);
  return c.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: DEFAULT_ERROR_MESSAGES.INTERNAL_ERROR,
        requestId,
        retryable: false,
      },
    },
    500,
  );
};
