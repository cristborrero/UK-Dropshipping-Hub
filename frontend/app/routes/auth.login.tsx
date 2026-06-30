import { useActionData, useNavigation, Form, Link } from 'react-router';
import type { Route } from './+types/auth.login';
import { requestBackend } from '../lib/api.server';
import { createUserSession, getSession, sessionStorage } from '../lib/auth.server';
import { Package, ChevronLeft, ArrowRight } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.has('accessToken')) {
    throw new Response(null, { status: 302, headers: { Location: '/dashboard' } });
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const intent = formData.get('intent');
  if (intent === 'logout') {
    const session = await getSession(request);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login',
        'Set-Cookie': await sessionStorage.destroySession(session),
      },
    });
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const res = await requestBackend<{ accessToken: string; refreshToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.error) {
    return { error: res.error.message };
  }

  return createUserSession(res.data!.accessToken, res.data!.refreshToken, '/dashboard');
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen bg-white relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-cross z-0 opacity-60 mask-[radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      {/* Violet blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-linear-to-r from-purple-300/20 to-violet-400/20 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-dark transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-dark flex items-center justify-center shadow-sm">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-brand-dark">
            UK Dropshipping Hub
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-bold tracking-tight text-brand-dark mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-7">Sign in to manage your B2B account</p>

          <Form method="post" className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-gray-400"
                placeholder="you@company.co.uk"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {actionData.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-dark text-white font-medium py-3 rounded-full hover:bg-[#2a2a2e] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2 group mt-2"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </span>
              {!isSubmitting && (
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              )}
            </button>
          </Form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-accent hover:text-[#7c3aed] transition-colors font-semibold">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
