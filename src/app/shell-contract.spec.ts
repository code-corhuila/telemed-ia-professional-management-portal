import { describe, expect, it } from 'vitest';

import { asApiError, TIMEOUT_CODE, TIMEOUT_STATUS } from './shell-contract';

describe('asApiError', () => {
  it('keeps the error the shell client normalised', () => {
    const error = asApiError(
      {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'the request has invalid fields',
        details: [{ field: 'licenseNumber', message: 'must not be blank' }],
        traceId: 'trace-1',
      },
      'fallback',
    );

    expect(error).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'the request has invalid fields',
      details: [{ field: 'licenseNumber', message: 'must not be blank' }],
      traceId: 'trace-1',
    });
  });

  it('reads the timeout of the shell', () => {
    const error = asApiError({ status: TIMEOUT_STATUS, code: TIMEOUT_CODE, message: 'too long' }, 'fallback');

    expect(error.code).toBe('TIMEOUT');
    expect(error.status).toBe(0);
    expect(error.traceId).toBeUndefined();
  });

  it('drops malformed field details', () => {
    const error = asApiError(
      { status: 400, code: 'VALIDATION_ERROR', message: 'invalid', details: [{ field: 'a', message: 'b' }, 'x', { field: 1 }] },
      'fallback',
    );

    expect(error.details).toEqual([{ field: 'a', message: 'b' }]);
  });

  it('gives the fallback message to anything that is not an ApiError', () => {
    for (const rejection of [new Error('Unknown status: X.'), 'boom', null, undefined, { message: 'no status' }]) {
      expect(asApiError(rejection, 'No pudimos hacerlo.')).toEqual({
        status: 0,
        code: 'UNKNOWN',
        message: 'No pudimos hacerlo.',
      });
    }
  });
});
