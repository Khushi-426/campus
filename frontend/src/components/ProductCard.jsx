import React from 'react';
import { Link } from 'react-router-dom';

function CategoryIcon({ category }) {
  switch (category) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
        </svg>
      );
    case 'calculator':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      );
    case 'lab-equipment':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 22h12a2 2 0 0 0 2-2c0-.5-.2-.9-.5-1.2L14 11.5V5h1V3H9v2h1v6.5L4.5 18.8A2 2 0 0 0 6 22zm3-8.5 2.5-3.6 2.5 3.6V20H9v-6.5z" />
        </svg>
      );
    case 'stationery':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      );
    case 'electronics':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
        </svg>
      );
  }
}

export default function ProductCard({ product }) {
  const conditionClass = `badge-condition-${(product.condition || 'good').toLowerCase().replace(' ', '-')}`;

  return (
    <Link to={`/product/${product._id}`} className="card">
      {product.status && product.status !== 'available' && (
        <div className={`badge badge-status badge-status-${product.status}`}>
          {product.status}
        </div>
      )}
      <div className="card-thumb">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} loading="lazy" />
        ) : (
          <div className="card-placeholder">
            <CategoryIcon category={product.category} />
            <span>{product.category || 'Gear'}</span>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="card-header-row">
          <span className={`badge ${conditionClass}`}>{product.condition || 'good'}</span>
          <span className="card-meta">{product.category}</span>
        </div>
        <div className="card-title">{product.title}</div>
        <div className="card-meta" style={{ marginTop: 'auto' }}>
          Seller: {product.seller?.name || 'Student'}
        </div>
        <div className="card-price">
          {product.price === 0 ? 'FREE' : `₹${product.price.toLocaleString('en-IN')}`}
        </div>
      </div>
    </Link>
  );
}
