import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        if (!cancelled) setProduct(data.product);
      })
      .catch(() => {
        if (!cancelled) setError('Listing not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChatWithSeller = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setStarting(true);
    try {
      const { data } = await api.post('/chat/start', { productId: id });
      navigate('/chat', { state: { conversationId: data.conversation._id } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start chat');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="container page">Loading…</div>;
  if (error && !product) return <div className="container page"><p className="error-text">{error}</p></div>;
  if (!product) return null;

  const isOwnListing = user && String(product.seller?._id) === String(user.id);

  return (
    <div className="container page">
      <div className="detail-grid">
        <div className="detail-thumb">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.title} />
          ) : (
            <span>No image provided</span>
          )}
        </div>

        <div>
          <div className="tag-stamp">{product.condition}</div>
          <h1 className="page-title" style={{ marginTop: 10 }}>{product.title}</h1>
          <p className="card-meta">{product.category} · {product.viewCount} views</p>
          <div className="detail-price">{product.price === 0 ? 'FREE' : `₹${product.price}`}</div>
          <p style={{ lineHeight: 1.6 }}>{product.description}</p>

          <div className="seller-box">
            <strong>{product.seller?.name}</strong>
            <p className="card-meta" style={{ marginTop: 4 }}>
              {product.seller?.branch ? `${product.seller.branch} · ` : ''}
              {product.seller?.year ? `Year ${product.seller.year}` : ''}
            </p>

            {isOwnListing ? (
              <p className="helper-text" style={{ marginTop: 12 }}>This is your own listing.</p>
            ) : (
              <button
                className="btn btn-navy"
                style={{ marginTop: 12 }}
                onClick={handleChatWithSeller}
                disabled={starting}
              >
                {starting ? 'Opening chat…' : 'Chat with seller'}
              </button>
            )}
          </div>

          {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
