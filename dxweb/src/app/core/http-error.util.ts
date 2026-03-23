import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns HttpClient failures into a readable message (FastAPI detail, network, validation array, etc.).
 */
export function formatHttpError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return (
        'Cannot reach the API. Start the backend (e.g. py -m uvicorn app.main:app --reload --port 8000 from dxbackend) ' +
        'and set src/environments/environment.ts apiUrl to match (e.g. http://localhost:8000/api/v1).'
      );
    }

    const body = err.error;

    if (typeof body === 'string' && body.trim().length > 0 && body.length < 500) {
      return body.trim();
    }

    if (body && typeof body === 'object') {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.length > 0) {
        return detail;
      }
      if (Array.isArray(detail)) {
        const parts = detail.map((x: { msg?: string; type?: string; loc?: unknown }) => {
          if (typeof x === 'object' && x && 'msg' in x) {
            return String((x as { msg: string }).msg);
          }
          return JSON.stringify(x);
        });
        if (parts.length) {
          return parts.join('; ');
        }
      }
    }

    return `Request failed (HTTP ${err.status}). Check the browser Network tab for the response body.`;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Something went wrong';
}
