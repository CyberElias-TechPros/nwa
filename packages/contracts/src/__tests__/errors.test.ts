import { describe, expect, it } from 'vitest';
import { DomainError, ErrorCode } from '@nwa/domain';
import { DEFAULT_ERROR_MESSAGES, serializeError } from '../errors';

describe('serializeError', () => {
  it('maps every ErrorCode to a non-empty default message', () => {
    for (const code of Object.keys(DEFAULT_ERROR_MESSAGES)) {
      expect(DEFAULT_ERROR_MESSAGES[code as ErrorCode]?.length).toBeGreaterThan(5);
    }
  });

  it('returns a stable envelope', () => {
    const err = new DomainError(ErrorCode.UNAUTHENTICATED, 'raw', false);
    const out = serializeError(err, 'req_001');
    expect(out.requestId).toBe('req_001');
    expect(out.code).toBe('UNAUTHENTICATED');
    expect(out.retryable).toBe(false);
  });
});
