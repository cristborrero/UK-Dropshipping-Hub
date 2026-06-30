import { createCookieSessionStorage, redirect } from 'react-router';
import { requestBackend } from './api.server';

const sessionSecret = process.env.SESSION_SECRET || 'default-session-secret-change-me';

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  return sessionStorage.getSession(cookie);
}

export async function requireAuth(request: Request) {
  const session = await getSession(request);
  const accessToken = session.get('accessToken');

  if (!accessToken) {
    throw redirect('/login');
  }

  // Verify token by calling /auth/me with the request context
  // This forwards the Cookie headers containing our JWT tokens to the backend
  const meRes = await requestBackend<any>('/auth/me', {
    request,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (meRes.error) {
    // If unauthorized, attempt refresh if refresh token exists
    const refreshToken = session.get('refreshToken');
    if (refreshToken) {
      const refreshRes = await requestBackend<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.data) {
        // Success! Save new access token and reload
        session.set('accessToken', refreshRes.data.accessToken);
        throw redirect(request.url, {
          headers: {
            'Set-Cookie': await sessionStorage.commitSession(session),
          },
        });
      }
    }

    // Refresh failed or no refresh token, redirect to login
    throw redirect('/login', {
      headers: {
        'Set-Cookie': await sessionStorage.destroySession(session),
      },
    });
  }

  return meRes.data;
}

export async function requireRole(request: Request, roles: string[]) {
  const user = await requireAuth(request);
  if (!roles.includes(user.role)) {
    throw redirect('/dashboard'); // or standard error
  }
  return user;
}

export async function createUserSession(
  accessToken: string,
  refreshToken: string,
  redirectTo: string
) {
  const session = await sessionStorage.getSession();
  session.set('accessToken', accessToken);
  session.set('refreshToken', refreshToken);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect('/login', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}
