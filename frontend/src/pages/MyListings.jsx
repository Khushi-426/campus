import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

const STATUS_OPTIONS = ['available', 'reserved', 'sold'];

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products/mine');
      setItems(data.items);
    } catch (err) {
      console.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/products/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Listings</h1>
          <p className="page-sub" style={{ margin: 0 }}>Manage status, edit details, or remove items you've posted.</p>
        </div>
        <Link to="/sell" className="btn btn-mustard">
          + Create New Listing
        </Link>
      </div>

      {loading ? (
        <p className="helper-text" style={{ textAlign: 'left' }}>Loading your listings...</p>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
          <svg viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <h3>You haven't listed anything yet</h3>
          <p className="page-sub">Clear out your desk and help juniors by listing your old books & calculators.</p>
          <Link to="/sell" className="btn btn-navy">List your first item</Link>
        </div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <div className="card" key={p._id} style={{ display: 'flex', flexDirection: 'column' }}>
              <ProductCard product={p} />
              <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, marginTop: -8 }}>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p._id, e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', fontSize: 13, background: 'var(--paper-light)' }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>Status: {s}</option>
                  ))}
                </select>
                <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 13, color: 'var(--rust)', borderColor: 'var(--rust)' }} onClick={() => remove(p._id)}>
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
