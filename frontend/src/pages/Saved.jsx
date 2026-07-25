import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';

export default function Saved() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/favorites')
      .then(({ data }) => {
        setItems(data.items);
      })
      .catch(() => {
        setError('Could not load your saved items.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: 'var(--text-main)' }}>
          Saved Watchlist ❤️
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Items you've starred to track price drops and availability.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading saved watchlist...</p>
      ) : items.length === 0 ? (
        <div className="card-saas" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>No saved items yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Click the heart icon on any listing to save it here for price-drop notifications.</p>
        </div>
      ) : (
        <div className="products-grid-saas">
          {items.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
