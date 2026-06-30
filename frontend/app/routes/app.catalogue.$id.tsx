import { useLoaderData, useActionData, useNavigation, Form, Link } from 'react-router';
import type { Route } from './+types/app.catalogue.$id';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { ChevronLeft, Trophy, CheckCircle, Shield, ShoppingCart, Percent, Box, Clock, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAuth(request);
  const res = await requestBackend<any>(`/catalogue/${params.id}`, { request });
  if (res.error) {
    throw new Response('Product not found', { status: 404 });
  }
  return { product: res.data };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const platform = formData.get('platform') as string;

  const res = await requestBackend(`/catalogue/${params.id}/import`, {
    method: 'POST',
    request,
    body: JSON.stringify({ platform }),
  });

  if (res.error) {
    return { error: res.error.message };
  }

  return { success: true, platform };
}

export default function CatalogueDetail() {
  const { product } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isImporting = navigation.state === 'submitting';

  // State to simulate markup pricing slider
  const [markupVal, setMarkupVal] = useState<number>(1.8); // Default 1.8x markup

  const customRetailPrice = product.wholesalePrice * markupVal;
  const customProfit = customRetailPrice - product.wholesalePrice;
  const customMarginPercentage = (customProfit / customRetailPrice) * 100;

  const getReputationBadge = (level: string) => {
    switch (level) {
      case 'PREMIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Trophy className="w-3.5 h-3.5" /> Premium Wholesaler
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#8b5cf6]/10 text-[#7c3aed] border border-[#8b5cf6]/20">
            <CheckCircle className="w-3.5 h-3.5" /> Verified Wholesaler
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            <Shield className="w-3.5 h-3.5" /> Standard Wholesaler
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/catalogue"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1a1a1c] transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Catalogue
      </Link>

      {/* Main product layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Info & Image/Desc */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider bg-[#f5f5f7] px-2.5 py-1 rounded">
                {product.category}
              </span>
              {getReputationBadge(product.supplier.level)}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#1a1a1c] tracking-tight leading-tight">
                {product.title}
              </h1>
              <p className="text-xs font-mono text-gray-400 mt-1 uppercase font-bold tracking-wider">
                SKU: {product.sku}
              </p>
            </div>

            {product.description && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-[#1a1a1c] uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Warehouse Details */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                  <Box className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Stock Level</p>
                  <p className={`text-sm font-bold mt-0.5 ${product.stock === 0 ? 'text-red-500' : 'text-[#1a1a1c]'}`}>
                    {product.stock > 0 ? `${product.stock} units` : 'Out of stock'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Dispatch SLA</p>
                  <p className="text-sm font-bold text-[#1a1a1c] mt-0.5">{product.estimatedShippingWindow}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Supplier OTD</p>
                  <p className="text-sm font-bold text-[#1a1a1c] mt-0.5">{product.supplier.otdPercentage.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wholesaler Reputation scorecard */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#1a1a1c] uppercase tracking-wider">Wholesaler KPI Report</h3>
              <p className="text-xs text-gray-400 mt-0.5">Supplier Profile: <span className="font-semibold text-gray-600">{product.supplier.companyName}</span></p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Reputation Score</p>
                <p className="text-base font-bold text-[#1a1a1c] mt-0.5">{product.supplier.reputationScore.toFixed(0)} / 100</p>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Fill Rate</p>
                <p className="text-base font-bold text-[#1a1a1c] mt-0.5">{product.supplier.fillRatePercentage.toFixed(0)}%</p>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Cancellation</p>
                <p className="text-base font-bold text-red-500 mt-0.5">{product.supplier.cancelRatePercentage.toFixed(0)}%</p>
              </div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Returns / Refunds</p>
                <p className="text-base font-bold text-red-500 mt-0.5">{product.supplier.returnRatePercentage.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Calculator & Staged Import Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pricing margin calculator card */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-5">
            <h3 className="text-sm font-bold text-[#1a1a1c] uppercase tracking-wider">Margin Calculator</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Wholesale cost:</span>
                <span className="font-bold text-[#1a1a1c]">£{product.wholesalePrice.toFixed(2)}</span>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-gray-500">Suggested Retail Price:</span>
                  <span className="text-[#8b5cf6]">£{customRetailPrice.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={markupVal}
                  onChange={(e) => setMarkupVal(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>1.2x markup</span>
                  <span>2.5x markup</span>
                </div>
              </div>

              {/* Profit breakdown */}
              <div className="bg-green-50/50 border border-green-100 rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">Markup Multiplier:</span>
                  <span className="font-bold text-[#1a1a1c]">{markupVal.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">Gross Profit Margin:</span>
                  <span className="font-bold text-green-700">{customMarginPercentage.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-200/50">
                  <span className="text-green-700 font-bold text-xs">Net profit per unit:</span>
                  <span className="font-extrabold text-green-700 text-sm">+£{customProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Import platforms actions card */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#1a1a1c] uppercase tracking-wider">Source to Store</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Stage this product. Staged imports compile schemas ready to push catalogs directly to active Shopify or WooCommerce setups.
            </p>

            {actionData?.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl space-y-1.5">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Import Staged successfully
                </p>
                <p className="text-[11px]">
                  Product mapped to <span className="font-bold uppercase">{actionData.platform}</span> catalog queues.
                </p>
              </div>
            )}

            {actionData?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                {actionData.error}
              </div>
            )}

            {/* Current staging status check */}
            {product.importedStatus && !actionData?.success && (
              <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 text-[#7c3aed] p-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>Staged to {product.importedPlatform}</span>
                <span className="text-[10px] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-full">{product.importedStatus}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Form method="post" className="w-full">
                <input type="hidden" name="platform" value="SHOPIFY" />
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-[#1a1a1c] text-white font-semibold text-xs py-3 rounded-full hover:bg-[#2a2a2e] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Stage to Shopify <ArrowUpRight className="w-3 h-3 text-white/50" />
                </button>
              </Form>

              <Form method="post" className="w-full">
                <input type="hidden" name="platform" value="WOOCOMMERCE" />
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-white text-[#1a1a1c] border border-gray-200 font-semibold text-xs py-3 rounded-full hover:bg-[#f5f5f7] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Stage to WooCommerce <ArrowUpRight className="w-3 h-3 text-gray-400" />
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
