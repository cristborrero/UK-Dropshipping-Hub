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

export function getProductImage(category: string, id: string): string {
  const categoryLower = (category || '').toLowerCase();
  
  // Use stable seed index based on product ID to rotate images in the same category
  let seed = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) {
      seed += id.charCodeAt(i);
    }
  }

  const imagesMap: Record<string, string[]> = {
    kitchen: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1565192647048-f997ded87ab5?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1522012147041-c0a1154301e8?w=600&auto=format&fit=crop&q=60'
    ],
    home: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=60'
    ],
    electronics: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60'
    ],
    fitness: [
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=60'
    ],
    apparel: [
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60'
    ],
    beauty: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=60'
    ]
  };

  const matchKey = Object.keys(imagesMap).find(key => categoryLower.includes(key));
  const list = matchKey ? imagesMap[matchKey] : [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=60'
  ];

  return list[seed % list.length];
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((p) => {
                const markupSuggested = p.wholesalePrice * 1.8;
                const margin = markupSuggested - p.wholesalePrice;
                const profitPercentage = ((margin / markupSuggested) * 100).toFixed(0);

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-gray-300 transition-all hover:shadow-md group relative"
                  >
                    {/* Image Area with Overlays */}
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50 border-b border-gray-100">
                      <img
                        src={getProductImage(p.category, p.id)}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Top Overlay: Supplier Badge */}
                      <div className="absolute top-3 left-3 z-10">
                        {getReputationBadge(p.supplier.level)}
                      </div>
                      {/* Top Overlay: SLA */}
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          SLA: {p.slaDays}d
                        </span>
                      </div>
                      {/* Bottom Overlay: Margin */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                          +{profitPercentage}% Margin
                        </span>
                      </div>
                    </div>

                    {/* Content details */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Supplier Info & SKU */}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold mb-1.5">
                          <span className="truncate max-w-[125px]">{p.supplier.companyName}</span>
                          <span className="font-mono">{p.sku}</span>
                        </div>

                        {/* Product Title */}
                        <h3 className="font-bold text-[#1a1a1c] text-sm leading-snug group-hover:text-violet-600 transition-colors line-clamp-2 min-h-[40px]">
                          {p.title}
                        </h3>

                        {/* Margins pricing card */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Wholesale Cost</p>
                            <p className="text-sm font-bold text-[#1a1a1c] mt-0.5">£{p.wholesalePrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Suggested Retail</p>
                            <p className="text-sm font-bold text-gray-500 mt-0.5">£{markupSuggested.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Stock & Source button */}
                      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                        <div className="text-xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Stock</span>
                          <span className={`font-semibold ${p.stock === 0 ? 'text-red-500' : 'text-[#1a1a1c]'}`}>
                            {p.stock > 0 ? `${p.stock} units` : 'Out of stock'}
                          </span>
                        </div>

                        <Link
                          to={`/catalogue/${p.id}`}
                          className="inline-flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 active:scale-[0.98] transition-all shadow-sm"
                        >
                          Source <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
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
