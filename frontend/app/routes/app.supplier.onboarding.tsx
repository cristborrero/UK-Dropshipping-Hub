import { useActionData, useLoaderData, useNavigation, Form, redirect } from 'react-router';
import type { Route } from './+types/app.supplier.onboarding';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { CheckCircle2 } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  if (user.role !== 'SUPPLIER') {
    return redirect('/');
  }

  const profileRes = await requestBackend<any>('/suppliers/me', { request });
  if (profileRes.error) {
    throw new Response('Profile not found', { status: 404 });
  }

  return { supplier: profileRes.data };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();

  const companyName = formData.get('companyName') as string;
  const vat = formData.get('vat') as string;
  const address = formData.get('address') as string;
  const categoriesStr = formData.get('categories') as string;
  const categories = categoriesStr ? categoriesStr.split(',').map((c) => c.trim()) : [];
  const shippingSla = parseInt(formData.get('shippingSla') as string, 10);

  const res = await requestBackend('/suppliers/me', {
    method: 'PATCH',
    request,
    body: JSON.stringify({ companyName, vat, address, categories, shippingSla }),
  });

  if (res.error) {
    return { error: res.error.message };
  }

  return redirect('/dashboard');
}

const inputClass =
  'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all placeholder:text-gray-400';

const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

export default function SupplierOnboarding() {
  const { supplier } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Onboarding Profile</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Complete your business profile to activate your account and start listing products.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#8b5cf6]/8 border border-[#8b5cf6]/20">
        <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-[#8b5cf6]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1a1a1c]">Complete your profile to go live</p>
          <p className="text-xs text-gray-400 mt-0.5">All fields are required to activate your supplier account.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-8 rounded-2xl">
        <Form method="post" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="companyName" className={labelClass}>Company Name</label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                defaultValue={supplier.companyName || ''}
                className={inputClass}
                placeholder="e.g. UK Wholesale LTD"
              />
            </div>
            <div>
              <label htmlFor="vat" className={labelClass}>VAT Number (UK)</label>
              <input
                id="vat"
                name="vat"
                type="text"
                required
                defaultValue={supplier.vat || ''}
                className={inputClass}
                placeholder="e.g. GB123456789"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className={labelClass}>Fiscal Address (UK only)</label>
            <input
              id="address"
              name="address"
              type="text"
              required
              defaultValue={supplier.address || ''}
              className={inputClass}
              placeholder="e.g. 10 Down St, London, W1J 7DY"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="categories" className={labelClass}>Product Categories</label>
              <input
                id="categories"
                name="categories"
                type="text"
                defaultValue={supplier.categories ? supplier.categories.join(', ') : ''}
                className={inputClass}
                placeholder="e.g. Pets, Home, Garden"
              />
              <span className="text-xs text-gray-400 mt-1.5 block">Separate with commas</span>
            </div>
            <div>
              <label htmlFor="shippingSla" className={labelClass}>Shipping SLA (days to dispatch)</label>
              <input
                id="shippingSla"
                name="shippingSla"
                type="number"
                min={1}
                required
                defaultValue={supplier.shippingSla || 2}
                className={inputClass}
                placeholder="e.g. 2"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {actionData.error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1a1a1c] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#2a2a2e] transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
