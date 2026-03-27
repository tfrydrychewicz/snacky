import type { ApiError } from '@snacky/shared-types';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly type?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static fromApiError(error: ApiError): AppError {
    return new AppError(error.detail, error.status, error.type);
  }
}

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return true;
  }
  return false;
};
