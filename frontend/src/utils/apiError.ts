export interface ApiError extends Error {
  status: number;
}

export function createApiError(status: number, message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

export function isApiError(error: unknown): error is ApiError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number",
  );
}

export function isAuthExpiredError(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}
