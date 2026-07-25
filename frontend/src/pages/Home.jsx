import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const CATEGORIES = [
  { id: 'book', label: 'Textbooks & Books', icon: '📚', desc: 'Engineering, CS & Science' },
  { id: 'calculator', label: 'Calculators', icon: '🔢', desc: 'Casio & TI Scientific' },
  { id: 'lab-equipment', label: 'Lab Gear', icon: '🧪', desc: 'Multimeters, Kits & Flasks' },
  { id: 'stationery', label: 'Stationery', icon: '📐', desc: 'Graph pads & Drafters' },
  { id: 'electronics', label: 'Electronics', icon: '💻', desc: 'Mice, Hubs & Adapters' },
  { id: 'other', label: 'Campus Items', icon: '🎒', desc: 'Lab Coats & Posters' },
];

function SkeletonListings() {
  return (
    <div className="products-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="product-card" key={i}>
          <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '4/3' }} />
          <div className="card-details">
            <div className="skeleton-pulse" style={{ width: '35%', height: 12 }} />
            <div className="skeleton-pulse" style={{ width: '85%', height: 16 }} />
            <div className="skeleton-pulse" style={{ width: '50%', height: 12 }} />
            <div className="skeleton-pulse" style={{ width: '40%', height: 20, marginTop: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const routerLocation = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const queryParams = new URLSearchParams(routerLocation.search);
  const searchFromUrl = queryParams.get('search') || '';
  const categoryFromUrl = queryParams.get('category') || '';

  const [search, setSearch] = useState(searchFromUrl);
  const [category, setCategory] = useState(categoryFromUrl);
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setSearch(searchFromUrl);
    setCategory(categoryFromUrl);
    setPage(1);
  }, [searchFromUrl, categoryFromUrl]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await api.get('/products', { params });
      setItems(data.items);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err) {
      setError('Could not load listings. Please make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setMaxPrice('');
    setPage(1);
  };

  return (
    <div>
      {/* Hero Banner (Amazon / Flipkart Promotional Hero) */}
      <section className="hero-banner">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Campus <span>Semester Resale</span> Marketplace</h1>
            <p>Save up to 75% on second-hand engineering textbooks, scientific calculators, and lab gear passed down by seniors.</p>
            <div className="hero-stats-row">
              <div className="stat-chip">
                <span>📚 500+ Verified Books</span>
              </div>
              <div className="stat-chip">
                <span>⚡ Instant Campus Chat</span>
              </div>
              <div className="stat-chip">
                <span>📍 Library Pickup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 64 }}>
        {/* Category Shortcut Tiles */}
        <div className="category-tiles-grid">
          <div
            className={`category-tile ${category === '' ? 'active' : ''}`}
            onClick={() => { setCategory(''); setPage(1); }}
          >
            <div className="category-icon-wrapper">🛍️</div>
            <div className="category-tile-title">All Items</div>
            <div className="category-tile-subtitle">Explore Catalog</div>
          </div>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`category-tile ${category === cat.id ? 'active' : ''}`}
              onClick={() => { setCategory(cat.id); setPage(1); }}
            >
              <div className="category-icon-wrapper">{cat.icon}</div>
              <div className="category-tile-title">{cat.label}</div>
              <div className="category-tile-subtitle">{cat.desc}</div>
            </div>
          ))}
        </div>

        {/* Filter Summary & Result Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--navy-900)' }}>
              {category ? `${category.toUpperCase()} Listings` : search ? `Search Results for "${search}"` : 'Recommended Campus Listings'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Showing {items.length} of {totalItems} verified items for sale
            </p>
          </div>

          {(search || category || maxPrice) && (
            <button className="btn-sell-now" style={{ background: '#e2e8f0', color: '#334155' }} onClick={clearAllFilters}>
              Clear Filters ✕
            </button>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <SkeletonListings />
        ) : items.length === 0 ? (
          <div className="svg-fallback-box" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '60px 20px' }}>
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginTop: 12 }}>No listings found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try selecting a different category or clearing your search term.</p>
            <button className="btn-sell-now" style={{ marginTop: 16 }} onClick={clearAllFilters}>Reset Filters</button>
          </div>
        ) : (
          <div className="products-grid">
            {items.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 40 }}>
            <button
              className="action-chat-btn"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 14, background: 'var(--navy-800)', color: '#fff' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-900)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="action-chat-btn"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 14, background: 'var(--navy-800)', color: '#fff' }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
