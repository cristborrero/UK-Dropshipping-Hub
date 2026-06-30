import { useLoaderData, useActionData, Link, Form } from 'react-router';
import type { Route } from './+types/app.products._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { Plus, Upload, Package, Pencil, Trash2 } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  if (user.role !== 'SUPPLIER') {
    throw new Response('Forbidden', { status: 403 });
  }

  const res = await requestBackend<any[]>('/products', { request });
  return { products: res.data || [] };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const id = formData.get('id') as string;
  const intent = formData.get('intent') as string;

  if (intent === 'delete' && id) {
    const res = await requestBackend(`/products/${id}`, { method: 'DELETE', request });
    if (res.error) {
      return { error: res.error.message };
    }
  }

  return null;
}

export default function ProductList() {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">My Products</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Manage your dropshipping catalogue and inventory levels.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/products/upload"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-[#1a1a1c] font-medium px-4 py-2.5 rounded-full hover:bg-[#f5f5f7] transition-all text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            CSV Upload
          </Link>
          <Link
            to="/products/new"
            className="inline-flex items-center gap-2 bg-[#1a1a1c] text-white font-medium px-4 py-2.5 rounded-full hover:bg-[#2a2a2e] transition-all text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {actionData.error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {products.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[#1a1a1c] font-semibold">No products listed yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Product" to get started.</p>
            <Link
              to="/products/new"
              className="mt-4 inline-flex items-center gap-2 bg-[#1a1a1c] text-white font-medium px-5 py-2.5 rounded-full text-sm hover:bg-[#2a2a2e] transition-all"
            >
              <Plus className="w-4 h-4" /> Add your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f5f5f7]/50">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">SKU</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Title</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Category</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Price</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Stock</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">SLA</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-[#8b5cf6] font-mono">{product.sku}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#1a1a1c]">{product.title}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{product.category}</td>
                    <td className="px-5 py-4 text-sm text-[#1a1a1c] font-semibold">
                      £{product.wholesalePrice.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`font-semibold ${product.inventory?.stock === 0 ? 'text-red-500' : 'text-[#1a1a1c]'}`}>
                        {product.inventory?.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{product.inventory?.slaDays ?? 2}d</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="inline-flex items-center gap-1.5 text-xs bg-white text-[#1a1a1c] border border-gray-200 font-semibold px-3 py-1.5 rounded-full hover:bg-[#f5f5f7] transition-all"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Link>
                        <Form
                          method="post"
                          onSubmit={(e) => {
                            if (!confirm('Deactivate this product?')) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="intent" value="delete" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 text-xs bg-white text-red-500 border border-red-200 font-semibold px-3 py-1.5 rounded-full hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Deactivate
                          </button>
                        </Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
