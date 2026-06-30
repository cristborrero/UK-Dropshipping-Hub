import { useActionData, useNavigation, Form, Link } from 'react-router';
import type { Route } from './+types/app.products.upload';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { Upload, FileSpreadsheet, ChevronLeft, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  if (user.role !== 'SUPPLIER') {
    throw new Response('Forbidden', { status: 403 });
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file || file.size === 0) {
    return { error: 'Please select a valid CSV file' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const backendForm = new FormData();
    backendForm.append('file', new Blob([buffer], { type: file.type }), file.name);

    const res = await requestBackend<any>('/products/upload-csv', {
      method: 'POST',
      request,
      body: backendForm,
    });

    if (res.error) {
      return { error: res.error.message };
    }

    return { result: res.data };
  } catch (err: any) {
    return { error: err.message || 'An error occurred during upload' };
  }
}

export default function CsvUpload() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back Link */}
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-dark transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Products
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark">CSV Bulk Upload</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-accent/10 text-[#7c3aed] border border-brand-accent/20 uppercase tracking-wider">
          Beta
        </span>
      </div>

      {/* Template info */}
      <div className="bg-[#f5f5f7] border border-gray-200 p-5 rounded-2xl space-y-3">
        <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-brand-accent" />
          CSV File Structure
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          Ensure headers match the format below. Column casing is insensitive, and snake_case or camelCase are both supported.
        </p>

        <div className="bg-brand-dark p-4 rounded-xl overflow-x-auto">
          <pre className="text-[11px] text-[#c4b5fd] font-mono leading-relaxed">
{`sku,title,description,category,wholesale_price,stock,sla_days
WHS-PET-101,Orthopedic Dog Bed,Soft and durable dog bed,Pets,24.99,50,2
WHS-PET-102,Squeaky Toy Bone,Natural rubber chew toy,Pets,4.50,120,1`}
          </pre>
        </div>
      </div>

      {/* Upload card */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl">
        <Form method="post" encType="multipart/form-data" className="space-y-6">
          <div>
            <label htmlFor="file" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select CSV File
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv"
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-accent transition-all file:mr-4 file:py-1 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-accent/10 file:text-[#7c3aed] hover:file:bg-brand-accent/15 file:cursor-pointer"
            />
          </div>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              {actionData.error}
            </div>
          )}

          {actionData?.result && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-5 rounded-xl space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Upload Complete
              </h4>
              <p className="text-xs">
                Successfully processed and created: <strong className="font-bold text-brand-dark">{actionData.result.createdCount}</strong> products.
              </p>
              {actionData.result.errorCount > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200/60 space-y-2">
                  <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed rows ({actionData.result.errorCount}):
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-orange-700/90 space-y-1">
                    {actionData.result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-dark text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#2a2a2e] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? 'Uploading…' : 'Upload CSV'}
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
