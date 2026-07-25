import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function CategorySvg({ category }) {
  switch (category) {
    case 'book':
      return <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>;
    case 'calculator':
      return <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>;
    case 'lab-equipment':
      return <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M6 22h12a2 2 0 0 0 2-2c0-.5-.2-.9-.5-1.2L14 11.5V5h1V3H9v2h1v6.5L4.5 18.8A2 2 0 0 0 6 22zm3-8.5 2.5-3.6 2.5 3.6V20H9v-6.5z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (isMounted) {
          setProduct(data.product);
          setActiveImgIdx(0);
        }
      })
      .catch(() => {
        if (isMounted) setError('Listing not found or failed to load.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleChatWithSeller = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setStartingChat(true);
    try {
      const { data } = await api.post('/chat/start', { productId: id });
      navigate('/chat', { state: { conversationId: data.conversation._id } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '32px 20px' }}>
        <div className="product-detail-layout">
          <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '4/3', borderRadius: 'var(--radius-lg)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton-pulse" style={{ width: '30%', height: 16 }} />
            <div className="skeleton-pulse" style={{ width: '80%', height: 32 }} />
            <div className="skeleton-pulse" style={{ width: '40%', height: 28 }} />
            <div className="skeleton-pulse" style={{ width: '100%', height: 140 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="error-banner">{error}</div>
        <Link to="/" className="btn-sell-now">← Back to Browse</Link>
      </div>
    );
  }

  if (!product) return null;

  const isOwnListing = user && String(product.seller?._id) === String(user.id);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImg = images[activeImgIdx];
  const price = product.price || 0;
  const estimatedMrp = price > 0 ? Math.round(price * 2.5) : 500;
  const savings = estimatedMrp - price;
  const discountPercent = price > 0 ? Math.round((savings / estimatedMrp) * 100) : 100;

  return (
    <div className="container" style={{ padding: '24px 20px 64px' }}>
      {/* Breadcrumb Trail */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--navy-800)' }}>Home</Link>
        <span>/</span>
        <span style={{ textTransform: 'capitalize' }}>{product.category}</span>
        <span>/</span>
        <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{product.title}</span>
      </div>

      <div className="product-detail-layout">
        {/* Gallery Section */}
        <div className="detail-gallery-box">
          <div className="detail-main-img-wrap">
            {activeImg ? (
              <img src={activeImg} alt={product.title} />
            ) : (
              <div className="svg-fallback-box" style={{ padding: 40 }}>
                <CategorySvg category={product.category} />
                <span style={{ fontSize: 13, marginTop: 8 }}>No photos provided by seller</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="detail-thumb-strip">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumb-btn ${activeImgIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveImgIdx(idx)}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Purchase Action Section */}
        <div className="product-summary-col">
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span className={`condition-tag tag-${(product.condition || 'good').toLowerCase().replace(/\s+/g, '-')}`} style={{ position: 'static' }}>
                {product.condition === 'new' ? '✨ Mint / New' : product.condition === 'like-new' ? '💎 Like New' : '📖 Good Condition'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>• 👁️ {product.viewCount || 0} Views</span>
            </div>

            <h1 className="product-header-title">{product.title}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Category: <strong style={{ color: 'var(--navy-900)' }}>{product.category}</strong>
            </p>
          </div>

          {/* Amazon Pricing Box */}
          <div className="price-card-box">
            <div className="price-heading-large">
              {price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}
              {price > 0 && <span className="mrp-badge-tag">{discountPercent}% OFF</span>}
            </div>

            {price > 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                M.R.P.: <span style={{ textDecoration: 'line-through' }}>₹{estimatedMrp.toLocaleString('en-IN')}</span>
                <span style={{ color: 'var(--rust-600)', fontWeight: 700, marginLeft: 8 }}>
                  Save ₹{savings.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span>🤝 Campus Hand-to-Hand Deal</span>
              <span>•</span>
              <span>📍 Inspect before paying</span>
            </div>
          </div>

          {/* Description Box */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 18 }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--navy-900)', margin: '0 0 8px' }}>Seller Notes & Item Condition</h4>
            <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-main)' }}>{product.description}</p>
          </div>

          {/* Verified Senior Seller Card & Action Button */}
          <div className="seller-trust-box">
            <div className="seller-profile-row">
              <div className="avatar-circle">
                {product.seller?.name?.[0] || 'S'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy-900)', fontFamily: 'var(--font-heading)' }}>
                  {product.seller?.name || 'Verified Student Seller'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {product.seller?.branch ? `${product.seller.branch}` : 'Senior Student'}
                  {product.seller?.year ? ` • Year ${product.seller.year}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 600, marginTop: 2 }}>
                  ⚡ Responds in ~10 mins
                </div>
              </div>
            </div>

            {isOwnListing ? (
              <div style={{ background: 'var(--bg-paper)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--navy-900)', fontWeight: 600 }}>
                💡 <strong>Your Listing:</strong> You are the owner of this item.
              </div>
            ) : (
              <button
                className="action-chat-btn"
                onClick={handleChatWithSeller}
                disabled={startingChat}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
                {startingChat ? 'Connecting with Seller...' : 'Chat with Seller Now'}
              </button>
            )}

            {error && <div className="error-banner">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
