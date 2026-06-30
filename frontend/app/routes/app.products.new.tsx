import { useActionData, useNavigation, Form, Link, redirect } from 'react-router';
import type { Route } from './+types/app.products.new';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { Tag, AlignLeft, Grid, PoundSterling, Box, Clock, ChevronLeft } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  if (user.role !== 'SUPPLIER') return redirect('/');
  if (user.status !== 'ACTIVE') return redirect('/onboarding');
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();

  const res = await requestBackend('/products', {
    method: 'POST',
    request,
    body: JSON.stringify({
      sku: formData.get('sku'),
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      wholesalePrice: parseFloat(formData.get('wholesalePrice') as string),
      stock: parseInt(formData.get('stock') as string, 10),
      slaDays: parseInt(formData.get('slaDays') as string, 10),
    }),
  });

  if (res.error) {
    return { error: res.error.message };
  }

  return redirect('/products');
}

const inputClass =
  'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-gray-400';

const labelClass =
  'flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

export default function NewProduct() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-dark transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Products
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark">Add New Product</h1>
        <p className="text-gray-400 mt-1 text-sm">Manually enter product details and inventory levels.</p>
      </div>

      <div className="bg-white border border-gray-200 p-8 rounded-2xl">
        <Form method="post" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="sku" className={labelClass}>
                <Tag className="w-3.5 h-3.5 text-gray-400" /> SKU
              </label>
              <input
                id="sku" name="sku" type="text" required
                className={inputClass} placeholder="e.g. WHS-PET-101"
              />
            </div>
            <div>
              <label htmlFor="title" className={labelClass}>
                <AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Product Title
              </label>
              <input
                id="title" name="title" type="text" required
                className={inputClass} placeholder="e.g. Ergonomic Dog Bed"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              <AlignLeft className="w-3.5 h-3.5 text-gray-400" /> Description
            </label>
            <textarea
              id="description" name="description" rows={4}
              className={`${inputClass} resize-none`}
              placeholder="Provide a detailed description of the product…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="category" className={labelClass}>
                <Grid className="w-3.5 h-3.5 text-gray-400" /> Category
              </label>
              <input
                id="category" name="category" type="text" required
                className={inputClass} placeholder="e.g. Pets"
              />
            </div>
            <div>
              <label htmlFor="wholesalePrice" className={labelClass}>
                <PoundSterling className="w-3.5 h-3.5 text-gray-400" /> Wholesale Price (£)
              </label>
              <input
                id="wholesalePrice" name="wholesalePrice" type="number"
                step="0.01" min="0" required
                className={inputClass} placeholder="e.g. 19.99"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="stock" className={labelClass}>
                <Box className="w-3.5 h-3.5 text-gray-400" /> Initial Stock
              </label>
              <input
                id="stock" name="stock" type="number" min="0" required
                className={inputClass} placeholder="e.g. 100"
              />
            </div>
            <div>
              <label htmlFor="slaDays" className={labelClass}>
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Dispatch SLA (Days)
              </label>
              <input
                id="slaDays" name="slaDays" type="number" min="1" required
                defaultValue={2} className={inputClass} placeholder="e.g. 2"
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
              className="bg-brand-dark text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#2a2a2e] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? 'Creating…' : 'Create Product'}
            </button>
            <Link
              to="/products"
              className="bg-white text-brand-dark border border-gray-200 font-medium px-6 py-2.5 rounded-full hover:bg-[#f5f5f7] transition-all text-sm flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
