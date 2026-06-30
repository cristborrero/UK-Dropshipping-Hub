

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export async function requestBackend<T>(
  path: string,
  options: RequestInit & { request?: Request } = {}
): Promise<ApiResponse<T>> {
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});

  // If a request is provided, forward its cookie header for authentication
  if (options.request) {
    const cookie = options.request.headers.get('Cookie');
    if (cookie) {
      headers.set('Cookie', cookie);
    }
    // Also forward Authorization header if present
    const auth = options.request.headers.get('Authorization');
    if (auth) {
      headers.set('Authorization', auth);
    } else {
      try {
        const { getSession } = await import('./auth.server');
        const session = await getSession(options.request);
        const accessToken = session.get('accessToken');
        if (accessToken) {
          headers.set('Authorization', `Bearer ${accessToken}`);
        }
      } catch (e) {
        // Ignore circular dependency or session loading errors
      }
    }
  }

  // Ensure JSON requests set content-type
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Return standard error format
      return {
        error: {
          status: response.status,
          message: data?.message || response.statusText || 'Request failed',
          errors: data?.errors,
        },
      };
    }

    return { data };
  } catch (err: any) {
    return {
      error: {
        status: 500,
        message: err.message || 'Failed to connect to backend service',
      },
    };
  }
}
