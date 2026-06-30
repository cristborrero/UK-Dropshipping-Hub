import { useLoaderData, Link, useSubmit, useSearchParams } from 'react-router';
import type { Route } from './+types/app.catalogue._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { Search, Filter, SlidersHorizontal, ArrowUpDown, Shield, Trophy, CheckCircle, HelpCircle, Package, ArrowRight } from 'lucide-react';
import React, { useRef } from 'react';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
  const url = new URL(request.url);

  // Forward query params to backend catalogue endpoint
  const query = new URLSearchParams();
  const category = url.searchParams.get('category');
  if (category) query.append('category', category);
  const minPrice = url.searchParams.get('minPrice');
  if (minPrice) query.append('minPrice', minPrice);
  const maxPrice = url.searchParams.get('maxPrice');
  if (maxPrice) query.append('maxPrice', maxPrice);
  const supplierId = url.searchParams.get('supplierId');
  if (supplierId) query.append('supplierId', supplierId);
  const reputationLevel = url.searchParams.get('reputationLevel');
  if (reputationLevel) query.append('reputationLevel', reputationLevel);
  const inStockOnly = url.searchParams.get('inStockOnly');
  if (inStockOnly) query.append('inStockOnly', inStockOnly);
  const sortBy = url.searchParams.get('sortBy');
  if (sortBy) query.append('sortBy', sortBy);

  const res = await requestBackend<any[]>(`/catalogue?${query.toString()}`, { request });

  return {
    products: res.data || [],
  };
}

export default function CatalogueIndex() {
  const { products } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  // Search input filter in-memory for fast query on current fetched set
  const searchVal = searchParams.get('q') || '';

  const filteredProducts = products.filter((p) => {
    if (!searchVal) return true;
    const term = searchVal.toLowerCase();
    return p.title.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  // Extract unique categories and suppliers from products for filter dropdowns
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const suppliers = Array.from(
    new Map(products.map((p) => [p.supplier.id, p.supplier.companyName])).entries()
  );

  const handleFilterChange = () => {
    if (formRef.current) {
      submit(formRef.current, { replace: true });
    }
  };

  const getReputationBadge = (level: string) => {
    switch (level) {
      case 'PREMIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Trophy className="w-3 h-3" /> Premium
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8b5cf6]/10 text-[#7c3aed] border border-[#8b5cf6]/20">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
            <Shield className="w-3 h-3" /> Standard
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Sourcing Catalogue</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Browse verified UK wholesalers, analyze margins, and staging-import products to your retail stores.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-sm font-bold text-[#1a1a1c] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#8b5cf6]" />
                Filters
              </span>
              {(searchParams.toString().length > 0) && (
                <button
                  onClick={() => setSearchParams({})}
                  className="text-xs text-gray-400 hover:text-[#8b5cf6] font-semibold transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <form ref={formRef} onChange={handleFilterChange} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                <select
                  name="category"
                  defaultValue={searchParams.get('category') || ''}
                  className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block font-semibold text-gray-500 uppercase tracking-wider mb-2">Supplier</label>
                <select
                  name="supplierId"
                  defaultValue={searchParams.get('supplierId') || ''}
                  className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reputation Level */}
              <div>
                <label className="block font-semibold text-gray-500 uppercase tracking-wider mb-2">Supplier Level</label>
                <select
                  name="reputationLevel"
                  defaultValue={searchParams.get('reputationLevel') || ''}
                  className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
                >
                  <option value="">All Levels</option>
                  <option value="PREMIUM">Premium Level</option>
                  <option value="VERIFIED">Verified Level</option>
                  <option value="STANDARD">Standard Level</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block font-semibold text-gray-500 uppercase tracking-wider mb-2">Price Limit (£)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="minPrice"
                    placeholder="Min"
                    defaultValue={searchParams.get('minPrice') || ''}
                    className="w-1/2 bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
                  />
                  <span className="text-gray-300">—</span>
                  <input
                    type="number"
                    name="maxPrice"
                    placeholder="Max"
                    defaultValue={searchParams.get('maxPrice') || ''}
                    className="w-1/2 bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* In stock only */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="inStockOnly"
                  name="inStockOnly"
                  value="true"
                  defaultChecked={searchParams.get('inStockOnly') === 'true'}
                  className="rounded border-gray-300 text-[#8b5cf6] focus:ring-[#8b5cf6] cursor-pointer w-4 h-4"
                />
                <label htmlFor="inStockOnly" className="font-semibold text-gray-500 cursor-pointer select-none">
                  In-Stock Only
                </label>
              </div>
            </form>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Top Actions: Search & Sort */}
          <div className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by title or SKU..."
                value={searchVal}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams);
                  if (e.target.value) {
                    params.set('q', e.target.value);
                  } else {
                    params.delete('q');
                  }
                  setSearchParams(params);
                }}
                className="w-full bg-[#f5f5f7] border border-transparent rounded-xl pl-10 pr-4 py-2 text-sm text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                defaultValue={searchParams.get('sortBy') || 'reputation'}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams);
                  params.set('sortBy', e.target.value);
                  setSearchParams(params);
                }}
                className="bg-[#f5f5f7] border border-transparent rounded-xl px-3.5 py-2 text-xs font-semibold text-[#1a1a1c] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all w-full sm:w-auto"
              >
                <option value="reputation">Sort by Supplier Reputation</option>
                <option value="price">Sort by Price (Low → High)</option>
                <option value="createdAt">Sort by Newest Arrivals</option>
              </select>
            </div>
          </div>

          {/* Grid list */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[#1a1a1c] font-semibold">No catalogue items found</p>
              <p className="text-sm text-gray-400 mt-1">Try relaxing filters or search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((p) => {
                const markupSuggested = p.wholesalePrice * 1.8;
                const margin = markupSuggested - p.wholesalePrice;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-300 transition-all hover:shadow-sm group"
                  >
                    <div>
                      {/* Supplier KPI Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs text-gray-400 font-semibold truncate max-w-[120px]">
                          {p.supplier.companyName}
                        </span>
                        {getReputationBadge(p.supplier.level)}
                      </div>

                      {/* Product Info */}
                      <h3 className="font-bold text-[#1a1a1c] text-base leading-tight group-hover:text-[#8b5cf6] transition-colors line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase font-bold tracking-wider">
                        {p.sku}
                      </p>

                      {/* Margins breakdown */}
                      <div className="grid grid-cols-3 gap-2 bg-[#f5f5f7] p-3 rounded-xl mt-4 border border-gray-100">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase font-semibold">Cost</p>
                          <p className="text-sm font-bold text-[#1a1a1c] mt-0.5">£{p.wholesalePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase font-semibold">Suggested</p>
                          <p className="text-sm font-bold text-gray-500 mt-0.5">£{markupSuggested.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#7c3aed] uppercase font-bold">Margin</p>
                          <p className="text-sm font-extrabold text-green-600 mt-0.5">+{((margin / markupSuggested) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Stock: </span>
                          <span className={`font-semibold ${p.stock === 0 ? 'text-red-500' : 'text-[#1a1a1c]'}`}>
                            {p.stock > 0 ? p.stock : 'Out of stock'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">SLA: </span>
                          <span className="font-semibold text-[#1a1a1c]">{p.slaDays}d</span>
                        </div>
                      </div>

                      <Link
                        to={`/catalogue/${p.id}`}
                        className="inline-flex items-center gap-1.5 bg-[#1a1a1c] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#2a2a2e] transition-all"
                      >
                        Source <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
