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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-accent/10 text-[#7c3aed] border border-brand-accent/20">
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
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark">Sourcing Catalogue</h1>
        <p className="text-sm text-gray-400 mt-1">
          Browse verified UK wholesalers, analyze margins, and staging-import products to your retail stores.
        </p>
      </div>

      {/* Top Filter and Search Bar Panel */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm">
        {/* Row 1: Search & Sort */}
        <div className="flex flex-col md:flex-row items-center gap-4">
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
              className="w-full bg-[#f5f5f7] border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              defaultValue={searchParams.get('sortBy') || 'reputation'}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                params.set('sortBy', e.target.value);
                setSearchParams(params);
              }}
              className="bg-[#f5f5f7] border border-transparent rounded-xl px-3.5 py-2.5 text-xs font-bold text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all w-full md:w-auto cursor-pointer"
            >
              <option value="reputation">Sort by Supplier Reputation</option>
              <option value="price">Sort by Price (Low → High)</option>
              <option value="createdAt">Sort by Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Row 2: Select Filters */}
        <form ref={formRef} onChange={handleFilterChange} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-gray-100 items-end text-xs font-semibold">
          {/* Category */}
          <div>
            <label className="block font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[9px]">Category</label>
            <select
              name="category"
              defaultValue={searchParams.get('category') || ''}
              className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all font-medium cursor-pointer"
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
            <label className="block font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[9px]">Supplier</label>
            <select
              name="supplierId"
              defaultValue={searchParams.get('supplierId') || ''}
              className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all font-medium cursor-pointer"
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
            <label className="block font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[9px]">Supplier Level</label>
            <select
              name="reputationLevel"
              defaultValue={searchParams.get('reputationLevel') || ''}
              className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all font-medium cursor-pointer"
            >
              <option value="">All Levels</option>
              <option value="PREMIUM">Premium Level</option>
              <option value="VERIFIED">Verified Level</option>
              <option value="STANDARD">Standard Level</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[9px]">Min Price (£)</label>
              <input
                type="number"
                name="minPrice"
                placeholder="Min"
                defaultValue={searchParams.get('minPrice') || ''}
                className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all font-medium"
              />
            </div>
            <div className="flex-1">
              <label className="block font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-[9px]">Max Price (£)</label>
              <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                defaultValue={searchParams.get('maxPrice') || ''}
                className="w-full bg-[#f5f5f7] border border-transparent rounded-xl px-3 py-2 text-brand-dark focus:outline-none focus:border-brand-accent focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Stock filter & reset */}
          <div className="flex items-center justify-between gap-4 h-9">
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="inStockOnly"
                name="inStockOnly"
                value="true"
                defaultChecked={searchParams.get('inStockOnly') === 'true'}
                className="rounded border-gray-300 text-brand-accent focus:ring-brand-accent cursor-pointer w-4 h-4"
              />
              <label htmlFor="inStockOnly" className="font-bold text-gray-400 cursor-pointer text-[9px] uppercase tracking-wider">
                In-Stock Only
              </label>
            </div>
            {searchParams.toString().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Grid list */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-brand-dark font-semibold">No catalogue items found</p>
          <p className="text-sm text-gray-400 mt-1">Try relaxing filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredProducts.map((p) => {
            const markupSuggested = p.wholesalePrice * 1.8;
            const margin = markupSuggested - p.wholesalePrice;
            const profitPercentage = ((margin / markupSuggested) * 100).toFixed(0);

            return (
              <Link
                key={p.id}
                to={`/catalogue/${p.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-gray-300 transition-all hover:shadow-md group relative shadow-sm"
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
                  <div className="absolute top-2 left-2 z-10">
                    {getReputationBadge(p.supplier.level)}
                  </div>
                  {/* Top Overlay: SLA */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {p.slaDays}d SLA
                    </span>
                  </div>
                  {/* Bottom Overlay: Margin */}
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded shadow-sm">
                      +{profitPercentage}% Margin
                    </span>
                  </div>
                </div>

                {/* Content details - highly optimized spacing */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {/* Supplier Info */}
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate mb-1">
                      {p.supplier.companyName}
                    </div>

                    {/* Product Title */}
                    <h3 className="font-bold text-brand-dark text-xs leading-snug group-hover:text-violet-600 transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                  </div>

                  <div>
                    {/* Pricing */}
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-100/50">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none">Cost</span>
                        <span className="font-bold text-brand-dark">£{p.wholesalePrice.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 uppercase font-bold block leading-none">Retail</span>
                        <span className="font-semibold text-gray-500">£{markupSuggested.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer: Stock */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100/50 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                      <span>Stock: <span className={p.stock === 0 ? 'text-red-500 font-bold' : 'text-brand-dark font-medium'}>{p.stock > 0 ? p.stock : 'Out'}</span></span>
                      <span className="text-violet-600 font-bold group-hover:underline flex items-center gap-0.5 text-[9px] uppercase tracking-wider">
                        Source <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
