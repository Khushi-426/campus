import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function CategoryIcon({ category }) {
  switch (category) {
    case 'book':
      return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>;
    case 'calculator':
      return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>;
    case 'lab-equipment':
      return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 22h12a2 2 0 0 0 2-2c0-.5-.2-.9-.5-1.2L14 11.5V5h1V3H9v2h1v6.5L4.5 18.8A2 2 0 0 0 6 22zm3-8.5 2.5-3.6 2.5 3.6V20H9v-6.5z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        if (!cancelled) {
          setProduct(data.product);
          setActiveImageIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Listing not found or could not be loaded.');
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
      setError(err.response?.data?.message || 'Could not start conversation');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <div className="detail-grid">
          <div className="skeleton-card" style={{ height: 380 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton-box skeleton-line" style={{ width: '30%' }} />
            <div className="skeleton-box skeleton-line" style={{ width: '80%', height: 32 }} />
            <div className="skeleton-box skeleton-line" style={{ width: '40%', height: 28 }} />
            <div className="skeleton-box skeleton-line" style={{ width: '100%', height: 120 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="container page">
        <div className="error-banner">{error}</div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>← Back to catalog</button>
      </div>
    );
  }

  if (!product) return null;

  const isOwnListing = user && String(product.seller?._id) === String(user.id);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImage = images[activeImageIndex];
  const conditionClass = `badge-condition-${(product.condition || 'good').toLowerCase().replace(' ', '-')}`;

  return (
    <div className="container page">
      <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginBottom: 24, padding: '6px 14px' }}>
        ← Back to Browse
      </button>

      <div className="detail-grid">
        {/* Gallery Column */}
        <div className="gallery-container">
          <div className="gallery-main">
            {activeImage ? (
              <img src={activeImage} alt={product.title} />
            ) : (
              <div className="card-placeholder" style={{ padding: 40 }}>
                <CategoryIcon category={product.category} />
                <span style={{ fontSize: 14 }}>No photo provided by seller</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`gallery-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Meta & Sticky Seller Action Column */}
        <div className="detail-info">
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge ${conditionClass}`}>{product.condition}</span>
              <span className="badge" style={{ background: 'var(--paper-light)', border: '1px solid var(--line)', color: 'var(--navy)' }}>
                {product.category}
              </span>
              {product.status && product.status !== 'available' && (
                <span className={`badge badge-status-${product.status}`} style={{ color: '#fff', background: 'var(--rust)' }}>
                  {product.status}
                </span>
              )}
            </div>

            <h1 className="page-title" style={{ fontSize: 32, lineHeight: 1.2 }}>{product.title}</h1>
            
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 16 }}>
              <span>Listed {new Date(product.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{product.viewCount} Views</span>
            </div>

            <div className="detail-price" style={{ margin: '16px 0' }}>
              {product.price === 0 ? 'FREE' : `₹${product.price.toLocaleString('en-IN')}`}
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 18, margin: '16px 0' }}>
              <h4 style={{ margin: '0 0 8px', color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>Item Description</h4>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>{product.description}</p>
            </div>
          </div>

          {/* Sticky Seller Info & Chat Action Card */}
          <div className="sticky-seller-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div className="seller-avatar">
                {product.seller?.name?.[0] || 'S'}
              </div>
              <div>
                <strong style={{ fontSize: 16, color: 'var(--navy)' }}>{product.seller?.name || 'Verified Student Seller'}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {product.seller?.branch ? `${product.seller.branch}` : 'College Senior'}
                  {product.seller?.year ? ` • Year ${product.seller.year}` : ''}
                </div>
              </div>
            </div>

            {isOwnListing ? (
              <div className="helper-text" style={{ margin: 0, textAlign: 'left', background: 'var(--paper-light)', padding: 12, borderRadius: 4 }}>
                💡 <strong>Your Listing:</strong> You are the seller of this item.
              </div>
            ) : (
              <button
                className="btn btn-mustard btn-block"
                style={{ fontSize: 16, padding: 12 }}
                onClick={handleChatWithSeller}
                disabled={starting}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
                {starting ? 'Opening Chat...' : 'Message Seller'}
              </button>
            )}

            {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
