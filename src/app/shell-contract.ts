/**
 * What the shell (telemed-ia-front) guarantees to this portal (Anexo H). A request made with
 * the shell's HttpClient that fails rejects with an ApiError, never with a raw
 * HttpErrorResponse. Keep in step with telemed-ia-front/src/app/core/http/api-error.ts.
 */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details?: ReadonlyArray<FieldError>;
  readonly traceId?: string;
}

/** Status and code of a request that exceeded the shell's 10-second limit. */
export const TIMEOUT_STATUS = 0;
export const TIMEOUT_CODE = 'TIMEOUT';

/**
 * Reads a rejection as the shell's ApiError. Anything else, such as an answer of the API that
 * breaks the contract, becomes an UNKNOWN error with the given message.
 */
export function asApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error !== null && typeof error === 'object') {
    const { status, code, message, details, traceId } = error as Record<string, unknown>;
    if (typeof status === 'number' && typeof message === 'string') {
      return {
        status,
        code: typeof code === 'string' ? code : 'UNKNOWN',
        message,
        details: Array.isArray(details) ? details.filter(isFieldError) : undefined,
        traceId: typeof traceId === 'string' ? traceId : undefined,
      };
    }
  }
  return { status: 0, code: 'UNKNOWN', message: fallbackMessage };
}

function isFieldError(value: unknown): value is FieldError {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const { field, message } = value as Record<string, unknown>;
  return typeof field === 'string' && typeof message === 'string';
}
