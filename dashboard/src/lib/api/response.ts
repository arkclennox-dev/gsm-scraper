import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiSuccessWithMeta<T>(
  data: T,
  meta: { page: number; pageSize: number; total: number },
  status = 200
) {
  return NextResponse.json({ success: true, data, meta }, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown[]
) {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  );
}

export function badRequest(message: string, details?: unknown[]) {
  return apiError("BAD_REQUEST", message, 400, details);
}

export function unauthorized(message = "Unauthorized") {
  return apiError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden") {
  return apiError("FORBIDDEN", message, 403);
}

export function notFound(message = "Not found") {
  return apiError("NOT_FOUND", message, 404);
}

export function conflict(message: string) {
  return apiError("CONFLICT", message, 409);
}

export function validationError(message: string, details?: unknown[]) {
  return apiError("VALIDATION_ERROR", message, 422, details);
}

export function serverError(message = "Internal server error") {
  return apiError("INTERNAL_ERROR", message, 500);
}
