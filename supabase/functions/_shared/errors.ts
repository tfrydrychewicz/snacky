import { corsHeaders } from './cors.ts';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export const errorResponse = (
  status: number,
  title: string,
  detail: string,
  type?: string,
): Response =>
  new Response(
    JSON.stringify({
      type: type ?? `https://api.snacky.app/errors/${title.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      status,
      detail,
    } satisfies ProblemDetail),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/problem+json' },
    },
  );

export const badRequest = (detail: string) => errorResponse(400, 'Bad Request', detail);

export const unauthorized = (detail = 'Missing or invalid authorization token') =>
  errorResponse(401, 'Unauthorized', detail);

export const forbidden = (detail = 'You do not have access to this resource') =>
  errorResponse(403, 'Forbidden', detail);

export const notFound = (detail: string) => errorResponse(404, 'Not Found', detail);

export const internalError = (detail = 'An unexpected error occurred') =>
  errorResponse(500, 'Internal Server Error', detail);

export const serviceUnavailable = (detail: string) =>
  errorResponse(503, 'Service Unavailable', detail);
