import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product._id}`} className="card">
      <div className="card-thumb">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} />
        ) : (
          <span>No image</span>
        )}
      </div>
      <div className="card-body">
        <div className="tag-stamp">{product.condition || 'good'}</div>
        <div className="card-title">{product.title}</div>
        <div className="card-meta">
          {product.category} · {product.seller?.name || 'Seller'}
        </div>
        <div className="card-price">
          {product.price === 0 ? 'FREE' : `₹${product.price}`}
        </div>
      </div>
    </Link>
  );
}
