/**
 * src/lib/errors.ts: Standardized error handling and API response utilities
 * 
 * Provides consistent error formatting following RFC 7807 Problem Details
 * and secure error handling that doesn't leak sensitive information.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard API error response following RFC 7807 Problem Details
 * @param status - HTTP status code
 * @param title - Human-readable error title
 * @param detail - Optional detailed error description
 * @param instance - Optional URI reference for this specific error occurrence
 */
export function problemResponse(
  status: number,
  title: string,
  detail?: string,
  instance?: string
) {
  const response = {
    type: 'about:blank',
    title,
    status,
    ...(detail && { detail }),
    ...(instance && { instance }),
  };

  console.error(`src/lib/errors.ts: API Error ${status}: ${title}`, { detail, instance });
  
  return NextResponse.json(response, { 
    status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

/**
 * Handle Zod validation errors with detailed field information
 * @param error - Zod validation error
 * @param instance - Optional URI reference
 */
export function handleValidationError(error: ZodError, instance?: string) {
  const fieldErrors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  const detail = `Validation failed: ${fieldErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`;
  
  return problemResponse(400, 'Validation Error', detail, instance);
}

/**
 * Handle different types of errors with appropriate responses
 * @param error - Any error object
 * @param instance - Optional URI reference
 */
export function handleApiError(error: unknown, instance?: string) {
  console.error('src/lib/errors.ts: Unhandled API error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return handleValidationError(error, instance);
  }

  // Custom application errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    if (process.env.NODE_ENV === 'production') {
      return problemResponse(500, 'Internal Server Error', undefined, instance);
    }
    
    // Authorization errors
    if (error.message.includes('Unauthorized')) {
      return problemResponse(401, 'Unauthorized', error.message, instance);
    }
    
    if (error.message.includes('Forbidden')) {
      return problemResponse(403, 'Forbidden', error.message, instance);
    }
    
    // Other application errors
    return problemResponse(500, 'Internal Server Error', error.message, instance);
  }

  // Unknown error type
  return problemResponse(500, 'Internal Server Error', undefined, instance);
}

/**
 * Success response wrapper
 * @param data - Response data
 * @param message - Optional success message
 * @param status - HTTP status code (default 200)
 */
export function successResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json({
    data,
    ...(message && { message }),
  }, { status });
}

/**
 * Created response for POST requests
 * @param data - Created resource data
 * @param message - Optional success message
 */
export function createdResponse<T>(data: T, message?: string) {
  return successResponse(data, message, 201);
}

/**
 * No content response for DELETE requests
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}
