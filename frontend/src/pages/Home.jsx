import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];

function SkeletonGrid() {
  return (
    <div className="grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-box skeleton-thumb" />
          <div className="skeleton-content">
            <div className="skeleton-box skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton-box skeleton-line" style={{ width: '85%' }} />
            <div className="skeleton-box skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-box skeleton-line" style={{ width: '30%', marginTop: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

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
      setError('Could not load listings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setMaxPrice('');
    setPage(1);
  };

  return (
    <div className="container page">
      <h1 className="page-title">Campus Trade & Marketplace</h1>
      <p className="page-sub">Buy and sell textbooks, calculators, and lab gear directly with fellow students.</p>

      {/* Category Filter Pills */}
      <div className="category-pills">
        <button
          className={`pill ${category === '' ? 'active' : ''}`}
          onClick={() => { setCategory(''); setPage(1); }}
        >
          All Categories
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`pill ${category === c ? 'active' : ''}`}
            onClick={() => { setCategory(c); setPage(1); }}
          >
            {c}
          </button>
        ))}
      </div>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Search textbooks, calculators, lab gear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Max Price (₹)"
          value={maxPrice}
          onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
          style={{ width: 130 }}
        />
        <button type="submit" className="btn btn-navy">Search</button>
        {(search || category || maxPrice) && (
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear
          </button>
        )}
      </form>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <svg viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <h3>No listings found</h3>
          <p className="page-sub">Try searching with a different term or clearing your category filters.</p>
          {(search || category || maxPrice) && (
            <button className="btn btn-outline" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
            Showing {items.length} of {totalItems} available items
          </div>
          <div className="grid">
            {items.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </>
      )}

      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 36 }}>
          <button
            className="btn btn-outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
