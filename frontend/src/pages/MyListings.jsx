import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const STATUS_OPTIONS = ['available', 'reserved', 'sold'];

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/products/mine');
    setItems(data.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/products/${id}`, { status });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="container page">
      <h1 className="page-title">My listings</h1>
      <p className="page-sub">Manage what you've put up for sale.</p>

      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && (
        <p>You haven't listed anything yet. <Link to="/sell">List your first item</Link>.</p>
      )}

      <div className="grid">
        {items.map((p) => (
          <div className="card" key={p._id}>
            <div className="card-thumb">
              {p.images?.[0] ? <img src={p.images[0]} alt={p.title} /> : <span>No image</span>}
            </div>
            <div className="card-body">
              <div className="card-title">{p.title}</div>
              <div className="card-price">{p.price === 0 ? 'FREE' : `₹${p.price}`}</div>
              <select
                value={p.status}
                onChange={(e) => updateStatus(p._id, e.target.value)}
                style={{ padding: 6, borderRadius: 4, border: '1px solid var(--line)' }}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline" onClick={() => remove(p._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
