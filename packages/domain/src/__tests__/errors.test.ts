import { describe, expect, it } from 'vitest';
import { DomainError, ErrorCode } from '../errors';

describe('DomainError', () => {
  it('preserves code, message, retryable flag', () => {
    const e = new DomainError(ErrorCode.VERSION_CONFLICT, 'plan changed', false);
    expect(e.code).toBe('VERSION_CONFLICT');
    expect(e.message).toBe('plan changed');
    expect(e.retryable).toBe(false);
    expect(e.name).toBe('DomainError');
  });
});
