import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const STATUS_OPTIONS = ['available', 'reserved', 'sold'];

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products/mine');
      setItems(data.items);
    } catch (err) {
      setError('Could not load your listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/products/${id}`, { status });
      load();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (err) {
      alert('Failed to delete listing');
    }
  };

  // Dashboard Stats Calculations
  const totalListings = items.length;
  const activeListings = items.filter((i) => i.status === 'available').length;
  const totalViews = items.reduce((acc, i) => acc + (i.viewCount || 0), 0);
  const totalValue = items.reduce((acc, i) => acc + (i.price || 0), 0);

  return (
    <div className="container" style={{ padding: '32px 20px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, color: 'var(--navy-900)' }}>Seller Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your active gear, view count, and sales status.</p>
        </div>
        <Link to="/sell" className="btn-sell-now">
          + Create New Listing
        </Link>
      </div>

      {/* Dashboard Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Items</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--navy-900)' }}>{activeListings}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Views</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--mustard-600)' }}>{totalViews}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Value Listed</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--rust-600)' }}>₹{totalValue.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Listings</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--navy-900)' }}>{totalListings}</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="products-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skeleton-pulse" key={i} style={{ aspectRatio: '4/3', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="svg-fallback-box" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '60px 20px' }}>
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginTop: 12 }}>You haven't listed anything yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Post your old engineering textbooks, scientific calculators, or lab gear.</p>
          <Link to="/sell" className="btn-sell-now" style={{ marginTop: 16 }}>List Your First Item</Link>
        </div>
      ) : (
        <div className="products-grid">
          {items.map((p) => (
            <div key={p._id} style={{ display: 'flex', flexDirection: 'column' }}>
              <ProductCard product={p} />
              <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderTop: 'none', borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)', padding: 12, display: 'flex', gap: 8, marginTop: -4 }}>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p._id, e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-medium)', fontSize: 12, background: 'var(--bg-main)', fontWeight: 600 }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>Status: {s.toUpperCase()}</option>
                  ))}
                </select>
                <button
                  className="search-btn"
                  style={{ background: 'var(--rust-600)', color: '#fff', padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-xs)' }}
                  onClick={() => remove(p._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
