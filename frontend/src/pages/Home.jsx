import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const CATEGORIES = [
  { id: 'book', label: 'Books', icon: '📚', count: '1.2k+', bgClass: 'bg-orange' },
  { id: 'electronics', label: 'Electronics', icon: '💻', count: '850+', bgClass: 'bg-green' },
  { id: 'lab-equipment', label: 'Lab Equipment', icon: '🧪', count: '420+', bgClass: 'bg-blue' },
  { id: 'stationery', label: 'Stationery', icon: '📁', count: '650+', bgClass: 'bg-amber' },
  { id: 'other', label: 'Others', icon: '⚙️', count: '1k+', bgClass: 'bg-purple' },
];

function SkeletonGrid() {
  return (
    <div className="products-grid-saas">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="card-saas" key={i}>
          <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '4/3' }} />
          <div className="card-saas-body">
            <div className="skeleton-pulse" style={{ width: '85%', height: 16 }} />
            <div className="skeleton-pulse" style={{ width: '40%', height: 18, marginTop: 8 }} />
            <div className="skeleton-pulse" style={{ width: '60%', height: 12, marginTop: 'auto' }} />
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const queryParams = new URLSearchParams(routerLocation.search);
  const searchFromUrl = queryParams.get('search') || '';
  const categoryFromUrl = queryParams.get('category') || '';

  const [search, setSearch] = useState(searchFromUrl);
  const [debouncedSearch, setDebouncedSearch] = useState(searchFromUrl);
  const [category, setCategory] = useState(categoryFromUrl);

  const debounceTimer = useRef(null);

  // 300ms Debounce Handler for Search Bar Input (Prevents firing 10 API requests for a 10-char keystroke)
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  useEffect(() => {
    setSearch(searchFromUrl);
    setCategory(categoryFromUrl);
    setPage(1);
  }, [searchFromUrl, categoryFromUrl]);

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const params = { page: isLoadMore ? page : 1, limit: 12 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;

      const { data } = await api.get('/products', { params });

      if (isLoadMore) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError('Could not load listings from server.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, debouncedSearch, category]);

  useEffect(() => {
    fetchProducts(page > 1);
  }, [page, debouncedSearch, category, fetchProducts]);

  const loadMoreItems = () => {
    if (page < totalPages && !loadingMore) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div>
      {/* Hero Banner Card */}
      <section className="hero-card-saas">
        <div className="hero-card-left">
          <h1>Buy. Sell. Donate.<br />Request. Repeat.</h1>
          <p>The trusted campus marketplace for students, by students.</p>
          <div className="hero-card-btns">
            <Link to="/?category=" className="btn-purple-solid">Browse Items</Link>
            <Link to="/sell" className="btn-purple-ghost">Post an Item</Link>
          </div>
        </div>

        {/* Vector SVG Illustration */}
        <div className="hero-vector-illustration">
          <svg viewBox="0 0 200 160" width="220" height="150">
            <circle cx="100" cy="80" r="70" fill="#c7d2fe" opacity="0.4"/>
            <path d="M65 130c0-20 15-35 35-35s35 15 35 35" fill="#4f46e5"/>
            <circle cx="100" cy="70" r="22" fill="#312e81"/>
            <path d="M125 135c0-15 12-28 28-28s28 13 28 28" fill="#818cf8"/>
            <circle cx="153" cy="85" r="18" fill="#4338ca"/>
          </svg>
        </div>
      </section>

      {/* Category Row */}
      <div className="category-row-grid">
        <div
          className={`cat-card-saas ${category === '' ? 'active' : ''}`}
          onClick={() => { setCategory(''); setPage(1); }}
        >
          <div className="cat-card-icon-box bg-purple">🛍️</div>
          <div className="cat-card-title">All Items</div>
          <div className="cat-card-count">Catalog</div>
        </div>

        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            className={`cat-card-saas ${category === cat.id ? 'active' : ''}`}
            onClick={() => { setCategory(cat.id); setPage(1); }}
          >
            <div className={`cat-card-icon-box ${cat.bgClass}`}>{cat.icon}</div>
            <div className="cat-card-title">{cat.label}</div>
            <div className="cat-card-count">{cat.count}</div>
          </div>
        ))}
      </div>

      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--text-main)', fontWeight: 800 }}>
          {category ? `${category.toUpperCase()} Listings` : debouncedSearch ? `Results for "${debouncedSearch}"` : 'Featured Listings'}
        </h2>
        <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>View all</Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && page === 1 ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <div className="card-saas" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>No listings found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Try clearing search filters or changing category.</p>
          <button className="btn-purple-solid" style={{ marginTop: 16 }} onClick={() => { setCategory(''); setSearch(''); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="products-grid-saas">
            {items.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>

          {/* Infinite Scroll / Load More Button */}
          {page < totalPages && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
              <button
                className="btn-purple-ghost"
                onClick={loadMoreItems}
                disabled={loadingMore}
                style={{ padding: '12px 32px', fontSize: 14 }}
              >
                {loadingMore ? 'Loading More Gear...' : 'Load More Listings ↓'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer Features Banner */}
      <div className="footer-features-banner">
        <div className="feature-item-pill">
          <div className="feature-icon-circle">🛡️</div>
          <div>
            <div className="feature-title">Secure & Trusted</div>
            <div className="feature-sub">Verified students only</div>
          </div>
        </div>

        <div className="feature-item-pill">
          <div className="feature-icon-circle">🔔</div>
          <div>
            <div className="feature-title">Smart Notifications</div>
            <div className="feature-sub">Never miss an update</div>
          </div>
        </div>

        <div className="feature-item-pill">
          <div className="feature-icon-circle">💬</div>
          <div>
            <div className="feature-title">Real-time Chat</div>
            <div className="feature-sub">Connect instantly</div>
          </div>
        </div>

        <div className="feature-item-pill">
          <div className="feature-icon-circle">⚡</div>
          <div>
            <div className="feature-title">Easy & Fast</div>
            <div className="feature-sub">Seamless experience</div>
          </div>
        </div>
      </div>
    </div>
  );
}
