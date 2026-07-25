import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function CategorySvg({ category }) {
  switch (category) {
    case 'book':
      return <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>;
    case 'calculator':
      return <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>;
    case 'lab-equipment':
      return <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M6 22h12a2 2 0 0 0 2-2c0-.5-.2-.9-.5-1.2L14 11.5V5h1V3H9v2h1v6.5L4.5 18.8A2 2 0 0 0 6 22zm3-8.5 2.5-3.6 2.5 3.6V20H9v-6.5z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
  }
}

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const price = product.price || 0;
  const isNegotiable = price > 500;

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const { data } = await api.post(`/favorites/${product._id}`);
      setIsSaved(data.favorited);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card-saas">
      {/* Top Image Container with lazy loading */}
      <div className="card-saas-img-wrap">
        <button
          className="wishlist-heart-btn"
          style={{ color: isSaved ? '#ef4444' : 'var(--text-subtle)' }}
          title={isSaved ? 'Remove from Saved' : 'Save to Watchlist'}
          onClick={handleFavoriteClick}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={isSaved ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <Link to={`/product/${product._id}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.title} loading="lazy" />
          ) : (
            <div style={{ color: 'var(--text-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <CategorySvg category={product.category} />
              <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{product.category}</span>
            </div>
          )}
        </Link>
      </div>

      {/* Card Details Body */}
      <div className="card-saas-body">
        <Link to={`/product/${product._id}`} className="card-saas-title" title={product.title}>
          {product.title}
        </Link>

        <div className="card-saas-price-row">
          <span className="price-bold">
            {price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}
          </span>
          {isNegotiable && <span className="negotiable-tag">Negotiable</span>}
        </div>

        <div className="card-saas-meta-row">
          <span className="condition-subtag">
            {product.condition === 'new' ? 'Mint / New' : product.condition === 'like-new' ? 'Like New' : 'Good Condition'}
          </span>

          <span className="location-subtag">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ color: 'var(--primary)' }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Hostel {product.seller?.year || '1'}
          </span>
        </div>
      </div>
    </div>
  );
}
